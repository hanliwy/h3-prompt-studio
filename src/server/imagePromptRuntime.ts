import type {
  AspectRatio,
  ImagePromptCanonical,
  ImagePromptFormat,
  ImagePromptModules,
  ImagePromptTarget,
  ImageSkillDefinition,
} from '../types';

const MODULE_ORDER: Array<[keyof ImagePromptModules, string]> = [
  ['imageType', '画面类型'],
  ['shotAndAngle', '景别与机位'],
  ['composition', '构图'],
  ['subject', '主体'],
  ['actionAndExpression', '动作与表情'],
  ['spatialStaging', '空间调度'],
  ['environment', '环境层次'],
  ['lightingAndColor', '光影与色彩'],
  ['aestheticsAndMaterials', '美学与材质'],
  ['aspectAndQuality', '画幅与质量'],
];

function cleanSegment(value: string): string {
  return value.replace(/--[a-z][\w-]*(?:\s+[^,;，；]+)?/gi, '').replace(/\s+/g, ' ').trim();
}

function taggedPrompt(canonical: ImagePromptCanonical): string {
  return MODULE_ORDER
    .map(([key, label]) => `【${label}】${cleanSegment(canonical.modules[key])}`)
    .join('；');
}

function naturalPrompt(canonical: ImagePromptCanonical): string {
  return MODULE_ORDER.map(([key]) => cleanSegment(canonical.modules[key])).filter(Boolean).join('，');
}

export function formatImagePrompt(
  canonical: ImagePromptCanonical,
  format: ImagePromptFormat,
  aspectRatio: AspectRatio,
): ImagePromptTarget {
  const tagged = taggedPrompt(canonical);
  const natural = naturalPrompt(canonical);
  const negativePrompt = canonical.negativeConcepts?.map(cleanSegment).filter(Boolean).join(', ');

  switch (format) {
    case 'midjourney':
      return {
        format,
        prompt: `${natural} --ar ${aspectRatio}`,
        aspectRatio,
        parameters: { ar: aspectRatio, stylize: 250 },
      };
    case 'flux':
      return { format, prompt: natural, aspectRatio, parameters: { aspectRatio } };
    case 'sdxl':
      return {
        format,
        prompt: natural,
        negativePrompt,
        aspectRatio,
        parameters: { steps: 30, cfg: 6.5, aspectRatio },
      };
    case 'jimeng':
      return { format, prompt: tagged, negativePrompt, aspectRatio, parameters: { aspectRatio } };
    case 'doubao':
      return { format, prompt: tagged, negativePrompt, aspectRatio, parameters: { aspectRatio } };
    default:
      return { format, prompt: tagged, negativePrompt, aspectRatio, parameters: { aspectRatio } };
  }
}

function fallbackCanonical(rawText: string): ImagePromptCanonical {
  // 解析失败或格式不符时，把原始文本塞进 subject 字段，其余留空，保证结果能展示
  const text = rawText.trim();
  const emptyModules: ImagePromptModules = {
    imageType: '', shotAndAngle: '', composition: '', subject: text,
    actionAndExpression: '', spatialStaging: '', environment: '',
    lightingAndColor: '', aestheticsAndMaterials: '', aspectAndQuality: '',
  };
  return { title: '图片提示词（原始输出）', modules: emptyModules };
}

export function parseImagePromptCanonical(content: string): ImagePromptCanonical {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    // JSON 解析失败：降级为原始文本展示，不阻断
    return fallbackCanonical(normalized);
  }

  // 模型可能返回数组（用户要求多组时）：取第一个元素
  if (Array.isArray(parsed)) {
    parsed = parsed[0];
  }

  if (!parsed || typeof parsed !== 'object') return fallbackCanonical(normalized);
  const candidate = parsed as Partial<ImagePromptCanonical>;

  // 缺 title 或 modules：降级但不抛错
  if (!candidate.title || !candidate.modules || typeof candidate.modules !== 'object') {
    return fallbackCanonical(normalized);
  }

  // 缺字段用空字符串补齐，不抛错
  const filledModules: ImagePromptModules = MODULE_ORDER.reduce((acc, [key]) => {
    const val = candidate.modules![key];
    acc[key] = typeof val === 'string' ? val : '';
    return acc;
  }, {} as ImagePromptModules);

  return {
    title: candidate.title,
    modules: filledModules,
    negativeConcepts: Array.isArray(candidate.negativeConcepts) ? candidate.negativeConcepts : undefined,
  };
}

interface BuildImagePromptArgs {
  skill: ImageSkillDefinition;
  format: ImagePromptFormat;
  aspectRatio: AspectRatio;
  styleCodes?: string;
}

export function buildImagePromptSystemPrompt({
  skill,
  format,
  aspectRatio,
  styleCodes,
}: BuildImagePromptArgs): string {
  return `你是创意提示词工作室中的图片提示词导演。严格执行所选 Skill，不得虚构用户没有提供的品牌、文字、人物数量、职业装备、核心道具或叙事事件。

所选 Skill: ${skill.id} (${skill.titleEn})
目标格式: ${format}
目标画幅: ${aspectRatio}
用户选择的画风代码: ${styleCodes || '未指定，由 Skill 根据画面意图选择克制默认值'}

<IMAGE_SKILL>
${skill.instruction}
</IMAGE_SKILL>

先生成模型无关的画面结构。只返回原始 JSON，不要 Markdown，不要目标平台参数。JSON 必须严格符合：
{
  "title": "简短中文标题",
  "modules": {
    "imageType": "画面类型",
    "shotAndAngle": "景别与机位",
    "composition": "构图",
    "subject": "主体",
    "actionAndExpression": "动作与表情",
    "spatialStaging": "空间调度",
    "environment": "环境层次",
    "lightingAndColor": "光影与色彩",
    "aestheticsAndMaterials": "美学与材质，展开 D/P/C/R/S 代码而不是只保留代码",
    "aspectAndQuality": "画幅与质量"
  },
  "negativeConcepts": ["需要避免的明显画面错误"]
}`;
}

export type ReasoningFallbackAction = 'drop-effort' | 'disable-thinking' | 'none';

export function reasoningFallbackAction(error: { status?: number; message?: string }): ReasoningFallbackAction {
  if (error.status !== 400 && error.status !== 422) return 'none';
  const message = error.message || '';
  const unsupported = /(unsupported|not supported|does not support|doesn't support|unknown|invalid|unexpected|parameter|不支持|未知参数)/i.test(message);
  if (!unsupported) return 'none';
  if (/reasoning[_ -]?effort/i.test(message)) return 'drop-effort';
  if (/thinking/i.test(message)) return 'disable-thinking';
  return 'none';
}