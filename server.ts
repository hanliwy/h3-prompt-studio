import express from 'express';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import {
  composeH3SystemPrompt,
  loadH3SkillDefinitions,
  resolveH3SkillById,
  selectH3SkillForRequest,
} from './src/server/h3SkillRuntime';
import { runH3AgentGeneration, type H3AgentLlmCall } from './src/server/h3AgentRuntime';
import {
  isPathInsideRoots,
  mediaUrlForConfiguredRoots,
  scanGalleryDirectories,
} from './src/server/galleryScanner';
import {
  appendHistoryItem,
  clearHistory,
  deleteHistoryItem,
  listHistoryDates,
  loadHistoryItems,
} from './src/server/historyStore';
import { formatSseEvent } from './src/server/sse';
import {
  loadImageSkillDefinitions,
  resolveImageSkillById,
  toPublicImageSkill,
} from './src/server/imageSkillRuntime';
import {
  buildImagePromptSystemPrompt,
  formatImagePrompt,
  parseImagePromptCanonical,
  reasoningFallbackAction,
} from './src/server/imagePromptRuntime';
import type { AspectRatio, ImagePromptFormat, ReasoningUsage } from './src/types';

dotenv.config();

// Helper to find available port automatically if initial port is occupied
async function findAvailablePort(startPort: number, host: string = '0.0.0.0'): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, host, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      // Port is occupied, try next port recursively
      resolve(findAvailablePort(startPort + 1, host));
    });
  });
}

// Initial default skills data
const INITIAL_SKILLS = [
  {
    id: 'general_master',
    title: '通用物理大师 (默认无特定风格偏向)',
    titleEn: 'General Physical & Camera Master',
    category: '标准基础',
    icon: 'Sparkles',
    description: 'MiniMax-H3 官方标准底层框架。专注于物理运动力学、低震动画面平滑度与自然光影。',
    systemPrompt: `You are the core MiniMax-H3 Master Prompt Generator. Refine user ideas into clean realistic video prompts.`,
    sampleInput: '一只白色萨摩耶犬在落满黄叶的公园小径上欢快奔跑',
    recommendedParams: { cameraMotion: 'tracking_shot', lens: '35mm_anamorphic', lighting: 'sunlit_natural', fps: 30, duration: '6s' },
    tags: ['官方标准', '真实物理', '通用偏好'],
  },
  {
    id: 'cinematic_imax',
    title: '电影级 IMAX 70mm 大片',
    titleEn: 'Cinematic IMAX 70mm Masterpiece',
    category: '影视大片',
    icon: 'Film',
    description: '生成兼具好莱坞电影质感、重型机械运动、Tyndall丁达尔光效与超高精细细节的8K视频提示词。',
    systemPrompt: `You are an expert cinematic director for MiniMax-H3. Output IMAX 70mm video prompts.`,
    sampleInput: '冰川之上的极光下，一位穿着古朴披风的探险家凝视着远方冰封的巨龙神殿',
    recommendedParams: { cameraMotion: 'dolly_in', lens: '35mm_anamorphic', lighting: 'volumetric_rays', fps: 24, duration: '6s' },
    tags: ['IMAX', '电影质感', '景深', '慢镜头', '好莱坞'],
  },
  {
    id: 'cyberpunk_scifi',
    title: '赛博朋克科幻高能',
    titleEn: 'Cyberpunk Sci-Fi Action',
    category: '科幻未来',
    icon: 'Zap',
    description: '霓虹雨夜、高科技装甲、光轮摩托疾驰、息影全息投影与高速追逐镜头。',
    systemPrompt: `You are a specialist in Cyberpunk Sci-Fi video generation for MiniMax-H3.`,
    sampleInput: '雨夜新东京街头，身穿荧光战甲的女刺客骑着光轮摩托在悬浮飞车群中穿梭',
    recommendedParams: { cameraMotion: 'tracking_shot', lens: '16mm_wide', lighting: 'cyberpunk_neon', fps: 60, duration: '5s' },
    tags: ['霓虹雨夜', '光轮摩托', 'FPV运镜', '赛博朋克'],
  },
  {
    id: 'character_dynamics',
    title: '人物微表情与肖像特写',
    titleEn: 'Character Emotion & Micro-expressions',
    category: '人物角色',
    icon: 'UserCheck',
    description: '专注于瞳孔光泽、面部肌肉微动、呼吸起伏、发丝随风飘动等真实人物情感展现。',
    systemPrompt: `You are an expert character animator specializing in facial fidelity and emotional realism.`,
    sampleInput: '阳光穿过树叶，一位身着白衬衫的少女在风中转过身，露出含泪微笑的侧脸',
    recommendedParams: { cameraMotion: 'orbit_arc', lens: '85mm_portrait', lighting: 'golden_hour', fps: 30, duration: '5s' },
    tags: ['85mm人像', '微表情', '情绪大片', '唯美美学'],
  },
  {
    id: 'anime_3d',
    title: '新海诚/三维史诗动漫',
    titleEn: 'Anime & 3D Unreal Cinematic',
    category: '动漫二次元',
    icon: 'Sparkles',
    description: '唯美天空云海、光斑漫反射、虚幻引擎5三维唯美动画或手绘风顶级视效。',
    systemPrompt: `You excel at creating anime and 3D unreal engine style video prompts.`,
    sampleInput: '云海之上的悬空神庙，身穿巫女服的少女向天空挥手，光斑粒子随风飞彩',
    recommendedParams: { cameraMotion: 'fpv_crane', lens: '16mm_wide', lighting: 'golden_hour', fps: 30, duration: '6s' },
    tags: ['新海诚风', '云海光效', '动漫视效', '虚幻引擎5'],
  },
  {
    id: 'photorealistic_commercial',
    title: '高端商业广告/产品展示',
    titleEn: 'Commercial Product Showcase',
    category: '商业广告',
    icon: 'ShoppingBag',
    description: '适用于香水、名表、超跑、高端饮品等慢动作极致高清商业长镜头。',
    systemPrompt: `You are a creative director for high-end luxury television commercials.`,
    sampleInput: '冰块掉入琥珀色威士忌酒杯中，液体飞溅出精致水滴，360度环绕慢动作展示',
    recommendedParams: { cameraMotion: 'orbit_arc', lens: 'macro_lens', lighting: 'dramatic_rim', fps: 60, duration: '5s' },
    tags: ['慢镜头', '商业奢品', '宏观水滴', '360度环绕'],
  },
  {
    id: 'macro_nature',
    title: '自然微距与纪录片风格',
    titleEn: 'BBC Nature Documentary Macro',
    category: '自然纪录片',
    icon: 'Compass',
    description: '媲美 BBC / National Geographic 纪录片品质，包含露珠、昆虫翅膀振动与自然变幻。',
    systemPrompt: `You are a nature cinematographer for BBC Earth.`,
    sampleInput: '清晨的雨林叶片上，一颗晶莹剔透的露珠缓缓滑落，折射出璀璨的金色晨光',
    recommendedParams: { cameraMotion: 'dolly_in', lens: 'macro_lens', lighting: 'sunlit_natural', fps: 30, duration: '5s' },
    tags: ['BBC品质', '自然微距', '晨光露珠', '超高清'],
  },
  {
    id: 'vintage_vhs',
    title: '复古 1980s 胶片/VHS 质感',
    titleEn: 'Vintage 1980s VHS & 16mm Film',
    category: '复古艺术',
    icon: 'Tv',
    description: '带有胶片颗粒、色差、RGB 拖尾、复古霓虹与 80 年代流行文化的怀旧视频。',
    systemPrompt: `You specialize in nostalgic vintage film aesthetics.`,
    sampleInput: '1980年代迈阿密海滩日落时分，一辆敞篷跑车沿着棕榈树大道行驶',
    recommendedParams: { cameraMotion: 'pan_right', lens: '35mm_anamorphic', lighting: 'golden_hour', fps: 24, duration: '5s' },
    tags: ['复古胶片', '1980年代', 'VHS质感', '迈阿密日落'],
  },
  {
    id: 'dark_fantasy',
    title: '史诗黑暗魔幻世界观',
    titleEn: 'Dark Fantasy & Mythological Epic',
    category: '奇幻魔幻',
    icon: 'Shield',
    description: '类似于《指环王》《艾尔登法环》的宏大魔幻建筑、神秘符文光芒与史诗氛围。',
    systemPrompt: `You specialize in Dark Fantasy cinematic video prompts.`,
    sampleInput: '漂浮在无尽虚空中的哥特式神殿，一位身披符文战甲的骑士步入发光的魔法阵中',
    recommendedParams: { cameraMotion: 'tilt_up', lens: '16mm_wide', lighting: 'chiaroscuro_noir', fps: 24, duration: '6s' },
    tags: ['暗黑魔幻', '史诗巨构', '魔法符文', '哥特神殿'],
  },
];

