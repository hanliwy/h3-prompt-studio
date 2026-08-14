import type { H3InputMode, H3SceneMode } from '../types';

export type H3SkillOutputFormat = 'h3-base' | 'native-skill' | 'multimode';
export type H3SkillValidatorKind =
  | 'h3-base'
  | 'handdrawn-live'
  | 'co-op-game-intro'
  | 'product-ad'
  | 'mv-subtitle'
  | 'paper-collage'
  | 'papercraft'
  | '3d-animation'
  | 'brand-promo'
  | 'multimode'
  | 'six-section';

export interface H3SkillWorkflowConfig {
  requiredRuntimeFiles: string[];
  outputFormat: H3SkillOutputFormat;
  validator: H3SkillValidatorKind;
  requiresSceneMode: boolean;
  supportedInputModes: H3InputMode[];
  fixedDuration?: string;
  fixedAspectRatio?: string;
}

export interface H3WorkflowPlan {
  selectedSkill: string;
  inputMode: H3InputMode;
  sceneMode?: H3SceneMode;
  outputFormat: H3SkillOutputFormat;
  duration: string;
  timelineSegments: string[];
  continuityStrategy: string;
  requiredChecks: string[];
}

export interface H3SkillValidationResult {
  isValid: boolean;
  issues: string[];
}

const DEFAULT_NATIVE_CONFIG: H3SkillWorkflowConfig = {
  requiredRuntimeFiles: ['SKILL.cn.md'],
  outputFormat: 'native-skill',
  validator: 'h3-base',
  requiresSceneMode: false,
  supportedInputModes: ['text', 'image'],
};

export const H3_SKILL_WORKFLOW_CONFIG: Record<string, H3SkillWorkflowConfig> = {
  'h3-prompt-writing': {
    requiredRuntimeFiles: ['SKILL.md', 'references/base-en.txt'],
    outputFormat: 'h3-base',
    validator: 'h3-base',
    requiresSceneMode: false,
    supportedInputModes: ['text', 'image'],
  },
  'h3-general-six-section': {
    requiredRuntimeFiles: ['SKILL.cn.md'],
    outputFormat: 'native-skill',
    validator: 'six-section',
    requiresSceneMode: false,
    supportedInputModes: ['text', 'image'],
  },
  'handdrawn-live-video-generator': {
    requiredRuntimeFiles: ['SKILL.cn.md'],
    outputFormat: 'native-skill',
    validator: 'handdrawn-live',
    requiresSceneMode: false,
    supportedInputModes: ['text', 'image'],
  },
  'co-op-game-intro-generator': {
    requiredRuntimeFiles: [
      'SKILL.cn.md',
      'references/h3-confirmation-image-template.md',
      'references/h3-video-prompt-template.md',
    ],
    outputFormat: 'native-skill',
    validator: 'co-op-game-intro',
    requiresSceneMode: false,
    supportedInputModes: ['text', 'image'],
  },
  'minimalist-product-ad-generator': {
    ...DEFAULT_NATIVE_CONFIG,
    validator: 'product-ad',
  },
  'brand-promo-video-generator': {
    ...DEFAULT_NATIVE_CONFIG,
    validator: 'brand-promo',
  },
  'music-video-subtitle-generator': {
    ...DEFAULT_NATIVE_CONFIG,
    validator: 'mv-subtitle',
  },
  'paper-collage-explainer-generator': {
    ...DEFAULT_NATIVE_CONFIG,
    validator: 'paper-collage',
  },
  'papercraft-stop-motion-explainer': {
    ...DEFAULT_NATIVE_CONFIG,
    validator: 'papercraft',
  },
  '3d-animation-short-generator': {
    requiredRuntimeFiles: [
      'SKILL.cn.md',
      'references/shot-table-spec.md',
      'references/storyboard-guidelines.md',
      'references/model-selection.md',
      'references/fallback-policy.md',
      'references/qc-checklist.md',
    ],
    outputFormat: 'native-skill',
    validator: '3d-animation',
    requiresSceneMode: false,
    supportedInputModes: ['text', 'image'],
  },
  'h3-multimode-5s': {
    requiredRuntimeFiles: ['SKILL.cn.md'],
    outputFormat: 'multimode',
    validator: 'multimode',
    requiresSceneMode: true,
    supportedInputModes: ['text', 'image'],
  },
  'h3-multimode-10s': {
    requiredRuntimeFiles: ['SKILL.cn.md'],
    outputFormat: 'multimode',
    validator: 'multimode',
    requiresSceneMode: true,
    supportedInputModes: ['text', 'image'],
  },
  'h3-multimode-15s': {
    requiredRuntimeFiles: ['SKILL.cn.md'],
    outputFormat: 'multimode',
    validator: 'multimode',
    requiresSceneMode: true,
    supportedInputModes: ['text', 'image'],
  },
  'gaven-cinematic-director': {
    requiredRuntimeFiles: ['SKILL.md', 'references/director-styles.md', 'references/photo-styles.md', 'references/capture-films.md', 'references/print-films.md'],
    outputFormat: 'multimode',
    validator: 'multimode',
    requiresSceneMode: false,
    supportedInputModes: ['text'],
  },
};

