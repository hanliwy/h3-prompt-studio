import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Bot, 
  User, 
  Cpu, 
  Film, 
  Camera, 
  Sun, 
  Sliders, 
  Layers, 
  Zap, 
  RefreshCw, 
  Bookmark, 
  Volume2, 
  ChevronDown, 
  ChevronUp, 
  Info,
  CheckCircle2,
  Wand2,
  Key,
  AlertTriangle,
  Settings,
  HelpCircle,
  Eye,
  Square,
  Brain,
  Image as ImageIcon
} from 'lucide-react';
import { 
  DeepSeekSettings, 
  PromptGenInputOptions, 
  StructuredPromptOutput, 
  PromptHistoryItem, 
  StylePreset, 
  VideoModelTarget,
  AspectRatio,
  CameraMotion,
  LensType,
  LightingStyle,
  ApiProfile,
  MiniMaxSkill,
  H3AgentReview,
  H3InputMode,
  H3ManualAuxiliaryParams,
  H3SceneMode,
  H3ReferenceMode,
  VisionSettings,
  GeneratorMode,
  ImagePromptFormat,
  ImagePromptResult,
  ImageSkill,
  ReasoningUsage,
  DialogueMode,
  PromptGenerationMode
} from '../types';

// 图片反推快速切换渠道列表（与设置弹窗一致）
const VISION_QUICK_PROVIDERS: Array<{ id: string; name: string; baseUrl: string; defaultModel: string; visionModels: string[] }> = [
  { id: 'zhipu', name: '智谱 BigModel', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4v-flash', visionModels: ['glm-4v-flash', 'glm-4v-plus', 'glm-4.6v-flash', 'glm-4.5v', 'glm-4.1v-thinking-flash', 'glm-ocr'] },
  { id: 'dashscope', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-vl-plus', visionModels: ['qwen-vl-plus', 'qwen-vl-max', 'qwen2.5-vl-72b-instruct', 'qwen2-vl-7b-instruct'] },
  { id: 'siliconflow', name: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', defaultModel: 'Qwen/Qwen2.5-VL-7B-Instruct', visionModels: ['Qwen/Qwen2.5-VL-7B-Instruct', 'Qwen/Qwen2.5-VL-72B-Instruct', 'Qwen/Qwen2-VL-7B-Instruct'] },
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'google/gemini-2.0-flash', visionModels: ['google/gemini-2.0-flash', 'google/gemini-2.5-flash', 'openai/gpt-4o', 'openai/gpt-4o-mini', 'qwen/qwen-2.5-vl-72b-instruct'] },
  { id: 'xflow', name: 'xFlow 聚合', baseUrl: 'https://api.xflow.cc/v1', defaultModel: 'grok-4-1-fast-non-reasoning', visionModels: ['grok-4-1-fast-non-reasoning', 'grok-4-1-fast', 'gemini-3-flash-preview', 'chatgpt-4o-latest'] },
  { id: 'ollama', name: '本地 Ollama', baseUrl: 'http://localhost:11434/v1', defaultModel: 'qwen3vl', visionModels: ['qwen3vl', 'qwen2.5vl', 'llava', 'llama3.2-vision'] },
];

// 反推输出风格选项
const REFERENCE_STYLES: Array<{ value: string; label: string; desc: string }> = [
  { value: 'natural', label: '自然语言核心创意', desc: '中文描述，适合作为 H3 视频核心创意' },
  { value: 'pixel', label: '像素级详细描述', desc: '逐细节中文描述，覆盖主体/光线/材质/镜头' },
  { value: 'tags', label: '标签流 Tags', desc: '逗号分隔标签 + 权重，适合绘图模型' },
  { value: 'i2v', label: '图像到视频 (I2V)', desc: '带时间轴变化的视频提示词' },
  { value: 'detail', label: '英文详情 (English)', desc: '英文详细描述' },
];

const IMAGE_PROMPT_FORMATS: Array<{ value: ImagePromptFormat; label: string; desc: string }> = [
  { value: 'generic', label: '通用', desc: '模型无关的结构化中文提示词' },
  { value: 'midjourney', label: 'Midjourney', desc: '自然语言正文与 --ar 参数' },
  { value: 'flux', label: 'Flux', desc: '完整自然语言画面描述' },
  { value: 'sdxl', label: 'SDXL', desc: '正向、负向与采样参数' },
  { value: 'jimeng', label: '即梦', desc: '中文模块化图片提示词' },
  { value: 'doubao', label: '豆包', desc: '中文自然语言图片提示词' },
];
import { MINIMAX_SKILLS } from '../data/skills';
import { 
  TARGET_MODELS, 
  CAMERA_MOTIONS, 
  LENS_TYPES, 
  LIGHTING_STYLES, 
  ASPECT_RATIOS,
  DIRECTOR_STYLES,
  PHOTO_STYLES,
  CAPTURE_FILMS,
  PRINT_FILMS,
  STYLE_INTENSITIES
} from '../data/presetOptions';

export interface ImageStyleCombination {
  directorStyle: string;
  photoStyle: string;
  captureFilm: string;
  printFilm: string;
  styleIntensity: string;
}

export interface GenerationControllerSlot {
  current: AbortController | null;
}

export const replaceGenerationController = (slot: GenerationControllerSlot): AbortController => {
  const previousController = slot.current;
  const nextController = new AbortController();
  slot.current = nextController;
  previousController?.abort();
  return nextController;
};

export const invalidateGenerationControllers = (...slots: GenerationControllerSlot[]): void => {
  const controllers = slots.map((slot) => slot.current);
  slots.forEach((slot) => {
    slot.current = null;
  });
  controllers.forEach((controller) => controller?.abort());
};

export const randomizeImageStyleCombination = (
  current: ImageStyleCombination,
  random: () => number = Math.random,
): ImageStyleCombination => {
  const pickValue = (options: Array<{ value: string }>) => options[Math.floor(random() * options.length)].value;
  const createCombination = (): ImageStyleCombination => {
    const useDirectorStyle = random() < 0.5;
    return {
      directorStyle: useDirectorStyle ? pickValue(DIRECTOR_STYLES) : '',
      photoStyle: useDirectorStyle ? '' : pickValue(PHOTO_STYLES),
      captureFilm: pickValue(CAPTURE_FILMS),
      printFilm: pickValue(PRINT_FILMS),
      styleIntensity: pickValue(STYLE_INTENSITIES),
    };
  };
  const isSameCombination = (next: ImageStyleCombination) => (
    next.directorStyle === current.directorStyle
    && next.photoStyle === current.photoStyle
    && next.captureFilm === current.captureFilm
    && next.printFilm === current.printFilm
    && next.styleIntensity === current.styleIntensity
  );

  let next = createCombination();
  for (let attempt = 0; attempt < 7 && isSameCombination(next); attempt += 1) {
    next = createCombination();
  }
  if (!isSameCombination(next)) return next;

  const currentIntensityIndex = STYLE_INTENSITIES.findIndex((item) => item.value === current.styleIntensity);
  const nextIntensityIndex = (currentIntensityIndex + 1) % STYLE_INTENSITIES.length;
  return { ...next, styleIntensity: STYLE_INTENSITIES[nextIntensityIndex].value };
};

interface PromptGeneratorProps {
  settings: DeepSeekSettings;
  onSaveToHistory: (item: PromptHistoryItem) => void;
  initialInputOptions?: Partial<PromptGenInputOptions>;
  onOpenKeyModal?: () => void;
  onSaveSettings?: (newSettings: DeepSeekSettings) => void;
  skills?: MiniMaxSkill[];
  imageSkills?: ImageSkill[];
  visionSettings?: VisionSettings;
  onSaveVisionSettings?: (nextVision: VisionSettings) => void;
}

interface GenerationRequestState {
  isGenerating: boolean;
  errorMessage: string | null;
  thinkingProcess: string | null;
  agentReview: H3AgentReview | null;
  matchedSkill: string | null;
  modelUsed: string;
  generationReasoning: ReasoningUsage | null;
  liveStreamSegments: Array<{ text: string; kind: string }>;
  streamStage: string;
  streamStatus: string;
  isLiveStreamOpen: boolean;
  shouldFollowLiveStream: boolean;
}

const createInitialRequestState = (): GenerationRequestState => ({
  isGenerating: false,
  errorMessage: null,
  thinkingProcess: null,
  agentReview: null,
  matchedSkill: null,
  modelUsed: '',
  generationReasoning: null,
  liveStreamSegments: [],
  streamStage: '',
  streamStatus: '',
  isLiveStreamOpen: true,
  shouldFollowLiveStream: true,
});

export const PromptGenerator: React.FC<PromptGeneratorProps> = ({
  settings,
  onSaveToHistory,
  initialInputOptions,
  onOpenKeyModal,
  onSaveSettings,
  skills,
  imageSkills = [],
  visionSettings,
  onSaveVisionSettings,
}) => {
  const availableSkills = skills?.length ? skills : MINIMAX_SKILLS;
  const [generatorMode, setGeneratorMode] = useState<GeneratorMode>('video');
  const [selectedSkillId, setSelectedSkillId] = useState<StylePreset>(
    initialInputOptions?.skillPreset || availableSkills[0]?.id || 'h3-prompt-writing'
  );
  const [userQuery, setUserQuery] = useState(
    initialInputOptions?.userPrompt || availableSkills[0]?.sampleInput || ''
  );
  const videoDraftRef = useRef(userQuery);
  const imageDraftRef = useRef(imageSkills[0]?.sampleInput || '雨夜，一个女孩等公交。');
  const [selectedImageSkillId, setSelectedImageSkillId] = useState('gaven-direct-image-prompts');
  const [imagePromptFormat, setImagePromptFormat] = useState<ImagePromptFormat>('generic');
  const [imageResult, setImageResult] = useState<ImagePromptResult | null>(null);
  // 多组图片结果时当前激活的那一组（单组时直接等于 imageResult）
  const activeImageResult: ImagePromptResult | null = (() => {
    if (!imageResult) return null;
    if (!imageResult.variants || imageResult.variants.length === 0) return imageResult;
    const variantList = [imageResult, ...imageResult.variants];
    return variantList[activeVariantIndex] || imageResult;
  })();
  const [imageAspectRatio, setImageAspectRatio] = useState<AspectRatio>('9:16');
  const [imageDirectorStyle, setImageDirectorStyle] = useState('');
  const [imagePhotoStyle, setImagePhotoStyle] = useState('');
  const [imageCaptureFilm, setImageCaptureFilm] = useState('');
  const [imagePrintFilm, setImagePrintFilm] = useState('');
  const [imageStyleIntensity, setImageStyleIntensity] = useState('S2');
  
  const selectedSkill = availableSkills.find((s) => s.id === selectedSkillId) || availableSkills[0] || MINIMAX_SKILLS[0];
  const selectedImageSkill = imageSkills.find((skill) => skill.id === selectedImageSkillId) || imageSkills[0];
  const activeSkillDisplay = generatorMode === 'video' ? selectedSkill : selectedImageSkill;

  const [targetModel, setTargetModel] = useState<VideoModelTarget>(
    initialInputOptions?.targetModel || 'minimax-h3'
  );
  const [cameraMotion, setCameraMotion] = useState<CameraMotion>(
    initialInputOptions?.cameraMotion || ''
  );
  const [lensType, setLensType] = useState<LensType>(
    initialInputOptions?.lensType || ''
  );
  const [lightingStyle, setLightingStyle] = useState<LightingStyle>(
    initialInputOptions?.lightingStyle || ''
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    initialInputOptions?.aspectRatio || '16:9'
  );
  const [motionSpeed, setMotionSpeed] = useState<number>(
    initialInputOptions?.motionSpeed || 7
  );
  const [duration, setDuration] = useState<string>(
    initialInputOptions?.duration || selectedSkill.fixedDuration || selectedSkill.recommendedParams.duration
  );
  const [inputMode, setInputMode] = useState<H3InputMode>(initialInputOptions?.inputMode || 'text');
  const [sceneMode, setSceneMode] = useState<H3SceneMode | undefined>(initialInputOptions?.sceneMode);

  // Gaven 电影感导演画风系统
  const [directorStyle, setDirectorStyle] = useState<string>('');
  const [photoStyle, setPhotoStyle] = useState<string>('');
  const [captureFilm, setCaptureFilm] = useState<string>('');
  const [printFilm, setPrintFilm] = useState<string>('');
  const [styleIntensity, setStyleIntensity] = useState<string>('S2');

  const isGavenSkill = selectedSkill.id === 'gaven-cinematic-director';

  // 视频人声处理模式：自动/对白/旁白/歌词演唱/无任何人声
  const [dialogueMode, setDialogueMode] = useState<DialogueMode>('auto');
  // 提示词组数：1 / 2 / 3 / 5
  const [variantCount, setVariantCount] = useState<number>(1);
  // 生成模式：preset=走 Skill Agent 状态机；direct=单轮 LLM 直接推理
  const [generationMode, setGenerationMode] = useState<PromptGenerationMode>('direct');
  // 多组结果当前激活的 tab 索引
  const [activeVariantIndex, setActiveVariantIndex] = useState<number>(0);

  // Active channel & custom model overrides
  const [currentChannelId, setCurrentChannelId] = useState<string>(
    settings.activeProfileId || 'default-deepseek'
  );
  const [currentModelName, setCurrentModelName] = useState<string>(
    settings.model || 'deepseek-v4-flash'
  );
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState<boolean>(false);
  const [requestThinkingEnabled, setRequestThinkingEnabled] = useState(settings.thinkingEnabled);
  const [requestReasoningEffort, setRequestReasoningEffort] = useState<'low' | 'medium' | 'high'>(settings.reasoningEffort);
  const [isReasoningEffortOpen, setIsReasoningEffortOpen] = useState(false);

  const [videoRequestState, setVideoRequestState] = useState<GenerationRequestState>(createInitialRequestState);
  const [imageRequestState, setImageRequestState] = useState<GenerationRequestState>(createInitialRequestState);
  const currentRequestState = generatorMode === 'video' ? videoRequestState : imageRequestState;
  const setCurrentRequestState = generatorMode === 'video' ? setVideoRequestState : setImageRequestState;
  const {
    isGenerating,
    errorMessage,
    thinkingProcess,
    agentReview,
    matchedSkill,
    modelUsed,
    generationReasoning,
    liveStreamSegments,
    streamStage,
    streamStatus,
    isLiveStreamOpen,
    shouldFollowLiveStream,
  } = currentRequestState;
  const isImageTaskGenerating = imageRequestState.isGenerating;
  const [structuredResult, setStructuredResult] = useState<StructuredPromptOutput | null>(null);
  // 多组结果时当前激活的那一组（单组时直接等于 structuredResult）
  const activeVariant: StructuredPromptOutput | null = (() => {
    if (!structuredResult) return null;
    if (!structuredResult.variants || structuredResult.variants.length === 0) return structuredResult;
    const variantList = [structuredResult, ...structuredResult.variants];
    return variantList[activeVariantIndex] || structuredResult;
  })();
  const setIsLiveStreamOpen = (value: React.SetStateAction<boolean>) => {
    setCurrentRequestState((prev) => ({
      ...prev,
      isLiveStreamOpen: typeof value === 'function' ? value(prev.isLiveStreamOpen) : value,
    }));
  };
  const setShouldFollowLiveStream = (value: React.SetStateAction<boolean>) => {
    setCurrentRequestState((prev) => ({
      ...prev,
      shouldFollowLiveStream: typeof value === 'function' ? value(prev.shouldFollowLiveStream) : value,
    }));
  };
  const liveStreamRef = useRef<HTMLPreElement | null>(null);
  const videoGenerationControllerRef = useRef<AbortController | null>(null);
  const imageGenerationControllerRef = useRef<AbortController | null>(null);
  const hasUserEditedPrompt = useRef(false);
  const [showThinking, setShowThinking] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [chatRefinementText, setChatRefinementText] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  // 图片反推（参考图生提示词）
  const [referenceMode, setReferenceMode] = useState<H3ReferenceMode>('i2va');
  const [referenceStyle, setReferenceStyle] = useState<string>('natural');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isDescribingImage, setIsDescribingImage] = useState(false);
  const [imageDescription, setImageDescription] = useState<string>('');
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // 输入方式面板内直接切换视觉渠道/模型（临时覆盖，仅本次反推生效）
  const [visionProviderQuick, setVisionProviderQuick] = useState<string>('');
  const [visionModelQuick, setVisionModelQuick] = useState<string>('');
  const [visionApiKeyQuick, setVisionApiKeyQuick] = useState<string>('');

  const resolveVisionSettings = (): VisionSettings => {
    const base = visionSettings || { apiKey: '', baseUrl: '', model: '' };
    // 未选择快速覆盖时使用已保存配置
    if (!visionProviderQuick && !visionModelQuick) return base;
    let url = base.baseUrl;
    let model = base.model;
    let apiKey = base.apiKey;
    if (visionProviderQuick && visionProviderQuick !== 'custom') {
      const provider = VISION_QUICK_PROVIDERS.find((p) => p.id === visionProviderQuick);
      const customCp = visionSettings?.customProviders?.find((cp) => cp.id === visionProviderQuick);
      const chosen = provider || customCp;
      if (chosen) {
        url = chosen.baseUrl;
        // 渠道独立 key 优先：本次新填 > 该渠道已存 key > 自定义渠道自带 key > 主配置
        apiKey = visionApiKeyQuick || visionSettings?.providerKeys?.[visionProviderQuick] || chosen.apiKey || base.apiKey;
        if (!visionModelQuick && chosen.model) model = chosen.model;
      }
    }
    if (visionModelQuick) model = visionModelQuick;
    if (visionApiKeyQuick) apiKey = visionApiKeyQuick;
    if (visionProviderQuick === 'custom' && !url) url = '';
    return { ...base, apiKey, baseUrl: url, model: model || base.model };
  };

  const handleImageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const maxCount = referenceMode === 'fl2va' ? 2 : 1;
    const selected = Array.from(files).slice(0, maxCount);
    const readers = selected.map((file) => new Promise<string>((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error(`${file.name} 不是图片文件`));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`));
      reader.readAsDataURL(file);
    }));
    Promise.all(readers)
      .then((urls) => {
        setReferenceImages(urls);
        // 换图保留旧反推结果，等下一次反推替换
        setImageError(null);
      })
      .catch((err: any) => setImageError(err?.message || '读取图片失败'));
  };

  const handleDescribeImages = async () => {
    if (referenceImages.length === 0) {
      setImageError(`请先上传${referenceMode === 'fl2va' ? '两张' : '一张'}参考图片`);
      return;
    }
    if (!visionSettings?.apiKey) {
      setImageError('未配置图片反推 API，请点击"配置图片 API"填写渠道。');
      return;
    }
    setIsDescribingImage(true);
    setImageError(null);
    try {
      const resolved = resolveVisionSettings();
      if (!resolved.apiKey) {
        setImageError('未配置图片反推 API Key：请在上方"快速切换"里填写所选渠道的 Key，或到设置中配置。');
        setIsDescribingImage(false);
        return;
      }
      const res = await fetch('/api/vision/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: referenceMode,
          style: referenceStyle,
          images: referenceImages,
          visionSettings: resolved,
        }),
      });
      if (!res.ok || !res.body) {
        const fallback = await res.json().catch(() => null);
        throw new Error(fallback?.error || `图片反推请求失败（HTTP ${res.status}）`);
      }
      // SSE 流式：等第一块内容到达再清空旧结果（"出结果才让之前的提示词消失"）
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      let receivedFirstChunk = false;
      let streamError: string | null = null;

      const handleFrame = (frame: string) => {
        const event = frame.split('\n').find((l) => l.startsWith('event:'))?.replace(/^event:\s*/, '').trim() || 'message';
        const dataText = frame
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.replace(/^data:\s*/, ''))
          .join('\n');
        if (!dataText) return;
        const data = JSON.parse(dataText);
        if (event === 'delta') {
          if (!receivedFirstChunk) {
            receivedFirstChunk = true;
            setImageDescription('');
          }
          acc += data.text || '';
          setImageDescription(acc);
        } else if (event === 'error') {
          streamError = data.error || '图片反推失败';
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        buffer = buffer.replace(/\r\n/g, '\n');
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';
        for (const frame of frames) {
          if (frame.trim()) handleFrame(frame.trim());
        }
        if (done) break;
      }
      if (buffer.trim()) handleFrame(buffer.trim());

      if (streamError) throw new Error(streamError);
      if (!receivedFirstChunk && !acc.trim()) {
        throw new Error('图片反推未返回有效内容，请检查模型是否支持图片输入。');
      }
      // 反推成功后记住该渠道的 key，下次不用重填
      if (visionApiKeyQuick && visionProviderQuick && visionProviderQuick !== 'custom' && onSaveVisionSettings) {
        onSaveVisionSettings({
          ...visionSettings,
          providerKeys: { ...(visionSettings?.providerKeys || {}), [visionProviderQuick]: visionApiKeyQuick },
        });
      }
    } catch (err: any) {
      setImageError(err?.message || '图片反推失败');
    } finally {
      setIsDescribingImage(false);
    }
  };

  const applyImageDescription = () => {
    if (!imageDescription.trim()) return;
    hasUserEditedPrompt.current = false;
    // 加模式标识，让后续 LLM 生成能识别参考模式（H3 官方 #I2VA/#FL2VA/#L2VA）
    const modeLabel = referenceMode === 'fl2va'
      ? '#FL2VA 首尾帧参考图反推'
      : referenceMode === 'l2va'
        ? '#L2VA 尾帧参考图反推'
        : '#I2VA 首帧参考图反推';
    setUserQuery(`${modeLabel}\n${imageDescription.trim()}`);
    setImageDescription('');
    setReferenceImages([]);
    // 反推结果已作为文本填入，生成流程切回非参考图模式
    setInputMode('text');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  // Sync state if settings change
  useEffect(() => {
    if (settings.model) {
      setCurrentModelName(settings.model);
    }
  }, [settings.model]);

  useEffect(() => {
    setRequestThinkingEnabled(settings.thinkingEnabled);
    setRequestReasoningEffort(settings.reasoningEffort);
  }, [settings.activeProfileId]);

  useEffect(() => {
    if (!selectedImageSkill && imageSkills[0]) setSelectedImageSkillId(imageSkills[0].id);
  }, [imageSkills, selectedImageSkill]);

  useEffect(() => {
    if (!isLiveStreamOpen || !shouldFollowLiveStream || !liveStreamRef.current) return;
    liveStreamRef.current.scrollTop = liveStreamRef.current.scrollHeight;
  }, [isLiveStreamOpen, liveStreamSegments, shouldFollowLiveStream]);

  useEffect(() => () => {
    invalidateGenerationControllers(videoGenerationControllerRef, imageGenerationControllerRef);
  }, []);

  // Apply external input options (from history / skill vault / gallery) when they change
  useEffect(() => {
    if (!initialInputOptions) return;
    if (initialInputOptions.userPrompt !== undefined) {
      setUserQuery(initialInputOptions.userPrompt);
      hasUserEditedPrompt.current = false;
    }
    if (initialInputOptions.skillPreset) setSelectedSkillId(initialInputOptions.skillPreset as StylePreset);
    if (initialInputOptions.targetModel) setTargetModel(initialInputOptions.targetModel);
    if (initialInputOptions.aspectRatio) setAspectRatio(initialInputOptions.aspectRatio);
    if (initialInputOptions.duration) setDuration(initialInputOptions.duration);
    if (initialInputOptions.motionSpeed !== undefined) setMotionSpeed(initialInputOptions.motionSpeed);
    if (initialInputOptions.cameraMotion) setCameraMotion(initialInputOptions.cameraMotion);
    if (initialInputOptions.lensType) setLensType(initialInputOptions.lensType);
    if (initialInputOptions.lightingStyle) setLightingStyle(initialInputOptions.lightingStyle);
    if (initialInputOptions.sceneMode) setSceneMode(initialInputOptions.sceneMode);

    // Parse Gaven style codes like "D10+P10+C08+R01+S3" back into individual selects
    if (initialInputOptions.gavenStyleCodes) {
      const parts = initialInputOptions.gavenStyleCodes.split('+').filter(Boolean);
      for (const part of parts) {
        if (part.startsWith('D')) setDirectorStyle(part);
        else if (part.startsWith('P')) setPhotoStyle(part);
        else if (part.startsWith('C')) setCaptureFilm(part);
        else if (part.startsWith('R')) setPrintFilm(part);
        else if (part.startsWith('S')) setStyleIntensity(part);
      }
    }
  }, [initialInputOptions]);

  useEffect(() => {
    if (availableSkills.length > 0 && !availableSkills.some((skill) => skill.id === selectedSkillId)) {
      const firstSkill = availableSkills[0];
      setSelectedSkillId(firstSkill.id);
      setDuration(firstSkill.recommendedParams.duration);
    }
  }, [skills]);

  // Handle Channel Switch directly in Generator
  const handleSwitchChannel = (prof: ApiProfile) => {
    setCurrentChannelId(prof.id);
    setCurrentModelName(prof.model);
    setRequestThinkingEnabled(prof.thinkingEnabled);
    setRequestReasoningEffort(prof.reasoningEffort);
    if (onSaveSettings) {
      onSaveSettings({
        ...settings,
        apiKey: prof.apiKey,
        model: prof.model,
        customBaseUrl: prof.baseUrl,
        thinkingEnabled: prof.thinkingEnabled,
        reasoningEffort: prof.reasoningEffort,
        activeProfileId: prof.id,
      });
    }
    setIsChannelDropdownOpen(false);
  };

  const handleGeneratorModeChange = (nextMode: GeneratorMode) => {
    if (nextMode === generatorMode) return;
    if (generatorMode === 'video') videoDraftRef.current = userQuery;
    else imageDraftRef.current = userQuery;
    setGeneratorMode(nextMode);
    setUserQuery(nextMode === 'video' ? videoDraftRef.current : imageDraftRef.current);
  };

  const handleRandomizeImageStyles = () => {
    const nextCombination = randomizeImageStyleCombination({
      directorStyle: imageDirectorStyle,
      photoStyle: imagePhotoStyle,
      captureFilm: imageCaptureFilm,
      printFilm: imagePrintFilm,
      styleIntensity: imageStyleIntensity,
    });
    setImageDirectorStyle(nextCombination.directorStyle);
    setImagePhotoStyle(nextCombination.photoStyle);
    setImageCaptureFilm(nextCombination.captureFilm);
    setImagePrintFilm(nextCombination.printFilm);
    setImageStyleIntensity(nextCombination.styleIntensity);
  };

  // Select a skill template
  const handleSelectSkill = (skillId: StylePreset) => {
    setSelectedSkillId(skillId);
    const skill = availableSkills.find((s) => s.id === skillId);
    if (skill) {
      setDuration(skill.fixedDuration || skill.recommendedParams.duration);
      if (skill.fixedAspectRatio) setAspectRatio(skill.fixedAspectRatio as AspectRatio);
      setSceneMode(undefined);
      // 提示词框为空、或内容仍是任一预设 skill 的示例时，替换为新 skill 示例；
      // 自定义内容（反推应用/历史回填/手动输入）一律保留。
      // 注意：后端 skill 与本地 seed 的示例文本可能不同，需同时覆盖两者。
      const prompt = userQuery.trim();
      const allSampleValues = new Set(
        [...availableSkills, ...MINIMAX_SKILLS].map((s) => s.sampleInput?.trim()).filter(Boolean),
      );
      if (!prompt || allSampleValues.has(prompt)) {
        setUserQuery(skill.sampleInput);
      }
    }
  };

  const handleSelectImageSkill = (skillId: string) => {
    setSelectedImageSkillId(skillId);
    const skill = imageSkills.find((item) => item.id === skillId);
    if (!skill) return;
    const prompt = userQuery.trim();
    const samples = new Set(imageSkills.map((item) => item.sampleInput.trim()).filter(Boolean));
    if (!prompt || samples.has(prompt)) setUserQuery(skill.sampleInput);
  };

  const buildHistoryDraftOutput = (
    promptText: string,
    title: string,
    outputAspectRatio: AspectRatio,
    outputTargetModel: VideoModelTarget,
    outputDuration: string,
  ): StructuredPromptOutput => ({
    title,
    englishPrompt: promptText,
    chineseTranslation: promptText,
    subjectDescription: promptText,
    cameraMovement: '',
    lightingAndAtmosphere: '',
    styleAndAesthetics: '',
    negativePrompt: '',
    soundCue: '',
    technicalParams: {
      targetModel: outputTargetModel,
      aspectRatio: outputAspectRatio,
      fps: outputDuration === 'static' ? 0 : 24,
      duration: outputDuration,
      motionSpeed: outputDuration === 'static' ? 0 : motionSpeed,
    },
  });

  const handleGenerateImage = async (promptText: string) => {
    const historyNow = new Date();
    const historyBase = {
      id: `hist-img-${historyNow.getTime()}`,
      createdAt: historyNow.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      createdAtIso: historyNow.toISOString(),
      historyDate: historyNow.toISOString().slice(0, 10),
      userQuery: promptText,
      skillId: selectedImageSkillId as StylePreset,
      modelUsed: currentModelName || settings.model || 'deepseek-v4-flash',
      isFavorite: false,
    };
    const imageDraftOutput = buildHistoryDraftOutput(
      promptText,
      '图片提示词 · 正在生成',
      imageAspectRatio,
      'midjourney',
      'static',
    );
    const saveImageHistory = (
      generationStatus: PromptHistoryItem['generationStatus'],
      structuredOutput: StructuredPromptOutput,
      errorMessage?: string,
      modelUsed = historyBase.modelUsed,
    ) => onSaveToHistory({
      ...historyBase,
      generationStatus,
      errorMessage,
      structuredOutput,
      thinkingProcess: '',
      modelUsed,
    });

    saveImageHistory('pending', imageDraftOutput);

    if (!selectedImageSkill) {
      const message = '图片 Skill 尚未加载，请确认后端服务已重启。';
      saveImageHistory('error', { ...imageDraftOutput, title: '图片提示词 · 生成失败' }, message);
      setImageRequestState((prev) => ({ ...prev, errorMessage: message }));
      return;
    }
    const generationController = replaceGenerationController(imageGenerationControllerRef);
    setImageRequestState((prev) => ({
      ...prev,
      isGenerating: true,
      errorMessage: null,
      liveStreamSegments: [],
      streamStage: 'prepare',
      streamStatus: '正在连接图片提示词生成接口...',
      isLiveStreamOpen: true,
      shouldFollowLiveStream: true,
    }));
    setActiveVariantIndex(0);

    const styleCodes = [imageDirectorStyle, imagePhotoStyle, imageCaptureFilm, imagePrintFilm, imageStyleIntensity]
      .filter(Boolean)
      .join('+');
    let partialOutput = '';

    try {
      const res = await fetch('/api/image-prompt/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          skillId: selectedImageSkill.id,
          format: imagePromptFormat,
          aspectRatio: imageAspectRatio,
          styleCodes,
          model: currentModelName || settings.model || 'deepseek-v4-flash',
          customBaseUrl: settings.customBaseUrl || 'https://api.deepseek.com',
          userApiKey: settings.apiKey,
          temperature: settings.temperature,
          thinkingEnabled: requestThinkingEnabled,
          reasoningEffort: requestReasoningEffort,
          variantCount,
          generationMode,
        }),
        signal: generationController.signal,
      });
      if (!res.ok || !res.body) {
        const fallback = await res.json().catch(() => null);
        throw new Error(fallback?.error || '图片提示词流式接口连接失败');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData: ImagePromptResult | null = null;
      const handleFrame = (frame: string) => {
        const lines = frame.split('\n');
        const event = lines.find((line) => line.startsWith('event:'))?.replace(/^event:\s*/, '').trim() || 'message';
        const dataText = lines.filter((line) => line.startsWith('data:')).map((line) => line.replace(/^data:\s*/, '')).join('\n');
        if (!dataText) return;
        const data = JSON.parse(dataText);
        if (event === 'stage') {
          if (imageGenerationControllerRef.current !== generationController) return;
          setImageRequestState((prev) => ({ ...prev, streamStage: data.stage || '', streamStatus: data.message || '' }));
        } else if (event === 'delta') {
          if (imageGenerationControllerRef.current !== generationController) return;
          if ((data.kind || 'content') === 'content') partialOutput += data.text || '';
          setImageRequestState((prev) => ({
            ...prev,
            liveStreamSegments: [...prev.liveStreamSegments, { text: data.text || '', kind: data.kind || 'content' }].slice(-800),
          }));
        } else if (event === 'final') {
          finalData = data;
        } else if (event === 'error') {
          throw new Error(data.error || '图片提示词生成失败');
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        buffer = buffer.replace(/\r\n/g, '\n');
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';
        for (const frame of frames) if (frame.trim()) handleFrame(frame.trim());
        if (done) break;
      }
      if (buffer.trim()) handleFrame(buffer.trim());
      if (!finalData) throw new Error('图片提示词生成结束但未收到最终结果');
      if (imageGenerationControllerRef.current !== generationController) return;
      setImageResult(finalData);
      setImageRequestState((prev) => ({
        ...prev,
        generationReasoning: finalData.reasoning,
        matchedSkill: finalData.matchedSkill,
        modelUsed: finalData.model,
        streamStatus: '完成',
      }));

      // 把图片结果转成 StructuredPromptOutput 并存入历史记录（与视频模式共用历史）
      const imageResultToStructured = (img: ImagePromptResult): StructuredPromptOutput => ({
        title: img.canonical.title,
        englishPrompt: img.target.prompt,
        chineseTranslation: img.target.prompt,
        subjectDescription: img.canonical.modules.subject,
        cameraMovement: img.canonical.modules.shotAndAngle,
        lightingAndAtmosphere: img.canonical.modules.lightingAndColor,
        styleAndAesthetics: img.canonical.modules.aestheticsAndMaterials,
        negativePrompt: img.target.negativePrompt || '',
        soundCue: '',
        technicalParams: {
          targetModel: 'midjourney',
          aspectRatio: img.target.aspectRatio,
          fps: 0,
          duration: 'static',
          motionSpeed: 0,
        },
        variants: img.variants?.map((v, i) => {
          const child = imageResultToStructured(v);
          child.variantIndex = i + 2;
          child.variantDirection = v.variantDirection;
          return child;
        }),
      });
      const imageHistoryItem: PromptHistoryItem = {
        ...historyBase,
        generationStatus: 'success',
        structuredOutput: imageResultToStructured(finalData),
        thinkingProcess: '',
        modelUsed: finalData.model,
      };
      onSaveToHistory(imageHistoryItem);
    } catch (err: any) {
      const interruptedOutput = partialOutput.trim()
        ? {
            ...imageDraftOutput,
            title: '图片提示词 · 未完成',
            englishPrompt: partialOutput.trim(),
            chineseTranslation: partialOutput.trim(),
          }
        : imageDraftOutput;
      if (err?.name === 'AbortError') {
        saveImageHistory('stopped', { ...interruptedOutput, title: '图片提示词 · 已停止' });
        if (imageGenerationControllerRef.current === generationController) {
          setImageRequestState((prev) => ({ ...prev, streamStage: 'stopped', streamStatus: '已停止生成' }));
        }
        return;
      }
      if (imageGenerationControllerRef.current === generationController) {
        const message = err?.message || '图片提示词生成失败';
        saveImageHistory('error', { ...interruptedOutput, title: '图片提示词 · 生成失败' }, message);
        setImageRequestState((prev) => ({ ...prev, errorMessage: message }));
      }
    } finally {
      if (imageGenerationControllerRef.current === generationController) {
        imageGenerationControllerRef.current = null;
        setImageRequestState((prev) => ({ ...prev, isGenerating: false }));
      }
    }
  };

  const handleGenerate = async (queryText?: string) => {
    const promptText = queryText || userQuery;
    if (!promptText.trim()) return;
    if (generatorMode === 'image') {
      await handleGenerateImage(promptText);
      return;
    }

    const historyNow = new Date();
    const historyId = `hist-${historyNow.getTime()}`;
    const pendingGavenStyleCodes = [directorStyle, photoStyle, captureFilm, printFilm, styleIntensity]
      .filter(Boolean)
      .join('+');
    const historyBase = {
      id: historyId,
      createdAt: historyNow.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      }),
      createdAtIso: historyNow.toISOString(),
      historyDate: historyNow.toISOString().slice(0, 10),
      userQuery: promptText,
      skillId: selectedSkillId,
      gavenStyleCodes: isGavenSkill ? pendingGavenStyleCodes || undefined : undefined,
      modelUsed: currentModelName || settings.model || 'deepseek-v4-flash',
      isFavorite: false,
    };
    const videoDraftOutput = buildHistoryDraftOutput(
      promptText,
      '视频提示词 · 正在生成',
      aspectRatio,
      targetModel || 'minimax-h3',
      duration,
    );
    const saveVideoHistory = (
      generationStatus: PromptHistoryItem['generationStatus'],
      structuredOutput: StructuredPromptOutput,
      errorMessage?: string,
      extra: Partial<PromptHistoryItem> = {},
    ) => onSaveToHistory({
      ...historyBase,
      generationStatus,
      errorMessage,
      structuredOutput,
      thinkingProcess: '',
      ...extra,
    });

    saveVideoHistory('pending', videoDraftOutput);

    if (inputMode === 'image' && referenceImages.length > 0 && !imageDescription) {
      const message = '请先点击"反推核心内容提示词"，获取图片描述后再生成。';
      saveVideoHistory('error', { ...videoDraftOutput, title: '视频提示词 · 未开始' }, message);
      setVideoRequestState((prev) => ({ ...prev, errorMessage: message }));
      return;
    }
    if (selectedSkill.requiresSceneMode && !sceneMode) {
      const message = '当前 Skill 必须先选择文戏、武戏或九宫格模式。';
      saveVideoHistory('error', { ...videoDraftOutput, title: '视频提示词 · 未开始' }, message);
      setVideoRequestState((prev) => ({ ...prev, errorMessage: message }));
      return;
    }

    const generationController = replaceGenerationController(videoGenerationControllerRef);
    setVideoRequestState((prev) => ({
      ...prev,
      isGenerating: true,
      thinkingProcess: null,
      errorMessage: null,
      liveStreamSegments: [],
      streamStage: 'prepare',
      streamStatus: '正在连接流式生成接口...',
      isLiveStreamOpen: true,
      shouldFollowLiveStream: true,
    }));
    setActiveVariantIndex(0);

    const cameraMotionLabel = CAMERA_MOTIONS.find((c) => c.value === cameraMotion)?.label;
    const lensLabel = LENS_TYPES.find((l) => l.value === lensType)?.label;
    const lightingLabel = LIGHTING_STYLES.find((l) => l.value === lightingStyle)?.label;
    const targetModelLabel = TARGET_MODELS.find((model) => model.value === targetModel)?.label;
    const manualAuxiliaryParams: H3ManualAuxiliaryParams = {};
    if (targetModel) manualAuxiliaryParams.targetModel = { presetId: targetModel, value: targetModelLabel || targetModel };
    if (cameraMotion) manualAuxiliaryParams.camera = { presetId: cameraMotion, value: cameraMotionLabel || cameraMotion };
    if (lensType) manualAuxiliaryParams.lens = { presetId: lensType, value: lensLabel || lensType };
    if (lightingStyle) manualAuxiliaryParams.lighting = { presetId: lightingStyle, value: lightingLabel || lightingStyle };

    // Gaven 画风代码组合，如 D01+C04+R01+S2
    const gavenStyleCodes = [directorStyle, photoStyle, captureFilm, printFilm, styleIntensity]
      .filter(Boolean)
      .join('+');
    const gavenStyleHint = isGavenSkill && gavenStyleCodes
      ? `\n用户已指定画风代码: ${gavenStyleCodes}。请读取所选 Skill 的画风参考文件，把代码展开成自然视觉语言应用到镜头与光影描述中。`
      : '';

    const currentBaseUrl = settings.customBaseUrl || 'https://api.deepseek.com';
    const activeApiKey = settings.apiKey;

    const payload = {
      messages: [
        ...chatHistory,
        {
          role: 'user',
          content: `请帮我生成针对 MiniMax-H3 (海螺AI) 和主流视频模型的专业视频提示词。
用户创意需求: "${promptText}"
已锁定工作流:
- 选定 Skill: ${selectedSkill.title} (${selectedSkill.titleEn})
- 输入模式: ${inputMode === 'text' ? '非参考图提示词' : '参考图生提示词'}
- 场景模式: ${sceneMode || '不适用'}
- 画面比例: ${aspectRatio}
- 画面动作幅度(1-10): ${motionSpeed}
- 视频时长: ${duration}
${gavenStyleHint}
请严格执行所选 Skill 的原生工作流，只生成并校验一个最终成品，不要提供候选方案。`,
        },
      ],
      model: currentModelName || settings.model || 'deepseek-v4-flash',
      customBaseUrl: currentBaseUrl,
      thinkingEnabled: requestThinkingEnabled,
      reasoningEffort: requestReasoningEffort,
      userApiKey: activeApiKey,
      options: {
        manualAuxiliaryParams,
        aspectRatio,
        duration,
        motionSpeed,
        userPrompt: promptText,
        skillId: selectedSkill.id,
        skillTitle: selectedSkill.title,
        // 反推内容已转为文本，后端只接受 text 模式生成
        inputMode: 'text',
        sceneMode,
        gavenStyleCodes: isGavenSkill ? gavenStyleCodes : undefined,
        dialogueMode,
        variantCount,
        generationMode,
      },
    };
    let partialOutput = '';

    try {
      const res = await fetch('/api/h3-agent/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: generationController.signal,
      });

      if (!res.ok || !res.body) {
        const fallbackData = await res.json().catch(() => null);
        throw new Error(fallbackData?.error || '流式接口连接失败');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData: any = null;

      const handleSseFrame = (frame: string) => {
        const lines = frame.split('\n');
        const event = lines.find((line) => line.startsWith('event:'))?.replace(/^event:\s*/, '').trim() || 'message';
        const dataText = lines
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.replace(/^data:\s*/, ''))
          .join('\n');
        if (!dataText) return;

        const data = JSON.parse(dataText);
        if (event === 'stage') {
          if (videoGenerationControllerRef.current !== generationController) return;
          setVideoRequestState((prev) => ({ ...prev, streamStage: data.stage || '', streamStatus: data.message || '' }));
          return;
        }
        if (event === 'delta') {
          if (videoGenerationControllerRef.current !== generationController) return;
          const kind = data.kind || 'content';
          if (kind === 'content') partialOutput += data.text || '';
          setVideoRequestState((prev) => ({
            ...prev,
            streamStage: data.stage || '',
            liveStreamSegments: [...prev.liveStreamSegments, { text: data.text || '', kind }].slice(-800),
          }));
          return;
        }
        if (event === 'final') {
          finalData = data;
          if (videoGenerationControllerRef.current === generationController) {
            setVideoRequestState((prev) => ({ ...prev, streamStatus: '生成完成，正在整理结构化结果...' }));
          }
          return;
        }
        if (event === 'error') {
          throw new Error(data.error || '流式生成失败');
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        buffer = buffer.replace(/\r\n/g, '\n');
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';
        for (const frame of frames) {
          if (frame.trim()) handleSseFrame(frame.trim());
        }
        if (done) break;
      }
      if (buffer.trim()) handleSseFrame(buffer.trim());

      if (!finalData?.success) {
        throw new Error(finalData?.error || '生成结束但没有收到最终结果');
      }

      if (videoGenerationControllerRef.current !== generationController) return;
      setStructuredResult(finalData.structuredOutput);
      setVideoRequestState((prev) => ({
        ...prev,
        thinkingProcess: finalData.thinkingProcess,
        agentReview: finalData.review || null,
        matchedSkill: finalData.matchedSkill || null,
        modelUsed: finalData.model || currentModelName,
        generationReasoning: finalData.reasoning || null,
        streamStatus: '完成',
      }));

      // Record in Chat history for multi-round follow ups
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content: promptText },
        { role: 'assistant', content: finalData.structuredOutput?.englishPrompt || finalData.content },
      ]);

      saveVideoHistory('success', finalData.structuredOutput, undefined, {
        resolvedParams: finalData.resolvedParams,
        gavenStyleCodes: isGavenSkill ? gavenStyleCodes || undefined : undefined,
        thinkingProcess: finalData.thinkingProcess,
        modelUsed: finalData.model || currentModelName,
      });
    } catch (err: any) {
      const interruptedOutput = partialOutput.trim()
        ? {
            ...videoDraftOutput,
            title: '视频提示词 · 未完成',
            englishPrompt: partialOutput.trim(),
            chineseTranslation: partialOutput.trim(),
          }
        : videoDraftOutput;
      if (err?.name === 'AbortError') {
        saveVideoHistory('stopped', { ...interruptedOutput, title: '视频提示词 · 已停止' });
        if (videoGenerationControllerRef.current === generationController) {
          setVideoRequestState((prev) => ({ ...prev, streamStage: 'stopped', streamStatus: '已停止生成' }));
        }
        return;
      }
      if (videoGenerationControllerRef.current === generationController) {
        console.error(err);
        const message = err?.message || '无法连接后端 API 服务，请检查网络联通性或代理配置';
        saveVideoHistory('error', { ...interruptedOutput, title: '视频提示词 · 生成失败' }, message);
        setVideoRequestState((prev) => ({
          ...prev,
          errorMessage: message,
        }));
      }
    } finally {
      if (videoGenerationControllerRef.current === generationController) {
        videoGenerationControllerRef.current = null;
        setVideoRequestState((prev) => ({ ...prev, isGenerating: false }));
      }
    }
  };

  const handleStopGenerate = () => {
    const activeControllerSlot = generatorMode === 'video'
      ? videoGenerationControllerRef
      : imageGenerationControllerRef;
    if (!activeControllerSlot.current) return;
    setCurrentRequestState((prev) => ({
      ...prev,
      isGenerating: false,
      streamStage: 'stopped',
      streamStatus: '已停止生成',
    }));
    invalidateGenerationControllers(activeControllerSlot);
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  const handleCopy = (text: string, key: string, label?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerToast(label ? `已成功复制 [${label}] 至剪贴板！` : '已成功复制提示词！');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyFormattedForPlatform = (platform: string) => {
    if (!activeVariant) return;
    let formatted = '';
    let nameLabel = '';
    if (platform === 'minimax') {
      formatted = `${activeVariant.englishPrompt} --ar ${activeVariant.technicalParams.aspectRatio} --fps 24`;
      nameLabel = 'MiniMax-H3 海螺';
    } else if (platform === 'runway') {
      formatted = `${activeVariant.englishPrompt}, ${activeVariant.cameraMovement}, high quality photorealistic, 24fps`;
      nameLabel = 'Runway Gen-3';
    } else if (platform === 'sora') {
      formatted = `[Cinematic Shot] ${activeVariant.englishPrompt}. Camera: ${activeVariant.cameraMovement}. Lighting: ${activeVariant.lightingAndAtmosphere}.`;
      nameLabel = 'OpenAI Sora';
    } else {
      formatted = activeVariant.englishPrompt;
      nameLabel = '完整最终 Prompt';
    }
    handleCopy(formatted, platform, nameLabel);
  };

  const isVideoPreview = (url?: string) => Boolean(url && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url));

  return (
    <div className="mx-auto max-w-[1800px] px-3 py-4 sm:px-5 sm:py-5">
      
      {/* Floating Copy Toast Notification */}
      {showToast && (
        <div role="status" aria-live="polite" className="fixed top-6 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-xl border border-emerald-500/80 bg-emerald-950 px-4 py-3 text-xs font-bold text-emerald-200 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{showToast}</span>
        </div>
      )}

      <div data-generator-mode-tabs className="mb-4 flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1 shadow-xl">
        {([
          ['video', '视频提示词', Film],
          ['image', '图片提示词', ImageIcon],
        ] as const).map(([mode, label, Icon]) => (
          <button
            key={mode}
            type="button"
            onClick={() => handleGeneratorModeChange(mode)}
            aria-pressed={generatorMode === mode}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              generatorMode === mode
                ? 'bg-cyan-950 text-cyan-200 ring-1 ring-cyan-600'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_420px_minmax(520px,1fr)]">
        <aside
          data-workspace-column="skills"
          className="order-4 space-y-4 lg:order-1 lg:col-start-1 lg:row-start-1 lg:row-span-4 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-1 xl:sticky xl:top-4 xl:row-span-2"
        >

      {/* Official H3 Format Selector */}
      <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">{generatorMode === 'video' ? 'MiniMax-H3 官方案例格式' : '图片提示词官方 Skill'}</h2>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">| 选择 {generatorMode === 'video' ? '视频' : '图片'} skill 工作流</span>
          </div>

          <div className="flex items-start gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[9px] leading-snug text-slate-400">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-cyan-400" />
            <span className="line-clamp-2">{generatorMode === 'video' ? '信息很少时默认走 h3-prompt-writing；明确意图时选择对应官方格式' : 'Gaven 图片导演会补全构图、调度、光色与材质，并保持用户事实约束'}</span>
          </div>
        </div>

        {/* Official Skill Selector Grid */}
        <div data-skill-template-grid className="grid grid-cols-4 gap-1">
          {generatorMode === 'video' ? availableSkills.map((skill) => {
            const isSelected = skill.id === selectedSkillId;
            const hasPreview = Boolean(skill.mediaPreviewUrl);
            const previewIsVideo = isVideoPreview(skill.mediaPreviewUrl);
            return (
              <button
                key={skill.id}
                onClick={() => handleSelectSkill(skill.id)}
                aria-pressed={isSelected}
                className={`group relative flex h-[60px] min-w-0 flex-col justify-end overflow-hidden rounded-md border p-1 text-left shadow-sm transition-all ${
                  isSelected
                    ? 'border-cyan-400 text-cyan-100 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/30'
                    : 'border-slate-800 text-slate-300 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-950/30'
                }`}
                title={`${skill.title} - ${skill.description}`}
              >
                {hasPreview ? (
                  previewIsVideo ? (
                    <video
                      src={skill.mediaPreviewUrl}
                      muted
                      loop
                      playsInline
                      preload="none"
                      autoPlay={isSelected}
                      onMouseEnter={(event) => {
                        event.currentTarget.play().catch(() => undefined);
                      }}
                      onMouseLeave={(event) => {
                        if (!isSelected) {
                          event.currentTarget.pause();
                          event.currentTarget.currentTime = 0;
                        }
                      }}
                      className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <img
                      src={skill.mediaPreviewUrl}
                      alt={skill.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.22),transparent_34%),linear-gradient(135deg,#0f172a,#111827_55%,#020617)]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/5" />
                {isSelected && (
                  <CheckCircle2 className="absolute right-1 top-1 z-10 h-3 w-3 text-cyan-300 drop-shadow" />
                )}
                <div className="relative z-10 min-w-0 space-y-0.5">
                  <div className="line-clamp-2 text-[8px] font-bold leading-[1.12] text-white drop-shadow">{skill.title}</div>
                  <span className="inline-flex rounded bg-black/60 px-1 py-px font-mono text-[7px] text-slate-200">
                    {skill.recommendedParams.duration}
                  </span>
                </div>
              </button>
            );
          }) : imageSkills.map((skill) => {
            const isSelected = skill.id === selectedImageSkillId;
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => handleSelectImageSkill(skill.id)}
                aria-pressed={isSelected}
                className={`group relative flex h-[60px] min-w-0 flex-col justify-end overflow-hidden rounded-md border p-1 text-left shadow-sm transition-all ${
                  isSelected
                    ? 'border-cyan-400 text-cyan-100 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/30'
                    : 'border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
                title={`${skill.title} - ${skill.description}`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,0.24),transparent_36%),linear-gradient(135deg,#0f172a,#111827_55%,#020617)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                {isSelected && <CheckCircle2 className="absolute right-1 top-1 z-10 h-3 w-3 text-cyan-300" />}
                <div className="relative z-10 line-clamp-3 text-[8px] font-bold leading-[1.15] text-white">{skill.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Skill Description Panel */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 text-xs shadow-xl">
        <div className="relative h-16 shrink-0 bg-slate-950">
          {activeSkillDisplay?.mediaPreviewUrl ? (
            isVideoPreview(activeSkillDisplay.mediaPreviewUrl) ? (
              <video
                src={activeSkillDisplay.mediaPreviewUrl}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={activeSkillDisplay.mediaPreviewUrl}
                alt={activeSkillDisplay.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.22),transparent_30%),linear-gradient(135deg,#020617,#172033)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 to-transparent" />
          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-black text-cyan-200 ring-1 ring-white/10">
            {activeSkillDisplay?.mediaPreviewUrl ? '当前格式 demo' : '暂无 demo'}
          </span>
        </div>

        <div className="flex flex-col gap-2 p-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-cyan-300">{activeSkillDisplay?.title || '图片 Skill 加载中'}</span>
              <span className="font-mono text-[10px] text-slate-400">({activeSkillDisplay?.titleEn || 'Image Skill'})</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">{activeSkillDisplay?.description || '请确认后端已重启并成功加载图片 Skill。'}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400">特征标签:</span>
            {(activeSkillDisplay?.tags || []).map((tag, i) => (
              <span key={i} className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-300">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

        </aside>

      {/* 左列（第二列）：输入方式 + 辅助参数，独立 flex 列避免行高相互撑开 */}
      <div
        className="lg:contents xl:col-start-2 xl:row-start-1 xl:flex xl:min-w-0 xl:flex-col xl:gap-4"
      >
      <section
        data-workspace-column="composer-controls"
        className="order-1 lg:order-2 lg:col-start-2 lg:row-start-1 xl:col-start-2 xl:row-start-1"
      >
      <div data-composer-panel="input-mode" className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-2.5 shadow-xl">
        {generatorMode === 'video' ? (
        <>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-200">输入方式</span>
            <span className="text-[10px] text-slate-500 font-mono">非参考图 / 参考图反推</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setInputMode('text')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setInputMode('text');
                }
              }}
              aria-pressed={inputMode === 'text'}
              className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                inputMode === 'text'
                  ? 'border-cyan-500 bg-cyan-950/60 text-cyan-100'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold">非参考图提示词</div>
                  <div className="mt-0.5 text-[10px] leading-tight opacity-70">根据文字直接执行 Skill 工作流</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenKeyModal?.(); }}
                  className="shrink-0 rounded-md border border-cyan-900/60 bg-cyan-950/40 px-1.5 py-0.5 text-[9px] text-cyan-400 hover:bg-cyan-900/50 hover:text-cyan-300"
                  title="配置大模型 API 渠道"
                >
                  ⚙️ API
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInputMode('image')}
              aria-pressed={inputMode === 'image'}
              className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                inputMode === 'image'
                  ? 'border-amber-500 bg-amber-950/45 text-amber-100'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                <span>参考图生提示词</span>
              </div>
              <div className="mt-0.5 text-[10px] leading-tight opacity-70">上传首帧 / 首尾帧图反推核心创意</div>
            </button>
          </div>

          {inputMode === 'image' && (
            <div className="space-y-1.5 rounded-lg border border-amber-800/60 bg-amber-950/25 p-2">
              {/* Mode selector */}
              <div className="grid grid-cols-3 gap-1">
                {([
                  ['i2va', 'I2VA 首帧', '单图'],
                  ['fl2va', 'FL2VA 首尾帧', '双图'],
                  ['l2va', 'L2VA 尾帧', '单图'],
                ] as Array<[H3ReferenceMode, string, string]>).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setReferenceMode(value);
                      // 切换模式保留已选图片与反推结果；FL2VA 缺第二张时上传补图即可
                      setImageError(null);
                    }}
                    aria-pressed={referenceMode === value}
                    className={`rounded-md border px-1.5 py-1 text-left transition-colors ${
                      referenceMode === value
                        ? 'border-amber-500 bg-amber-950/50 text-amber-100'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[10px] font-bold leading-tight">{label}</div>
                    <div className="text-[9px] opacity-70">{hint}</div>
                  </button>
                ))}
              </div>

              {/* Output style selector */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-200/80">
                  <Sliders className="w-3 h-3" />
                  反推输出方式
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {REFERENCE_STYLES.map((style) => (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() => setReferenceStyle(style.value)}
                      aria-pressed={referenceStyle === style.value}
                      title={style.desc}
                      className={`rounded-md border px-1.5 py-1 text-left transition-colors ${
                        referenceStyle === style.value
                          ? 'border-amber-500 bg-amber-950/50 text-amber-100'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[10px] font-bold leading-tight">{style.label}</div>
                      <div className="truncate text-[9px] opacity-70">{style.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload + Preview */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={referenceMode === 'fl2va'}
                onChange={(e) => handleImageFiles(e.target.files)}
                className="hidden"
                id="reference-image-input"
              />
              <label
                htmlFor="reference-image-input"
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-amber-700/70 bg-amber-950/20 px-2 py-2 text-[11px] text-amber-200 hover:bg-amber-950/40"
              >
                {referenceImages.length > 0
                  ? `已选择 ${referenceImages.length} 张图片（点击更换）`
                  : `点击选择${referenceMode === 'fl2va' ? '首帧 + 尾帧两张' : '一张'}参考图片`}
              </label>

              {referenceImages.length > 0 && (
                <div className={`grid gap-1.5 ${referenceImages.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {referenceImages.map((src, i) => (
                    <div key={i} className="relative overflow-hidden rounded-md border border-amber-800/60">
                      <img src={src} alt={`参考图 ${i + 1}`} className="h-24 w-full object-cover" />
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[9px] text-amber-200">
                        {referenceMode === 'fl2va' ? (i === 0 ? '首帧' : '尾帧') : referenceMode === 'l2va' ? '尾帧' : '首帧'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Describe button */}
              <button
                type="button"
                onClick={handleDescribeImages}
                disabled={isDescribingImage || referenceImages.length === 0}
                className="w-full rounded-lg border border-amber-600 bg-amber-900/40 px-2 py-1.5 text-[11px] font-bold text-amber-100 hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDescribingImage ? '图片反推中...' : '反推核心内容提示词'}
              </button>

              {!visionSettings?.apiKey && (
                <button
                  type="button"
                  onClick={() => onOpenKeyModal?.()}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"
                >
                  ⚙️ 配置图片 API（反推需要视觉模型渠道）
                </button>
              )}

              <div className="space-y-1.5 rounded-lg border border-slate-700 bg-slate-900/60 p-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <Zap className="w-3 h-3 text-amber-400" />
                      快速切换渠道 / 模型（仅本次反推）
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenKeyModal?.()}
                      className="shrink-0 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400 hover:text-slate-200"
                    >
                      设置 API
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={visionProviderQuick}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setVisionProviderQuick(pid);
                        // 切换渠道时重置模型为默认；回到"已保存配置"时清空临时 key
                        setVisionModelQuick('');
                        if (pid === '') setVisionApiKeyQuick('');
                      }}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1 text-[10px] text-slate-200 outline-none focus:border-amber-500"
                    >
                      <option value="">使用已保存配置</option>
                      {VISION_QUICK_PROVIDERS.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                      {(visionSettings?.customProviders || []).map((cp) => (
                        <option key={cp.id} value={cp.id}>{cp.name}（自定义）</option>
                      ))}
                      <option value="custom">自定义（手动填）</option>
                    </select>
                    <select
                      value={visionModelQuick}
                      onChange={(e) => setVisionModelQuick(e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1 text-[10px] text-slate-200 outline-none focus:border-amber-500"
                    >
                      <option value="">
                        {(() => {
                          if (visionProviderQuick === 'custom') return '自定义模型（下方填写）';
                          if (visionModelQuick) return visionModelQuick;
                          if (visionProviderQuick) {
                            const p = VISION_QUICK_PROVIDERS.find((x) => x.id === visionProviderQuick);
                            const cp = visionSettings?.customProviders?.find((x) => x.id === visionProviderQuick);
                            return `默认（${p?.defaultModel || cp?.model || '未设置'}）`;
                          }
                          return `默认（${visionSettings?.model || '未设置'}）`;
                        })()}
                      </option>
                      {(() => {
                        if (!visionProviderQuick || visionProviderQuick === 'custom') return null;
                        const provider = VISION_QUICK_PROVIDERS.find((p) => p.id === visionProviderQuick);
                        const customCp = visionSettings?.customProviders?.find((cp) => cp.id === visionProviderQuick);
                        const models = provider?.visionModels || (customCp?.model ? [customCp.model] : []);
                        return (
                          <>
                            {models.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                            {visionModelQuick && !models.includes(visionModelQuick) && (
                              <option value={visionModelQuick}>{visionModelQuick}（自定义）</option>
                            )}
                          </>
                        );
                      })()}
                    </select>
                  </div>
                  {visionProviderQuick === 'custom' && (
                    <input
                      type="text"
                      value={visionModelQuick}
                      onChange={(e) => setVisionModelQuick(e.target.value)}
                      placeholder="输入自定义模型名，例如 glm-4v-flash"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1 text-[10px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-amber-500"
                    />
                  )}
                  {visionProviderQuick !== '' && visionProviderQuick !== 'custom' && (
                    <input
                      type="password"
                      value={visionApiKeyQuick}
                      onChange={(e) => setVisionApiKeyQuick(e.target.value)}
                      placeholder="该渠道的 API Key（必填，不填会用已保存配置的 Key 调该渠道会 401）"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1 text-[10px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-amber-500"
                    />
                  )}
                  <div className="flex items-center justify-between gap-2 text-[9px] text-slate-500">
                    <span className="truncate">
                      当前：<span className="font-mono text-emerald-300">
                        {(() => {
                          if (visionModelQuick) return visionModelQuick;
                          if (visionProviderQuick === 'custom') return '自定义模型';
                          if (visionProviderQuick) {
                            const p = VISION_QUICK_PROVIDERS.find((x) => x.id === visionProviderQuick);
                            const cp = visionSettings?.customProviders?.find((x) => x.id === visionProviderQuick);
                            return p?.defaultModel || cp?.model || visionSettings?.model || '未设置';
                          }
                          return visionSettings?.model || '未设置';
                        })()}
                      </span>
                    </span>
                    <span className="shrink-0">未选则用已保存配置</span>
                  </div>
                </div>

              {imageError && (
                <div className="rounded-md border border-rose-800/70 bg-rose-950/40 px-2 py-1.5 text-[10px] text-rose-200">
                  {imageError}
                </div>
              )}

              {imageDescription && (
                <div className="space-y-1.5 rounded-md border border-emerald-800/60 bg-emerald-950/25 p-2">
                  <div className="text-[10px] font-bold text-emerald-300">
                    反推结果（核心内容提示词）
                    {isDescribingImage && <span className="ml-1 text-amber-300 animate-pulse">· 实时输出中...</span>}
                  </div>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed text-slate-200">
                    {imageDescription}
                  </p>
                  <button
                    type="button"
                    onClick={applyImageDescription}
                    disabled={isDescribingImage}
                    className="w-full rounded-lg border border-emerald-600 bg-emerald-900/40 px-2 py-1.5 text-[11px] font-bold text-emerald-100 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDescribingImage ? '反推中，请稍候...' : '应用到提示词框并生成'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedSkill.requiresSceneMode && (
          <div className="space-y-1.5 border-t border-slate-800 pt-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-200">场景模式（必选）</span>
              {!sceneMode && <span className="text-[10px] font-bold text-amber-400">请选择后再生成</span>}
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {([
                ['drama', '文戏', '表演、关系与情绪节拍'],
                ['action', '武戏', '连续攻防、受力与动作结果'],
                ['storyboard-grid', '九宫格', '九个状态映射为连续时间线'],
              ] as Array<[H3SceneMode, string, string]>).map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSceneMode(value)}
                  aria-pressed={sceneMode === value}
                  className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                    sceneMode === value
                      ? 'border-purple-500 bg-purple-950/55 text-purple-100'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{label}</div>
                  <div className="mt-0.5 text-[10px] leading-tight opacity-70">{description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <ImageIcon className="h-4 w-4 text-purple-400" />
                图片提示词任务
              </span>
              <span className="text-[10px] font-mono text-slate-500">单张静态画面</span>
            </div>
            <div className="rounded-lg border border-purple-900/70 bg-purple-950/25 p-2 text-[10px] leading-relaxed text-purple-100/80">
              当前 Skill 会把核心创意补全为景别、构图、主体、静态调度、环境、光色、材质与画幅，并按所选图片模型格式输出。
            </div>
            <div className="space-y-1.5">
              <label htmlFor="image-prompt-format" className="text-[11px] font-bold text-slate-300">目标图片模型格式</label>
              <select
                id="image-prompt-format"
                value={imagePromptFormat}
                onChange={(event) => setImagePromptFormat(event.target.value as ImagePromptFormat)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
              >
                {IMAGE_PROMPT_FORMATS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label} — {item.desc}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
      </section>

      {/* Controls & Options Bar */}
      <section
        data-workspace-column="auxiliary-column"
        className="order-1 lg:order-3 lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-start-1"
      >
      <div data-composer-panel="auxiliary-params" className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-2.5 shadow-xl">
        <div className={generatorMode === 'video' ? 'contents' : 'hidden'}>
        {/* Random combination for camera/lens/lighting */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>辅助参数</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setCameraMotion(CAMERA_MOTIONS[Math.floor(Math.random() * CAMERA_MOTIONS.length)].value as any);
              setLensType(LENS_TYPES[Math.floor(Math.random() * LENS_TYPES.length)].value as any);
              setLightingStyle(LIGHTING_STYLES[Math.floor(Math.random() * LIGHTING_STYLES.length)].value as any);
            }}
            className="shrink-0 rounded border border-purple-700 bg-purple-950/50 px-2 py-0.5 text-[10px] font-bold text-purple-200 hover:bg-purple-900"
          >
            🎲 随机组合
          </button>
        </div>
        {/* Aspect Ratio & Duration (hard constraints, shown first) */}
        <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2 xl:grid-cols-2">
          <div className="space-y-0.5">
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>画面比例</span>
            </span>
            <select
              aria-label="画面比例"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as any)}
              disabled={Boolean(selectedSkill.fixedAspectRatio)}
              className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ASPECT_RATIOS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>视频时长</span>
            </span>
            <select
              aria-label="视频时长"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={Boolean(selectedSkill.fixedDuration)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-center font-mono text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="5s">5秒</option>
              <option value="6s">6秒</option>
              <option value="8s">8秒</option>
              <option value="10s">10秒</option>
              <option value="15s">15秒</option>
            </select>
          </div>

          {/* Camera motion */}
          <div className="space-y-0.5">
            <label htmlFor="camera-motion" className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>摄像机运镜轨迹</span>
            </label>
            <select
              id="camera-motion"
              value={cameraMotion}
              onChange={(e) => setCameraMotion(e.target.value as any)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
            >
              <option value="">无（由提示词 / Skill 判断）</option>
              {CAMERA_MOTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Lens Type */}
          <div className="space-y-0.5">
            <label htmlFor="lens-type" className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Film className="w-3.5 h-3.5 text-purple-400" />
              <span>光学镜头类型</span>
            </label>
            <select
              id="lens-type"
              value={lensType}
              onChange={(e) => setLensType(e.target.value as any)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
            >
              <option value="">无（由提示词 / Skill 判断）</option>
              {LENS_TYPES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lighting + Target Model Style */}
        <div className="grid grid-cols-1 gap-1.5 border-t border-slate-800/80 pt-1.5 text-xs sm:grid-cols-2 xl:grid-cols-2">
          {/* Lighting Style */}
          <div className="space-y-0.5">
            <label htmlFor="lighting-style" className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>光影氛围</span>
            </label>
            <select
              id="lighting-style"
              value={lightingStyle}
              onChange={(e) => setLightingStyle(e.target.value as any)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
            >
              <option value="">无（由提示词 / Skill 判断）</option>
              {LIGHTING_STYLES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Target Model Style */}
          <div className="space-y-0.5 sm:col-span-1 xl:col-span-3">
            <label htmlFor="target-video-model" className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>目标视频大模型风格</span>
            </label>
            <select
              id="target-video-model"
              value={targetModel}
              onChange={(e) => setTargetModel(e.target.value as any)}
              className="w-full min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
            >
              <option value="">无（由提示词 / Skill 判断）</option>
              {TARGET_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 视频生成新选项：对白模式 / 提示词组数 / 生成模式 */}
        <div className="grid grid-cols-1 gap-1.5 border-t border-slate-800/80 pt-1.5 text-xs sm:grid-cols-3 xl:grid-cols-3">
          {/* 对白模式 */}
          <div className="space-y-0.5">
            <label htmlFor="dialogue-mode" className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>视频人声处理</span>
            </label>
            <select
              id="dialogue-mode"
              value={dialogueMode}
              onChange={(e) => setDialogueMode(e.target.value as DialogueMode)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-emerald-500 focus:outline-none"
              title="控制视频中人物说话的形式；对白与旁白会写入画面时间线段，不会污染声音设计段"
            >
              <option value="auto">自动判断（由模型按画面意图）</option>
              <option value="dialogue">角色对白（人物开口说话）</option>
              <option value="voiceover">画外旁白（嘴唇保持闭合）</option>
              <option value="lyrics">歌词演唱（人物唱歌）</option>
              <option value="no-human-voice">无任何人声（纯环境声与动作声）</option>
            </select>
          </div>

          {/* 提示词组数 */}
          <div className="space-y-0.5">
            <label htmlFor="variant-count" className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>提示词组数</span>
            </label>
            <select
              id="variant-count"
              value={String(variantCount)}
              onChange={(e) => setVariantCount(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none"
              title="同时生成多组差异化提示词，结果区可用 Tab 切换查看与复制"
            >
              <option value="1">1 组（默认）</option>
              <option value="2">2 组（不同视角/节奏）</option>
              <option value="3">3 组（远景/中景/特写）</option>
              <option value="5">5 组（远景/中景/特写/俯视/仰视）</option>
            </select>
          </div>

          {/* 生成模式 */}
          <div className="space-y-0.5">
            <label htmlFor="generation-mode" className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>生成模式</span>
            </label>
            <select
              id="generation-mode"
              value={generationMode}
              onChange={(e) => setGenerationMode(e.target.value as PromptGenerationMode)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-purple-500 focus:outline-none"
              title="直接推理=单轮调用，已加载所选 Skill 完整规则（主文件+references），速度快；Agent 推理=多轮工具循环让模型自己读 Skill 资料，宽松输出不卡校验（适合自定义 Skill / 多组）"
            >
              <option value="direct">直接推理（单轮，已加载 Skill 完整规则）</option>
              <option value="agent">Agent 推理（自主工具循环，宽松不卡校验）</option>
            </select>
          </div>
        </div>

        {/* Gaven Cinematic Director style selectors */}
        {isGavenSkill && (
          <div className="space-y-1.5 border-t border-slate-800/80 pt-2 text-xs">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] font-semibold text-slate-200">导演画风系统（Dxx/Pxx/Cxx/Rxx 可组合）</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
                  setDirectorStyle(pick(DIRECTOR_STYLES).value);
                  setPhotoStyle(pick(PHOTO_STYLES).value);
                  setCaptureFilm(pick(CAPTURE_FILMS).value);
                  setPrintFilm(pick(PRINT_FILMS).value);
                  setStyleIntensity(pick(STYLE_INTENSITIES).value);
                }}
                className="shrink-0 rounded border border-purple-700 bg-purple-950/50 px-2 py-0.5 text-[10px] font-bold text-purple-200 hover:bg-purple-900"
              >
                🎲 随机组合
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
              <div className="space-y-0.5">
                <label htmlFor="director-style" className="text-slate-400 text-[11px]">导演视觉语言 (Dxx)</label>
                <select
                  id="director-style"
                  value={directorStyle}
                  onChange={(e) => setDirectorStyle(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">无</option>
                  {DIRECTOR_STYLES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-0.5">
                <label htmlFor="photo-style" className="text-slate-400 text-[11px]">摄影风格 (Pxx)</label>
                <select
                  id="photo-style"
                  value={photoStyle}
                  onChange={(e) => setPhotoStyle(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">无</option>
                  {PHOTO_STYLES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-0.5">
                <label htmlFor="capture-film" className="text-slate-400 text-[11px]">拍摄胶片 (Cxx)</label>
                <select
                  id="capture-film"
                  value={captureFilm}
                  onChange={(e) => setCaptureFilm(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">无</option>
                  {CAPTURE_FILMS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-0.5">
                <label htmlFor="print-film" className="text-slate-400 text-[11px]">电影印片 (Rxx)</label>
                <select
                  id="print-film"
                  value={printFilm}
                  onChange={(e) => setPrintFilm(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">无</option>
                  {PRINT_FILMS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-0.5">
                <label htmlFor="style-intensity" className="text-slate-400 text-[11px]">风格强度 (S1-S3)</label>
                <select
                  id="style-intensity"
                  value={styleIntensity}
                  onChange={(e) => setStyleIntensity(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  {STYLE_INTENSITIES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex items-center rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-400 xl:col-span-1">
                <span className="truncate font-mono text-purple-300">
                  {[directorStyle, photoStyle, captureFilm, printFilm, styleIntensity].filter(Boolean).join('+') || '未选择画风'}
                </span>
              </div>
            </div>
          </div>
        )}
        </div>

        {generatorMode === 'image' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                <Sliders className="h-3.5 w-3.5 text-purple-400" />图片辅助参数
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-image-style-randomize
                  onClick={handleRandomizeImageStyles}
                  disabled={isImageTaskGenerating}
                  className="flex items-center gap-1 rounded border border-purple-800 bg-purple-950/50 px-2 py-0.5 text-[9px] font-semibold text-purple-200 transition-colors hover:border-purple-600 hover:bg-purple-900/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  随机组合
                </button>
                <span className="rounded border border-purple-800 bg-purple-950/50 px-2 py-0.5 text-[9px] font-mono text-purple-300">{imagePromptFormat}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="space-y-0.5">
                <label htmlFor="image-aspect-ratio" className="text-[11px] text-slate-400">画面比例</label>
                <select id="image-aspect-ratio" value={imageAspectRatio} onChange={(event) => setImageAspectRatio(event.target.value as AspectRatio)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200">
                  {ASPECT_RATIOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="space-y-0.5">
                <label htmlFor="image-style-intensity" className="text-[11px] text-slate-400">风格强度</label>
                <select id="image-style-intensity" value={imageStyleIntensity} onChange={(event) => setImageStyleIntensity(event.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200">
                  {STYLE_INTENSITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="space-y-0.5">
                <label htmlFor="image-director-style" className="text-[11px] text-slate-400">导演视觉语言 (Dxx)</label>
                <select id="image-director-style" value={imageDirectorStyle} onChange={(event) => setImageDirectorStyle(event.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200">
                  <option value="">无</option>{DIRECTOR_STYLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="space-y-0.5">
                <label htmlFor="image-photo-style" className="text-[11px] text-slate-400">摄影风格 (Pxx)</label>
                <select id="image-photo-style" value={imagePhotoStyle} onChange={(event) => setImagePhotoStyle(event.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200">
                  <option value="">无</option>{PHOTO_STYLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="space-y-0.5">
                <label htmlFor="image-capture-film" className="text-[11px] text-slate-400">拍摄胶片 (Cxx)</label>
                <select id="image-capture-film" value={imageCaptureFilm} onChange={(event) => setImageCaptureFilm(event.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200">
                  <option value="">无</option>{CAPTURE_FILMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="space-y-0.5">
                <label htmlFor="image-print-film" className="text-[11px] text-slate-400">电影印片 (Rxx)</label>
                <select id="image-print-film" value={imagePrintFilm} onChange={(event) => setImagePrintFilm(event.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200">
                  <option value="">无</option>{PRINT_FILMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] font-mono text-purple-300">
              {[imageDirectorStyle, imagePhotoStyle, imageCaptureFilm, imagePrintFilm, imageStyleIntensity].filter(Boolean).join('+') || '未选择画风'}
            </div>

            {/* 图片生成通用选项：组数 + 生成模式（与视频模式共享 state） */}
            <div className="grid grid-cols-2 gap-1.5 border-t border-slate-800/80 pt-1.5">
              <div className="space-y-0.5">
                <label htmlFor="image-variant-count" className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>提示词组数</span>
                </label>
                <select
                  id="image-variant-count"
                  value={String(variantCount)}
                  onChange={(e) => setVariantCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none"
                  title="同时生成多组差异化图片提示词，结果区可用 Tab 切换"
                >
                  <option value="1">1 组（默认）</option>
                  <option value="2">2 组</option>
                  <option value="3">3 组</option>
                  <option value="5">5 组</option>
                </select>
              </div>
              <div className="space-y-0.5">
                <label htmlFor="image-generation-mode" className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span>生成模式</span>
                </label>
                <select
                  id="image-generation-mode"
                  value={generationMode}
                  onChange={(e) => setGenerationMode(e.target.value as PromptGenerationMode)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-purple-500 focus:outline-none"
                  title="使用预设=走 Skill 工作流（JSON 解析+格式转换）；直接推理=单轮 LLM 输出（速度快，跳过解析）"
                >
                  <option value="preset">使用预设（Skill 工作流）</option>
                  <option value="direct">直接推理（单轮 LLM）</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      </section>
      </div>

      {/* 右列（第三列）：提示词框 + 实时流/结果，独立 flex 列 */}
      <div
        className="lg:contents xl:col-start-3 xl:row-start-1 xl:flex xl:min-w-0 xl:flex-col xl:gap-4"
      >

      {/* 提示词框与实时流左右并排（2:1） */}
      <div data-prompt-stream-row className="min-w-0 w-full lg:contents xl:flex xl:flex-row xl:items-start xl:gap-4">
      {/* Main Prompt Input Box & Channel Selector */}
      <section
        data-workspace-column="composer"
        className="order-2 space-y-3 lg:order-4 lg:col-start-2 lg:row-start-3 xl:order-1 xl:min-w-0 xl:flex-[2] xl:sticky xl:top-4 xl:col-start-2 xl:row-start-2"
      >
      <div className="space-y-3">
        {/* Error Banner if API call failed */}
        {errorMessage && (
          <div role="alert" className="p-4 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold">生成请求未成功: </span>
                <span>{errorMessage}</span>
                <div className="text-[11px] text-rose-300/80 font-mono mt-0.5">
                  当前 API 渠道: {settings.customBaseUrl || '官方默认'} | 模型: {currentModelName}
                </div>
              </div>
            </div>

            {onOpenKeyModal && (
              <button
                onClick={onOpenKeyModal}
                className="px-3 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-100 font-semibold text-xs border border-rose-700 shrink-0 flex items-center gap-1"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>检查/更改通用 API 渠道设置</span>
              </button>
            )}
          </div>
        )}

        <div className="relative rounded-2xl bg-slate-900 border-2 border-slate-800 focus-within:border-cyan-500/80 shadow-2xl transition-all p-4 space-y-3">
          
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{generatorMode === 'video' ? '输入你的视频核心画面创意 / 场景描述' : '输入你的图片核心画面创意 / 静态场景描述'}</span>
            </span>
          </div>

          <textarea
            aria-label="核心画面创意或场景描述"
            rows={8}
            value={userQuery}
            onChange={(e) => {
              hasUserEditedPrompt.current = true;
              setUserQuery(e.target.value);
              if (generatorMode === 'video') videoDraftRef.current = e.target.value;
              else imageDraftRef.current = e.target.value;
            }}
            placeholder={generatorMode === 'video'
              ? '例如：冰川之上的极光下，一位穿着古朴披风的人凝视远方冰封的巨龙神殿……'
              : '例如：雨夜，一名女孩独自在公交站台等车，冷蓝街道与暖黄站灯形成对比……'}
            className="min-h-48 w-full resize-y bg-transparent font-sans text-sm leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />

          {/* Action Row & Dynamic Model/Channel Selector */}
          <div className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-800/80 pt-3">
            
            {/* Dynamic API Channel & Custom Model Switcher */}
            <div className="relative w-full">
              <div className="flex w-full items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                  aria-expanded={isChannelDropdownOpen}
                  aria-controls="api-channel-dropdown"
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 transition-all hover:bg-slate-800 font-mono"
                  title="点击切换已保存的 API 渠道与模型"
                >
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-cyan-300">
                    {settings.profiles?.find(p => p.id === currentChannelId)?.name || '当前 API 渠道'}
                  </span>
                  <span className="text-slate-400">/</span>
                  <span className="text-purple-300 font-bold max-w-[140px] truncate">
                    {currentModelName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Quick Editable Model Input */}
                <input
                  type="text"
                  aria-label="快速修改当前模型名"
                  value={currentModelName}
                  onChange={(e) => {
                    setCurrentModelName(e.target.value);
                    if (onSaveSettings) {
                      onSaveSettings({ ...settings, model: e.target.value });
                    }
                  }}
                  placeholder="可直接自定义模型名(如 opencode-go)"
                  className="hidden w-32 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-[11px] font-mono text-purple-200 focus:border-purple-500 focus:outline-none 2xl:block"
                  title="可在此处直接修改或输入带前缀的模型名称，如 opencode-go, glm-4-flash, deepseek-v3 等"
                />
              </div>

              {/* Dropdown Panel for Channel Switch */}
              {isChannelDropdownOpen && (
                <div id="api-channel-dropdown" className="absolute bottom-full left-0 mb-2 w-80 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl p-3 z-50 space-y-2 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-200 text-[11px]">选择 API 驱动渠道</span>
                    {onOpenKeyModal && (
                      <button
                        onClick={() => {
                          setIsChannelDropdownOpen(false);
                          onOpenKeyModal();
                        }}
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        <Settings className="w-3 h-3" />
                        <span>配置多渠道</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {(settings.profiles || []).map((prof) => {
                      const isSelected = prof.id === currentChannelId;
                      return (
                        <button
                          key={prof.id}
                          onClick={() => handleSwitchChannel(prof)}
                          className={`w-full p-2 rounded-xl text-left border flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-xs">{prof.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                              {prof.baseUrl}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-950 text-purple-300 font-mono border border-slate-800">
                              {prof.model}
                            </span>
                            {isSelected && <div className="text-[9px] text-cyan-400 font-bold mt-0.5">生效中</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual model input inside dropdown */}
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <label htmlFor="custom-model-name" className="text-[10px] text-slate-400 font-mono">自定义当前模型名 (Model Name):</label>
                    <input
                      id="custom-model-name"
                      type="text"
                      value={currentModelName}
                      onChange={(e) => {
                        setCurrentModelName(e.target.value);
                        if (onSaveSettings) {
                          onSaveSettings({ ...settings, model: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex w-full gap-2">
              <div className="relative flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRequestThinkingEnabled((value) => !value)}
                  aria-pressed={requestThinkingEnabled}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-bold transition-colors ${
                    requestThinkingEnabled
                      ? 'border-purple-600 bg-purple-950/70 text-purple-200'
                      : 'border-slate-700 bg-slate-950 text-slate-400'
                  }`}
                  title="仅影响当前生成会话，不修改渠道配置"
                >
                  <Brain className="h-4 w-4" />
                  <span>思考</span>
                </button>
                {requestThinkingEnabled && (
                  <button
                    type="button"
                    onClick={() => setIsReasoningEffortOpen((value) => !value)}
                    aria-expanded={isReasoningEffortOpen}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-3 text-[11px] font-bold text-slate-300 hover:border-purple-600"
                  >
                    强度：{requestReasoningEffort === 'low' ? '低' : requestReasoningEffort === 'medium' ? '中' : '高'}
                  </button>
                )}
                {isReasoningEffortOpen && requestThinkingEnabled && (
                  <div className="absolute bottom-full left-0 z-40 mb-2 w-44 rounded-xl border border-purple-800 bg-slate-950 p-2 shadow-2xl">
                    <div className="mb-1.5 text-[10px] font-bold text-purple-300">思考强度</div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['low', 'medium', 'high'] as const).map((effort) => (
                        <button
                          key={effort}
                          type="button"
                          onClick={() => {
                            setRequestReasoningEffort(effort);
                            setIsReasoningEffortOpen(false);
                          }}
                          aria-pressed={requestReasoningEffort === effort}
                          className={`rounded-md px-2 py-1.5 text-[10px] font-bold ${
                            requestReasoningEffort === effort
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {effort === 'low' ? '低' : effort === 'medium' ? '中' : '高'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Main Submit Button */}
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !userQuery.trim()}
                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                    <span className="truncate">{currentModelName} 正在推演中...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>{generatorMode === 'video' ? '生成 MiniMax-H3 视频 Prompt' : `生成 ${IMAGE_PROMPT_FORMATS.find((item) => item.value === imagePromptFormat)?.label || '图片'}提示词`}</span>
                  </>
                )}
              </button>
              {isGenerating && (
                <button
                  type="button"
                  onClick={handleStopGenerate}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-500/70 bg-rose-950/80 px-4 py-3 text-xs font-bold text-rose-100 transition-colors hover:bg-rose-900"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>停止生成</span>
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* 实时生成流（与提示词框并排，占 1/3） */}
      <div className="lg:contents xl:order-2 xl:block xl:min-w-0 xl:flex-1">
        <div data-workspace-section="stream" className="order-1 mb-2 min-w-0 max-w-full overflow-hidden rounded-2xl border border-cyan-900/70 bg-slate-950 text-xs shadow-xl lg:col-start-2 lg:row-start-4">
          <div className="flex min-w-0 w-full items-center justify-between gap-1.5 overflow-hidden border-b border-cyan-900/40 bg-cyan-950/35 px-3 py-2.5 text-cyan-100">
            <button
              onClick={() => setIsLiveStreamOpen((prev) => !prev)}
              aria-expanded={isLiveStreamOpen}
              aria-controls="live-stream-content"
              className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-left"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 text-cyan-300 ${isGenerating ? 'animate-spin' : ''}`} />
              <span className="font-bold whitespace-nowrap">实时生成流</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-900 border border-cyan-900/60 text-cyan-300 font-mono shrink-0">
                {streamStage || 'ready'}
              </span>
              <span className="truncate text-[11px] text-cyan-200/70">{streamStatus}</span>
            </button>
            <div className="flex shrink-0 items-center gap-1 text-[10px]">
              <span className="hidden items-center gap-1 text-purple-400/70 2xl:flex"><span className="inline-block w-2 h-2 rounded-full bg-purple-500/60" />思考</span>
              <span className="hidden items-center gap-1 text-slate-400 2xl:flex"><span className="inline-block w-2 h-2 rounded-full bg-cyan-500/60" />输出</span>
              {liveStreamSegments.length > 0 && (
                <button
                  onClick={() => {
                    const fullText = liveStreamSegments.map((s) => s.text).join('');
                    navigator.clipboard.writeText(fullText);
                  }}
                  className="shrink-0 whitespace-nowrap rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-bold text-slate-300 hover:bg-slate-700"
                >
                  复制
                </button>
              )}
              {!shouldFollowLiveStream && isLiveStreamOpen && (
                <button
                  onClick={() => {
                    setShouldFollowLiveStream(true);
                    requestAnimationFrame(() => {
                      if (liveStreamRef.current) {
                        liveStreamRef.current.scrollTop = liveStreamRef.current.scrollHeight;
                      }
                    });
                  }}
                  className="shrink-0 whitespace-nowrap rounded border border-cyan-800 bg-cyan-950/60 px-1.5 py-0.5 font-bold text-cyan-200 hover:bg-cyan-900"
                >
                  跟随
                </button>
              )}
              <button
                onClick={() => setIsLiveStreamOpen((prev) => !prev)}
                aria-label={isLiveStreamOpen ? '收起实时流' : '展开实时流'}
                aria-expanded={isLiveStreamOpen}
                aria-controls="live-stream-content"
                className="flex shrink-0 items-center gap-0.5 text-slate-400 hover:text-cyan-200"
              >
                {isLiveStreamOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {isLiveStreamOpen && (
            <div id="live-stream-content" className="space-y-1 p-2 pb-2">
              <div
                data-live-stream-log
                ref={liveStreamRef}
                className="min-h-14 min-w-0 max-h-[clamp(3.5rem,16dvh,9rem)] max-w-full overflow-y-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-[11px] leading-relaxed font-mono scroll-smooth"
                onScroll={(event) => {
                  const el = event.currentTarget;
                  const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                  setShouldFollowLiveStream(distanceToBottom < 48);
                }}
              >
                {liveStreamSegments.length === 0
                  ? (isGenerating ? '等待模型开始输出...' : '尚未开始生成。这里会持续保留最近一次实时输出。')
                  : liveStreamSegments.map((seg, i) => (
                      <span key={i} className={seg.kind === 'reasoning' ? 'text-purple-400/70' : 'text-slate-200'}>
                        {seg.text}
                      </span>
                    ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      <section
        data-workspace-column="result"
        className="order-3 flex min-w-0 flex-col gap-4 lg:order-5 lg:col-start-2 lg:row-start-5 xl:col-start-3 xl:row-start-2"
      >

      {/* DeepSeek Thinking Process Display */}
      {thinkingProcess && (
        <div className="order-3 overflow-hidden rounded-2xl border border-purple-900/60 bg-slate-950 text-xs shadow-xl">
          <button
            onClick={() => setShowThinking(!showThinking)}
            aria-expanded={showThinking}
            aria-controls="thinking-process-content"
            className="w-full px-5 py-3 bg-purple-950/40 hover:bg-purple-950/60 flex items-center justify-between border-b border-purple-900/40 text-purple-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="font-bold">模型思维链推理分析过程 (Thinking Process)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-900/80 text-purple-300 font-mono">
                {modelUsed || currentModelName}
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <span>{showThinking ? '折叠思考' : '展开思考'}</span>
              {showThinking ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showThinking && (
            <div id="thinking-process-content" className="p-5 font-mono text-[11px] text-purple-200/90 leading-relaxed whitespace-pre-wrap bg-purple-950/20 max-h-60 overflow-y-auto">
              {thinkingProcess}
            </div>
          )}
        </div>
      )}

      {/* Real Generated Result Output or Demo Showcase */}
      <div data-workspace-section="result" className="order-2">
      {generatorMode === 'image' ? (
        imageResult ? (
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            {/* 图片多组 Tab 切换（仅当存在 variants 数组时显示） */}
            {(() => {
              const variantList = imageResult.variants && imageResult.variants.length > 0
                ? [imageResult, ...imageResult.variants]
                : null;
              if (!variantList || variantList.length <= 1) return null;
              return (
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1.5" role="tablist" aria-label="图片提示词组别切换">
                  {variantList.map((variant, index) => {
                    const isActive = index === activeVariantIndex;
                    return (
                      <button
                        key={index}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveVariantIndex(index)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                        title={variant.variantDirection || `第 ${index + 1} 组`}
                      >
                        <span className="font-mono">#{index + 1}</span>
                        {variant.variantDirection && (
                          <span className="hidden sm:inline font-normal text-[10px] opacity-80">{variant.variantDirection}</span>
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      const combined = variantList.map((v, i) => `# 第 ${i + 1} 组${v.variantDirection ? `（${v.variantDirection}）` : ''}\n${v.target.prompt}`).join('\n\n---\n\n');
                      handleCopy(combined, `image-all-variants-${Date.now()}`, `全部 ${variantList.length} 组`);
                    }}
                    className="ml-auto flex items-center gap-1 rounded-lg border border-cyan-800 bg-cyan-950/60 px-2 py-1.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-900"
                  >
                    {copiedKey?.startsWith('image-all-variants') ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>复制全部 {variantList.length} 组</span>
                  </button>
                </div>
              );
            })()}
            <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400">图片提示词生成成功</span>
                  <span className="rounded border border-purple-800 bg-purple-950 px-2 py-0.5 text-[10px] font-mono text-purple-300">{activeImageResult?.target.format}</span>
                  <h3 className="text-base font-bold text-slate-100">{activeImageResult?.canonical.title}{imageResult.variants && imageResult.variants.length > 0 ? ` · 第 ${activeVariantIndex + 1} 组` : ''}</h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Skill: <span className="font-mono text-cyan-300">{activeImageResult?.matchedSkill}</span> · 模型: <span className="font-mono text-purple-300">{activeImageResult?.model}</span>
                </p>
              </div>
              <button onClick={() => handleCopy(activeImageResult?.target.prompt || '', 'image-master', '图片提示词')} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white">
                {copiedKey === 'image-master' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}复制图片提示词
              </button>
            </div>
            {isGenerating && (
              <div className="flex items-center gap-2 rounded-xl border border-cyan-800 bg-cyan-950/45 px-3 py-2 text-[11px] text-cyan-100">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />正在生成新版本，当前保留上一版结果
              </div>
            )}
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                <span>正向提示词 · {activeImageResult?.target.format}</span>
                <button onClick={() => handleCopy(activeImageResult?.target.prompt || '', 'image-prompt')} className="text-slate-400 hover:text-purple-300">复制</button>
              </div>
              <p className="whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-900 p-3.5 text-xs leading-relaxed text-slate-100">{activeImageResult?.target.prompt}</p>
            </div>
            {activeImageResult?.target.negativePrompt && (
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400"><span>负面提示词</span><button onClick={() => handleCopy(activeImageResult?.target.negativePrompt || '', 'image-negative')} className="hover:text-cyan-300">复制</button></div>
                <p className="font-mono text-[11px] text-slate-300">{activeImageResult.target.negativePrompt}</p>
              </div>
            )}
            <div className="grid gap-3 text-[11px] sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-slate-300">画幅：<span className="font-mono text-cyan-300">{activeImageResult?.target.aspectRatio}</span><br />参数：<span className="font-mono text-slate-400">{JSON.stringify(activeImageResult?.target.parameters)}</span></div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-slate-300">实际思考：<span className="font-bold text-purple-300">{activeImageResult?.reasoning.applied ? `开启${activeImageResult?.reasoning.effort ? ` / ${activeImageResult.reasoning.effort}` : ''}` : '关闭'}</span>{activeImageResult?.reasoning.downgradeReason && <p className="mt-1 text-amber-300">{activeImageResult.reasoning.downgradeReason}</p>}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-800 bg-purple-950/60"><ImageIcon className="h-5 w-5 text-purple-300" /></div>
            <h3 className="text-sm font-bold text-slate-200">图片提示词结果将在这里持续保留</h3>
            <p className="text-[11px] text-slate-500">选择目标模型格式并从核心创意框发起生成。</p>
          </div>
        )
      ) : structuredResult ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-6 animate-in fade-in duration-300">

          {/* 多组提示词 Tab 切换（仅当存在 variants 数组时显示） */}
          {(() => {
            const variantList = structuredResult.variants && structuredResult.variants.length > 0
              ? [structuredResult, ...structuredResult.variants]
              : null;
            if (!variantList || variantList.length <= 1) return null;
            return (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1.5" role="tablist" aria-label="提示词组别切换">
                {variantList.map((variant, index) => {
                  const isActive = index === activeVariantIndex;
                  return (
                    <button
                      key={variant.id || index}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveVariantIndex(index)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-500/20'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                      title={variant.variantDirection || `第 ${index + 1} 组`}
                    >
                      <span className="font-mono">#{index + 1}</span>
                      {variant.variantDirection && (
                        <span className="hidden sm:inline font-normal text-[10px] opacity-80">{variant.variantDirection}</span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const variant = variantList[activeVariantIndex] || variantList[0];
                    const combined = variantList.map((v, i) => `# 第 ${i + 1} 组${v.variantDirection ? `（${v.variantDirection}）` : ''}\n${v.englishPrompt}`).join('\n\n---\n\n');
                    handleCopy(combined, `all-variants-${Date.now()}`, `全部 ${variantList.length} 组`);
                  }}
                  className="ml-auto flex items-center gap-1 rounded-lg border border-cyan-800 bg-cyan-950/60 px-2 py-1.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-900"
                  title="把全部组别合并为带分隔线的文本复制"
                >
                  {copiedKey?.startsWith('all-variants') ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>复制全部 {variantList.length} 组</span>
                </button>
              </div>
            );
          })()}
          
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
            <div className="min-w-0 space-y-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-[10px] font-bold">
                  推演生成成功
                </span>
                {matchedSkill && (
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-[10px] font-bold">
                    Skill: {matchedSkill}
                  </span>
                )}
                <h3 className="min-w-0 break-words text-base font-bold text-slate-100 [overflow-wrap:anywhere]">{structuredResult.title}</h3>
              </div>
              <p className="text-xs text-slate-400">
                适配视频模型: <span className="text-cyan-300 font-mono">{String(structuredResult.technicalParams.targetModel).toUpperCase()}</span> | 驱动 LLM: <span className="text-purple-300 font-mono">{modelUsed || currentModelName}</span>
                {generationReasoning && (
                  <span className="ml-2 font-mono text-purple-300">
                    思考: {generationReasoning.applied ? `开启${generationReasoning.effort ? `/${generationReasoning.effort}` : ''}` : '关闭'}
                  </span>
                )}
                {agentReview && (
                  <span className="ml-2 text-emerald-300 font-mono">
                    Skill校验: {agentReview.isValidH3Format ? '通过' : '需复核'}
                    {agentReview.fixedInRepairTurn ? ' / 已自动修复' : ''}
                  </span>
                )}
              </p>
            </div>

            {/* One-click Prominent Copy Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleCopy(activeVariant?.englishPrompt || structuredResult.englishPrompt, 'master', '最终 Prompt')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'master' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>一键复制 MiniMax-H3 最终 Prompt</span>
              </button>

              <button
                onClick={() => handleCopyFormattedForPlatform('minimax')}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 flex items-center gap-1"
              >
                <span>带有参数格式</span>
              </button>
            </div>
          </div>

          {isGenerating && (
            <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-cyan-800 bg-cyan-950/45 px-3 py-2 text-[11px] text-cyan-100">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-300" />
              <span>正在生成新版本，当前保留上一版结果</span>
            </div>
          )}

          {agentReview && agentReview.issues.length > 0 && (
            <div className="rounded-xl bg-amber-950/40 border border-amber-800 p-3 text-xs text-amber-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-bold">Skill 校验提示：</span>
                  <span>{agentReview.issues.join('；')}</span>
                </div>
                <button
                  onClick={() => handleGenerate()}
                  disabled={isGenerating}
                  className="shrink-0 rounded-lg border border-amber-700 bg-amber-900/60 px-3 py-1 text-[11px] font-bold text-amber-100 hover:bg-amber-800 disabled:opacity-50"
                >
                  {isGenerating ? '修复中...' : '修复格式'}
                </button>
              </div>
            </div>
          )}

          <div data-result-language-grid className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Final Prompt */}
          <div className="h-full space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                <span>MiniMax-H3 最终提示词{structuredResult.variants && structuredResult.variants.length > 0 ? ` · 第 ${activeVariantIndex + 1} 组` : ''}</span>
              </span>
              <button
                onClick={() => handleCopy(activeVariant?.englishPrompt || '', 'master', '最终 Prompt')}
                className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
              >
                {copiedKey === 'master' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'master' ? '已复制' : '复制最终提示词'}</span>
              </button>
            </div>
            <p className="whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-900 p-3.5 font-sans text-xs leading-relaxed text-slate-100 select-all [overflow-wrap:anywhere]">
              {activeVariant?.englishPrompt}
            </p>
          </div>

          {/* Chinese Breakdown */}
          <div className="h-full space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>中文对照与画面分解</span>
              </span>
              <button
                onClick={() => handleCopy(activeVariant?.chineseTranslation || '', 'cn', '中文解析')}
                className="text-xs text-slate-400 hover:text-purple-300 flex items-center gap-1 font-mono"
              >
                {copiedKey === 'cn' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'cn' ? '已复制' : '复制中文'}</span>
              </button>
            </div>
            <p className="whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-900 p-3.5 text-xs leading-relaxed text-slate-200 select-all [overflow-wrap:anywhere]">
              {activeVariant?.chineseTranslation}
            </p>
          </div>
          </div>

          {/* Detailed Mechanics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Camera mechanics */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>运镜轨迹分析</span>
              </div>
              <div className="text-slate-200 font-medium">{activeVariant?.cameraMovement}</div>
            </div>

            {/* Lighting & atmosphere */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>光影与粒子氛围</span>
              </div>
              <div className="text-slate-200 font-medium">{activeVariant?.lightingAndAtmosphere}</div>
            </div>
          </div>

          {/* Negative & Sound */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-400 font-medium flex items-center justify-between text-[11px]">
                <span>负面排除项 (Negative Prompt)</span>
                <button onClick={() => handleCopy(activeVariant?.negativePrompt || '', 'neg', '负面词')} className="hover:text-cyan-300 font-mono">复制</button>
              </div>
              <div className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800">
                {activeVariant?.negativePrompt}
              </div>
            </div>

            {activeVariant?.soundCue && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>音效配乐设计建议 (Sound Design)</span>
                </div>
                <div className="text-slate-300">{activeVariant.soundCue}</div>
              </div>
            )}
          </div>

          {/* Multi-round Chat Iteration */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>多轮继续迭代与微调 (Follow-up Refinement)</span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                aria-label="继续迭代与微调要求"
                value={chatRefinementText}
                onChange={(e) => setChatRefinementText(e.target.value)}
                placeholder="例如: 增加镜头向后倾斜、将背景雨夜改为夕阳金辉、翻译为可灵AI格式..."
                className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isGenerating && chatRefinementText.trim()) {
                    handleGenerate(chatRefinementText);
                    setChatRefinementText('');
                  }
                }}
              />

              <button
                onClick={() => {
                  handleGenerate(chatRefinementText);
                  setChatRefinementText('');
                }}
                disabled={isGenerating || !chatRefinementText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-cyan-400" />
                <span>迭代</span>
              </button>
            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-slate-200">最终结果将在这里持续保留</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">等待第一次生成</span>
          </div>

          <div className="rounded-xl border border-dashed border-cyan-900/70 bg-cyan-950/15 px-6 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-800 bg-cyan-950/60">
              <Film className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="mt-4 text-sm font-bold text-slate-200">从中间创作台发起生成</div>
            <p className="mx-auto mt-2 max-w-md text-[11px] leading-relaxed text-slate-500">
              最终提示词、中文对照、声音与镜头信息会固定在这里；生成下一版时不会清空当前结果。
            </p>
          </div>

          <details className="group rounded-xl border border-slate-800 bg-slate-950/55 p-3">
            <summary className="cursor-pointer list-none text-[11px] font-bold text-slate-400 transition-colors hover:text-cyan-300">
              查看 H3 输出格式示例
            </summary>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                <span>合规示例（10s T2VA，雨夜新东京题材）：</span>
              </span>
              <button
                onClick={() => handleCopy(`integrated_multimodal_description: [Shot 1] Cinematic, live-action, a medium-wide shot frames a female assassin in luminous tactical armor straddling a glowing hoverbike at a rain-soaked neo-Tokyo intersection. The camera tracks right at fast speed with large amplitude as she twists the throttle and surges into the lane of suspended flying vehicles. [Shot 2] At 00:04.500, the shot cuts to a low-angle close-up as rain beads streak across her chromed visor.\n\noverall_soundscape: Heavy rain hisses against asphalt and armor plating while the hoverbike's electric thrum builds underneath.\n\nnon_diegetic_music: Pulsing synth-bass at a fast tempo layered with metallic percussion.`, 'demo', '演示提示词')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3 text-cyan-400" />
                <span>一键复制演示样式</span>
              </button>
            </div>

            <pre className="text-[11px] font-mono text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800/80 select-all whitespace-pre-wrap break-words overflow-x-auto">{`integrated_multimodal_description: [Shot 1] Cinematic, live-action, a medium-wide shot frames a female assassin in luminous tactical armor straddling a glowing hoverbike at a rain-soaked neo-Tokyo intersection. The camera tracks right at fast speed with large amplitude as she twists the throttle and surges into the lane of suspended flying vehicles, spray arcing from the wet asphalt. [Shot 2] At 00:04.500, the shot cuts to a low-angle close-up as rain beads streak across her chromed visor and cyan running lights throw volumetric rays through the downpour.

overall_soundscape: Heavy rain hisses against asphalt and armor plating while the hoverbike's electric thrum builds underneath. Distant engine wash from passing flying vehicles sweeps left to right.

non_diegetic_music: Pulsing synth-bass at a fast tempo layered with metallic percussion, building in intensity before cutting to silence at the fade.`}</pre>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1">
              <div className="flex items-center gap-1 bg-slate-900 p-2 rounded-lg border border-slate-800">
                <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>镜头：[Shot N] 分镜 + At 时间码，运镜含 motion/amplitude/speed</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-2 rounded-lg border border-slate-800">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>声景：overall_soundscape 描述环境声与动作声</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-2 rounded-lg border border-slate-800">
                <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>配乐：non_diegetic_music 画外音乐（无则 N/A）</span>
              </div>
            </div>
          </div>
          </details>
        </div>
      )}

      </div>
      </section>
      </div>
      </div>
    </div>
  );
};
