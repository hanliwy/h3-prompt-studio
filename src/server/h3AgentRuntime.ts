import fs from 'node:fs';
import path from 'node:path';
import type {
  AspectRatio,
  H3AgentResult,
  H3AgentReview,
  H3AuxiliaryParamKey,
  H3PromptVariant,
  H3ResolvedParam,
  H3ResolvedParams,
  StructuredPromptOutput,
} from '../types';
import type { H3SkillDefinition } from './h3SkillRuntime';
import { CAMERA_MOTIONS, LENS_TYPES, LIGHTING_STYLES, TARGET_MODELS } from '../data/presetOptions';
import {
  getH3SkillWorkflowConfig,
  validateSkillOutput,
} from './h3SkillWorkflow';
import {
  validateH3Prompt,
  type AgentLoopLlmCall,
  type AgentLoopEvent,
  type AgentMessage,
  type AgentToolCall,
  type AgentToolDef,
  type H3AgentLoopRunOptions,
} from './h3AgentLoop';

export type H3AgentLlmCall = AgentLoopLlmCall;
export type H3AgentLlmMessage = AgentMessage;
export type H3AgentStage = string;
export type H3AgentConfidence = 'low' | 'medium' | 'high';

export type { AgentLoopEvent, H3AgentLoopRunOptions } from './h3AgentLoop';

export interface RunH3AgentGenerationArgs {
  userPrompt: string;
  skills: H3SkillDefinition[];
  skillsRoot: string;
  callLlm: H3AgentLlmCall;
  options?: H3AgentLoopRunOptions;
  emit?: (event: AgentLoopEvent) => void;
  signal?: AbortSignal;
  maxTurns?: number;
}

interface GeneratedPromptPayload {
  confidence?: H3AgentConfidence;
  reason?: string;
  resolvedParams?: Partial<H3ResolvedParams>;
  result?: Partial<H3PromptVariant>;
}

interface ParsedGeneration {
  payload: GeneratedPromptPayload | null;
  issues: string[];
  submission: AgentToolCall | null;
}

const MAX_RUNTIME_CONTEXT_CHARS = 120000;
const AUXILIARY_PARAM_KEYS: H3AuxiliaryParamKey[] = ['targetModel', 'camera', 'lens', 'lighting'];
const RESOLVED_PARAM_SOURCES = ['manual-ui', 'user-text', 'skill-recommended', 'system-default'] as const;
const SYSTEM_DEFAULT_VALUES: Record<H3AuxiliaryParamKey, string> = {
  targetModel: 'minimax-h3',
  camera: '按 Skill 规划运镜',
  lens: '按 Skill 规划镜头',
  lighting: '按 Skill 规划光影',
};
const AUXILIARY_PRESETS: Record<H3AuxiliaryParamKey, Map<string, string>> = {
  targetModel: new Map(TARGET_MODELS.map((item) => [String(item.value), item.label])),
  camera: new Map(CAMERA_MOTIONS.map((item) => [String(item.value), item.label])),
  lens: new Map(LENS_TYPES.map((item) => [String(item.value), item.label])),
  lighting: new Map(LIGHTING_STYLES.map((item) => [String(item.value), item.label])),
};

const resolvedParamSchema = {
  type: 'object',
  properties: {
    value: { type: 'string' },
    source: { type: 'string', enum: RESOLVED_PARAM_SOURCES },
    presetId: { type: 'string' },
    userEvidence: { type: 'string' },
    promptEvidence: { type: 'string' },
  },
  required: ['value', 'source', 'promptEvidence'],
};

const SUBMIT_GENERATED_PROMPT_TOOL: AgentToolDef = {
  type: 'function',
  function: {
    name: 'submit_generated_prompt',
    description: '提交唯一最终视频提示词。必须一次性返回完整成品，不返回候选方案。',
    parameters: {
      type: 'object',
      properties: {
        confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        reason: { type: 'string' },
        resolvedParams: {
          type: 'object',
          properties: {
            targetModel: resolvedParamSchema,
            camera: resolvedParamSchema,
            lens: resolvedParamSchema,
            lighting: resolvedParamSchema,
          },
          required: AUXILIARY_PARAM_KEYS,
        },
        result: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            titleCn: { type: 'string' },
            titleEn: { type: 'string' },
            promptEn: { type: 'string' },
            promptCn: { type: 'string' },
            negativePromptEn: { type: 'string' },
            negativePromptCn: { type: 'string' },
          },
          required: ['id', 'titleCn', 'titleEn', 'promptEn', 'promptCn'],
        },
      },
      required: ['confidence', 'reason', 'resolvedParams', 'result'],
    },
  },
};

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error
    ? signal.reason
    : new DOMException('生成已取消。', 'AbortError');
}