export function getH3SkillWorkflowConfig(skillId: string): H3SkillWorkflowConfig {
  return H3_SKILL_WORKFLOW_CONFIG[skillId] || DEFAULT_NATIVE_CONFIG;
}

function parseDurationSeconds(duration: string | undefined): number {
  const match = String(duration || '6s').match(/(\d+(?:\.\d+)?)/);
  return match ? Math.max(1, parseFloat(match[1])) : 6;
}

function expectedTimelineRange(
  skillId: string,
  duration: string,
  sceneMode?: H3SceneMode,
): [number, number] | null {
  const seconds = parseDurationSeconds(duration);

  if (skillId === 'handdrawn-live-video-generator') return [5, 5];
  if (skillId === 'co-op-game-intro-generator') return [6, 6];
  if (skillId === 'paper-collage-explainer-generator') return [3, 6];
  if (skillId === 'papercraft-stop-motion-explainer' && seconds === 15) return [4, 6];
  if (skillId === 'music-video-subtitle-generator') {
    if (seconds <= 10) return [1, 2];
    if (seconds <= 15) return [2, 4];
  }
  if (skillId === 'minimalist-product-ad-generator') {
    if (seconds <= 5) return [3, 4];
    if (seconds <= 10) return [5, 7];
    if (seconds <= 15) return [6, 9];
  }
  if (skillId === 'brand-promo-video-generator' && seconds <= 15) return [5, 8];
  if (skillId === '3d-animation-short-generator') return [2, 12];
  if (skillId === 'h3-general-six-section') {
    if (seconds <= 6) return [2, 3];
    if (seconds <= 10) return [3, 4];
    return [3, 5];
  }

  if (skillId.startsWith('h3-multimode-')) {
    if (sceneMode === 'storyboard-grid') return [9, 9];
    if (sceneMode === 'drama') {
      if (seconds <= 5) return [2, 4];
      if (seconds <= 10) return [4, 6];
      return [5, 8];
    }
    if (sceneMode === 'action') {
      if (seconds <= 5) return [3, 5];
      if (seconds <= 10) return [5, 8];
      return [6, 10];
    }
  }

  return null;
}

export function validateWorkflowPlan(
  plan: H3WorkflowPlan,
  skillId: string,
  config: H3SkillWorkflowConfig,
): H3SkillValidationResult {
  const issues: string[] = [];
  if (plan.selectedSkill !== skillId) issues.push(`工作流计划的 selectedSkill 必须是 ${skillId}。`);
  if (plan.inputMode !== 'text') issues.push('当前版本尚未实现图片输入，只允许 inputMode=text。');
  if (plan.outputFormat !== config.outputFormat) {
    issues.push(`outputFormat 必须是 ${config.outputFormat}。`);
  }
  if (config.requiresSceneMode && !plan.sceneMode) {
    issues.push('该 Skill 必须选择 sceneMode：drama、action 或 storyboard-grid。');
  }
  if (!Array.isArray(plan.timelineSegments) || plan.timelineSegments.length === 0) {
    issues.push('工作流计划必须包含 timelineSegments。');
  }
  if (!plan.continuityStrategy?.trim()) issues.push('工作流计划必须说明 continuityStrategy。');
  if (!Array.isArray(plan.requiredChecks) || plan.requiredChecks.length === 0) {
    issues.push('工作流计划必须包含 requiredChecks。');
  }

  const range = expectedTimelineRange(skillId, plan.duration, plan.sceneMode);
  if (range && (plan.timelineSegments.length < range[0] || plan.timelineSegments.length > range[1])) {
    issues.push(
      `${skillId} 在 ${plan.duration}${plan.sceneMode ? `/${plan.sceneMode}` : ''} 下应规划 ${range[0]}-${range[1]} 个时间段或节拍，当前为 ${plan.timelineSegments.length} 个。`,
    );
  }

  return { isValid: issues.length === 0, issues };
}

