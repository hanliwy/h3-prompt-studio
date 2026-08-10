import fs from 'fs';
import path from 'path';
import type {
	AspectRatio,
	H3AgentResult,
	H3AgentReview,
	H3InputMode,
	H3ManualAuxiliaryParams,
	H3PromptVariant,
	H3SceneMode,
	StructuredPromptOutput,
} from '../types';
import type { H3SkillDefinition } from './h3SkillRuntime';
import {
	getH3SkillWorkflowConfig,
	validateBaseH3Prompt,
	validateSkillOutput,
	validateWorkflowPlan,
	type H3SkillWorkflowConfig,
	type H3WorkflowPlan,
} from './h3SkillWorkflow';

export interface AgentToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
}

export interface AgentMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	tool_calls?: AgentToolCall[];
	tool_call_id?: string;
	name?: string;
}

export interface AgentToolDef {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
}

export interface AgentLlmTurnResult {
	content: string;
	tool_calls: AgentToolCall[];
}

export type AgentLoopLlmCall = (args: {
	systemPrompt: string;
	messages: AgentMessage[];
	tools?: AgentToolDef[];
	temperature?: number;
	signal?: AbortSignal;
}) => Promise<AgentLlmTurnResult>;

export interface AgentLoopEvent {
	type: 'turn_start' | 'delta' | 'tool_call' | 'tool_result' | 'turn_end' | 'final' | 'error';
	turn?: number;
	stage?: string;
	message?: string;
	text?: string;
	toolName?: string;
	toolArgs?: Record<string, unknown>;
	toolResult?: string;
	issues?: string[];
	[key: string]: unknown;
}

export interface H3AgentLoopRunOptions {
	manualAuxiliaryParams?: H3ManualAuxiliaryParams;
	gavenStyleCodes?: string;
	targetModel?: string;
	aspectRatio?: string;
	duration?: string;
	motionSpeed?: number;
	cameraMotionLabel?: string;
	lensLabel?: string;
	lightingLabel?: string;
	skillId?: string;
	inputMode?: H3InputMode;
	sceneMode?: H3SceneMode;
	variantCount?: number;
}

export interface AgentLoopOptions {
	userPrompt: string;
	skills: H3SkillDefinition[];
	skillsRoot: string;
	callLlm: AgentLoopLlmCall;
	options?: H3AgentLoopRunOptions;
	maxTurns?: number;
	emit?: (event: AgentLoopEvent) => void;
	signal?: AbortSignal;
}

interface FinalPromptPayload {
	matchedSkill: string;
	confidence: 'low' | 'medium' | 'high';
	reason: string;
	result: Partial<H3PromptVariant>;
}

interface ToolContext {
	selectedSkill: H3SkillDefinition;
	config: H3SkillWorkflowConfig;
	skillsRoot: string;
	duration: string;
	inputMode: H3InputMode;
	sceneMode?: H3SceneMode;
	readFiles: Set<string>;
	plan: H3WorkflowPlan | null;
	validatedPrompt: string | null;
}