function resolveSelectedSkill(skills: H3SkillDefinition[], skillId: string | undefined) {
  if (!skillId) throw new Error('前端必须先选择一个 MiniMax-H3 Skill。');
  const selectedSkill = skills.find(
    (skill) => skill.id === skillId || skill.folder === skillId || skill.aliases.includes(skillId),
  );
  if (!selectedSkill) throw new Error(`找不到所选 Skill：${skillId}`);
  return selectedSkill;
}

function loadRequiredSkillContext(
  selectedSkill: H3SkillDefinition,
  skillsRoot: string,
  requiredFiles: string[],
) {
  const skillDir = path.resolve(skillsRoot, selectedSkill.folder);
  let remaining = MAX_RUNTIME_CONTEXT_CHARS;
  const loadedFiles: string[] = [];
  const sections: string[] = [];

  for (const relativePath of requiredFiles) {
    const resolved = path.resolve(skillDir, relativePath);
    if (!resolved.startsWith(`${skillDir}${path.sep}`) || !fs.existsSync(resolved)) {
      throw new Error(`无法读取所选 Skill 的必需文件：${relativePath}`);
    }
    const content = fs.readFileSync(resolved, 'utf-8');
    if (content.length > remaining) {
      throw new Error(`所选 Skill 的运行上下文超过 ${MAX_RUNTIME_CONTEXT_CHARS} 字符，无法完整加载。`);
    }
    sections.push(`=== ${selectedSkill.id}/${relativePath} ===\n${content}`);
    loadedFiles.push(relativePath);
    remaining -= content.length;
  }
  return { context: sections.join('\n\n'), loadedFiles };
}

function buildSystemPrompt(
  selectedSkill: H3SkillDefinition,
  skillContext: string,
  options: H3AgentLoopRunOptions,
) {
  const config = getH3SkillWorkflowConfig(selectedSkill.id);
  const duration = config.fixedDuration || options.duration || selectedSkill.recommendedParams.duration;
  const aspectRatio = config.fixedAspectRatio || options.aspectRatio || '16:9';
  const manualAuxiliaryParams = options.manualAuxiliaryParams || {};
  const skillRecommendations = {
    camera: selectedSkill.recommendedParams.cameraMotion,
    lens: selectedSkill.recommendedParams.lens,
    lighting: selectedSkill.recommendedParams.lighting,
    targetModel: 'minimax-h3',
  };
  const gavenStyleBlock = options.gavenStyleCodes
    ? `\n用户指定画风组合：${options.gavenStyleCodes}。必须从上方 Skill 的画风参考文件中读取对应条目，把 Dxx（导演视觉语言）、Pxx（摄影风格）、Cxx（拍摄胶片）、Rxx（印片风格）与 S（强度）每一层都完整展开为自包含的自然视觉语言，写入成品的"视觉风格"段。不得遗漏任何选定的画风层级，不得用导演姓名或画风代码代替具体描述。展开后不得在成品中保留任何画风代码、括号标注（如（D13）（P03））或"受……启发"引用。`
    : '';
  return `你是 MiniMax-H3 视频提示词执行器。服务器已锁定唯一 Skill 并加载全部必需规则，不做路由，不向用户提问，不返回候选，不输出工作流草稿。${gavenStyleBlock}

重要：不要输出冗长的思考过程、大纲、自检表或分镜规划文本。直接调用 submit_generated_prompt 提交完整成品。内容部分（result.promptEn）必须包含完整提示词，不要把提示词写在中间分析里。
如果需要输出任何中间文本（包括思考过程），请全部使用中文。最终成品 result.promptEn 使用英文，result.promptCn 使用中文。

固定工作流参数：Skill=${selectedSkill.id}；inputMode=${options.inputMode || 'text'}；sceneMode=${options.sceneMode || '不适用'}；duration=${duration}；aspectRatio=${aspectRatio}；motionSpeed=${options.motionSpeed || 7}。

四项语义辅助参数是 targetModel、camera、lens、lighting。请在本次生成成品的同一次调用中理解用户自然语言，不得额外询问或增加参数确认调用，也不能只依靠固定关键词判断。解析优先级必须是：manual-ui 非空手动选择 > user-text 用户自然语言明确表达 > skill-recommended > system-default。
用户手动选择（空对象表示没有手动锁定）：${JSON.stringify(manualAuxiliaryParams)}
Skill 推荐 preset：${JSON.stringify(skillRecommendations)}

调用 submit_generated_prompt 时必须同时提交 resolvedParams 和 result：
- 四项 resolvedParams 都必须有非空 value、合法 source 和 promptEvidence。
- manual-ui 必须原样保留对应手动 value 与 presetId。
- user-text 必须提供 userEvidence，且它是用户原文中的连续片段；允许用户使用任何自然语言表达摄影意图。
- skill-recommended 必须返回对应推荐 presetId；只有未命中更高优先级时才能使用。
- promptEvidence 必须是 result.promptEn 中的连续片段，用于证明该参数已经落实到最终提示词，而不是只写在分析里。

在本次调用内部完成：理解需求、规划时间线、按 Skill 原生格式写成品、自检。然后只调用一次 submit_generated_prompt，提交一个完整结果。result.promptEn 是前端复制的唯一成品，result.promptCn 必须提供中文对照；中文原生 Skill 可让两者相同。不得声称已经生成图片、视频或获得用户批准。

以下是所选 Skill 的完整运行规则：
${skillContext}`;
}

