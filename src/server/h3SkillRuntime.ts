import fs from 'fs';
import path from 'path';
import type {
  AspectRatio,
  CameraMotion,
  H3InputMode,
  LensType,
  LightingStyle,
  MiniMaxSkill,
  VideoModelTarget,
} from '../types';
import {
  getH3SkillWorkflowConfig,
  type H3SkillOutputFormat,
  type H3SkillValidatorKind,
} from './h3SkillWorkflow';

export interface H3SkillDefinition extends MiniMaxSkill {
  folder: string;
  instruction: string;
  sourceFiles: string[];
  aliases: string[];
  routingKeywords: string[];
  requiredRuntimeFiles: string[];
  outputFormat: H3SkillOutputFormat;
  validator: H3SkillValidatorKind;
  requiresSceneMode: boolean;
  supportedInputModes: H3InputMode[];
  fixedDuration?: string;
  fixedAspectRatio?: string;
}

interface H3PromptOptions {
  targetModel?: VideoModelTarget;
  aspectRatio?: AspectRatio | string;
  duration?: string;
  motionSpeed?: number;
  cameraMotionLabel?: string;
  lensLabel?: string;
  lightingLabel?: string;
}

interface ComposePromptArgs {
  skill: H3SkillDefinition;
  options?: H3PromptOptions;
  outputMode?: 'json';
}

const MAX_SKILL_INSTRUCTION_CHARS = 90000;

