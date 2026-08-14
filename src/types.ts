export type VideoModelTarget = 'minimax-h3' | 'kling-ai' | 'runway-gen3' | 'luma-dream' | 'sora' | 'pika-2' | 'midjourney' | 'seedance-2.0' | string;

export type AspectRatio = '16:9' | '9:16' | '21:9' | '1:1' | '4:3' | '3:4';

export type H3InputMode = 'text' | 'image';
export type H3SceneMode = 'drama' | 'action' | 'storyboard-grid';
export type GeneratorMode = 'video' | 'image';
export type ImagePromptFormat = 'generic' | 'midjourney' | 'flux' | 'sdxl' | 'jimeng' | 'doubao';

// 视频中人声的处理方式：自动判断/角色对白/画外旁白/歌词演唱/无任何人声
export type DialogueMode = 'auto' | 'dialogue' | 'voiceover' | 'lyrics' | 'no-human-voice';

// 提示词生成模式：preset=完整 Skill Agent 状态机（强校验）；direct=单轮 LLM 绕过状态机；agent=自主工具循环（宽松，不卡校验）
export type PromptGenerationMode = 'preset' | 'direct' | 'agent';

export type CameraMotion = 
  | 'static'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'tilt_down'
  | 'dolly_in'
  | 'dolly_out'
  | 'zoom_in'
  | 'zoom_out'
  | 'orbit_arc'
  | 'tracking_shot'
  | 'fpv_crane'
  | 'handheld_shake'
  | 'bullet_time'
  | string;

export type LensType = 
  | '35mm_anamorphic'
  | '85mm_portrait'
  | '16mm_wide'
  | 'macro_lens'
  | 'telephoto_200mm'
  | 'fisheye'
  | 'cinematic_prime'
  | string;

export type LightingStyle = 
  | 'cyberpunk_neon'
  | 'golden_hour'
  | 'volumetric_rays'
  | 'chiaroscuro_noir'
  | 'soft_studio'
  | 'bioluminescent'
  | 'moody_fog'
  | 'dramatic_rim'
  | 'sunlit_natural'
  | string;

export type StylePreset = 
  | 'general_master'
  | 'cinematic_imax'
  | 'cyberpunk_scifi'
  | 'anime_3d'
  | 'photorealistic_commercial'
  | 'character_dynamics'
  | 'macro_nature'
  | 'multi_shot_storyboard'
  | 'vintage_vhs'
  | 'dark_fantasy'
  | string;

export interface MiniMaxSkill {
  id: StylePreset;
  title: string;
  titleEn: string;
  category: string;
  icon: string;
  description: string;
  systemPrompt: string;
  sampleInput: string;
  recommendedParams: {
    cameraMotion: CameraMotion;
    lens: LensType;
    lighting: LightingStyle;
    fps: number;
    duration: string;
  };
  tags: string[];
  mediaPreviewUrl?: string; // Auto-matched video/image preview from local folder or URL
  requiresSceneMode?: boolean;
  supportedInputModes?: H3InputMode[];
  requiredRuntimeFiles?: string[];
  fixedDuration?: string;
  fixedAspectRatio?: string;
}

export interface ImageSkill {
  id: string;
  title: string;
  titleEn: string;
  category: string;
  icon: string;
  description: string;
  sampleInput: string;
  tags: string[];
  mediaPreviewUrl?: string;
}

export interface ImageSkillDefinition extends ImageSkill {
  folder?: string;
  instruction: string;
  sourceFiles: string[];
  aliases?: string[];
}

export interface ImagePromptModules {
  imageType: string;
  shotAndAngle: string;
  composition: string;
  subject: string;
  actionAndExpression: string;
  spatialStaging: string;
  environment: string;
  lightingAndColor: string;
  aestheticsAndMaterials: string;
  aspectAndQuality: string;
}

export interface ImagePromptCanonical {
  title: string;
  modules: ImagePromptModules;
  negativeConcepts?: string[];
}

export interface ImagePromptTarget {
  format: ImagePromptFormat;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: AspectRatio;
  parameters: Record<string, string | number | boolean>;
}

export interface ReasoningUsage {
  requested: boolean;
  applied: boolean;
  effort?: 'low' | 'medium' | 'high';
  downgradeReason?: string;
}

export interface ImagePromptResult {
  matchedSkill: string;
  canonical: ImagePromptCanonical;
  target: ImagePromptTarget;
  reasoning: ReasoningUsage;
  model: string;
  // 多组图片提示词时存放其余组
  variants?: ImagePromptResult[];
  variantIndex?: number;
  variantDirection?: string;
}

export interface StructuredPromptOutput {
  title: string;
  englishPrompt: string;
  chineseTranslation: string;
  subjectDescription: string;
  cameraMovement: string;
  lightingAndAtmosphere: string;
  styleAndAesthetics: string;
  negativePrompt: string;
  soundCue?: string;
  technicalParams: {
    targetModel: VideoModelTarget;
    aspectRatio: AspectRatio;
    fps: number;
    duration: string;
    motionSpeed: number;
  };
  // 多组提示词时存放其余组；当前默认组直接挂在 StructuredPromptOutput 顶层
  variants?: StructuredPromptOutput[];
  // 本组序号（从 1 开始），单组时省略
  variantIndex?: number;
  // 本组差异化方向说明（例如"远景为主，慢推镜头"）
  variantDirection?: string;
}

export interface H3PromptVariant {
  id: string;
  titleCn: string;
  titleEn: string;
  promptEn: string;
  promptCn: string;
  negativePromptEn: string;
  negativePromptCn: string;
}