function parseGeneration(result: Awaited<ReturnType<H3AgentLlmCall>>): ParsedGeneration {
  const matchingSubmissions = result.tool_calls.filter((call) => call.name === 'submit_generated_prompt');
  const submission = matchingSubmissions[0] || null;
  if (!submission) {
    return {
      payload: null,
      issues: ['模型没有调用 submit_generated_prompt 提交唯一最终结果。'],
      submission: null,
    };
  }

  if ('_raw' in submission.args) {
    return {
      payload: null,
      issues: ['模型返回的工具参数不是有效 JSON（可能因输出过长被截断）。请精简思考过程，直接提交完整成品，不要输出工作流草稿。'],
      submission,
    };
  }

  const payload = submission.args as GeneratedPromptPayload;
  const issues: string[] = [];
  if (result.tool_calls.length !== 1 || matchingSubmissions.length !== 1) {
    issues.push('每次响应必须且只能调用一次 submit_generated_prompt。');
  }
  if (!payload.result || typeof payload.result !== 'object') issues.push('缺少 result 对象。');
  if (!payload.resolvedParams || typeof payload.resolvedParams !== 'object') issues.push('缺少 resolvedParams 对象。');
  if (!String(payload.result?.promptEn || '').trim()) issues.push('result.promptEn 不能为空。');
  if (!String(payload.result?.promptCn || '').trim()) issues.push('result.promptCn 不能为空。');
  return { payload, issues, submission };
}

function normalizeResult(
  raw: Partial<H3PromptVariant> | undefined,
  selectedSkill: H3SkillDefinition,
  userPrompt: string,
): H3PromptVariant {
  const promptText = String(raw?.promptEn || '').trim();
  return {
    id: String(raw?.id || `${selectedSkill.id}_result`),
    titleCn: String(raw?.titleCn || selectedSkill.title),
    titleEn: String(raw?.titleEn || selectedSkill.titleEn),
    promptEn: promptText || userPrompt,
    promptCn: String(raw?.promptCn || '').trim(),
    negativePromptEn: String(raw?.negativePromptEn || ''),
    negativePromptCn: String(raw?.negativePromptCn || ''),
  };
}

