import fs from 'fs';
import path from 'path';
import type { ImageSkill, ImageSkillDefinition } from '../types';

const REQUIRED_REFERENCE_FILES = [
  'capture-films.md',
  'director-styles.md',
  'photo-styles.md',
  'print-films.md',
] as const;

const IMAGE_SKILL_MANIFEST = [
  {
    id: 'gaven-direct-image-prompts',
    folder: 'gaven-direct-image-prompts',
    title: 'Gaven 图像提示词导演',
    titleEn: 'Gaven Image Prompt Director',
    category: '图像导演',
    icon: 'Image',
    description: '将自然语言画面需求整理为结构规范的图片提示词，支持导演语言、摄影风格与胶片画风。',
    sampleInput: '雨夜，一个女孩等公交。',
    tags: ['图片提示词', '导演风格', '摄影', '胶片', 'D/P/C/R/S'],
    aliases: ['gaven-image-director'],
  },
] as const;

function readRequiredFile(skillDir: string, relativePath: string): string {
  const fullPath = path.resolve(skillDir, relativePath);
  const root = `${path.resolve(skillDir)}${path.sep}`;
  if (!fullPath.startsWith(root)) throw new Error(`图片 Skill 文件越出允许目录: ${relativePath}`);
  if (!fs.existsSync(fullPath)) throw new Error(`图片 Skill 缺少必需文件: ${relativePath}`);
  return fs.readFileSync(fullPath, 'utf8').trim();
}

export function loadImageSkillDefinitions(skillsRoot: string): ImageSkillDefinition[] {
  return IMAGE_SKILL_MANIFEST.map((manifest) => {
    const skillDir = path.resolve(skillsRoot, manifest.folder);
    const sourceFiles = [
      'SKILL.md',
      ...REQUIRED_REFERENCE_FILES.map((name) => `references/${name}`),
    ];
    const instruction = sourceFiles
      .map((relativePath) => `## ${relativePath}\n${readRequiredFile(skillDir, relativePath)}`)
      .join('\n\n');

    return {
      ...manifest,
      tags: [...manifest.tags],
      aliases: [...manifest.aliases],
      instruction,
      sourceFiles,
    };
  });
}

export function resolveImageSkillById(
  skillId: string | undefined,
  skills: ImageSkillDefinition[],
): ImageSkillDefinition | undefined {
  if (!skillId) return undefined;
  const normalized = skillId.toLowerCase();
  return skills.find((skill) => (
    skill.id.toLowerCase() === normalized ||
    skill.folder?.toLowerCase() === normalized ||
    skill.aliases?.some((alias) => alias.toLowerCase() === normalized)
  ));
}

export function toPublicImageSkill(skill: ImageSkillDefinition): ImageSkill & { instruction?: never } {
  const { instruction: _instruction, sourceFiles: _sourceFiles, aliases: _aliases, folder: _folder, ...publicSkill } = skill;
  return publicSkill;
}