export interface H3AgentReview {
  isValidH3Format: boolean;
  issues: string[];
  fixedInRepairTurn: boolean;
}

export type H3AuxiliaryParamKey = 'targetModel' | 'camera' | 'lens' | 'lighting';

export interface H3ManualAuxiliaryParam {
  value: string;
  presetId?: string;
}

export type H3ManualAuxiliaryParams = Partial<Record<H3AuxiliaryParamKey, H3ManualAuxiliaryParam>>;

export type H3ResolvedParamSource = 'manual-ui' | 'user-text' | 'skill-recommended' | 'system-default';

export interface H3ResolvedParam {
  value: string;
  source: H3ResolvedParamSource;
  presetId?: string;
  userEvidence?: string;
  promptEvidence: string;
}

export type H3ResolvedParams = Record<H3AuxiliaryParamKey, H3ResolvedParam>;

export interface H3AgentResult {
  matchedSkill: string;
  confidence: 'low' | 'medium' | 'high';
  reason: string;
  suggestedDirections: string[];
  variants: H3PromptVariant[];
  review: H3AgentReview;
  resolvedParams?: H3ResolvedParams;
  structuredOutput: StructuredPromptOutput;
  thinkingProcess: string;
}

export interface DeepSeekThinking {
  process: string;
  timeSpentMs?: number;
}

export interface PromptHistoryItem {
  id: string;
  createdAt: string;
  createdAtIso?: string;
  historyDate?: string;
  generationStatus?: 'pending' | 'success' | 'error' | 'stopped';
  errorMessage?: string;
  userQuery: string;
  skillId?: StylePreset;
  structuredOutput: StructuredPromptOutput;
  resolvedParams?: H3ResolvedParams;
  gavenStyleCodes?: string;
  thinkingProcess?: string;
  modelUsed: string;
  isFavorite: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  titleEn?: string;
  mediaType: 'video' | 'image';
  mediaUrl: string;
  posterUrl?: string;
  category: 'Cyberpunk' | 'Cinematic' | 'Anime' | 'Nature' | 'Character' | 'Sci-Fi' | 'Commercial' | 'Fantasy' | string;
  tags: string[];
  promptEn: string;
  promptCn: string;
  cameraMotion: string;
  lensType?: string;
  lighting?: string;
  stylePreset?: string;
  negativePrompt?: string;
  targetModel: VideoModelTarget;
  author?: string;
  likesCount: number;
  isLiked?: boolean;
  aspectRatio: AspectRatio;
  duration?: string;
  fps?: number;
  seed?: number;
  source?: 'X / Twitter' | 'GitHub' | '公共网页' | '视频来源' | '本地双轨' | string;
  sourceUrl?: string;
  localMediaPath?: string;
  language?: 'zh' | 'en' | string;
}

export interface ApiProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string; // supports preset or custom model string like deepseek-ai/DeepSeek-V3, prefix/deepseek-v4-pro
  thinkingEnabled: boolean;
  reasoningEffort: 'low' | 'medium' | 'high';
  temperature: number;
}

export interface DeepSeekSettings {
  apiKey: string;
  model: string; // flexible string for custom model names
  thinkingEnabled: boolean;
  reasoningEffort: 'low' | 'medium' | 'high';
  temperature: number;
  customBaseUrl?: string;
  activeProfileId?: string;
  profiles?: ApiProfile[];
}

// 自定义视觉渠道（可多个、可命名）
export interface VisionCustomProvider {
  id: string; // 如 cp-1712345678901
  name: string; // 用户命名，如 "公司中转 GLM"
  baseUrl: string;
  apiKey?: string;
  model?: string;
}

// 图片反推提示词（VLM）配置：OpenAI-compatible 视觉模型渠道
export interface VisionSettings {
  apiKey: string;
  baseUrl: string; // e.g. https://open.bigmodel.cn/api/paas/v4
  model: string; // e.g. glm-4v-flash / qwen-vl-plus / gpt-4o
  temperature?: number;
  customModels?: string[]; // 用户自定义添加的视觉模型名
  customProviders?: VisionCustomProvider[]; // 用户自定义添加的命名视觉渠道（可多个）
  providerKeys?: Record<string, string>; // 内置渠道 id → 各自独立的 API Key（避免切换渠道覆盖）
}

export type H3ReferenceMode = 'i2va' | 'fl2va' | 'l2va';

export interface H3ReferenceImage {
  mode: H3ReferenceMode;
  images: string[]; // data URL / base64 images: 1 for i2va/l2va, 2 for fl2va
}

export interface PromptGenInputOptions {
  userPrompt: string;
  skillPreset: StylePreset;
  targetModel: VideoModelTarget;
  aspectRatio: AspectRatio;
  cameraMotion: CameraMotion;
  lensType: LensType;
  lightingStyle: LightingStyle;
  motionSpeed: number;
  duration: string;
  inputMode?: H3InputMode;
  sceneMode?: H3SceneMode;
  enableSoundCue: boolean;
  enableNegativePrompt: boolean;
  gavenStyleCodes?: string;
  gavenDirectorStyle?: string;
  gavenPhotoStyle?: string;
  gavenCaptureFilm?: string;
  gavenPrintFilm?: string;
  gavenStyleIntensity?: string;
  // 视频中人声处理方式
  dialogueMode?: DialogueMode;
  // 提示词组数（1/2/3）
  variantCount?: number;
  // 生成模式：预设工作流 / 直接推理
  generationMode?: PromptGenerationMode;
}