function normalizeResolvedParams(raw: Partial<H3ResolvedParams> | undefined): Partial<H3ResolvedParams> {
  const normalized: Partial<H3ResolvedParams> = {};
  for (const key of AUXILIARY_PARAM_KEYS) {
    const candidate = raw?.[key] as Partial<H3ResolvedParam> | undefined;
    if (!candidate || typeof candidate !== 'object') continue;
    normalized[key] = {
      value: String(candidate.value || '').trim(),
      source: String(candidate.source || '') as H3ResolvedParam['source'],
      presetId: candidate.presetId ? String(candidate.presetId).trim() : undefined,
      userEvidence: candidate.userEvidence ? String(candidate.userEvidence).trim() : undefined,
      promptEvidence: String(candidate.promptEvidence || '').trim(),
    };
  }
  return normalized;
}

function includesEvidence(text: string, evidence: string) {
  const normalizedText = text.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  const normalizedEvidence = evidence.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  return Boolean(normalizedEvidence && normalizedText.includes(normalizedEvidence));
}

function validateManualAuxiliaryParams(options: H3AgentLoopRunOptions) {
  const issues: string[] = [];
  for (const key of AUXILIARY_PARAM_KEYS) {
    const manual = options.manualAuxiliaryParams?.[key];
    if (!manual) continue;
    const presetId = String(manual.presetId || '').trim();
    const value = String(manual.value || '').trim();
    const expectedValue = AUXILIARY_PRESETS[key].get(presetId);
    if (!presetId || !expectedValue) {
      issues.push(`manualAuxiliaryParams.${key}.presetId 不是服务器允许的选项。`);
    } else if (value !== expectedValue) {
      issues.push(`manualAuxiliaryParams.${key}.value 与 presetId 不匹配，期望“${expectedValue}”。`);
    }
  }
  return issues;
}

function validateResolvedParams(
  resolvedParams: Partial<H3ResolvedParams>,
  result: H3PromptVariant,
  userPrompt: string,
  selectedSkill: H3SkillDefinition,
  options: H3AgentLoopRunOptions,
) {
  const issues: string[] = [];
  const recommendations: Record<H3AuxiliaryParamKey, string> = {
    targetModel: 'minimax-h3',
    camera: selectedSkill.recommendedParams.cameraMotion,
    lens: selectedSkill.recommendedParams.lens,
    lighting: selectedSkill.recommendedParams.lighting,
  };

  for (const key of AUXILIARY_PARAM_KEYS) {
    const resolved = resolvedParams[key];
    const manual = options.manualAuxiliaryParams?.[key];
    if (!resolved) {
      issues.push(`resolvedParams.${key} 缺失。`);
      continue;
    }
    if (!resolved.value) issues.push(`resolvedParams.${key}.value 不能为空。`);
    if (!RESOLVED_PARAM_SOURCES.includes(resolved.source as typeof RESOLVED_PARAM_SOURCES[number])) {
      issues.push(`resolvedParams.${key}.source 无效。`);
    }
    if (!resolved.promptEvidence || !includesEvidence(result.promptEn, resolved.promptEvidence)) {
      issues.push(`resolvedParams.${key}.promptEvidence 必须是最终提示词中的连续片段。`);
    }

    if (manual) {
      if (resolved.source !== 'manual-ui') issues.push(`resolvedParams.${key} 必须采用 manual-ui 手动覆盖。`);
      if (resolved.value !== manual.value) {
        issues.push(`resolvedParams.${key}.value 与手动值不一致，期望“${manual.value}”，实际“${resolved.value}”。`);
      }
      if (manual.presetId && resolved.presetId !== manual.presetId) {
        issues.push(`resolvedParams.${key}.presetId 与手动选择不一致，期望“${manual.presetId}”。`);
      }
    } else if (resolved.source === 'manual-ui') {
      issues.push(`resolvedParams.${key} 没有对应的手动 UI 参数，不得标记为 manual-ui。`);
    }

    if (resolved.source === 'user-text') {
      if (!resolved.userEvidence || !includesEvidence(userPrompt, resolved.userEvidence)) {
        issues.push(`resolvedParams.${key}.userEvidence 必须是用户原文中的连续片段。`);
      }
    }

    if (resolved.source === 'skill-recommended' && resolved.presetId !== recommendations[key]) {
      issues.push(`resolvedParams.${key}.presetId 与 Skill 推荐不一致，期望“${recommendations[key]}”。`);
    }
    if (resolved.source === 'system-default' && resolved.value !== SYSTEM_DEFAULT_VALUES[key]) {
      issues.push(`resolvedParams.${key}.value 与系统默认不一致，期望“${SYSTEM_DEFAULT_VALUES[key]}”。`);
    }
  }
  return issues;
}

