import assert from 'node:assert/strict';
import {
  buildImagePromptSystemPrompt,
  formatImagePrompt,
  parseImagePromptCanonical,
  reasoningFallbackAction,
} from '../src/server/imagePromptRuntime';
import type { ImagePromptCanonical, ImageSkillDefinition } from '../src/types';

const canonical: ImagePromptCanonical = {
  title: '雨夜候车',
  modules: {
    imageType: '电影感都市人物场景',
    shotAndAngle: '中远景，平视视角',
    composition: '三分法构图，人物位于右侧',
    subject: '一名独自等车的年轻女孩',
    actionAndExpression: '安静站立，神情平静',
    spatialStaging: '前景路面，中景人物，背景城市灯光',
    environment: '持续细雨与湿润街道',
    lightingAndColor: '冷蓝雨夜与暖黄站台灯',
    aestheticsAndMaterials: '写实电影摄影与湿润材质',
    aspectAndQuality: '16:9 横幅，高细节',
  },
  negativeConcepts: ['多余人物', '错误肢体'],
};

const formats = ['generic', 'midjourney', 'flux', 'sdxl', 'jimeng', 'doubao'] as const;
for (const format of formats) {
  const result = formatImagePrompt(canonical, format, '16:9');
  assert.equal(result.format, format);
  assert.ok(result.prompt.length > 40);
  assert.equal(result.aspectRatio, '16:9');
}
assert.match(formatImagePrompt(canonical, 'midjourney', '16:9').prompt, /--ar 16:9/);
assert.ok(formatImagePrompt(canonical, 'sdxl', '16:9').negativePrompt?.includes('错误肢体'));
assert.ok(!formatImagePrompt(canonical, 'flux', '16:9').prompt.includes('--ar'));
assert.ok(formatImagePrompt(canonical, 'jimeng', '16:9').prompt.includes('【画面类型】'));

const parsed = parseImagePromptCanonical(`\n\`\`\`json\n${JSON.stringify(canonical)}\n\`\`\`\n`);
assert.equal(parsed.title, canonical.title);
// 容错：格式不符时降级为 fallback canonical（不抛错），原始文本保留在 subject 字段
const degraded = parseImagePromptCanonical('{"title":"缺少模块"}');
assert.ok(degraded.modules.subject.includes('缺少模块'));
assert.ok(degraded.title.includes('原始输出'));

const skill: ImageSkillDefinition = {
  id: 'gaven-direct-image-prompts',
  title: 'Gaven 图像提示词导演',
  titleEn: 'Gaven Image Prompt Director',
  category: '图像导演',
  icon: 'Image',
  description: '测试',
  sampleInput: '雨夜，一个女孩等公交。',
  tags: ['图片'],
  instruction: 'Dxx Pxx Cxx Rxx S1-S3，禁止虚构用户未提供的实体。',
  sourceFiles: ['SKILL.md'],
};
const systemPrompt = buildImagePromptSystemPrompt({ skill, format: 'flux', aspectRatio: '16:9', styleCodes: 'D01+C04+R01+S2' });
assert.ok(systemPrompt.includes('D01+C04+R01+S2'));
assert.ok(systemPrompt.includes('禁止虚构'));
assert.ok(systemPrompt.includes('imageType'));

assert.equal(reasoningFallbackAction({ status: 400, message: 'reasoning_effort is unsupported' }), 'drop-effort');
assert.equal(reasoningFallbackAction({ status: 422, message: 'unknown parameter thinking' }), 'disable-thinking');
assert.equal(reasoningFallbackAction({ status: 401, message: 'invalid token' }), 'none');

console.log('imagePromptRuntime tests passed');
