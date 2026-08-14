import fs from 'node:fs';
import path from 'node:path';
import type { AspectRatio, StructuredPromptOutput, VideoModelTarget } from '../types';
import type { H3SkillDefinition } from './h3SkillRuntime';
import type {
  AgentLoopEvent,
  AgentLoopLlmCall,
  AgentMessage,
  AgentToolDef,
} from './h3AgentLoop';

// 自主 Agent 推理：只给模型「读 Skill 资料」的只读工具，模型读完后直接输出文本。
// 与 runH3AgentLoop 的差别：没有 submit/workflow/validate 等卡校验工具，输出不做格式校验，
// 模型某轮没有 tool_calls 时，其文本即为最终结果。多组按 ===第N组=== 拆分，拆多少展示多少。

export interface FreeformVariantDirection {
  label: string;
  hint: string;
}

export interface RunFreeformAgentArgs {
  userPrompt: string;
  skill: H3SkillDefinition;
  skillsRoot: string;
  callLlm: AgentLoopLlmCall;
  variantTotal: number;
  variantDirections: FreeformVariantDirection[];
  options: {
    duration?: string;
    aspectRatio?: string;
    targetModel?: string;
    motionSpeed?: number;
    skillTitle?: string;
  };
  emit?: (event: AgentLoopEvent) => void;
  onCompatibility?: (message: string) => void;
  signal?: AbortSignal;
  maxTurns?: number;
}

export interface FreeformAgentResult {
  variants: StructuredPromptOutput[];
  thinkingProcess: string;
  turns: number;
  readFiles: string[];
}

const FREEFORM_TOOLS: AgentToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'list_skill_files',
      description: '列出当前所选 Skill 目录下的参考文件（.md/.txt/.json）。无需参数。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_skill_file',
      description: '读取当前所选 Skill 目录下的指定文件，学习其输出格式与写作规则。每次只读一个文件。',
      parameters: {
        type: 'object',
        properties: {
          relativePath: { type: 'string', description: '相对于 Skill 目录的文件路径，例如 SKILL.md' },
        },
        required: ['relativePath'],
      },
    },
  },
];

function buildSystemPrompt(
  skill: H3SkillDefinition,
  variantTotal: number,
  variantDirections: FreeformVariantDirection[],
  options: RunFreeformAgentArgs['options'],
): string {
  const duration = options.duration || '6s';
  const aspectRatio = options.aspectRatio || '16:9';
  const variantBlock =
    variantTotal > 1
      ? `\n- 本次需要输出 ${variantTotal} 组差异化提示词，每组以一行 \`===第N组 · 方向标签===\` 开头（紧跟换行写正文），方向参考：\n${variantDirections
          .slice(0, variantTotal)
          .map((d, i) => `  第${i + 1}组 · ${d.label}：${d.hint}`)
          .join('\n')}\n  组与组之间用空行分隔。共享核心创意与主体身份，但用不同镜头/视角/调度。`
      : '';
  return `你是 MiniMax-H3 视频提示词工程师。用户已选定 Skill：${skill.title}（${skill.id}）。

工作方式（自主 Agent）：
1. 先调用 list_skill_files 查看这个 Skill 目录里有哪些参考文件。
2. 调用 read_skill_file 读取关键文件（通常是 SKILL.md 或主规则文件；理解格式即可，不要把所有文件都读一遍）。
3. 理解该 Skill 的输出格式与写作规则后，直接输出最终视频提示词正文，停止调用任何工具。

输出要求：
- 直接输出提示词正文，不要 JSON、不要标题前缀、不要解释、不要候选方案。
- 严格遵循你读到的 Skill 原生输出格式（时间线/段落结构、开头语、语言等都按 Skill 文件来）。
- 视频时长：${duration}；画幅：${aspectRatio}。${variantBlock}

重要：本模式不做任何格式校验拦截，你按 Skill 规则放开写完整内容即可。读文件是为了学格式，学完就输出，不要反复读、不要等待确认。`;
}