const IMAGE_KEYWORD_RE =
  /\b(8k\s*render|4k\s*render|ultra[- ]?detailed|photorealistic\s+render|hyper[- ]?realistic\s+render|masterpiece\s+render)\b/i;
const SHOT_RE = /\[Shot\s+(\d+)\]/gi;
const SHOT_TIMECODE_RE = /\[Shot\s+(\d+)\]\s+At\s+(\d{2}):(\d{2})\.(\d{3})/gi;

export function validateBaseH3Prompt(promptText: string, duration: string): H3SkillValidationResult {
  const issues: string[] = [];
  const lower = promptText.toLowerCase();
  const sections = [
    'integrated_multimodal_description',
    'overall_soundscape',
    'non_diegetic_music',
  ];
  let previousIndex = -1;
  for (const section of sections) {
    const index = lower.indexOf(section);
    if (index < 0) issues.push(`缺少必需字段 ${section}。`);
    if (index >= 0 && index < previousIndex) issues.push('H3 三个字段顺序错误。');
    if (index >= 0) previousIndex = index;
  }

  const shots = [...promptText.matchAll(SHOT_RE)].map((match) => Number(match[1]));
  if (shots.length === 0 || shots[0] !== 1) issues.push('必须从 [Shot 1] 开始。');
  shots.forEach((shot, index) => {
    if (shot !== index + 1) issues.push(`镜头编号必须连续，缺少或错位的镜头编号出现在 ${shot}。`);
  });

  const durationSeconds = parseDurationSeconds(duration);
  const timedShots = [...promptText.matchAll(SHOT_TIMECODE_RE)].map((match) => ({
    shot: Number(match[1]),
    seconds: Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000,
  }));
  let previousTime = 0;
  for (const timed of timedShots) {
    if (timed.shot < 2) issues.push('[Shot 1] 不应包含切镜时间码。');
    if (timed.seconds <= previousTime) issues.push('后续镜头切镜时间必须严格递增。');
    if (timed.seconds >= durationSeconds) issues.push('切镜时间必须早于视频结束时间。');
    previousTime = timed.seconds;
  }
  if (shots.length > 1 && timedShots.length !== shots.length - 1) {
    issues.push('[Shot 2] 及之后的每个镜头都必须带 At MM:SS.mmm 切镜时间。');
  }

  const imageKeyword = promptText.match(IMAGE_KEYWORD_RE);
  if (imageKeyword) issues.push(`检测到图像式渲染关键词 ${imageKeyword[0]}。`);

  return { isValid: issues.length === 0, issues };
}

function requireFragments(promptText: string, fragments: string[], issues: string[]) {
  for (const fragment of fragments) {
    if (!promptText.includes(fragment)) issues.push(`缺少必需内容：${fragment}`);
  }
}

function validateHanddrawn(promptText: string, duration: string): H3SkillValidationResult {
  const issues: string[] = [];
  const seconds = parseDurationSeconds(duration);
  requireFragments(
    promptText,
    [`${seconds}秒，16:9横版视频`, `0-`, `-${seconds}秒`, '下一步建议：'],
    issues,
  );
  if (!/接触|缠住|掌心|手指/.test(promptText)) issues.push('0-3 秒必须描述实拍手或物体与手绘实体的明确接触。');
  if (!/慢半拍/.test(promptText)) issues.push('必须明确相机慢半拍追随。');
  if (!/蜡笔|粉笔|彩色铅笔|粉彩|粗糙笔刷/.test(promptText)) issues.push('必须描述粗糙手绘材质。');
  return { isValid: issues.length === 0, issues };
}