function canonicalizeResolvedParams(
  resolvedParams: Partial<H3ResolvedParams>,
  selectedSkill: H3SkillDefinition,
  options: H3AgentLoopRunOptions,
): H3ResolvedParams {
  const recommendations: Record<H3AuxiliaryParamKey, string> = {
    targetModel: 'minimax-h3',
    camera: selectedSkill.recommendedParams.cameraMotion,
    lens: selectedSkill.recommendedParams.lens,
    lighting: selectedSkill.recommendedParams.lighting,
  };
  const canonical = { ...resolvedParams } as H3ResolvedParams;
  for (const key of AUXILIARY_PARAM_KEYS) {
    const resolved = canonical[key];
    const manual = options.manualAuxiliaryParams?.[key];
    if (manual) {
      canonical[key] = { ...resolved, value: manual.value, presetId: manual.presetId, source: 'manual-ui' };
    } else if (resolved.source === 'skill-recommended') {
      const presetId = recommendations[key];
      canonical[key] = {
        ...resolved,
        value: AUXILIARY_PRESETS[key].get(presetId) || presetId,
        presetId,
      };
    } else if (resolved.source === 'system-default') {
      canonical[key] = {
        ...resolved,
        value: SYSTEM_DEFAULT_VALUES[key],
        presetId: key === 'targetModel' ? 'minimax-h3' : undefined,
      };
    }
  }
  return canonical;
}

function reviewResult(
  result: H3PromptVariant,
  resolvedParams: Partial<H3ResolvedParams>,
  userPrompt: string,
  selectedSkill: H3SkillDefinition,
  options: H3AgentLoopRunOptions,
  extraIssues: string[] = [],
): H3AgentReview {
  const config = getH3SkillWorkflowConfig(selectedSkill.id);
  const duration = config.fixedDuration || options.duration || selectedSkill.recommendedParams.duration;
  const validation = validateSkillOutput({
    skillId: selectedSkill.id,
    promptText: result.promptEn,
    duration,
    inputMode: options.inputMode || 'text',
    sceneMode: options.sceneMode,
  });
  const parameterIssues = validateResolvedParams(resolvedParams, result, userPrompt, selectedSkill, options);
  const issues = [...extraIssues, ...validation.issues, ...parameterIssues];
  if (!result.promptCn.trim()) issues.push('唯一结果缺少中文对照。');
  return { isValidH3Format: issues.length === 0, issues, fixedInRepairTurn: false };
}

function toStructuredOutput(
  result: H3PromptVariant,
  resolvedParams: H3ResolvedParams,
  selectedSkill: H3SkillDefinition,
  options: H3AgentLoopRunOptions,
): StructuredPromptOutput {
  const config = getH3SkillWorkflowConfig(selectedSkill.id);
  return {
    title: result.titleCn,
    englishPrompt: result.promptEn,
    chineseTranslation: result.promptCn,
    subjectDescription: result.promptCn,
    cameraMovement: resolvedParams.camera.value,
    lightingAndAtmosphere: resolvedParams.lighting.value,
    styleAndAesthetics: result.titleEn,
    negativePrompt: [result.negativePromptEn, result.negativePromptCn].filter(Boolean).join('\n'),
    soundCue: '声音设计已包含在唯一最终提示词中。',
    technicalParams: {
      targetModel: (resolvedParams.targetModel.presetId || resolvedParams.targetModel.value) as StructuredPromptOutput['technicalParams']['targetModel'],
      aspectRatio: (config.fixedAspectRatio || options.aspectRatio || '16:9') as AspectRatio,
      fps: 24,
      duration: config.fixedDuration || options.duration || selectedSkill.recommendedParams.duration,
      motionSpeed: options.motionSpeed || 7,
    },
  };
}

function buildResult(
  parsed: ParsedGeneration,
  selectedSkill: H3SkillDefinition,
  userPrompt: string,
  options: H3AgentLoopRunOptions,
  fixedInRepairTurn: boolean,
  trace: string[],
) {
  const finalResult = normalizeResult(parsed.payload?.result, selectedSkill, userPrompt);
  const resolvedParams = normalizeResolvedParams(parsed.payload?.resolvedParams);
  const review = reviewResult(finalResult, resolvedParams, userPrompt, selectedSkill, options, parsed.issues);
  review.fixedInRepairTurn = fixedInRepairTurn && review.isValidH3Format;
  return { finalResult, resolvedParams, review, trace };
}