function executeFreeformTool(
  name: string,
  args: Record<string, unknown>,
  skill: H3SkillDefinition,
  skillsRoot: string,
): string {
  const skillDir = path.resolve(skillsRoot, skill.folder);
  if (!fs.existsSync(skillDir)) return `错误：Skill 目录不存在（${skill.folder}）。`;

  if (name === 'list_skill_files') {
    const entries = fs.readdirSync(skillDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /\.(md|txt|json)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    return JSON.stringify({ skillId: skill.id, files });
  }

  if (name === 'read_skill_file') {
    const relativePath = String(args.relativePath || '').trim();
    if (!relativePath) return '错误：缺少 relativePath 参数。';
    const resolved = path.resolve(skillDir, relativePath);
    if (!resolved.startsWith(skillDir + path.sep)) return '错误：路径越界，只能读取当前 Skill 目录内的文件。';
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return `错误：文件 ${relativePath} 不存在。`;
    return `=== ${skill.id}/${relativePath} ===\n${fs.readFileSync(resolved, 'utf-8').slice(0, 24000)}`;
  }

  return `错误：未知工具 ${name}。`;
}

function buildVariant(
  text: string,
  index: number,
  direction: FreeformVariantDirection | undefined,
  options: RunFreeformAgentArgs['options'],
): StructuredPromptOutput {
  return {
    title: `Agent 推理 · ${options.duration || '6s'}${direction ? ` · ${direction.label}` : ''}`,
    englishPrompt: text.trim(),
    chineseTranslation: text.trim(),
    subjectDescription: text.slice(0, 200),
    cameraMovement: '由 Agent 自主推理',
    lightingAndAtmosphere: '由 Agent 自主推理',
    styleAndAesthetics: options.skillTitle || skillFallbackTitle(options),
    negativePrompt: '',
    soundCue: '',
    technicalParams: {
      targetModel: (options.targetModel || 'minimax-h3') as VideoModelTarget,
      aspectRatio: (options.aspectRatio || '16:9') as AspectRatio,
      fps: 24,
      duration: options.duration || '6s',
      motionSpeed: options.motionSpeed || 7,
    },
    variantIndex: index > 0 ? index + 1 : undefined,
    variantDirection: direction?.label,
  };
}

function skillFallbackTitle(options: RunFreeformAgentArgs['options']): string {
  return options.skillTitle || 'Agent 推理';
}

export async function runFreeformAgentLoop({
  userPrompt,
  skill,
  skillsRoot,
  callLlm,
  variantTotal,
  variantDirections,
  options,
  emit,
  onCompatibility,
  signal,
  maxTurns = 6,
}: RunFreeformAgentArgs): Promise<FreeformAgentResult> {
  const systemPrompt = buildSystemPrompt(skill, variantTotal, variantDirections, options);
  const messages: AgentMessage[] = [{ role: 'user', content: userPrompt }];
  const trace: string[] = [`已选 Skill：${skill.title}（${skill.id})`];
  const readFiles = new Set<string>();
  const fire = (event: AgentLoopEvent) => emit?.(event);

  let finalText = '';
  let turns = 0;
  let lastContent = '';

  for (let turn = 1; turn <= maxTurns; turn += 1) {
    signal?.throwIfAborted();
    turns = turn;
    fire({ type: 'turn_start', turn, stage: `turn_${turn}`, message: `Agent 自主推理：第 ${turn} 轮` });
    const llmResult = await callLlm({ systemPrompt, messages, tools: FREEFORM_TOOLS, temperature: 0.6, signal });
    signal?.throwIfAborted();
    const content = String(llmResult.content || '').trim();
    if (content) {
      lastContent = content;
      fire({ type: 'delta', turn, text: content });
    }
    const toolCalls = Array.isArray(llmResult.tool_calls) ? llmResult.tool_calls : [];

    // 无工具调用 → 模型已输出最终文本，结束循环
    if (toolCalls.length === 0) {
      finalText = content;
      fire({ type: 'turn_end', turn });
      trace.push(`第 ${turn} 轮：模型输出最终结果（${content.length} 字）`);
      break;
    }

    // 有工具调用 → 执行并回喂
    messages.push({ role: 'assistant', content, tool_calls: toolCalls });
    for (const call of toolCalls) {
      fire({ type: 'tool_call', turn, toolName: call.name, toolArgs: call.args, stage: `tool_${call.name}`, message: `执行 ${call.name}` });
      const result = executeFreeformTool(call.name, call.args, skill, skillsRoot);
      if (call.name === 'read_skill_file') readFiles.add(String(call.args.relativePath || ''));
      trace.push(`第 ${turn} 轮：${call.name}${call.args.relativePath ? `(${call.args.relativePath})` : ''}`);
      fire({ type: 'tool_result', turn, toolName: call.name, toolResult: result.slice(0, 2000) });
      messages.push({ role: 'tool', tool_call_id: call.id, name: call.name, content: result });
    }
    fire({ type: 'turn_end', turn });
  }

  // 达到 maxTurns 仍在调工具：强制最后一轮（不带工具）拿文本
  if (!finalText) {
    fire({ type: 'turn_start', turn: turns + 1, stage: 'finalize', message: '汇总资料，输出最终提示词...' });
    signal?.throwIfAborted();
    const finalize = await callLlm({
      systemPrompt,
      messages: [
        ...messages,
        { role: 'user', content: '你已经读取了足够的 Skill 资料。现在直接输出最终视频提示词正文，不要再调用任何工具。' },
      ],
      temperature: 0.6,
      signal,
    });
    finalText = String(finalize.content || '').trim() || lastContent;
    trace.push(`兜底轮：强制输出最终结果（${finalText.length} 字）`);
  }

  if (!finalText.trim()) throw new Error('Agent 推理未返回有效内容。');

  // 拆分多组（兼容 ===第N组=== / ## 第N组 / 【第N组】/ 第N组： 等常见格式）
  const isMulti = variantTotal > 1;
  const separatorRe = /^[\s#*=【】（）()*~_-]*第\s*\d+\s*组[^\n]*$/m;
  let segments: string[];
  if (isMulti) {
    segments = finalText.split(separatorRe).map((s) => s.trim()).filter(Boolean);
    if (segments.length < variantTotal) {
      onCompatibility?.(`模型仅返回 ${segments.length} 组（期望 ${variantTotal}），已按实际返回展示。`);
    }
  } else {
    segments = [finalText.trim()];
  }
  const variants = segments.slice(0, Math.max(variantTotal, 1)).map((seg, i) =>
    buildVariant(seg, i, variantDirections[i], options),
  );

  trace.push(`读取文件：${Array.from(readFiles).join('、') || '未读取'}`);
  trace.push(`最终产出 ${variants.length} 组提示词（宽松模式，未做格式校验）`);
  fire({ type: 'final', message: `Agent 推理完成，已生成 ${variants.length} 组` });

  return { variants, thinkingProcess: trace.join('\n'), turns, readFiles: Array.from(readFiles) };
}