const H3_SKILL_MANIFEST = [
  {
    id: 'h3-prompt-writing',
    folder: 'h3-prompt-writing',
    title: 'H3 官方通用提示词写作',
    titleEn: 'H3 Prompt Writing',
    category: '官方基础',
    icon: 'Sparkles',
    description:
      '官方 MiniMax-H3 提示词结构，覆盖 T2VA、I2VA、FL2VA、L2VA、Ref2VA，并要求输出 H3 专用字段。',
    sampleInput: '雨夜城市中，一个人撑伞走过霓虹街口，水面倒影随着脚步轻微晃动',
    recommendedParams: {
      cameraMotion: 'tracking_shot' as CameraMotion,
      lens: '35mm_anamorphic' as LensType,
      lighting: 'sunlit_natural' as LightingStyle,
      fps: 24,
      duration: '15s',
    },
    tags: ['官方格式', 'T2VA', 'I2VA', 'Ref2VA', '声音字段'],
    aliases: ['general_master', 'cinematic_imax', 'cyberpunk_scifi', 'character_dynamics', 'macro_nature'],
    routingKeywords: ['通用', 'prompt', '提示词', '镜头', '运镜', '海螺', 'minimax', 'h3'],
  },
  {
    id: 'minimalist-product-ad-generator',
    folder: 'minimalist-product-ad-generator',
    title: '极简产品广告生成器',
    titleEn: 'Minimalist Product Ad Generator',
    category: '商业广告',
    icon: 'ShoppingBag',
    mediaPreviewUrl: 'https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/assets/minimalist-product-ad-generator.gif',
    description: '将产品图片或卖点需求转为高级、干净、适合电商和新品发布的产品广告短片。',
    sampleInput: '给一款黑金包装的香水做一个高级感极简产品广告',
    recommendedParams: {
      cameraMotion: 'orbit_arc' as CameraMotion,
      lens: 'macro_lens' as LensType,
      lighting: 'soft_studio' as LightingStyle,
      fps: 24,
      duration: '10s',
    },
    tags: ['产品广告', '极简', '电商', '新品发布'],
    aliases: ['photorealistic_commercial'],
    routingKeywords: ['产品', '商品', '电商', '广告', '香水', '包装', '卖点', '新品', '商业', 'product'],
  },
  {
    id: '3d-animation-short-generator',
    folder: '3d-animation-short-generator',
    title: '3D 动画短片生成器',
    titleEn: '3D Animation Short Generator',
    category: '动画叙事',
    icon: 'Layers',
    mediaPreviewUrl: 'https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/assets/3d-animation-short-generator.gif',
    description: '从故事想法生成角色、场景、分镜、镜头和音频完整生产流程，适合连续叙事动画。',
    sampleInput: '一个小机器人在废弃温室里发现会发光的种子，并把它种下',
    recommendedParams: {
      cameraMotion: 'fpv_crane' as CameraMotion,
      lens: '16mm_wide' as LensType,
      lighting: 'golden_hour' as LightingStyle,
      fps: 24,
      duration: '15s',
    },
    tags: ['3D动画', '角色一致性', '分镜', '叙事'],
    aliases: ['anime_3d', 'multi_shot_storyboard'],
    routingKeywords: ['3d', '动画', '短片', '故事', '角色', '分镜', '连续', '剧情', 'animation'],
  },
  {
    id: 'papercraft-stop-motion-explainer',
    folder: 'papercraft-stop-motion-explainer',
    title: '纸艺定格科普解释器',
    titleEn: 'Papercraft Stop Motion Explainer',
    category: '知识科普',
    icon: 'FileVideo',
    mediaPreviewUrl: 'https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/assets/papercraft-stop-motion-explainer.gif',
    description: '用手工纸艺、立体书和定格动画视觉解释科学、教育或知识主题。',
    sampleInput: '用纸艺定格动画解释为什么日食会发生',
    recommendedParams: {
      cameraMotion: 'dolly_in' as CameraMotion,
      lens: 'cinematic_prime' as LensType,
      lighting: 'soft_studio' as LightingStyle,
      fps: 24,
      duration: '15s',
    },
    tags: ['纸艺', '科普', '定格动画', '教育'],
    aliases: [],
    routingKeywords: ['纸艺', '折纸', '定格', '科普', '解释', '教育', '知识', 'science', 'explainer'],
  },
  {
    id: 'brand-promo-video-generator',
    folder: 'brand-promo-video-generator',
    title: '品牌宣传短片生成器',
    titleEn: 'Brand Promo Video Generator',
    category: '品牌营销',
    icon: 'Film',
    mediaPreviewUrl: 'https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/assets/brand-promo-video-generator.gif',
    description: '为品牌、产品、网站、App、店铺或个人项目生成宣传短片、卖点节奏和 CTA。',
    sampleInput: '帮我的 AI 写作 App 做一个 15 秒品牌宣传短片，突出效率和创意',
    recommendedParams: {
      cameraMotion: 'tracking_shot' as CameraMotion,
      lens: '35mm_anamorphic' as LensType,
      lighting: 'dramatic_rim' as LightingStyle,
      fps: 24,
      duration: '15s',
    },
    tags: ['品牌宣传', 'App', 'CTA', '营销'],
    aliases: [],
    routingKeywords: ['品牌', '宣传', '推广', '官网', 'app', '网站', '功能', 'cta', 'promo', 'launch'],
  },
  {
    id: 'music-video-subtitle-generator',
    folder: 'mv-subtitle-skill-confirmed',
    title: '音乐视频字幕生成器',
    titleEn: 'Music Video Subtitle Generator',
    category: '音乐视频',
    icon: 'Volume2',
    mediaPreviewUrl: 'https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/assets/music-video-subtitle-generator.gif',
    description: '为 AI MV、情绪短片和歌词排版生成节拍同步的空间字幕、镜头和拼接建议。',
    sampleInput: '给一首关于夏夜告别的歌做一个带歌词字幕的 AI 音乐视频',
    recommendedParams: {
      cameraMotion: 'tracking_shot' as CameraMotion,
      lens: '35mm_anamorphic' as LensType,
      lighting: 'moody_fog' as LightingStyle,
      fps: 24,
      duration: '15s',
    },
    tags: ['MV', '歌词字幕', '节拍', '空间排版'],
    aliases: ['mv-subtitle-skill-confirmed'],
    routingKeywords: ['音乐', 'mv', '歌词', '字幕', '歌曲', '节拍', '旋律', 'music', 'subtitle', 'lyric'],
  },
  {
    id: 'co-op-game-intro-generator',
    folder: 'co-op-game-intro-generator',
    title: '双人合作游戏开场生成器',
    titleEn: 'Co-op Game Intro Generator',
    category: '游戏开场',
    icon: 'Gamepad2',
    mediaPreviewUrl: 'https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/assets/co-op-game-intro-generator.gif',
    description: '生成双人合作游戏菜单、角色卡、按钮交互与开场动画提示词。',
    sampleInput: '做一个双人合作冒险游戏的开场菜单，两个角色在篝火旁准备出发',
    recommendedParams: {
      cameraMotion: 'dolly_in' as CameraMotion,
      lens: '35mm_anamorphic' as LensType,
      lighting: 'dramatic_rim' as LightingStyle,
      fps: 24,
      duration: '15s',
    },
    tags: ['游戏菜单', '双人合作', '角色卡', 'UI 动画'],
    aliases: [],
    routingKeywords: ['游戏', '菜单', '双人', '合作', '开场', '角色卡', '按钮', 'game', 'co-op'],
  },
  {
    id: 'paper-collage-explainer-generator',
    folder: 'paper-collage-explainer-generator',
    title: '纸质拼贴解释器',
    titleEn: 'Paper Collage Explainer Generator',
    category: '观点解释',
    icon: 'Layers',
    mediaPreviewUrl: 'https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/assets/paper-collage-explainer-generator.gif',
    description: '用半调拼贴、纸片运动和触感音效表达观点、旁白、知识点或抽象主题。',
    sampleInput: '用纸质拼贴风格解释现代人为什么总觉得时间不够用',
    recommendedParams: {
      cameraMotion: 'pan_right' as CameraMotion,
      lens: 'cinematic_prime' as LensType,
      lighting: 'soft_studio' as LightingStyle,
      fps: 24,
      duration: '15s',
    },
    tags: ['纸质拼贴', '观点', '旁白', '社媒 B-roll'],
    aliases: [],
    routingKeywords: ['拼贴', '观点', '旁白', '抽象', '纸片', 'b-roll', 'collage', 'opinion'],
  },
  {
    id: 'handdrawn-live-video-generator',
    folder: 'handdrawn-live-video-generator',
    title: '手绘现实融合视频生成器',
    titleEn: 'Handdrawn Live Video Generator',
    category: '创意短片',
    icon: 'Sparkles',
    mediaPreviewUrl: 'https://raw.githubusercontent.com/MiniMax-AI/MiniMax-H3/main/assets/handdrawn-live-video-generator.gif',
    description: '生成粗糙发光手绘动画与真实空间融合的超现实单场景短片。',
    sampleInput: '一条发光的手绘线条从笔记本里爬出来，沿着桌面逃走',
    recommendedParams: {
      cameraMotion: 'handheld_shake' as CameraMotion,
      lens: '35mm_anamorphic' as LensType,
      lighting: 'sunlit_natural' as LightingStyle,
      fps: 24,
      duration: '15s',
    },
    tags: ['手绘', '真人实拍', '超现实', '单场景'],
    aliases: ['vintage_vhs', 'dark_fantasy'],
    routingKeywords: ['手绘', '线条', '涂鸦', '现实', '真人', '融合', '逃走', 'handdrawn', 'live-action'],
  },
  {
    id: 'h3-multimode-5s',
    folder: 'h3-multimode-5s',
    title: 'H3 5秒三流程导演模板',
    titleEn: 'H3 5s Drama Action Storyboard',
    category: '多模式短片',
    icon: 'Zap',
    description: '将一句核心创意压缩为 5 秒文戏、武戏或九宫格流程的 MiniMax H3 中文成品提示词。',
    sampleInput: '两个多年未见的旧友在雨夜车站重逢，其中一人发现对方手里拿着当年的旧车票',
    recommendedParams: {
      cameraMotion: 'tracking_shot' as CameraMotion,
      lens: '35mm_anamorphic' as LensType,
      lighting: 'moody_fog' as LightingStyle,
      fps: 24,
      duration: '5s',
    },
    tags: ['5秒', '文戏', '武戏', '九宫格'],
    aliases: [],
    routingKeywords: ['5秒', '文戏', '武戏', '九宫格', '微型事件'],
  },
  {
    id: 'h3-multimode-10s',
    folder: 'h3-multimode-10s',
    title: 'H3 10秒三流程导演模板',
    titleEn: 'H3 10s Drama Action Storyboard',
    category: '多模式短片',
    icon: 'Film',
    description: '将核心故事转为 10 秒文戏、武戏或九宫格流程的 MiniMax H3 中文成品提示词。',
    sampleInput: '女刺客驾驶光轮摩托穿越雨夜新东京的悬浮车流，躲避追捕并冲出封锁',
    recommendedParams: {
      cameraMotion: 'tracking_shot' as CameraMotion,
      lens: '16mm_wide' as LensType,
      lighting: 'cyberpunk_neon' as LightingStyle,
      fps: 24,
      duration: '10s',
    },
    tags: ['10秒', '文戏', '武戏', '九宫格'],
    aliases: [],
    routingKeywords: ['10秒', '文戏', '武戏', '九宫格', '紧凑故事'],
  },
  {
    id: 'h3-multimode-15s',
    folder: 'h3-multimode-15s',
    title: 'H3 15秒三流程导演模板',
    titleEn: 'H3 15s Drama Action Storyboard',
    category: '多模式短片',
    icon: 'Layers',
    description: '将核心故事扩展为 15 秒文戏、武戏或九宫格流程的 MiniMax H3 中文成品提示词。',
    sampleInput: '废弃温室中，小机器人发现一颗发光种子，在风暴来临前完成种植并见证它发芽',
    recommendedParams: {
      cameraMotion: 'fpv_crane' as CameraMotion,
      lens: '35mm_anamorphic' as LensType,
      lighting: 'dramatic_rim' as LightingStyle,
      fps: 24,
      duration: '15s',
    },
    tags: ['15秒', '文戏', '武戏', '九宫格'],
    aliases: [],
    routingKeywords: ['15秒', '文戏', '武戏', '九宫格', '完整转折'],
  },
  {
    id: 'gaven-cinematic-director',
    folder: 'gaven-image-director',
    title: '电影感视频提示词导演',
    titleEn: 'Gaven Cinematic Video Director',
    category: '影视导演',
    icon: 'Clapperboard',
    description: '用导演视觉语言、摄影风格、胶片模拟与电影印片风格作为约束，将自然语言画面需求组织为结构规范的 MiniMax H3 视频提示词。',
    sampleInput: '雨夜，一个女孩等公交。',
    recommendedParams: {
      cameraMotion: 'tracking_shot' as CameraMotion,
      lens: '35mm_anamorphic' as LensType,
      lighting: 'moody_fog' as LightingStyle,
      fps: 24,
      duration: '15s',
    },
    tags: ['视频', 'H3', '导演风格', '胶片模拟', 'Kodak', 'Fujifilm'],
    aliases: ['gaven-direct-image-prompts', 'gaven-image-director'],
    routingKeywords: ['电影', '导演', '胶片', 'Kodak', 'Fujifilm', '画风', '王家卫', '张艺谋', '诺兰', '安德森'],
  },
];