function validateMultimode(
  promptText: string,
  duration: string,
  sceneMode?: H3SceneMode,
  inputMode: H3InputMode = 'text',
): H3SkillValidationResult {
  const issues: string[] = [];
  const seconds = parseDurationSeconds(duration);
  // Normalize em-dash and en-dash to hyphen for timeline checks
  const normalized = promptText.replace(/[\u2014\u2013\u2012\u2015]/g, '-');
  if (!normalized.trim().startsWith(`生成一段${seconds}秒`)) {
    issues.push(`最终提示词必须以"生成一段${seconds}秒"开头。`);
  }
  requireFragments(normalized, ['剪辑与动作：', '视觉风格：', '声音设计：'], issues);
  if (!normalized.includes('0-') || !normalized.includes(`-${seconds}秒`)) {
    issues.push(`时间线必须无缺口覆盖 0-${seconds} 秒。`);
  }
  if (sceneMode === 'action') {
    const actionSignals = promptText.match(/攻击|闪避|格挡|受力|反制|命中|卸力|追击/g) || [];
    if (actionSignals.length < 3) issues.push('武戏模式必须明确连续攻防、接触受力和结果动作。');
  }
  if (sceneMode === 'storyboard-grid') {
    requireFragments(normalized, ['九宫格状态映射：'], issues);
    if (inputMode === 'text' && /已经生成|已生成九宫格图片/.test(normalized)) {
      issues.push('非图片模式不得声称已经生成九宫格图片。');
    }
  }
  return { isValid: issues.length === 0, issues };
}

function validateNativePrompt(
  promptText: string,
  skillId: string,
  duration: string,
): H3SkillValidationResult {
  const issues: string[] = [];
  if (promptText.trim().length < 180) issues.push('最终提示词过短，未体现 Skill 的时间线和制作要求。');
  const seconds = parseDurationSeconds(duration);
  const durationPattern = new RegExp(`(${seconds}\\s*秒|${seconds}\\s*s\\b|${seconds}\\s*second|${seconds}\\s*sec|${seconds}-second)`, 'i');
  if (!durationPattern.test(promptText)) {
    issues.push(`最终提示词应明确目标时长 ${duration}。`);
  }
  if (skillId === 'co-op-game-intro-generator') {
    requireFragments(promptText, ['0-', `-${seconds}秒`], issues);
  }
  if (skillId === 'music-video-subtitle-generator') {
    requireFragments(promptText, ['Shot 1', 'Typography'], issues);
  }
  if (skillId === '3d-animation-short-generator' && !/Shot|镜头/.test(promptText)) {
    issues.push('3D 动画 Skill 的最终结果必须包含按镜头组织的可执行视频提示词。');
  }
  return { isValid: issues.length === 0, issues };
}

function validateSixSection(promptText: string, duration: string): H3SkillValidationResult {
  const issues: string[] = [];
  const seconds = parseDurationSeconds(duration);
  const normalized = promptText.replace(/[\u2014\u2013\u2012\u2015]/g, '-');
  if (!normalized.trim().startsWith(`生成一段`)) {
    issues.push('最终提示词必须以"生成一段"开头。');
  }
  if (!new RegExp(`${seconds}秒`).test(normalized)) {
    issues.push(`最终提示词应明确目标时长 ${seconds} 秒。`);
  }
  requireFragments(
    normalized,
    ['主体定义：', '任务概述：', '保留分析：', '画面描述：', '环境声：', '配乐：'],
    issues,
  );
  if (!normalized.includes('0-') || !normalized.includes(`-${seconds}秒`)) {
    issues.push(`画面描述段的时间线必须无缺口覆盖 0-${seconds} 秒。`);
  }
  return { isValid: issues.length === 0, issues };
}

export function validateSkillOutput(args: {
  skillId: string;
  promptText: string;
  duration: string;
  inputMode?: H3InputMode;
  sceneMode?: H3SceneMode;
}): H3SkillValidationResult {
  const config = getH3SkillWorkflowConfig(args.skillId);
  if (config.validator === 'h3-base') return validateBaseH3Prompt(args.promptText, args.duration);
  if (config.validator === 'handdrawn-live') return validateHanddrawn(args.promptText, args.duration);
  if (config.validator === 'six-section') {
    return validateSixSection(args.promptText, config.fixedDuration || args.duration);
  }
  if (config.validator === 'multimode') {
    return validateMultimode(
      args.promptText,
      config.fixedDuration || args.duration,
      args.sceneMode,
      args.inputMode || 'text',
    );
  }
  return validateNativePrompt(args.promptText, args.skillId, config.fixedDuration || args.duration);
}
