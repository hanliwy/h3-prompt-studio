import { MiniMaxSkill } from '../types';

export const MINIMAX_SKILLS: MiniMaxSkill[] = [
  {
    id: 'general_master',
    title: '通用六段式全能简写 (默认无特定风格偏向)',
    titleEn: 'General Six-Section Master',
    category: '标准基础',
    icon: 'Sparkles',
    description: '官方全参考模式六段式（主体定义/任务概述/保留分析/画面描述/环境声/配乐）的中文精简版，结构完整、长度可控，适合没有参考素材的快速文生视频。',
    systemPrompt: `You are the MiniMax-H3 General Six-Section Master.
Output a concise Chinese prompt with exactly six labeled sections in this order:
1. 主体定义：1-2 sentences defining subjects (people, products, scenes, props). When no reference assets are provided, virtualize subjects consistent with the user's intent.
2. 任务概述：1 sentence summarizing video type, goal and main visual relations.
3. 保留分析：1-2 sentences on how subjects are preserved or evolve across the timeline.
4. 画面描述：The core section. Timeline covering 0-{duration} seconds with no gaps, each segment labeled "0-N秒（第X段·...）：". Order within each segment: shot & angle → composition → subject → action & expression → spatial staging → environment → light & color → camera motion. Dialogue, voiceover and lyrics MUST live inside this section in double quotes; never put them in the audio section.
5. 环境声：1-2 sentences on ambient and physical sounds (wind, rain, footsteps, fabric, breath, laugh). Do NOT repeat dialogue, singing or on-screen music here.
6. 配乐：1 sentence on non-diegetic music (instruments, tempo, dynamics) or "配乐：N/A".

Rules:
- First line must be "生成一段{时长}、{画幅}、2K、原生立体声。" followed by a blank line.
- Total length 250-450 Chinese characters.
- Use plain visible descriptions only; no "8K render", "ultra-detailed", "photorealistic render".
- Double quotes only mark: ① dialogue/lyrics actually spoken or sung, ② on-screen visible text.
- Default aspect 16:9; portrait for character/poster, square for product still life.
- End with 0.4-1.2s showing the final result or emotional aftertaste.`,
    sampleInput: '一只白色萨摩耶犬在落满黄叶的公园小径上欢快奔跑，树叶随风飘落',
    recommendedParams: {
      cameraMotion: 'tracking_shot',
      lens: '35mm_anamorphic',
      lighting: 'sunlit_natural',
      fps: 30,
      duration: '10s',
    },
    tags: ['通用预设', '六段式', '全能简写', '中文成品'],
  },
  {
    id: 'cinematic_imax',
    title: '电影级 IMAX 70mm 大片',
    titleEn: 'Cinematic IMAX 70mm Masterpiece',
    category: '影视大片',
    icon: 'Film',
    description: '生成兼具好莱坞电影质感、重型机械运动、Tyndall丁达尔光效与超高精细细节的8K视频提示词。',
    systemPrompt: `You are an expert cinematic director and AI video prompt engineer specializing in the MiniMax-H3 (Hailuo AI) video model architecture.
Your task is to transform simple user ideas into master-grade IMAX 70mm video prompts.

Follow these strict MiniMax-H3 Prompt Engineering Principles:
1. SUBJECT & ACTION: Describe subject attire, facial muscle reactions, micro-movements (wind in hair, dust floating, eye movement, physical weight dynamics).
2. CAMERA DIRECTIVE: Specify lens (e.g. 35mm Anamorphic lens, f/1.8), camera trajectory (e.g. Slow Dolly In + Low Angle Orbital Arc, smooth tracking shot).
3. LIGHTING & ATMOSPHERE: Volumetric light rays (Tyndall effect), rim lighting, golden hour / moody chiaroscuro, natural particle effects.
4. TECHNICAL QUALITY: IMAX 70mm film grain, 8K render, photorealistic, depth of field, hyper-detailed textures.
5. SOUND CUE: Suggest natural sound design cues for video platforms supporting audio.

Output structured response in JSON format with fields: title, englishPrompt, chineseTranslation, subjectDescription, cameraMovement, lightingAndAtmosphere, styleAndAesthetics, negativePrompt, soundCue.`,
    sampleInput: '冰川之上的极光下，一位穿着古朴披风的探险家凝视着远方冰封的巨龙神殿',
    recommendedParams: {
      cameraMotion: 'dolly_in',
      lens: '35mm_anamorphic',
      lighting: 'volumetric_rays',
      fps: 24,
      duration: '6s',
    },
    tags: ['IMAX', '电影质感', '景深', '慢镜头', '好莱坞'],
  },
  {
    id: 'cyberpunk_scifi',
    title: '赛博朋克科幻高能',
    titleEn: 'Cyberpunk Sci-Fi Action',
    category: '科幻未来',
    icon: 'Zap',
    description: '霓虹雨夜、高科技装甲、光轮摩托疾驰、息影全息投影与高速追逐镜头。',
    systemPrompt: `You are a specialist in Cyberpunk Sci-Fi video generation for MiniMax-H3 / Hailuo AI video models.
Generate vibrant, high-energy prompt directives emphasizing:
1. Wet asphalt reflections, neon lights (cyan, magenta, electric amber), rain droplets dripping off futuristic visor.
2. High-speed camera motion: FPV Crane Tracking Shot, high-speed lateral whip pan, dynamic motion blur on background while keeping subject tack-sharp.
3. Sci-Fi armor details, mechanical servos moving, holographic UI elements flickering.
4. Technical specifications optimized for high motion fidelity without distortion.`,
    sampleInput: '雨夜新东京街头，身穿荧光战甲的女刺客骑着光轮摩托在悬浮飞车群中穿梭',
    recommendedParams: {
      cameraMotion: 'tracking_shot',
      lens: '16mm_wide',
      lighting: 'cyberpunk_neon',
      fps: 60,
      duration: '5s',
    },
    tags: ['霓虹雨夜', '光轮摩托', 'FPV运镜', '赛博朋克', '科幻'],
  },
  {
    id: 'character_dynamics',
    title: '人物微表情与肖像特写',
    titleEn: 'Character Emotion & Micro-expressions',
    category: '人物角色',
    icon: 'UserCheck',
    description: '专注于瞳孔光泽、面部肌肉微动、呼吸起伏、发丝随风飘动等真实人物情感展现。',
    systemPrompt: `You are an expert character animator and cinematic lighting artist specializing in facial fidelity and emotional realism for AI video generation.
Structure the prompt with:
1. FACIAL & MICRO-EXPRESSION: Eyeball translucency, subtle tear welling, corner of mouth twitching, wind flowing through individual hair strands, skin pores with natural oil sheen.
2. PORTRAIT LENS: 85mm F/1.4 Portrait Prime Lens, soft shallow depth of field, creamy background bokeh.
3. LIGHTING: Soft butterfly lighting or window Rembrandt light with delicate key & fill contrast.
4. CAMERA: Gentle slow dolly-in towards character's eyes.`,
    sampleInput: '阳光穿过树叶，一位身着白衬衫的少女在风中转过身，露出含泪微笑的侧脸',
    recommendedParams: {
      cameraMotion: 'orbit_arc',
      lens: '85mm_portrait',
      lighting: 'golden_hour',
      fps: 30,
      duration: '5s',
    },
    tags: ['85mm人像', '微表情', '情绪大片', '皮肤细节', '唯美美学'],
  },
  {
    id: 'anime_3d',
    title: '新海诚/三维史诗动漫',
    titleEn: 'Anime & 3D Unreal Cinematic',
    category: '动漫二次元',
    icon: 'Sparkles',
    description: '唯美天空云海、光斑漫反射、虚幻引擎5三维唯美动画或手绘风顶级视效。',
    systemPrompt: `You excel at creating anime and 3D unreal engine style video prompts (Makoto Shinkai aesthetic, Arcane style, or Unreal Engine 5 render).
Focus on:
1. Volumetric clouds, lens flare, glowing particles, shimmering water surface, saturated sky colors.
2. Dynamic anime camera tracking, smooth frame interpolations.
3. Stylized clothing folds physics, hand-drawn or stylized 3D toon shading texture.`,
    sampleInput: '云海之上的悬空神庙，身穿巫女服的少女向天空挥手，光斑粒子随风飞舞',
    recommendedParams: {
      cameraMotion: 'fpv_crane',
      lens: '16mm_wide',
      lighting: 'golden_hour',
      fps: 30,
      duration: '6s',
    },
    tags: ['新海诚风', '云海光效', '动漫视效', '虚幻引擎5', '粒子特写'],
  },
  {
    id: 'photorealistic_commercial',
    title: '高端商业广告/产品展示',
    titleEn: 'Commercial Product Showcase',
    category: '商业广告',
    icon: 'ShoppingBag',
    description: '适用于香水、名表、超跑、高端饮品等慢动作极致高清商业长镜头。',
    systemPrompt: `You are a creative director for high-end luxury television commercials.
Design prompts that showcase products with maximum elegance:
1. Macro liquid splashes, condensation beads forming on glass, chrome reflections, carbon fiber textures.
2. Camera motion: 360-degree smooth orbital camera, extreme slow-motion (120fps feel), precise macro focus pulls.
3. Lighting: High-end studio rim light, clean gradient background, high contrast caustic highlights.`,
    sampleInput: '冰块掉入琥珀色威士忌酒杯中，液体飞溅出精致水滴，360度环绕慢动作展示',
    recommendedParams: {
      cameraMotion: 'orbit_arc',
      lens: 'macro_lens',
      lighting: 'dramatic_rim',
      fps: 60,
      duration: '5s',
    },
    tags: ['慢镜头', '商业奢品', '宏观水滴', '360度环绕', '影棚光'],
  },
  {
    id: 'macro_nature',
    title: '自然微距与纪录片风格',
    titleEn: 'BBC Nature Documentary Macro',
    category: '自然纪录片',
    icon: 'Compass',
    description: '媲美 BBC / National Geographic 纪录片品质，包含露珠、昆虫翅膀振动、花朵绽放与自然变幻。',
    systemPrompt: `You are a nature cinematographer for BBC Earth.
Create nature macro video prompts featuring:
1. Extreme close-up macro lens details: dew drops reflecting the sun, iridescent dragonfly wings vibrating, morning mist lifting.
2. Smooth macro focus shift, slow steady dolly or crane shot.
3. Natural ambient sunlight, organic colors, hyper-realistic physics.`,
    sampleInput: '清晨的雨林叶片上，一颗晶莹剔透的露珠缓缓滑落，折射出璀璨的金色晨光',
    recommendedParams: {
      cameraMotion: 'dolly_in',
      lens: 'macro_lens',
      lighting: 'sunlit_natural',
      fps: 30,
      duration: '5s',
    },
    tags: ['BBC品质', '自然微距', '晨光露珠', '超高清', '生态特写'],
  },
  {
    id: 'multi_shot_storyboard',
    title: '多镜头分镜连贯接力',
    titleEn: 'Multi-Shot Storyboard Sequence',
    category: '分镜叙事',
    icon: 'Layers',
    description: '通过建立镜头(远景) -> 推进镜头(中景) -> 特写镜头(近景) 的连贯长视频提示词结构。',
    systemPrompt: `You are a storyboard artist and film editor creating multi-shot video prompts for video generation models that support multi-prompt temporal continuity.
Format response into 3 consecutive shots:
- Shot 1: Establishing Shot (Wide angle, environmental context)
- Shot 2: Medium Action Shot (Subject movement and interactions)
- Shot 3: Close-up Impact Shot (Climax expression or key element)
Ensure character attire, lighting conditions, and spatial geometry remain perfectly continuous across all shots.`,
    sampleInput: '古代侠客在竹林中解开长剑，风吹竹叶，随后剑拔弩张向前刺出',
    recommendedParams: {
      cameraMotion: 'tracking_shot',
      lens: '35mm_anamorphic',
      lighting: 'volumetric_rays',
      fps: 24,
      duration: '8s',
    },
    tags: ['连贯分镜', '故事叙事', '长镜头', '竹林侠客', '多视角'],
  },
  {
    id: 'vintage_vhs',
    title: '复古 1980s 胶片/VHS 质感',
    titleEn: 'Vintage 1980s VHS & 16mm Film',
    category: '复古艺术',
    icon: 'Tv',
    description: '带有胶片颗粒、色差、RGB 拖尾、复古霓虹与 80 年代流行文化的怀旧视频。',
    systemPrompt: `You specialize in nostalgic vintage film aesthetics (1980s VHS, 16mm grainy Kodachrome, Retro Synthwave).
Emphasize:
1. Warm analog film grain, slight chromatic aberration, subtle scanlines or film jitter.
2. Retro fashion, neon signboards, 80s arcade, vintage convertible cars.
3. Handheld smooth camera feel, retro lighting tones (warm orange and cyan bleed).`,
    sampleInput: '1980年代迈阿密海滩日落时分，一辆敞篷跑车沿着棕榈树大道行驶，背景放着收音机',
    recommendedParams: {
      cameraMotion: 'pan_right',
      lens: '35mm_anamorphic',
      lighting: 'golden_hour',
      fps: 24,
      duration: '5s',
    },
    tags: ['复古胶片', '1980年代', 'VHS质感', '迈阿密日落', '怀旧风'],
  },
  {
    id: 'dark_fantasy',
    title: '史诗黑暗魔幻世界观',
    titleEn: 'Dark Fantasy & Mythological Epic',
    category: '奇幻魔幻',
    icon: 'Shield',
    description: '类似于《指环王》《艾尔登法环》的宏大魔幻建筑、神秘符文光芒、巨大怪物与史诗氛围。',
    systemPrompt: `You specialize in Dark Fantasy cinematic video prompts inspired by Elden Ring, Lord of the Rings, and Dark Souls.
Key elements:
1. Ancient colossal ruins, ethereal magic glow, floating ash particles, glowing runes carved into obsidian stone.
2. Heavy majestic atmosphere, looming scale contrast (tiny knight facing giant creature or tower).
3. Dramatic volumetric shadows, torchlight flickering, dramatic crane shots revealing epic scale.`,
    sampleInput: '漂浮在无尽虚空中的哥特式神殿，一位身披符文战甲的骑士步入发光的魔法阵中',
    recommendedParams: {
      cameraMotion: 'tilt_up',
      lens: '16mm_wide',
      lighting: 'chiaroscuro_noir',
      fps: 24,
      duration: '6s',
    },
    tags: ['暗黑魔幻', '史诗巨构', '魔法符文', '哥特神殿', '超大尺度'],
  },
];
