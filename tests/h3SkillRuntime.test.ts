import assert from 'node:assert/strict';
import path from 'node:path';
import {
  composeH3SystemPrompt,
  loadH3SkillDefinitions,
  selectH3SkillForRequest,
} from '../src/server/h3SkillRuntime';

const skillsRoot = path.join(process.cwd(), 'data', 'h3-skills');
const skills = loadH3SkillDefinitions(skillsRoot);

assert.ok(skills.length >= 12, 'loads official skills plus bundled 5s/10s/15s multimode skills');

for (const [skillId, duration] of [
  ['h3-multimode-5s', '5s'],
  ['h3-multimode-10s', '10s'],
  ['h3-multimode-15s', '15s'],
] as const) {
  const skill = skills.find((item) => item.id === skillId) as any;
  assert.ok(skill, `loads ${skillId}`);
  assert.equal(skill.recommendedParams.duration, duration);
  assert.equal(skill.requiresSceneMode, true, `${skillId} requires drama/action/storyboard-grid mode`);
  assert.deepEqual(skill.supportedInputModes, ['text', 'image']);
  assert.ok(skill.requiredRuntimeFiles.includes('SKILL.cn.md'));
}

const baseSkill = skills.find((skill) => skill.id === 'h3-prompt-writing');
assert.ok(baseSkill, 'loads h3-prompt-writing');
assert.match(
  baseSkill.instruction,
  /integrated_multimodal_description/,
  'base prompt-writing skill includes the official H3 output fields',
);
assert.match(
  baseSkill.instruction,
  /overall_soundscape/,
  'base prompt-writing skill includes official audio field guidance',
);

const productSkill = selectH3SkillForRequest('给一款香水做一个极简高级感产品广告', skills);
assert.equal(
  productSkill.id,
  'minimalist-product-ad-generator',
  'routes product-ad requests to the product ad skill',
);
assert.match(
  productSkill.mediaPreviewUrl || '',
  /minimalist-product-ad-generator\.gif$/,
  'official style skills expose their MiniMax-H3 demo GIF',
);

const brandSkill = selectH3SkillForRequest('帮我的 App 做一个品牌宣传短片，突出功能和 CTA', skills);
assert.equal(
  brandSkill.id,
  'brand-promo-video-generator',
  'routes brand-promo requests to the brand promo skill',
);

const prompt = composeH3SystemPrompt({
  skill: baseSkill,
  outputMode: 'json',
  options: {
    targetModel: 'minimax-h3',
    aspectRatio: '16:9',
    duration: '6s',
    motionSpeed: 7,
    cameraMotionLabel: 'Slow Dolly In',
    lensLabel: '35mm Anamorphic',
    lightingLabel: 'Natural Sunlight',
  },
});

assert.match(prompt, /OFFICIAL MINIMAX-H3 SKILL/);
assert.match(prompt, /integrated_multimodal_description/);
assert.match(prompt, /overall_soundscape/);
assert.match(prompt, /non_diegetic_music/);
assert.match(prompt, /Return ONLY raw valid JSON/);

console.log('h3SkillRuntime tests passed');