const normalize = (value: string) => value.toLowerCase();

function readTextFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function listInstructionFiles(skillDir: string): string[] {
  const files: string[] = [];

  const visit = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }

      if (/\.(md|txt|yaml|yml)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };

  visit(skillDir);

  return files.sort((a, b) => {
    const score = (filePath: string) => {
      const name = path.basename(filePath);
      if (name === 'SKILL.cn.md') return 0;
      if (name === 'SKILL.md') return 1;
      if (filePath.includes(`${path.sep}references${path.sep}`)) return 2;
      return 3;
    };
    return score(a) - score(b) || a.localeCompare(b);
  });
}

function readSkillInstruction(skillDir: string): { instruction: string; sourceFiles: string[] } {
  const sourceFiles = listInstructionFiles(skillDir);
  const sections: string[] = [];

  for (const filePath of sourceFiles) {
    const content = readTextFile(filePath);
    if (!content) continue;
    const relativePath = path.relative(skillDir, filePath);
    sections.push(`## ${relativePath}\n${content.trim()}`);
  }

  const instruction = sections.join('\n\n').slice(0, MAX_SKILL_INSTRUCTION_CHARS);
  return {
    instruction,
    sourceFiles: sourceFiles.map((filePath) => path.relative(skillDir, filePath)),
  };
}