// Initial default gallery items data
const INITIAL_GALLERY = [
  {
    id: 'g-1',
    title: '雨夜赛博朋克装甲武士',
    titleEn: 'Cyberpunk Armored Samurai in Neon Rain',
    mediaType: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-and-neon-lights-41551-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop',
    category: 'Cyberpunk',
    tags: ['赛博朋克', '霓虹雨夜', '追踪镜头', 'MiniMax H3', '8K光影'],
    promptEn: 'Cinematic 8K video, a futuristic armored samurai walking through a drenched cyberpunk alleyway in Neo-Tokyo. Neon signs reflect on wet asphalt. Camera starts with a smooth low-angle tracking shot, slowly moving backwards as rain droplets drip off the samurai\'s glowing blue visor. Volumetric light rays, 35mm anamorphic lens, shallow depth of field, 24fps.',
    promptCn: '电影级8K视频，一位身穿未来科技装甲的武士行走在新东京被雨水浸湿的赛博朋克巷道中。霓虹招牌在湿漉漉的黑色沥青路面上折射出绚丽光影。镜头以平滑低角度追踪开始，在雨滴从武士发光的蓝色面罩滑落时缓慢向后后退推进。丁达尔体积光束，35mm变形宽银幕镜头，浅景深，24帧/秒。',
    cameraMotion: 'Low Angle Backward Tracking Shot (低角度后退追踪镜头)',
    lensType: '35mm Anamorphic Lens (35mm变形宽银幕)',
    lighting: 'Cyberpunk Neon & Wet Asphalt Reflections (霓虹与雨夜反光)',
    stylePreset: 'cinematic_imax',
    negativePrompt: 'blurry, low quality, glitching limbs, morphing armor, static camera, noise, artifact',
    targetModel: 'minimax-h3',
    author: 'MiniMax AI Studio',
    likesCount: 1420,
    isLiked: true,
    aspectRatio: '16:9',
    duration: '6s',
    fps: 24,
    seed: 8493021,
    source: 'GitHub',
    language: 'zh',
  },
  {
    id: 'g-2',
    title: '阳光少女微表情与风吹发丝',
    titleEn: 'Girl turning around with emotional tears in golden sunlight',
    mediaType: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-smiling-at-the-camera-in-a-field-41537-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop',
    category: 'Character',
    tags: ['人像特写', '黄金时段', '85mm定焦', '微表情', '情感大片'],
    promptEn: 'Hyper-realistic medium close-up shot, a young East Asian girl with wind blowing individual strands of dark hair across her face in a sunlit meadow during golden hour. She turns her head towards the camera with a subtle, emotional smile, glint of tears in her pupils. 85mm F/1.4 lens, creamy background bokeh, soft rim lighting, natural skin texture, 30fps.',
    promptCn: '超写实中景特写镜头，黄金时段阳光明媚的草地上，微风吹拂着一位东亚少女的面庞，几缕黑发散落微动。她转过头面向镜头，露出微妙而带有些许含泪深情的微笑，瞳孔闪烁着清澈光芒。85mm F/1.4镜头，奶油般细腻的背景虚化，柔和轮廓光，自然皮肤纹理，30帧/秒。',
    cameraMotion: 'Slow Orbital Arc & Dolly In (慢速弧形环绕并推进)',
    lensType: '85mm Portrait Prime Lens (85mm人像定焦)',
    lighting: 'Golden Hour Sunset & Rim Light (黄金时段逆光与轮廓光)',
    stylePreset: 'character_dynamics',
    negativePrompt: 'deformed face, unnatural expression, plastic skin, stiff movement, low resolution',
    targetModel: 'minimax-h3',
    author: 'Cinematographer_X',
    likesCount: 980,
    isLiked: false,
    aspectRatio: '16:9',
    duration: '5s',
    fps: 30,
    seed: 5049381,
    source: 'X / Twitter',
    language: 'zh',
  },
  {
    id: 'g-3',
    title: '冰川巨龙神殿大片',
    titleEn: 'Ancient Dragon Temple in Arctic Aurora',
    mediaType: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-timelapse-of-the-aurora-borealis-over-a-snowy-mountain-41539-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?q=80&w=1200&auto=format&fit=crop',
    category: 'Cinematic',
    tags: ['极光冰川', '好莱坞大片', '巨构建筑', 'IMAX 70mm', '史诗观感'],
    promptEn: 'IMAX 70mm masterpiece shot, an ancient colossal stone dragon temple carved into a frozen glacier peak under shimmering green Aurora Borealis. A hooded lone traveler with a blowing fur cloak stands at the edge of a cliff looking up. Camera smoothly tilts up and dollies forward, revealing giant dragon statues glowing with internal azure runes. Volumetric mist, 24fps.',
    promptCn: 'IMAX 70mm影院级巨作，座落在冰封冰川之巅的古老石刻巨龙神殿，上方是微光闪烁的绿色北极光。一位身穿毛皮斗篷的孤独旅行者伫立在悬崖边缘抬头仰望。镜头平滑向上仰拍并向前推进，展现出内部发着蔚蓝色符文光芒的巨型龙雕像。体积感寒雾，24帧/秒。',
    cameraMotion: 'Tilt Up & Slow Dolly In (仰角攀升推进镜头)',
    lensType: '16mm Ultra-Wide Lens (16mm超广角镜头)',
    lighting: 'Bioluminescent Azure Runes & Aurora Glow (极光与蓝光符文)',
    stylePreset: 'cinematic_imax',
    negativePrompt: 'oversaturated, CGI glitch, flat lighting, blurry architecture, cartoonish',
    targetModel: 'minimax-h3',
    author: 'VFX Mastermind',
    likesCount: 2150,
    isLiked: true,
    aspectRatio: '21:9',
    duration: '8s',
    fps: 24,
    seed: 9283741,
    source: '公共网页',
    language: 'zh',
  },
  {
    id: 'g-4',
    title: '清晨雨林露珠滑落微距',
    titleEn: 'BBC Nature Macro - Dewdrop Sliding on Forest Leaf',
    mediaType: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-green-leaves-covered-in-water-drops-41544-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop',
    category: 'Nature',
    tags: ['BBC纪录片', '微距露珠', '自然物理', '4K特写', '晨光'],
    promptEn: 'BBC Earth nature documentary macro video, 100mm macro lens focus on a crystal clear dewdrop perched on a vibrant emerald rainforest leaf. The sun shines through the mist, creating brilliant caustics inside the droplet. As the leaf trembles in gentle morning breeze, the dewdrop slowly slides down, reflecting miniature trees inside it. 60fps slow motion.',
    promptCn: 'BBC Earth自然纪录片极高清微距视频，100mm微距镜头聚焦于鲜艳翡翠色雨林叶片上一颗晶莹剔透的露珠。阳光穿过晨雾，在水滴内部折射出极其璀璨的焦散光效。随着叶片在微风中轻颤，露珠缓缓向下滑落，水滴内部倒映出微型树木景观。60帧慢动作。',
    cameraMotion: 'Macro Steady Focus Pull & Slow Push (微距焦距跟推)',
    lensType: '100mm Macro Lens (100mm微距镜头)',
    lighting: 'Sunlit Natural & Caustic Refraction (自然阳光与水滴焦散)',
    stylePreset: 'macro_nature',
    negativePrompt: 'shaky, unfocused, artificial liquid, static image, cartoon',
    targetModel: 'kling-ai',
    author: 'NatureLover_AI',
    likesCount: 760,
    isLiked: false,
    aspectRatio: '16:9',
    duration: '5s',
    fps: 60,
    seed: 1293847,
    source: '视频来源',
    language: 'zh',
  },
  {
    id: 'g-5',
    title: '新海诚风格动漫云海少女',
    titleEn: 'Makoto Shinkai Anime Girl Above Cloud Sea',
    mediaType: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-clouds-moving-fast-over-the-mountains-41541-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
    category: 'Anime',
    tags: ['新海诚', '云海光斑', '动漫视效', '天空之城', '梦幻二次元'],
    promptEn: 'Makoto Shinkai style anime video, a high school girl in traditional shrine maiden outfit standing on a floating floating island high above a vast sea of glowing sunset clouds. Swirling light particles float upwards into a brilliant turquoise sky with twin moons. Wide angle camera crane shot moving dynamically downwards, stylized hand-drawn anime aesthetic, 30fps.',
    promptCn: '新海诚风格顶尖动漫视频，一位穿着传统巫女服的少女站在高悬于辽阔日落云海之上的浮空岛上。旋转的金色光斑粒子向上飘入璀璨的绿松石色天空，背景挂着双月。广角摇臂镜头动态向下俯冲，手绘质感动漫美学，30帧/秒。',
    cameraMotion: 'FPV Crane Dynamic Downward Swoop (FPV摇臂向下俯冲)',
    lensType: '16mm Wide Angle Anime Stylized (16mm动漫广角)',
    lighting: 'Golden Hour Sunset & Glowing Particles (日落金色与发光粒子)',
    stylePreset: 'anime_3d',
    negativePrompt: 'photorealistic human, ugly anime, low resolution, bad hands, dark gloomy',
    targetModel: 'minimax-h3',
    author: 'AnimeVision_99',
    likesCount: 1890,
    isLiked: true,
    aspectRatio: '16:9',
    duration: '6s',
    fps: 30,
    seed: 7382019,
    source: 'X / Twitter',
    language: 'zh',
  },
  {
    id: 'g-6',
    title: '极简主义东京城市线条艺术海报',
    titleEn: 'Tokyo Minimalist Line Art Poster',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop',
    posterUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop',
    category: 'Commercial',
    tags: ['极简主义', '东京城市', '线条艺术', '海报设计', ' Midjourney'],
    promptEn: 'Ultra-high-end minimalist city portrait poster, subject TOKYO, capturing everyday city life with refined architecture lines. Sidewalk coffee shop, ramen stand, convenience store, bicycles, clean red and cream color palette, vector line art aesthetic, 8k render.',
    promptCn: '创作一张超高端的极简主义城市肖像海报，主题为 TOKYO，通过建筑线条插画捕捉日常城市生活中那种宁静的精致感与井然有序的混乱感。受下北泽、中目黑街区启发，充满本土特色的街景。',
    cameraMotion: 'Static Framing (静态构图)',
    lensType: '50mm Standard Prime',
    lighting: 'Clean Flat Architectural Light (极简平面光)',
    stylePreset: 'general_master',
    negativePrompt: '3d realistic render, photorealistic, cluttered background, messy text, ugly typography',
    targetModel: 'midjourney',
    author: '@Snow',
    likesCount: 1650,
    isLiked: true,
    aspectRatio: '3:4',
    duration: 'Image',
    fps: 0,
    seed: 4829103,
    source: 'X / Twitter',
    language: 'zh',
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // Ensure local data directories exist
  const dataDir = path.join(process.cwd(), 'data');
  const h3SkillsDir = path.join(dataDir, 'h3-skills');
  const imageSkillsDir = path.join(dataDir, 'image-skills');
  const mediaDir = path.join(dataDir, 'media');
  const skillsFile = path.join(dataDir, 'skills.json');
  const galleryFile = path.join(dataDir, 'gallery.json');
  const configFile = path.join(dataDir, 'config.json');
  const historyFile = path.join(dataDir, 'history.json');
  const historyDir = path.join(dataDir, 'history');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const loadRuntimeH3Skills = () => loadH3SkillDefinitions(h3SkillsDir);
  const loadRuntimeImageSkills = () => loadImageSkillDefinitions(imageSkillsDir);
  const toPublicSkill = (skill: any) => {
    const { instruction, sourceFiles, folder, aliases, routingKeywords, ...publicSkill } = skill;
    return {
      ...publicSkill,
      systemPrompt: `[OFFICIAL MINIMAX-H3 SKILL] ${skill.id}`,
    };
  };

  // Seed default skills.json if missing
  if (!fs.existsSync(skillsFile)) {
    const officialSkills = loadRuntimeH3Skills().map(toPublicSkill);
    fs.writeFileSync(
      skillsFile,
      JSON.stringify(officialSkills.length > 0 ? officialSkills : INITIAL_SKILLS, null, 2),
      'utf-8',
    );
  }

  // Seed default gallery.json if missing
  if (!fs.existsSync(galleryFile)) {
    fs.writeFileSync(galleryFile, JSON.stringify(INITIAL_GALLERY, null, 2), 'utf-8');
  }

  // Seed config.json if missing
  if (!fs.existsSync(configFile)) {
    const defaultConfig = {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
      thinkingEnabled: true,
      reasoningEffort: 'high',
      temperature: 0.7,
      profiles: [],
      galleryScanDirs: [],
      galleryScanMaxDepth: 16,
      galleryScanMaxFiles: 20000,
    };
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  }

  // Seed history.json if missing
  if (!fs.existsSync(historyFile)) {
    fs.writeFileSync(historyFile, JSON.stringify([], null, 2), 'utf-8');
  }

  // Serve static media files from ./data/media
  app.use('/api/media', express.static(mediaDir));

  const readSystemConfig = () => {
    if (!fs.existsSync(configFile)) return {};
    try {
      return JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    } catch {
      return {};
    }
  };

  const getGalleryScanConfig = () => {
    const config: any = readSystemConfig();
    const configuredDirs = Array.isArray(config.galleryScanDirs) ? config.galleryScanDirs : [];
    const roots = [mediaDir, ...configuredDirs]
      .filter((dir) => typeof dir === 'string' && dir.trim())
      .map((dir) => path.resolve(dir.trim()));

    return {
      roots: Array.from(new Set(roots)),
      maxDepth: Number.isFinite(Number(config.galleryScanMaxDepth)) ? Number(config.galleryScanMaxDepth) : 16,
      maxFiles: Number.isFinite(Number(config.galleryScanMaxFiles)) ? Number(config.galleryScanMaxFiles) : 20000,
    };
  };

  app.get('/api/gallery/scan-dirs', (req, res) => {
    const config: any = readSystemConfig();
    return res.json({
      success: true,
      galleryScanDirs: Array.isArray(config.galleryScanDirs) ? config.galleryScanDirs : [],
      galleryScanMaxDepth: config.galleryScanMaxDepth ?? 16,
      galleryScanMaxFiles: config.galleryScanMaxFiles ?? 20000,
    });
  });

  app.post('/api/gallery/scan-dirs', (req, res) => {
    try {
      const body = req.body || {};
      const nextDirs = Array.isArray(body.galleryScanDirs)
        ? body.galleryScanDirs
            .map((dir: any) => String(dir || '').trim())
            .filter(Boolean)
        : [];
      const existingConfig: any = readSystemConfig();
      const nextConfig = {
        ...existingConfig,
        galleryScanDirs: Array.from(new Set(nextDirs)),
        galleryScanMaxDepth: Number.isFinite(Number(body.galleryScanMaxDepth)) ? Number(body.galleryScanMaxDepth) : existingConfig.galleryScanMaxDepth ?? 16,
        galleryScanMaxFiles: Number.isFinite(Number(body.galleryScanMaxFiles)) ? Number(body.galleryScanMaxFiles) : existingConfig.galleryScanMaxFiles ?? 20000,
      };

      fs.writeFileSync(configFile, JSON.stringify(nextConfig, null, 2), 'utf-8');
      return res.json({
        success: true,
        galleryScanDirs: nextConfig.galleryScanDirs,
        galleryScanMaxDepth: nextConfig.galleryScanMaxDepth,
        galleryScanMaxFiles: nextConfig.galleryScanMaxFiles,
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/gallery/file', (req, res) => {
    const requestedPath = typeof req.query.path === 'string' ? req.query.path : '';
    if (!requestedPath) return res.status(400).json({ success: false, error: '缺少 path 参数' });

    const { roots } = getGalleryScanConfig();
    const resolvedPath = path.resolve(requestedPath);
    if (!isPathInsideRoots(resolvedPath, roots) || !fs.existsSync(resolvedPath)) {
      return res.status(403).json({ success: false, error: '该文件不在已配置的画廊扫描目录中' });
    }

    return res.sendFile(resolvedPath);
  });

  app.post('/api/gallery/sidecar-prompt', (req, res) => {
    try {
      const mediaPath = typeof req.body?.mediaPath === 'string' ? req.body.mediaPath : '';
      const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
      if (!mediaPath) return res.status(400).json({ success: false, error: '缺少 mediaPath' });
      if (!prompt) return res.status(400).json({ success: false, error: '提示词不能为空' });

      const { roots } = getGalleryScanConfig();
      const resolvedMediaPath = path.resolve(mediaPath);
      const mediaExt = path.extname(resolvedMediaPath).toLowerCase();
      const allowedMediaExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov', '.m4v']);
      if (!allowedMediaExts.has(mediaExt)) {
        return res.status(400).json({ success: false, error: '只能为图片或视频写入同名提示词 txt' });
      }
      if (!isPathInsideRoots(resolvedMediaPath, roots) || !fs.existsSync(resolvedMediaPath)) {
        return res.status(403).json({ success: false, error: '该媒体文件不在已配置的画廊扫描目录中' });
      }

      const parsed = path.parse(resolvedMediaPath);
      const txtPath = path.join(parsed.dir, `${parsed.name}.txt`);
      if (!isPathInsideRoots(txtPath, roots)) {
        return res.status(403).json({ success: false, error: '目标 txt 路径不在已配置的画廊扫描目录中' });
      }

      fs.writeFileSync(txtPath, `${prompt}\n`, 'utf-8');
      return res.json({ success: true, txtPath, prompt });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Config GET & POST
  app.get('/api/config', (req, res) => {
    try {
      if (fs.existsSync(configFile)) {
        const data = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
        return res.json({ success: true, config: data });
      }
      return res.json({ success: true, config: {} });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/config', (req, res) => {
    try {
      const existingConfig: any = readSystemConfig();
      const config = { ...existingConfig, ...req.body };
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
      return res.json({ success: true, message: '系统配置已保存到 ./data/config.json' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 图片反推提示词（VLM）：把一张或多张参考图反推为 H3 核心内容提示词
  // 支持 i2va（单图首帧）、fl2va（双图首尾帧）、l2va（单图尾帧）
  // style 支持：natural（自然语言核心创意）/ pixel（像素级详细描述）/ tags（标签流）/ i2v（图像到视频）/ detail（英文详情）
  app.post('/api/vision/describe', async (req, res) => {
    try {
      const {
        mode = 'i2va',
        images = [],
        style = 'natural',
        visionSettings,
      } = req.body || {};

      const config: any = readSystemConfig();
      const vs = visionSettings || config.visionSettings || {};
      const apiKey = vs.apiKey || process.env.VISION_API_KEY;
      const baseUrl = vs.baseUrl || process.env.VISION_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
      const model = vs.model || process.env.VISION_MODEL || 'glm-4v-flash';

      if (!apiKey) {
        return res.status(400).json({ success: false, error: '未配置图片反推 API Key，请先在设置中填写图片 API 渠道。' });
      }
      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ success: false, error: '请至少上传一张参考图片。' });
      }
      const expectCount = mode === 'fl2va' ? 2 : 1;
      if (images.length !== expectCount) {
        return res.status(400).json({ success: false, error: `${mode === 'fl2va' ? 'FL2VA 需要上传两张图片（首帧+尾帧）' : mode === 'l2va' ? 'L2VA 需要上传一张尾帧图片' : 'I2VA 需要上传一张首帧图片'}，当前收到 ${images.length} 张。` });
      }

      // detail（英文详情）模式下，user 指令也须用英文，否则模型会优先服从中文要求
      const isEnglishStyle = style === 'detail';
      const modeInstruction: Record<string, string> = {
        i2va: isEnglishStyle
          ? 'This is the first-frame reference image for an H3 video generation. Reverse-engineer it into a core content prompt: describe the subject, action state, composition, scene environment, lighting atmosphere and a continuable camera starting point in detail, in English, as a standalone creative description for video generation.'
          : '这是一张 H3 视频生成的首帧参考图。请反推出这份核心内容提示词：详细描述画面中的主体、动作状态、构图、场景环境、光线氛围与可延续的镜头起点，用中文写一段可直接作为视频生成核心创意的描述。',
        fl2va: isEnglishStyle
          ? 'These are two reference images for an H3 video generation (first is the start frame, second is the end frame). Reverse-engineer the core content prompt: describe both frames separately, then give a continuous motion path from start to end (subject action, pose changes, composition evolution, scene and lighting transition), in English, as a standalone creative description for video generation.'
          : '这是两张 H3 视频生成的参考图（第一张为首帧，第二张为尾帧）。请反推出这份核心内容提示词：分别描述两张图的内容，并给出从首帧发展到尾帧的连续运动路径（主体动作、姿态变化、构图演变、场景与光线过渡），用中文写一段可直接作为视频生成核心创意的描述。',
        l2va: isEnglishStyle
          ? 'This is the end-frame reference image for an H3 video generation. Reverse-engineer the core content prompt: describe the final frame state, then reasonably infer a continuous opening state and the path to reach it (how the subject, objects, camera and scene gradually converge to this frame), in English, as a standalone creative description for video generation.'
          : '这是一张 H3 视频生成的尾帧参考图。请反推出这份核心内容提示词：描述图中最终画面状态，并合理反推一个与之连续的开场状态与到达路径（人物、物体、镜头、场景如何逐步收敛到该画面），用中文写一段可直接作为视频生成核心创意的描述。',
      };

      // 反推输出风格（参考 ComfyUI Prompt Assistant 的 vision_prompts 模板）
      const styleSystem: Record<string, string> = {
        natural: '你是专业的 H3 视频提示词前置分析器。只根据用户提供的参考图反推核心内容提示词，输出自然语言描述，不生成最终 H3 成品，不输出 JSON。',
        pixel: '你是一位拥有像素级观察力的视觉分析专家，擅长为 AI 视频/图像生成工具反推精准详尽的提示词。请深度解析参考图中的每一个细节：主体、动作、服装、场景、光线、色彩、材质、镜头与氛围，输出完整能复现画面细节的中文自然语言描述。格式纯净，不输出 Markdown 符号、不做中英对照括号、不输出 JSON。',
        tags: '你是一位精通 Danbooru 标签体系与权重语法的视觉分析专家。请深度解析参考图，将画面中的每一个细节拆解并转化为高信息密度的逗号分隔标签流（Tags）。核心主体使用权重括号如 (subject:1.2)。只输出标签，严禁自然语言句子，不输出 JSON。',
        i2v: '你是一位精通人体工学与物理引擎的 AI 视频提示词专家。基于参考图（初始帧）和用户动态指令，生成可直接供视频生成模型执行的提示词。提示词必须包含时间轴上的变化（从...变为...），处理肢体连贯性、服饰物理反馈及惯性细节。只输出提示词正文，不输出 JSON。',
        detail: 'You are a professional AI Image Prompt and Reverse Engineering Expert. Generate precise, detailed English descriptions of the reference image covering subject, action, composition, scene, lighting, color, texture and atmosphere, suitable for AI video/image generation. Output clean natural language only, no JSON.',
      };

      const imageContent = images.map((img: string) => ({
        type: 'image_url' as const,
        image_url: { url: img },
      }));

      const client = new OpenAI({ baseURL: baseUrl, apiKey });

      // SSE 流式输出：delta 逐字推送，最后 done 收尾
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
      const send = (event: string, data: unknown) => {
        if (res.writableEnded || res.destroyed) return;
        res.write(formatSseEvent({ event, data }));
      };

      const stream: any = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: styleSystem[style] || styleSystem.natural },
          { role: 'user', content: [{ type: 'text', text: modeInstruction[mode] }, ...imageContent] },
        ],
        max_tokens: 1600,
        stream: true,
      });

      let description = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          description += delta.content;
          send('delta', { text: delta.content });
        }
      }

      if (!description.trim()) {
        send('error', { error: '图片反推模型未返回有效内容，请检查模型是否支持图片输入。' });
        res.end();
        return;
      }
      send('done', { success: true, description: description.trim(), mode, style });
      res.end();
    } catch (e: any) {
      console.error('Vision describe error:', e?.message || e);
      if (res.headersSent) {
        res.write(formatSseEvent({ event: 'error', data: { error: e?.message || '图片反推失败，请检查图片 API 渠道配置或模型是否支持视觉输入。' } }));
        res.end();
      } else {
        return res.status(500).json({ success: false, error: e?.message || '图片反推失败，请检查图片 API 渠道配置或模型是否支持视觉输入。' });
      }
    }
  });

  // History GET & POST & DELETE
  app.get('/api/history', (req, res) => {
    try {
      const limit = Number(req.query.limit || 300);
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const history = loadHistoryItems({ historyDir, legacyHistoryFile: historyFile }, { date, limit });
      return res.json({ success: true, history, count: history.length, limit, date, storage: 'daily-jsonl' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/history/dates', (req, res) => {
    try {
      const dates = listHistoryDates({ historyDir, legacyHistoryFile: historyFile });
      return res.json({ success: true, dates, count: dates.length, storage: 'daily-jsonl' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/history', (req, res) => {
    try {
      const newItem = req.body;
      const item = appendHistoryItem({ historyDir, legacyHistoryFile: historyFile }, newItem);
      return res.json({ success: true, item, storage: 'daily-jsonl' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/history', (req, res) => {
    try {
      const id = req.query.id || req.body?.id;
      if (id) {
        const removed = deleteHistoryItem({ historyDir, legacyHistoryFile: historyFile }, String(id));
        const remaining = loadHistoryItems({ historyDir, legacyHistoryFile: historyFile }, { limit: 1 }).length;
        return res.json({ success: true, removed, remaining });
      } else {
        clearHistory({ historyDir, legacyHistoryFile: historyFile });
        return res.json({ success: true, message: '已清空历史记录' });
      }
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Helper to read local media files and match with skills & gallery
  const getLocalMediaFiles = () => {
    if (!fs.existsSync(mediaDir)) return [];
    try {
      return fs.readdirSync(mediaDir);
    } catch {
      return [];
    }
  };

  // Helper to open local folder in OS File Explorer
  app.post('/api/open-local-folder', (req, res) => {
    const { folderType = 'media' } = req.body;
    let targetPath = mediaDir;
    if (folderType === 'data') targetPath = dataDir;

    console.log(`[Open Folder Request] Target path: ${targetPath}`);

    // Try platform-specific command
    let command = '';
    const platform = process.platform;
    if (platform === 'win32') {
      command = `start "" "${targetPath}"`;
    } else if (platform === 'darwin') {
      command = `open "${targetPath}"`;
    } else {
      command = `xdg-open "${targetPath}"`;
    }

    exec(command, (err) => {
      if (err) {
        console.warn('Command exec open folder warning:', err.message);
        // Fallback or send success as folder is ensured to exist
      }
      return res.json({
        success: true,
        path: targetPath,
        message: `已为您成功尝试在系统文件管理器中打开本地目录:\n${targetPath}`,
      });
    });
  });

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // GET /api/skills - Load skill presets and attach video previews if matching media exists
  app.get('/api/skills', (req, res) => {
    try {
      const officialSkills = loadRuntimeH3Skills().map(toPublicSkill);
      let customSkills: any[] = [];

      if (fs.existsSync(skillsFile)) {
        const raw = fs.readFileSync(skillsFile, 'utf-8');
        const savedSkills = JSON.parse(raw);
        const officialIds = new Set(officialSkills.map((skill: any) => skill.id));
        customSkills = Array.isArray(savedSkills)
          ? savedSkills.filter((skill: any) => {
              return skill?.id?.startsWith('custom_') || !officialIds.has(skill?.id);
            })
          : [];
      }

      const skills = [...officialSkills, ...customSkills];
      const mediaFiles = getLocalMediaFiles();

      // Check for video/image matching each skill.id (e.g., cinematic_imax.mp4 / .png)
      const enrichedSkills = skills.map((skill: any) => {
        const match = mediaFiles.find((file) => {
          const nameWithoutExt = path.parse(file).name;
          return nameWithoutExt.toLowerCase() === skill.id.toLowerCase();
        });

        if (match) {
          return {
            ...skill,
            mediaPreviewUrl: `/api/media/${match}`,
          };
        }
        return skill;
      });

      return res.json({ success: true, skills: enrichedSkills, count: enrichedSkills.length });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/image-skills', (_req, res) => {
    try {
      const skills = loadRuntimeImageSkills().map(toPublicImageSkill);
      return res.json({ success: true, skills, count: skills.length });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || '图片 Skill 加载失败' });
    }
  });

  // POST /api/skills - Add or update custom skill preset
  app.post('/api/skills', (req, res) => {
    try {
      const newSkill = req.body;
      if (!newSkill || !newSkill.id || !newSkill.title) {
        return res.status(400).json({ success: false, error: '技能必须包含有效的 id 和 title' });
      }

      let skills = [];
      if (fs.existsSync(skillsFile)) {
        skills = JSON.parse(fs.readFileSync(skillsFile, 'utf-8'));
      }

      const index = skills.findIndex((s: any) => s.id === newSkill.id);
      if (index >= 0) {
        skills[index] = { ...skills[index], ...newSkill };
      } else {
        skills.unshift(newSkill);
      }

      fs.writeFileSync(skillsFile, JSON.stringify(skills, null, 2), 'utf-8');
      return res.json({ success: true, skill: newSkill, skills });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // DELETE /api/skills/:id
  app.delete('/api/skills/:id', (req, res) => {
    try {
      const { id } = req.params;
      if (!fs.existsSync(skillsFile)) return res.json({ success: true });

      let skills = JSON.parse(fs.readFileSync(skillsFile, 'utf-8'));
      skills = skills.filter((s: any) => s.id !== id);
      fs.writeFileSync(skillsFile, JSON.stringify(skills, null, 2), 'utf-8');
      return res.json({ success: true, remaining: skills.length });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/gallery - Load gallery items + local scanned media files
  app.get('/api/gallery', (req, res) => {
    try {
      let gallery = [];
      if (fs.existsSync(galleryFile)) {
        gallery = JSON.parse(fs.readFileSync(galleryFile, 'utf-8'));
      } else {
        gallery = INITIAL_GALLERY;
      }

      const scanConfig = getGalleryScanConfig();
      const localDiscoveredItems = scanGalleryDirectories({
        roots: scanConfig.roots,
        maxDepth: scanConfig.maxDepth,
        maxFiles: scanConfig.maxFiles,
        mediaUrlForFile: (filePath) => mediaUrlForConfiguredRoots(mediaDir, filePath),
      });

      // Merge manually uploaded/edited items + local discovered items + seed gallery
      const mergedMap = new Map();
      localDiscoveredItems.forEach(item => mergedMap.set(item.id, item));
      gallery.forEach((item: any) => mergedMap.set(item.id, item));

      const mergedList = Array.from(mergedMap.values());
      return res.json({
        success: true,
        items: mergedList,
        count: mergedList.length,
        scannedCount: localDiscoveredItems.length,
        scanRoots: scanConfig.roots,
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/gallery - Add or update gallery item
  app.post('/api/gallery', (req, res) => {
    try {
      const newItem = req.body;
      if (!newItem || !newItem.id || !newItem.title) {
        return res.status(400).json({ success: false, error: '画廊项目必须包含有效的 id 和 title' });
      }

      let gallery = [];
      if (fs.existsSync(galleryFile)) {
        gallery = JSON.parse(fs.readFileSync(galleryFile, 'utf-8'));
      }

      const index = gallery.findIndex((g: any) => g.id === newItem.id);
      if (index >= 0) {
        gallery[index] = { ...gallery[index], ...newItem };
      } else {
        gallery.unshift(newItem);
      }

      fs.writeFileSync(galleryFile, JSON.stringify(gallery, null, 2), 'utf-8');
      return res.json({ success: true, item: newItem, gallery });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Helper function to format Base URL
  const formatBaseUrl = (url?: string) => {
    if (!url || !url.trim()) return 'https://api.deepseek.com';
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    return clean.replace(/\/+$/, '');
  };

  // Validate API Key & Connection
  app.post(['/api/deepseek/validate-key', '/api/llm/validate-key'], async (req, res) => {
    try {
      const apiKey = req.body.apiKey || process.env.DEEPSEEK_API_KEY;
      const rawBaseUrl = req.body.baseUrl || req.body.customBaseUrl || process.env.DEEPSEEK_BASE_URL;
      const baseUrl = formatBaseUrl(rawBaseUrl);
      const model = req.body.model || 'deepseek-v4-flash';

      if (!apiKey) {
        return res.status(400).json({ valid: false, error: '未提供 API 密钥 (API Key)' });
      }

      console.log(`[API Validate] Connecting to BaseURL: ${baseUrl}, Model: ${model}`);

      const client = new OpenAI({
        baseURL: baseUrl,
        apiKey: apiKey,
      });

      // Quick test completion
      const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: 'Hi, respond with OK.' }],
        max_tokens: 10,
      });

      if (response && response.choices && response.choices.length > 0) {
        return res.json({ 
          valid: true, 
          message: `API 接口测试成功！渠道: ${baseUrl} (${model})` 
        });
      } else {
        return res.status(400).json({ valid: false, error: 'API 服务响应为空，请检查渠道状态' });
      }
    } catch (err: any) {
      console.error('API Validation Error:', err?.message || err);
      return res.status(400).json({ 
        valid: false, 
        error: err?.message || 'API 校验失败，请检查 Base URL、API Key 或模型名称是否正确' 
      });
    }
  });

  // Convert internal AgentMessage (tool_calls as {id,name,args}) to OpenAI chat format
  // (tool_calls as {id,type,function:{name,arguments:string}})
  function toOpenAiMessage(m: any): any {
    if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.tool_calls.map((tc: any) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.args ?? {}) },
        })),
      };
    }
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.tool_call_id, content: m.content };
    }
    return { role: m.role, content: m.content };
  }

  const createOfflineAgentCall = (): H3AgentLlmCall => async () => {
    throw new Error('当前 H3 Skill 工作流必须配置可用的 API Key；已禁用不执行真实 Skill 流程的离线伪结果。');
  };

  const isAbortError = (error: any, signal?: AbortSignal) =>
    signal?.aborted || error?.name === 'AbortError' || error?.code === 'ABORT_ERR';

  const shouldRetryWithoutThinking = (error: any, signal?: AbortSignal) => {
    if (isAbortError(error, signal)) return false;
    const status = Number(error?.status || error?.statusCode || 0);
    if (status !== 400 && status !== 422) return false;
    const message = String(error?.message || error?.error?.message || '');
    return /(thinking|reasoning[_ -]?effort)/i.test(message)
      && /(unsupported|not supported|unknown|unrecognized|invalid|unexpected|parameter)/i.test(message);
  };

  // Parse valid max_tokens range from provider error and auto-adjust
  const adjustMaxTokens = (error: any, completionParams: any): boolean => {
    const message = String(error?.message || error?.error?.message || '');
    const rangeMatch = message.match(/max_tokens.*?\[(\d+),\s*(\d+)\]/i);
    if (!rangeMatch) return false;
    const maxAllowed = parseInt(rangeMatch[2], 10);
    const current = Number(completionParams.max_tokens || 0);
    if (maxAllowed > 0 && current > maxAllowed) {
      completionParams.max_tokens = maxAllowed;
      return true;
    }
    return false;
  };

  app.post('/api/image-prompt/generate-stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const requestController = new AbortController();
    const abortRequest = () => {
      if (requestController.signal.aborted) return;
      const abortError = new Error('客户端已停止生成。');
      abortError.name = 'AbortError';
      requestController.abort(abortError);
    };
    req.on('aborted', abortRequest);
    let responseFinished = false;
    res.on('finish', () => { responseFinished = true; });
    res.on('close', () => { if (!responseFinished) abortRequest(); });

    const send = (event: string, data: unknown) => {
      if (res.writableEnded || res.destroyed || requestController.signal.aborted) return;
      res.write(formatSseEvent({ event, data }));
    };

    try {
      const {
        prompt,
        skillId = 'gaven-direct-image-prompts',
        format = 'generic',
        aspectRatio = '1:1',
        styleCodes = '',
        model = 'deepseek-v4-flash',
        thinkingEnabled = true,
        reasoningEffort = 'medium',
        temperature = 0.7,
        userApiKey,
        baseUrl: userBaseUrl,
        customBaseUrl,
      } = req.body || {};

      const allowedFormats = new Set<ImagePromptFormat>(['generic', 'midjourney', 'flux', 'sdxl', 'jimeng', 'doubao']);
      const allowedRatios = new Set<AspectRatio>(['16:9', '9:16', '21:9', '1:1', '4:3', '3:4']);
      const allowedEfforts = new Set(['low', 'medium', 'high']);
      if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 20000) {
        throw new Error('请输入 1 到 20000 字符的图片画面创意。');
      }
      if (!allowedFormats.has(format)) throw new Error('不支持的图片提示词格式。');
      if (!allowedRatios.has(aspectRatio)) throw new Error('不支持的图片画幅。');
      if (typeof thinkingEnabled !== 'boolean') throw new Error('thinkingEnabled 必须是布尔值。');
      if (!allowedEfforts.has(reasoningEffort)) throw new Error('reasoningEffort 必须是 low、medium 或 high。');

      const skills = loadRuntimeImageSkills();
      const skill = resolveImageSkillById(skillId, skills);
      if (!skill) throw new Error(`未找到图片 Skill: ${skillId}`);

      const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('图片提示词生成需要配置可用的 API Key。');
      const baseUrl = formatBaseUrl(userBaseUrl || customBaseUrl || process.env.DEEPSEEK_BASE_URL);
      const client = new OpenAI({ baseURL: baseUrl, apiKey });
      const systemPrompt = buildImagePromptSystemPrompt({ skill, format, aspectRatio, styleCodes });
      const reasoning: ReasoningUsage = {
        requested: thinkingEnabled,
        applied: thinkingEnabled,
        effort: thinkingEnabled ? reasoningEffort : undefined,
      };

      send('stage', { stage: 'prepare', message: `正在加载 ${skill.title}...` });
      send('stage', { stage: 'generate', message: `正在生成 ${format} 图片提示词...` });

      const completionParams: any = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt.trim() },
        ],
        temperature,
        stream: true,
        max_tokens: 32768,
      };
      if (thinkingEnabled) {
        completionParams.thinking = { type: 'enabled' };
        completionParams.reasoning_effort = reasoningEffort;
      }

      const runStream = async () => {
        let content = '';
        const stream = await client.chat.completions.create(completionParams, { signal: requestController.signal });
        for await (const chunk of stream as any) {
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.reasoning_content) send('delta', { text: delta.reasoning_content, kind: 'reasoning' });
          if (delta?.content) {
            content += delta.content;
            send('delta', { text: delta.content, kind: 'content' });
          }
        }
        return content;
      };

      let rawContent = '';
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          rawContent = await runStream();
          break;
        } catch (error: any) {
          if (isAbortError(error, requestController.signal)) throw error;
          if (adjustMaxTokens(error, completionParams)) continue;
          const action = reasoningFallbackAction({
            status: Number(error?.status || error?.statusCode || 0),
            message: String(error?.message || error?.error?.message || ''),
          });
          if (action === 'drop-effort' && completionParams.reasoning_effort) {
            delete completionParams.reasoning_effort;
            reasoning.effort = undefined;
            reasoning.downgradeReason = '当前模型不支持思考强度，已保留思考模式。';
            send('stage', { stage: 'compatibility', message: reasoning.downgradeReason });
            continue;
          }
          if (action === 'disable-thinking' && completionParams.thinking) {
            delete completionParams.thinking;
            delete completionParams.reasoning_effort;
            reasoning.applied = false;
            reasoning.effort = undefined;
            reasoning.downgradeReason = '当前模型不支持思考模式，已自动关闭。';
            send('stage', { stage: 'compatibility', message: reasoning.downgradeReason });
            continue;
          }
          throw error;
        }
      }
      if (!rawContent) throw new Error('图片提示词模型未返回有效内容。');

      send('stage', { stage: 'validate', message: '正在校验画面结构并转换目标格式...' });
      const canonical = parseImagePromptCanonical(rawContent);
      const target = formatImagePrompt(canonical, format, aspectRatio);
      const finalData = {
        success: true,
        matchedSkill: skill.id,
        canonical,
        target,
        reasoning,
        model,
      };
      if (!res.writableEnded && !res.destroyed && !requestController.signal.aborted) {
        res.write(formatSseEvent({ event: 'final', data: finalData }));
      }
      res.end();
    } catch (error: any) {
      if (isAbortError(error, requestController.signal)) {
        if (!res.writableEnded && !res.destroyed) res.end();
        return;
      }
      console.error('Image Prompt Stream Error:', error?.message || error);
      send('error', { success: false, error: error?.message || '图片提示词生成失败' });
      res.end();
    }
  });

  // Streaming MiniMax-H3 Skill Agent Endpoint (SSE over fetch stream)
  app.post('/api/h3-agent/generate-stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const requestController = new AbortController();
    const abortRequest = () => {
      if (requestController.signal.aborted) return;
      const abortError = new Error('客户端已停止生成。');
      abortError.name = 'AbortError';
      requestController.abort(abortError);
    };
    req.on('aborted', abortRequest);
    let responseFinished = false;
    res.on('finish', () => {
      responseFinished = true;
    });
    res.on('close', () => {
      if (!responseFinished) abortRequest();
    });

    const send = (event: string, data: unknown) => {
      if (res.writableEnded || res.destroyed || requestController.signal.aborted) return;
      res.write(formatSseEvent({ event, data }));
    };

    try {
      const {
        messages = [],
        model = 'deepseek-v4-flash',
        thinkingEnabled = true,
        reasoningEffort = 'medium',
        userApiKey,
        baseUrl: userBaseUrl,
        customBaseUrl,
        options = {},
      } = req.body;

      const userMessage = messages[messages.length - 1]?.content || options.userPrompt || '一个女孩';
      const roughUserPrompt = options.userPrompt || userMessage;
      const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY;
      const baseUrl = formatBaseUrl(userBaseUrl || customBaseUrl || process.env.DEEPSEEK_BASE_URL);
      const h3Skills = loadRuntimeH3Skills();
      const h3Reasoning: ReasoningUsage = {
        requested: thinkingEnabled,
        applied: thinkingEnabled,
        effort: thinkingEnabled ? reasoningEffort : undefined,
      };

      send('stage', { stage: 'prepare', message: '正在准备 MiniMax-H3 官方 skill 上下文...' });

      const client = apiKey
        ? new OpenAI({
            baseURL: baseUrl,
            apiKey,
          })
        : null;

      const offlineAgentCall = createOfflineAgentCall();
      const callLlm: H3AgentLlmCall = client
        ? async ({ systemPrompt, messages: loopMessages, tools, temperature, signal }) => {
            const completionParams: any = {
              model,
              messages: [{ role: 'system', content: systemPrompt }, ...loopMessages.map(toOpenAiMessage)],
              temperature,
              stream: true,
              max_tokens: 393216,
            };
            if (Array.isArray(tools) && tools.length > 0) {
              completionParams.tools = tools.map((t) => ({ type: 'function', function: t.function }));
              completionParams.tool_choice = 'auto';
            }
            if (h3Reasoning.applied) {
              completionParams.thinking = { type: 'enabled' };
              if (h3Reasoning.effort) completionParams.reasoning_effort = h3Reasoning.effort;
            }

            const runStream = async () => {
              let content = '';
              const toolCallMap = new Map<number, { id: string; name: string; argsRaw: string }>();
              const stream = await client.chat.completions.create(completionParams, { signal });
              for await (const chunk of stream as any) {
                const delta = chunk.choices?.[0]?.delta;
                if (delta?.reasoning_content) {
                  content += delta.reasoning_content;
                  send('delta', { text: delta.reasoning_content, kind: 'reasoning' });
                }
                if (delta?.content) {
                  content += delta.content;
                  send('delta', { text: delta.content, kind: 'content' });
                }
                if (Array.isArray(delta?.tool_calls)) {
                  for (const tc of delta.tool_calls) {
                    const idx = typeof tc.index === 'number' ? tc.index : 0;
                    if (!toolCallMap.has(idx)) {
                      toolCallMap.set(idx, { id: tc.id || '', name: '', argsRaw: '' });
                    }
                    const entry = toolCallMap.get(idx)!;
                    if (tc.id) entry.id = tc.id;
                    if (tc.function?.name) entry.name += tc.function.name;
                    if (tc.function?.arguments) entry.argsRaw += tc.function.arguments;
                  }
                }
              }
              const tool_calls = Array.from(toolCallMap.values()).map((tc) => {
                let args: Record<string, unknown> = {};
                try {
                  args = tc.argsRaw ? JSON.parse(tc.argsRaw) : {};
                } catch {
                  args = { _raw: tc.argsRaw };
                }
                return {
                  id: tc.id || `call_${Math.random().toString(36).slice(2, 10)}`,
                  name: tc.name,
                  args,
                };
              });
              return { content, tool_calls };
            };

            for (let attempt = 0; attempt < 4; attempt += 1) {
              try {
                return await runStream();
              } catch (firstErr: any) {
                if (isAbortError(firstErr, signal)) throw firstErr;
                if (adjustMaxTokens(firstErr, completionParams)) {
                  console.warn(`[H3 Agent Stream] Retry with adjusted max_tokens=${completionParams.max_tokens}`);
                  continue;
                }
                const action = reasoningFallbackAction({
                  status: Number(firstErr?.status || firstErr?.statusCode || 0),
                  message: String(firstErr?.message || firstErr?.error?.message || ''),
                });
                if (action === 'drop-effort' && completionParams.reasoning_effort) {
                  delete completionParams.reasoning_effort;
                  h3Reasoning.effort = undefined;
                  h3Reasoning.downgradeReason = '当前模型不支持思考强度，已保留思考模式。';
                  send('stage', { stage: 'compatibility', message: h3Reasoning.downgradeReason });
                  continue;
                }
                if (action === 'disable-thinking' && completionParams.thinking) {
                  delete completionParams.thinking;
                  delete completionParams.reasoning_effort;
                  h3Reasoning.applied = false;
                  h3Reasoning.effort = undefined;
                  h3Reasoning.downgradeReason = '当前模型不支持思考模式，已自动关闭。';
                  send('stage', { stage: 'compatibility', message: h3Reasoning.downgradeReason });
                  continue;
                }
                throw firstErr;
              }
            }
            throw new Error('模型兼容重试次数已用尽。');
          }
        : offlineAgentCall;

      const agentResult = await runH3AgentGeneration({
        userPrompt: roughUserPrompt,
        skills: h3Skills,
        skillsRoot: h3SkillsDir,
        callLlm,
        options: {
          ...options,
          skillId: options.skillId,
          inputMode: options.inputMode || 'text',
          sceneMode: options.sceneMode,
        },
        emit: (event) => {
          if (event.type === 'turn_start') {
            send('stage', { stage: event.stage || `turn_${event.turn}`, message: event.message || `Agent 推理第 ${event.turn} 轮...` });
          } else if (event.type === 'tool_call') {
            send('stage', { stage: `tool_${event.toolName}`, message: event.message || `调用工具 ${event.toolName}` });
          } else if (event.type === 'tool_result' && event.toolName === 'validate_skill_output') {
            send('stage', { stage: 'validate', message: event.message || (event.issues && event.issues.length ? `校验发现 ${event.issues.length} 个问题` : '校验通过') });
          }
        },
        signal: requestController.signal,
      });

      send('final', {
        success: true,
        ...agentResult,
        reasoning: h3Reasoning,
        model: apiKey ? model : `${model} (内置 H3 Agent Runtime)`,
        content: JSON.stringify(agentResult.structuredOutput, null, 2),
      });
      res.end();
    } catch (err: any) {
      if (isAbortError(err, requestController.signal)) {
        if (!res.writableEnded && !res.destroyed) res.end();
        return;
      }
      console.error('H3 Agent Stream Error:', err?.message || err);
      send('error', {
        success: false,
        error: err?.message || 'H3 Agent 流式生成失败，请检查 API Key、Base URL 或模型名称',
      });
      res.end();
    }
  });

  // Multi-turn MiniMax-H3 Skill Agent Endpoint
  app.post('/api/h3-agent/generate', async (req, res) => {
    const requestController = new AbortController();
    const abortRequest = () => {
      if (requestController.signal.aborted) return;
      const abortError = new Error('客户端已停止生成。');
      abortError.name = 'AbortError';
      requestController.abort(abortError);
    };
    req.on('aborted', abortRequest);
    let responseFinished = false;
    res.on('finish', () => {
      responseFinished = true;
    });
    res.on('close', () => {
      if (!responseFinished) abortRequest();
    });

    try {
      const {
        messages = [],
        model = 'deepseek-v4-flash',
        thinkingEnabled = true,
        reasoningEffort = 'medium',
        userApiKey,
        baseUrl: userBaseUrl,
        customBaseUrl,
        options = {},
      } = req.body;

      const userMessage = messages[messages.length - 1]?.content || options.userPrompt || '一个女孩';
      const roughUserPrompt = options.userPrompt || userMessage;
      const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY;
      const baseUrl = formatBaseUrl(userBaseUrl || customBaseUrl || process.env.DEEPSEEK_BASE_URL);
      const h3Skills = loadRuntimeH3Skills();

      const offlineAgentCall = createOfflineAgentCall();

      const client = apiKey
        ? new OpenAI({
            baseURL: baseUrl,
            apiKey,
          })
        : null;

      const callLlm: H3AgentLlmCall = client
        ? async ({ systemPrompt, messages: loopMessages, tools, temperature, signal }) => {
            const completionParams: any = {
              model,
              messages: [{ role: 'system', content: systemPrompt }, ...loopMessages.map(toOpenAiMessage)],
              temperature,
            };
            if (Array.isArray(tools) && tools.length > 0) {
              completionParams.tools = tools.map((t) => ({ type: 'function', function: t.function }));
              completionParams.tool_choice = 'auto';
            }
            if (thinkingEnabled) {
              completionParams.thinking = { type: 'enabled' };
              completionParams.reasoning_effort = reasoningEffort;
            }

            const runOnce = async () => {
              const completion: any = await client.chat.completions.create(completionParams, { signal });
              const msg = completion.choices?.[0]?.message;
              const content = msg?.content || '';
              const tool_calls = Array.isArray(msg?.tool_calls)
                ? msg.tool_calls.map((tc: any) => {
                    let args: Record<string, unknown> = {};
                    try {
                      args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
                    } catch {
                      args = { _raw: tc.function?.arguments };
                    }
                    return {
                      id: tc.id || `call_${Math.random().toString(36).slice(2, 10)}`,
                      name: tc.function?.name || '',
                      args,
                    };
                  })
                : [];
              return { content, tool_calls };
            };

            try {
              return await runOnce();
            } catch (firstErr: any) {
              if (isAbortError(firstErr, signal)) throw firstErr;
              if (shouldRetryWithoutThinking(firstErr, signal)) {
                console.warn('[H3 Agent] Retry without thinking params due to:', firstErr?.message);
                delete completionParams.thinking;
                delete completionParams.reasoning_effort;
                return await runOnce();
              }
              throw firstErr;
            }
          }
        : offlineAgentCall;

      const agentResult = await runH3AgentGeneration({
        userPrompt: roughUserPrompt,
        skills: h3Skills,
        skillsRoot: h3SkillsDir,
        callLlm,
        options: {
          ...options,
          skillId: options.skillId,
          inputMode: options.inputMode || 'text',
          sceneMode: options.sceneMode,
        },
        signal: requestController.signal,
      });

      return res.json({
        success: true,
        ...agentResult,
        model: apiKey ? model : `${model} (内置 H3 Agent Runtime)`,
        content: JSON.stringify(agentResult.structuredOutput, null, 2),
      });
    } catch (err: any) {
      if (isAbortError(err, requestController.signal)) {
        if (!res.writableEnded && !res.destroyed) res.end();
        return;
      }
      console.error('H3 Agent Generation Error:', err?.message || err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'H3 Agent 生成失败，请检查 API Key、Base URL 或模型名称',
      });
    }
  });

  // Universal Generation Endpoint
  app.post(['/api/deepseek/generate', '/api/llm/generate'], async (req, res) => {
    try {
      const {
        messages = [],
        model = 'deepseek-v4-flash',
        thinkingEnabled = true,
        reasoningEffort = 'high',
        userApiKey,
        baseUrl: userBaseUrl,
        customBaseUrl,
        options = {},
      } = req.body;

      const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY;
      const baseUrl = formatBaseUrl(userBaseUrl || customBaseUrl || process.env.DEEPSEEK_BASE_URL);
      const userMessage = messages[messages.length - 1]?.content || '赛博朋克雨夜武士';
      const roughUserPrompt = options.userPrompt || userMessage;
      const h3Skills = loadRuntimeH3Skills();
      const selectedH3Skill =
        resolveH3SkillById(options.skillId, h3Skills) ||
        selectH3SkillForRequest(roughUserPrompt, h3Skills);
      const h3SystemPrompt = composeH3SystemPrompt({
        skill: selectedH3Skill,
        options,
        outputMode: 'json',
      });

      // If no API key is provided, generate a fallback MiniMax-H3 response
      if (!apiKey) {
        console.log('[API Proxy] No API key provided, returning local MiniMax-H3 rule generator response.');

        // Wait a small artificial delay to simulate AI thinking
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const cameraMotionStr = options.manualAuxiliaryParams?.camera?.value || '由用户描述与 Skill 决定';
        const lensTypeStr = options.manualAuxiliaryParams?.lens?.value || '由用户描述与 Skill 决定';
        const lightingStr = options.manualAuxiliaryParams?.lighting?.value || '由用户描述与 Skill 决定';
        const targetModelStr = options.manualAuxiliaryParams?.targetModel?.presetId || 'minimax-h3';
        const aspectRatioStr = options.aspectRatio || '16:9';

        const thinkingProcess = `1. 分析用户意图: "${roughUserPrompt}"
2. 选择官方 MiniMax-H3 Skill: ${selectedH3Skill.id} (${selectedH3Skill.title})
3. 应用 MiniMax-H3 官方提示词结构:
   - integrated_multimodal_description: 将主体、环境、动作、镜头、时间线整合为连续视频描述。
   - overall_soundscape: 描述画面内可听见的环境声、动作声、空间声。
   - non_diegetic_music: 描述非画面内音乐、节奏、情绪铺底。
4. 应用 MiniMax-H3 (海螺AI) 视频提示词工程法则:
   - 主体与微动作: 细化人物服饰(高科技纹理/飘带)、面部微表情、雨滴顺着发光面罩滑落的微观动态。
   - 运镜轨迹: 选择 ${cameraMotionStr}，通过慢速后退与平滑推近塑造三维空间穿透感。
   - 镜头与光影: 配备 ${lensTypeStr}，环境采用 ${lightingStr}，极速渲染湿滑地面的霓虹倒影与丁达尔体积光。
   - 视频模型匹配: 针对 ${targetModelStr} 的物理引擎优化语法，避免肢体变形与闪烁。
5. 结构化合成英文主 Prompt 与中文深度释义，生成针对负面提示词 (Negative Prompt) 的排除项。`;

        const structuredOutput = {
          title: `MiniMax-H3 视频生成提示词: ${String(roughUserPrompt).slice(0, 16)}`,
          englishPrompt: `integrated_multimodal_description:
[0-${options.duration || '6s'}] ${roughUserPrompt}. Build the scene as a continuous MiniMax-H3 video shot using ${selectedH3Skill.titleEn}. The subject has physically plausible micro-movements, natural weight transfer, detailed surface textures, and environment-driven motion. Camera uses ${cameraMotionStr} with smooth, low-jitter movement, shot on ${lensTypeStr}. Lighting follows ${lightingStr}, with coherent reflections, depth, particles, and atmosphere. Keep spatial continuity, stable identity, and realistic cause-and-effect throughout the full duration.

overall_soundscape:
Layer natural diegetic sound that matches the visible motion: subtle ambience, close physical texture sounds, environmental reflections, and distance cues synchronized to camera movement.

non_diegetic_music:
Use restrained cinematic music that supports the selected style without overpowering the scene; keep rhythm aligned with the main camera move and emotional beat.`,
          chineseTranslation: `已按官方 ${selectedH3Skill.title} skill 的 H3 字段组织输出：integrated_multimodal_description / overall_soundscape / non_diegetic_music。画面核心为：${roughUserPrompt}。运镜采用 ${cameraMotionStr}，镜头采用 ${lensTypeStr}，光影采用 ${lightingStr}。`,
          subjectDescription: `主角拥有高精度面部和服装细节，雨滴在面罩或衣服上顺滑流淌，发丝随微风飘动，眼神专注有神。`,
          cameraMovement: `${cameraMotionStr}，镜头运动极其平滑流畅，完美展现前中后景的空间透视感。`,
          lightingAndAtmosphere: `${lightingStr}，营造沉浸式强视觉冲击力氛围。`,
          styleAndAesthetics: `${selectedH3Skill.titleEn}，遵循官方 MiniMax-H3 skill 的生产约束与审查重点。`,
          negativePrompt: `blurry, bad physics, morphing limbs, distorted face, jittering, low resolution, overexposed, static shot, watermark, text`,
          soundCue: `雨水拍打沥青路面的细腻水滴声，远处低沉的科幻引擎轰鸣声与清脆的金属摩擦声`,
          technicalParams: {
            targetModel: targetModelStr,
            aspectRatio: aspectRatioStr,
            fps: 24,
            duration: options.duration || '6s',
            motionSpeed: options.motionSpeed || 7,
          },
        };

        return res.json({
          success: true,
          thinkingProcess,
          content: JSON.stringify(structuredOutput, null, 2),
          structuredOutput,
          model: `${model} (内置引擎)`,
        });
      }

      // Real OpenAI-compatible API call
      console.log(`[Universal API Request] BaseURL: ${baseUrl}, Model: ${model}`);
      const client = new OpenAI({
        baseURL: baseUrl,
        apiKey: apiKey,
      });

      const reqMessages = [
        { role: 'system', content: h3SystemPrompt },
        ...messages,
      ];

      const completionParams: any = {
        model: model,
        messages: reqMessages,
        temperature: 0.7,
      };

      // Add thinking parameters if enabled
      if (thinkingEnabled) {
        completionParams.thinking = { type: 'enabled' };
        completionParams.reasoning_effort = reasoningEffort;
      }

      let response;
      try {
        response = await client.chat.completions.create(completionParams);
      } catch (firstErr: any) {
        if (thinkingEnabled && (completionParams.thinking || completionParams.reasoning_effort)) {
          console.warn('[API Warning] Retry without thinking/reasoning_effort extra parameters due to:', firstErr?.message);
          delete completionParams.thinking;
          delete completionParams.reasoning_effort;
          response = await client.chat.completions.create(completionParams);
        } else {
          throw firstErr;
        }
      }

      const choice = response.choices?.[0];
      const content = choice?.message?.content || '';
      
      const reasoningContent = (choice?.message as any)?.reasoning_content || 
                             (choice?.message as any)?.thinking || 
                             '思维链推理分析完成。';

      let parsedOutput = null;
      try {
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedOutput = JSON.parse(cleanContent);
      } catch (e) {
        console.warn('Failed to parse raw JSON from API, creating structured fallback wrapper');
        parsedOutput = {
          title: '视频生成提示词',
          englishPrompt: content,
          chineseTranslation: 'LLM 生成结果',
          subjectDescription: '主图细节描述',
          cameraMovement: options.manualAuxiliaryParams?.camera?.value || '由用户描述与 Skill 决定',
          lightingAndAtmosphere: options.manualAuxiliaryParams?.lighting?.value || '由用户描述与 Skill 决定',
          styleAndAesthetics: '8K 超写实电影感',
          negativePrompt: 'blurry, low quality, morphing, jittering',
          technicalParams: {
            targetModel: options.manualAuxiliaryParams?.targetModel?.presetId || 'minimax-h3',
            aspectRatio: options.aspectRatio || '16:9',
            fps: 24,
            duration: '6s',
            motionSpeed: 7,
          },
        };
      }

      return res.json({
        success: true,
        thinkingProcess: reasoningContent,
        content: content,
        structuredOutput: parsedOutput,
        model: model,
      });

    } catch (err: any) {
      console.error('Generation API Error:', err?.message || err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'API 调用发生错误，请检查 Base URL、Key 以及模型名称',
      });
    }
  });

  // Vite middleware in development mode
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const preferredPort = parseInt(process.env.PORT || '3000', 10);
  const actualPort = await findAvailablePort(preferredPort, '0.0.0.0');

  if (actualPort !== preferredPort) {
    console.warn(`[Server Warning] 端口兼容提示: 默认端口 ${preferredPort} 已被本地其他进程占用！系统已自动适配绑定可用端口: ${actualPort}`);
  }

  app.listen(actualPort, '0.0.0.0', () => {
    console.log(`[Server] MiniMax H3 Video Studio running on http://localhost:${actualPort}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Start Error]', err);
});