const AGENT_TOOLS: AgentToolDef[] = [
	{
		type: 'function',
		function: {
			name: 'read_skill_file',
			description: '读取前端已选 Skill 的必需运行文件。必须读取系统列出的全部文件，不能读取其他 Skill。',
			parameters: {
				type: 'object',
				properties: { skillId: { type: 'string' }, relativePath: { type: 'string' } },
				required: ['skillId', 'relativePath'],
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'submit_workflow_plan',
			description: '提交唯一内部制作计划。timelineSegments 必须遵守所选 Skill 对当前时长和模式的节拍/镜头规则。',
			parameters: {
				type: 'object',
				properties: {
					selectedSkill: { type: 'string' },
					inputMode: { type: 'string', enum: ['text', 'image'] },
					sceneMode: { type: 'string', enum: ['drama', 'action', 'storyboard-grid'] },
					outputFormat: { type: 'string', enum: ['h3-base', 'native-skill', 'multimode'] },
					duration: { type: 'string' },
					timelineSegments: { type: 'array', items: { type: 'string' } },
					continuityStrategy: { type: 'string' },
					requiredChecks: { type: 'array', items: { type: 'string' } },
				},
				required: ['selectedSkill', 'inputMode', 'outputFormat', 'duration', 'timelineSegments', 'continuityStrategy', 'requiredChecks'],
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'validate_skill_output',
			description: '使用当前 Skill 的专属规则校验唯一最终提示词。失败后修正同一结果并重新校验。',
			parameters: {
				type: 'object',
				properties: { promptText: { type: 'string' } },
				required: ['promptText'],
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'submit_final_prompt',
			description: '提交唯一最终结果。result.promptEn 必须与最近一次校验通过的 promptText 完全相同。',
			parameters: {
				type: 'object',
				properties: {
					matchedSkill: { type: 'string' },
					confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
					reason: { type: 'string' },
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
				required: ['matchedSkill', 'confidence', 'reason', 'result'],
			},
		},
	},
];

export function validateH3Prompt(promptText: string, duration: string | undefined) {
	return validateBaseH3Prompt(promptText, duration || '6s');
}

function parsePlan(args: Record<string, unknown>): H3WorkflowPlan {
	return {
		selectedSkill: String(args.selectedSkill || ''),
		inputMode: String(args.inputMode || 'text') as H3InputMode,
		sceneMode: args.sceneMode ? (String(args.sceneMode) as H3SceneMode) : undefined,
		outputFormat: String(args.outputFormat || 'native-skill') as H3WorkflowPlan['outputFormat'],
		duration: String(args.duration || '6s'),
		timelineSegments: Array.isArray(args.timelineSegments) ? args.timelineSegments.map(String) : [],
		continuityStrategy: String(args.continuityStrategy || ''),
		requiredChecks: Array.isArray(args.requiredChecks) ? args.requiredChecks.map(String) : [],
	};
}

function executeTool(name: string, args: Record<string, unknown>, ctx: ToolContext) {
	if (name === 'read_skill_file') {
		const skillId = String(args.skillId || '');
		const relativePath = String(args.relativePath || '');
		if (skillId !== ctx.selectedSkill.id) {
			return { result: `错误：前端已选择 ${ctx.selectedSkill.id}，不能读取其他 Skill。`, terminate: false };
		}
		if (!ctx.config.requiredRuntimeFiles.includes(relativePath)) {
			return { result: `错误：必读文件为 ${ctx.config.requiredRuntimeFiles.join(', ')}`, terminate: false };
		}
		const skillDir = path.resolve(ctx.skillsRoot, ctx.selectedSkill.folder);
		const resolved = path.resolve(skillDir, relativePath);
		if (!resolved.startsWith(skillDir + path.sep) || !fs.existsSync(resolved)) {
			return { result: `错误：无法读取 ${relativePath}。`, terminate: false };
		}
		ctx.readFiles.add(relativePath);
		return {
			result: `=== ${ctx.selectedSkill.id}/${relativePath} ===\n${fs.readFileSync(resolved, 'utf-8').slice(0, 24000)}`,
			terminate: false,
		};
	}

	if (name === 'submit_workflow_plan') {
		const unread = ctx.config.requiredRuntimeFiles.filter((file) => !ctx.readFiles.has(file));
		if (unread.length > 0) return { result: `错误：尚未读取 ${unread.join(', ')}`, terminate: false };
		const plan = parsePlan(args);
		if (plan.inputMode !== ctx.inputMode) return { result: `错误：inputMode 必须是 ${ctx.inputMode}。`, terminate: false };
		if (ctx.config.requiresSceneMode && plan.sceneMode !== ctx.sceneMode) {
			return { result: `错误：sceneMode 必须是 ${ctx.sceneMode}。`, terminate: false };
		}
		const validation = validateWorkflowPlan(plan, ctx.selectedSkill.id, ctx.config);
		if (!validation.isValid) return { result: JSON.stringify(validation, null, 2), terminate: false };
		ctx.plan = plan;
		return { result: JSON.stringify({ isValid: true, message: '唯一工作流计划已锁定。' }), terminate: false };
	}

	if (name === 'validate_skill_output') {
		if (!ctx.plan) return { result: JSON.stringify({ isValid: false, issues: ['必须先提交有效工作流计划。'] }), terminate: false };
		const promptText = String(args.promptText || '');
		const validation = validateSkillOutput({
			skillId: ctx.selectedSkill.id,
			promptText,
			duration: ctx.duration,
			inputMode: ctx.inputMode,
			sceneMode: ctx.sceneMode,
		});
		ctx.validatedPrompt = validation.isValid ? promptText : null;
		return { result: JSON.stringify(validation, null, 2), terminate: false };
	}

	if (name === 'submit_final_prompt') {
		const payload = args as unknown as FinalPromptPayload;
		const promptText = String(payload.result?.promptEn || '');
		if (!ctx.plan) return { result: '错误：尚未提交工作流计划。', terminate: false };
		if (!ctx.validatedPrompt || promptText !== ctx.validatedPrompt) {
			return { result: '错误：最终 promptEn 必须先通过校验，且提交内容必须与校验文本完全相同。', terminate: false };
		}
		if (payload.matchedSkill !== ctx.selectedSkill.id) {
			return { result: `错误：matchedSkill 必须是 ${ctx.selectedSkill.id}。`, terminate: false };
		}
		return { result: '唯一最终结果已接收。', terminate: true, finalPayload: payload };
	}

	return { result: `错误：未知工具 ${name}。`, terminate: false };
}

function buildSystemPrompt(skill: H3SkillDefinition, config: H3SkillWorkflowConfig, options: H3AgentLoopRunOptions) {
	const duration = config.fixedDuration || options.duration || skill.recommendedParams.duration;
	const aspectRatio = config.fixedAspectRatio || options.aspectRatio || '16:9';
	return `你是运行在服务器上的 MiniMax-H3 Skill 执行 Agent。前端已经选择唯一 Skill，不做路由，不生成候选，不等待用户批准。

已锁定：Skill=${skill.id}；inputMode=${options.inputMode || 'text'}；sceneMode=${options.sceneMode || '不适用'}；duration=${duration}；aspectRatio=${aspectRatio}；targetModel=${options.targetModel || 'minimax-h3'}；camera=${options.cameraMotionLabel || '按 Skill 规划'}；lens=${options.lensLabel || '按 Skill 规划'}；lighting=${options.lightingLabel || '按 Skill 规划'}。

当前版本只实现非图片模式。不得虚构已观察、已生成或已批准任何图片。

强制状态机：
1. 第一轮一次性调用 read_skill_file 读取全部必需文件：${config.requiredRuntimeFiles.join(', ')}。
2. 按文件中的真实流程调用 submit_workflow_plan，规划唯一时间线。镜头/节拍数量必须由 Skill、时长、模式和内容决定，禁止默认两个镜头。
3. 严格按计划生成一份最终 Prompt，调用 validate_skill_output。
4. 校验失败时修正同一 Prompt 并重新校验，禁止生成第二套方案。
5. 校验通过后调用 submit_final_prompt，result 只包含一个结果。

执行所选 Skill 的原生输出格式，不把所有 Skill 强制转成英文三段式。只有 h3-prompt-writing 基础模式使用 integrated_multimodal_description、overall_soundscape、non_diegetic_music。中文原生 Skill 可以把完整中文成品同时放入 promptEn 与 promptCn，以兼容现有 API 字段。涉及确认图、故事板或审批 Gate 时，在内部完成文本规划与自检，但不声称已经生成媒体或取得批准。promptEn 是前端一键复制的唯一完整成品。

现在先读取全部必需文件。`;
}

function normalizeResult(raw: Partial<H3PromptVariant>, skill: H3SkillDefinition, userPrompt: string): H3PromptVariant {
	const promptText = String(raw.promptEn || '').trim();
	return {
		id: String(raw.id || `${skill.id}_result`),
		titleCn: String(raw.titleCn || skill.title),
		titleEn: String(raw.titleEn || skill.titleEn),
		promptEn: promptText || userPrompt,
		promptCn: String(raw.promptCn || promptText || userPrompt),
		negativePromptEn: String(raw.negativePromptEn || ''),
		negativePromptCn: String(raw.negativePromptCn || ''),
	};
}

function toStructuredOutput(result: H3PromptVariant, skill: H3SkillDefinition, options: H3AgentLoopRunOptions): StructuredPromptOutput {
	const config = getH3SkillWorkflowConfig(skill.id);
	return {
		title: result.titleCn,
		englishPrompt: result.promptEn,
		chineseTranslation: result.promptCn,
		subjectDescription: result.promptCn,
		cameraMovement: options.cameraMotionLabel || '由所选 Skill 的工作流计划决定',
		lightingAndAtmosphere: options.lightingLabel || '由所选 Skill 的视觉规则决定',
		styleAndAesthetics: result.titleEn,
		negativePrompt: [result.negativePromptEn, result.negativePromptCn].filter(Boolean).join('\n'),
		soundCue: '声音设计已包含在唯一最终提示词中。',
		technicalParams: {
			targetModel: (options.targetModel || 'minimax-h3') as StructuredPromptOutput['technicalParams']['targetModel'],
			aspectRatio: (config.fixedAspectRatio || options.aspectRatio || '16:9') as AspectRatio,
			fps: 24,
			duration: config.fixedDuration || options.duration || skill.recommendedParams.duration,
			motionSpeed: options.motionSpeed || 7,
		},
	};
}

function reviewResult(result: H3PromptVariant, skill: H3SkillDefinition, options: H3AgentLoopRunOptions): H3AgentReview {
	const config = getH3SkillWorkflowConfig(skill.id);
	const validation = validateSkillOutput({
		skillId: skill.id,
		promptText: result.promptEn,
		duration: config.fixedDuration || options.duration || skill.recommendedParams.duration,
		inputMode: options.inputMode || 'text',
		sceneMode: options.sceneMode,
	});
	return { isValidH3Format: validation.isValid, issues: validation.issues, fixedInRepairTurn: false };
}

export async function runH3AgentLoop({
	userPrompt,
	skills,
	skillsRoot,
	callLlm,
	options = {},
	maxTurns = 8,
	emit,
	signal,
}: AgentLoopOptions): Promise<H3AgentResult> {
	if (!options.skillId) throw new Error('前端必须先选择一个 MiniMax-H3 Skill。');
	const selectedSkill = skills.find((skill) => skill.id === options.skillId || skill.folder === options.skillId || skill.aliases.includes(options.skillId!));
	if (!selectedSkill) throw new Error(`找不到所选 Skill：${options.skillId}`);

	const config = getH3SkillWorkflowConfig(selectedSkill.id);
	const inputMode = options.inputMode || 'text';
	if (inputMode !== 'text') throw new Error('图片模式将在后续版本开放，当前请选择非图片模式。');
	if (config.requiresSceneMode && !options.sceneMode) throw new Error('该 Skill 必须先选择文戏、武戏或九宫格模式（sceneMode）。');

	const duration = config.fixedDuration || options.duration || selectedSkill.recommendedParams.duration;
	const context: ToolContext = {
		selectedSkill,
		config,
		skillsRoot,
		duration,
		inputMode,
		sceneMode: options.sceneMode,
		readFiles: new Set(),
		plan: null,
		validatedPrompt: null,
	};
	const systemPrompt = buildSystemPrompt(selectedSkill, config, { ...options, inputMode, duration });
	const messages: AgentMessage[] = [{ role: 'user', content: userPrompt }];
	const trace: string[] = [];
	let submitted: FinalPromptPayload | null = null;
	let sawValidationFailure = false;
	const fire = (event: AgentLoopEvent) => emit?.(event);

	for (let turn = 1; turn <= maxTurns; turn++) {
		signal?.throwIfAborted();
		fire({ type: 'turn_start', turn, stage: `turn_${turn}`, message: `执行 ${selectedSkill.title}：第 ${turn} 轮` });
		const llmResult = await callLlm({ systemPrompt, messages, tools: AGENT_TOOLS, temperature: 0.55, signal });
		signal?.throwIfAborted();
		const content = String(llmResult.content || '').trim();
		const toolCalls = Array.isArray(llmResult.tool_calls) ? llmResult.tool_calls : [];
		if (content) fire({ type: 'delta', turn, text: content });

		if (toolCalls.length === 0) {
			messages.push({ role: 'assistant', content });
			messages.push({ role: 'user', content: '必须继续使用工具推进状态机，不要直接输出文本。只生成一个结果。' });
			trace.push(`第 ${turn} 轮：未调用工具`);
			fire({ type: 'turn_end', turn });
			continue;
		}

		messages.push({ role: 'assistant', content, tool_calls: toolCalls });
		let terminate = false;
		for (const call of toolCalls) {
			fire({ type: 'tool_call', turn, toolName: call.name, toolArgs: call.args, stage: `tool_${call.name}`, message: `执行 ${call.name}` });
			const outcome = executeTool(call.name, call.args, context);
			trace.push(`第 ${turn} 轮：${call.name}`);
			fire({ type: 'tool_result', turn, toolName: call.name, toolResult: outcome.result.slice(0, 2000) });

			if (call.name === 'validate_skill_output') {
				try {
					const validation = JSON.parse(outcome.result) as { isValid: boolean; issues: string[] };
					if (!validation.isValid) sawValidationFailure = true;
					fire({ type: 'tool_result', turn, toolName: call.name, issues: validation.issues, message: validation.isValid ? 'Skill 专属校验通过' : `校验发现 ${validation.issues.length} 个问题` });
				} catch {
					sawValidationFailure = true;
				}
			}

			messages.push({ role: 'tool', tool_call_id: call.id, name: call.name, content: outcome.result });
			if (outcome.finalPayload) submitted = outcome.finalPayload;
			if (outcome.terminate) terminate = true;
		}
		fire({ type: 'turn_end', turn });
		if (terminate && submitted) break;
	}

	if (!submitted) throw new Error(`Agent 未在 ${maxTurns} 轮内完成有效计划、校验和提交，请重试。`);

	const finalResult = normalizeResult(submitted.result, selectedSkill, userPrompt);
	const review = reviewResult(finalResult, selectedSkill, { ...options, inputMode, duration });
	review.fixedInRepairTurn = sawValidationFailure && review.isValidH3Format;
	if (!review.isValidH3Format) throw new Error(`最终结果未通过 ${selectedSkill.title} 专属校验：${review.issues.join('；')}`);

	trace.push(`读取文件：${Array.from(context.readFiles).join('、')}`);
	trace.push(`锁定计划：${context.plan?.timelineSegments.length || 0} 个时间段/节拍`);
	trace.push('最终只产出 1 条提示词，并通过 Skill 专属校验');
	fire({ type: 'final', message: '唯一最终结果已生成' });

	return {
		matchedSkill: selectedSkill.id,
		confidence: submitted.confidence,
		reason: submitted.reason,
		suggestedDirections: [],
		variants: [finalResult],
		review,
		structuredOutput: toStructuredOutput(finalResult, selectedSkill, { ...options, inputMode, duration }),
		thinkingProcess: trace.join('\n'),
	};
}