export function loadH3SkillDefinitions(skillsRoot: string): H3SkillDefinition[] {
  return H3_SKILL_MANIFEST.map((manifest) => {
    const skillDir = path.join(skillsRoot, manifest.folder);
    const { instruction, sourceFiles } = readSkillInstruction(skillDir);
    const workflow = getH3SkillWorkflowConfig(manifest.id);

    return {
      ...manifest,
      ...workflow,
      systemPrompt: instruction || `${manifest.titleEn}: ${manifest.description}`,
      instruction: instruction || `${manifest.titleEn}: ${manifest.description}`,
      sourceFiles,
    };
  });
}

export function resolveH3SkillById(
  skillId: string | undefined,
  skills: H3SkillDefinition[],
): H3SkillDefinition | undefined {
  if (!skillId) return undefined;
  const normalizedSkillId = normalize(skillId);
  return skills.find((skill) => {
    return (
      normalize(skill.id) === normalizedSkillId ||
      normalize(skill.folder) === normalizedSkillId ||
      skill.aliases.some((alias) => normalize(alias) === normalizedSkillId)
    );
  });
}

export function selectH3SkillForRequest(
  userRequest: string,
  skills: H3SkillDefinition[],
): H3SkillDefinition {
  const text = normalize(userRequest);
  let bestSkill = skills.find((skill) => skill.id === 'h3-prompt-writing') || skills[0];
  let bestScore = 0;

  for (const skill of skills) {
    const score = skill.routingKeywords.reduce((total, keyword) => {
      return text.includes(normalize(keyword)) ? total + 1 : total;
    }, 0);

    if (score > bestScore) {
      bestSkill = skill;
      bestScore = score;
    }
  }

  return bestSkill;
}