export async function runH3AgentGeneration({
  userPrompt,
  skills,
  skillsRoot,
  callLlm,
  options = {},
  emit,
  signal,
}: RunH3AgentGenerationArgs): Promise<H3AgentResult> {
  throwIfAborted(signal);
  const selectedSkill = resolveSelectedSkill(skills, options.skillId);
  const config = getH3SkillWorkflowConfig(selectedSkill.id);
  const inputMode = options.inputMode || 'text';
  if (inputMode !== 'text') throw new Error('图片模式将在后续版本开放，当前请选择非图片模式。');
  if (config.requiresSceneMode && !options.sceneMode) {
    throw new Error('该 Skill 必须先选择文戏、武戏或九宫格模式（sceneMode）。');
  }
  const manualAuxiliaryIssues = validateManualAuxiliaryParams(options);
  if (manualAuxiliaryIssues.length > 0) {
    throw new Error(`手动辅助参数无效：${manualAuxiliaryIssues.join('；')}`);
  }

  const duration = config.fixedDuration || options.duration || selectedSkill.recommendedParams.duration;
  const runtimeOptions = { ...options, inputMode, duration };
  const { context, loadedFiles } = loadRequiredSkillContext(
    selectedSkill,
    skillsRoot,
    config.requiredRuntimeFiles,
  );
  const systemPrompt = buildSystemPrompt(selectedSkill, context, runtimeOptions);
  const messages: AgentMessage[] = [{ role: 'user', content: userPrompt }];
  const trace = [`服务器已加载 Skill 文件：${loadedFiles.join('、')}`];

  emit?.({ type: 'turn_start', turn: 1, stage: 'generate', message: `正在按 ${selectedSkill.title} 生成唯一成品...` });
  const firstResponse = await callLlm({
    systemPrompt,
    messages,
    tools: [SUBMIT_GENERATED_PROMPT_TOOL],
    temperature: 0.55,
    signal,
  });
  throwIfAborted(signal);
  emit?.({ type: 'turn_end', turn: 1 });

  let parsed = parseGeneration(firstResponse);
  if (!parsed.submission) {
    throw new Error(parsed.issues[0] || '模型未按协议调用 submit_generated_prompt。');
  }
  let built = buildResult(parsed, selectedSkill, userPrompt, runtimeOptions, false, trace);
  trace.push('第 1 次模型调用完成服务器专属校验');

  // Split fallback: if the first call was truncated (no usable result), try to salvage promptEn from raw JSON
  if (!built.review.isValidH3Format && parsed.submission?.args && '_raw' in parsed.submission.args) {
    const rawJson = String((parsed.submission.args as any)._raw || '');
    const promptEnMatch = rawJson.match(/"promptEn"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (promptEnMatch?.[1]) {
      // Unescape and clean up the partial English prompt
      const salvagedEnglish = promptEnMatch[1]
        .replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
      if (salvagedEnglish.length > 100) {
        emit?.({ type: 'turn_start', turn: 3, stage: 'salvage', message: '检测到截断，正在补全中文对照...' });
        const salvageResponse = await callLlm({
          systemPrompt: '你只做一件事：为给定的英文视频提示词提供中文对照。直接调用 submit_generated_prompt，result.promptEn 保持原文不变，result.promptCn 填入中文翻译。同时提交四项 resolvedParams。',
          messages: [{ role: 'user', content: salvagedEnglish }],
          tools: [SUBMIT_GENERATED_PROMPT_TOOL],
          temperature: 0.3,
          signal,
        });
        throwIfAborted(signal);
        emit?.({ type: 'turn_end', turn: 3 });
        const salvageParsed = parseGeneration(salvageResponse);
        if (salvageParsed.payload?.result?.promptEn && salvageParsed.payload.result.promptCn) {
          const salvagedFinalResult = normalizeResult(
            { ...salvageParsed.payload.result, promptEn: salvagedEnglish },
            selectedSkill,
            userPrompt,
          );
          const salvagedResolved = normalizeResolvedParams(salvageParsed.payload.resolvedParams);
          const salvageReview = reviewResult(salvagedFinalResult, salvagedResolved, userPrompt, selectedSkill, runtimeOptions, salvageParsed.issues);
          salvageReview.fixedInRepairTurn = true;
          if (salvageReview.isValidH3Format) {
            parsed = salvageParsed;
            built = { finalResult: salvagedFinalResult, resolvedParams: salvagedResolved, review: salvageReview, trace };
            trace.push('第 3 次模型调用完成截断补全');
          }
        }
      }
    }
  }

  // If validation still fails but we have a usable result, return it with warnings instead of throwing
  const hasResult = Boolean(parsed.payload?.result?.promptEn && parsed.payload?.result?.promptCn);
  if (!built.review.isValidH3Format && !hasResult) {
    throw new Error(`唯一结果修复后仍未通过 ${selectedSkill.title} 专属校验：${built.review.issues.join('；')}`);
  }
  if (!built.review.isValidH3Format && hasResult) {
    trace.push(`结果已生成，但存在 ${built.review.issues.length} 个格式提醒：${built.review.issues.join('；')}`);
    emit?.({ type: 'final', message: '唯一最终结果已生成（含格式提醒）' });
    const payload = parsed.payload!;
    const resolvedParams = built.resolvedParams as H3ResolvedParams;
    return {
      matchedSkill: selectedSkill.id,
      confidence: payload.confidence || 'medium',
      reason: payload.reason || '已生成结果，部分格式有待人工确认',
      suggestedDirections: [],
      variants: [built.finalResult],
      review: built.review,
      resolvedParams,
      structuredOutput: toStructuredOutput(built.finalResult, resolvedParams, selectedSkill, runtimeOptions),
      thinkingProcess: trace.join('\n'),
    };
  }

  const payload = parsed.payload!;
  const resolvedParams = canonicalizeResolvedParams(built.resolvedParams, selectedSkill, runtimeOptions);
  trace.push('最终只产出 1 条提示词，并通过 Skill 专属校验');
  emit?.({ type: 'final', message: '唯一最终结果已生成' });
  return {
    matchedSkill: selectedSkill.id,
    confidence: payload.confidence || 'high',
    reason: payload.reason || '按所选 Skill 生成并通过服务器校验',
    suggestedDirections: [],
    variants: [built.finalResult],
    review: built.review,
    resolvedParams,
    structuredOutput: toStructuredOutput(built.finalResult, resolvedParams, selectedSkill, runtimeOptions),
    thinkingProcess: trace.join('\n'),
  };
}

export function validateH3Variants(variants: H3PromptVariant[], duration: string): H3AgentReview {
  const issues: string[] = [];
  if (variants.length === 0) issues.push('未返回任何候选提示词。');
  variants.forEach((variant, index) => {
    const validation = validateH3Prompt(variant.promptEn, duration);
    if (!validation.isValid) issues.push(`候选 ${index + 1}: ${validation.issues.join('; ')}`);
    if (!variant.promptCn.trim()) issues.push(`候选 ${index + 1}: 缺少中文对照。`);
  });
  return { isValidH3Format: issues.length === 0, issues, fixedInRepairTurn: false };
}

export function validateH3AgentResult(result: H3AgentResult): H3AgentReview {
  if (result.matchedSkill !== 'h3-prompt-writing') {
    const issues = [...result.review.issues];
    if (result.variants.length !== 1) issues.push(`单结果工作流应返回 1 条结果，当前为 ${result.variants.length} 条。`);
    if (!result.variants[0]?.promptCn.trim()) issues.push('唯一结果缺少中文对照。');
    return {
      isValidH3Format: result.review.isValidH3Format && issues.length === 0,
      issues,
      fixedInRepairTurn: result.review.fixedInRepairTurn,
    };
  }
  const duration = result.structuredOutput.technicalParams.duration;
  const review = validateH3Variants(result.variants, duration);
  if (result.variants.length !== 1) review.issues.push(`单结果工作流应返回 1 条结果，当前为 ${result.variants.length} 条。`);
  return {
    ...review,
    isValidH3Format: review.issues.length === 0,
    fixedInRepairTurn: result.review.fixedInRepairTurn,
  };
}
