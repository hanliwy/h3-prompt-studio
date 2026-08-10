import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadImageSkillDefinitions,
  resolveImageSkillById,
  toPublicImageSkill,
} from '../src/server/imageSkillRuntime';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-skills-'));
const skillDir = path.join(root, 'gaven-direct-image-prompts');
fs.mkdirSync(path.join(skillDir, 'references'), { recursive: true });
fs.mkdirSync(path.join(skillDir, 'agents'), { recursive: true });
fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Gaven 图像提示词导演\n核心规则');
for (const name of ['director-styles.md', 'photo-styles.md', 'capture-films.md', 'print-films.md']) {
  fs.writeFileSync(path.join(skillDir, 'references', name), `# ${name}\nreference-content`);
}
fs.writeFileSync(path.join(skillDir, 'agents', 'openai.yaml'), 'ignored: true');

const skills = loadImageSkillDefinitions(root);
assert.equal(skills.length, 1);
assert.equal(skills[0].id, 'gaven-direct-image-prompts');
assert.ok(skills[0].instruction.includes('核心规则'));
assert.ok(skills[0].instruction.includes('director-styles.md'));
assert.ok(skills[0].instruction.includes('print-films.md'));
assert.ok(!skills[0].instruction.includes('ignored: true'), 'agent config must not enter model instructions');
assert.deepEqual(skills[0].sourceFiles, [
  'SKILL.md',
  'references/capture-films.md',
  'references/director-styles.md',
  'references/photo-styles.md',
  'references/print-films.md',
]);
assert.equal(resolveImageSkillById('GAVEN-DIRECT-IMAGE-PROMPTS', skills)?.id, skills[0].id);
assert.equal(toPublicImageSkill(skills[0]).instruction, undefined);

fs.rmSync(path.join(skillDir, 'references', 'print-films.md'));
assert.throws(() => loadImageSkillDefinitions(root), /print-films\.md/);

fs.rmSync(root, { recursive: true, force: true });
console.log('imageSkillRuntime tests passed');