export function composeH3SystemPrompt({
  skill,
  options = {},
}: ComposePromptArgs): string {
  const {
    targetModel = 'minimax-h3',
    aspectRatio = '16:9',
    duration = '6s',
    motionSpeed = 7,
    cameraMotionLabel = 'model-appropriate smooth camera movement',
    lensLabel = 'model-appropriate lens',
    lightingLabel = 'model-appropriate lighting',
  } = options;

  return `You are a MiniMax-H3 production prompt generator running inside a web application.

Your highest-priority task is to follow the OFFICIAL MINIMAX-H3 SKILL below. Treat it as authoritative production guidance, not as background inspiration.

Selected skill: ${skill.id} (${skill.titleEn})
Skill source files: ${skill.sourceFiles.join(', ') || 'inline manifest fallback'}

<OFFICIAL MINIMAX-H3 SKILL>
${skill.instruction}
</OFFICIAL MINIMAX-H3 SKILL>

The user may provide only a rough idea. Infer practical defaults when needed, but do not invent brand claims, medical/legal claims, or exact product facts that the user did not provide.

For this app, generate a complete first-draft result in one turn even when the skill describes staged approvals. If information is missing, make restrained assumptions and include concise questions in chineseTranslation only when they materially improve the next revision.

Generation controls from the UI:
- targetModel: ${targetModel}
- aspectRatio: ${aspectRatio}
- duration: ${duration}
- motionSpeed: ${motionSpeed}/10
- cameraMotion: ${cameraMotionLabel}
- lens: ${lensLabel}
- lighting: ${lightingLabel}

The MiniMax-H3-ready text MUST be placed in englishPrompt. When using the base H3 prompt-writing format, englishPrompt MUST preserve these exact section names and order:
integrated_multimodal_description
overall_soundscape
non_diegetic_music

Your output MUST be valid JSON matching this schema:
{
  "title": "Short descriptive title in Chinese",
  "englishPrompt": "MiniMax-H3-ready English prompt following the selected official skill format",
  "chineseTranslation": "Complete Chinese explanation of the prompt and any restrained assumptions",
  "subjectDescription": "Detailed subject, setting, action, continuity, and micro-movements",
  "cameraMovement": "Specific camera path, timing, lens directive, angles, and motion mechanics",
  "lightingAndAtmosphere": "Lighting, particles, color, reflections, weather, and atmospheric behavior",
  "styleAndAesthetics": "Visual style and production design required by the selected skill",
  "negativePrompt": "Comma-separated artifacts and failure modes to avoid",
  "soundCue": "Diegetic sound and/or music direction when appropriate",
  "technicalParams": {
    "targetModel": "${targetModel}",
    "aspectRatio": "${aspectRatio}",
    "fps": 24,
    "duration": "${duration}",
    "motionSpeed": ${motionSpeed}
  }
}

Return ONLY raw valid JSON with no markdown wrapping or extra commentary outside the JSON object.`;
}
