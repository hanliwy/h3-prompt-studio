import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Loader2, 
  Sparkles, 
  Sliders, 
  Globe, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Radio, 
  Server,
  Layers,
  Tag
} from 'lucide-react';
import { DeepSeekSettings, ApiProfile, VisionSettings, VisionCustomProvider } from '../types';

interface UniversalApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DeepSeekSettings;
  onSaveSettings: (newSettings: DeepSeekSettings) => void;
  visionSettings?: VisionSettings;
  onSaveVisionSettings?: (nextVision: VisionSettings) => void;
}

// Preset Provider Templates
const PROVIDER_TEMPLATES: Array<{
  name: string;
  baseUrl: string;
  defaultModel: string;
  popularModels: string[];
  desc: string;
}> = [
  {
    name: 'DeepSeek 官方 API',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-v4-flash',
    popularModels: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-reasoner'],
    desc: '官方直连，包含 DeepSeek-V4 及推理架构',
  },
  {
    name: 'OpenCode / OpenCodeGo 套餐',
    baseUrl: 'https://opencode.ai/zen/go/v1',
    defaultModel: 'deepseek-v4-flash',
    popularModels: ['glm5', 'glm5.1', 'mimo-2.5', 'deepseek-v4-pro', 'deepseek-v4-flash'],
    desc: 'OpenCode 官方中转 API 与 OpenCodeGo 订阅套餐',
  },
  {
    name: '智谱 AI BigModel (GLM-4)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    popularModels: ['glm-4-flash', 'glm-4-plus', 'glm-4-air', 'codegeex-4'],
    desc: '智谱 AI 开放平台，GLM-4 旗舰大模型及 CodeGeex 系列',
  },
  {
    name: '硅基流动 (SiliconFlow)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    popularModels: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'deepseek-ai/DeepSeek-V2.5'],
    desc: '国内高性能托管服务，兼容标准 API',
  },
  {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-r1',
    popularModels: ['deepseek/deepseek-r1', 'deepseek/deepseek-chat', 'anthropic/claude-3.5-sonnet'],
    desc: '海外通用模型网关与统一路由',
  },
  {
    name: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    popularModels: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    desc: '月之暗面官方 API',
  },
  {
    name: '自定义 / OneAPI 中转',
    baseUrl: 'https://your-custom-api-domain.com/v1',
    defaultModel: 'deepseek-v4-flash',
    popularModels: ['deepseek-v4-flash', 'deepseek-ai/DeepSeek-V3', 'gpt-4o-mini'],
    desc: '适用于自建 OneAPI、NewAPI 或第三方聚合渠道',
  },
];

// 图片反推（VLM）视觉渠道预设
const VISION_PROVIDERS: Array<{
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  visionModels: string[];
}> = [
  {
    id: 'zhipu',
    name: '智谱 BigModel (GLM-4V)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4v-flash',
    visionModels: ['glm-4v-flash', 'glm-4v-plus', 'glm-4.6v-flash', 'glm-4.5v', 'glm-4.1v-thinking-flash', 'glm-ocr'],
  },
  {
    id: 'dashscope',
    name: '通义千问 DashScope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-vl-plus',
    visionModels: ['qwen-vl-plus', 'qwen-vl-max', 'qwen2.5-vl-72b-instruct', 'qwen2-vl-7b-instruct'],
  },
  {
    id: 'siliconflow',
    name: '硅基流动 SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2.5-VL-7B-Instruct',
    visionModels: ['Qwen/Qwen2.5-VL-7B-Instruct', 'Qwen/Qwen2.5-VL-72B-Instruct', 'Qwen/Qwen2-VL-7B-Instruct'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash',
    visionModels: ['google/gemini-2.0-flash', 'google/gemini-2.5-flash', 'openai/gpt-4o', 'openai/gpt-4o-mini', 'qwen/qwen-2.5-vl-72b-instruct'],
  },
  {
    id: 'xflow',
    name: 'xFlow API 聚合',
    baseUrl: 'https://api.xflow.cc/v1',
    defaultModel: 'grok-4-1-fast-non-reasoning',
    visionModels: ['grok-4-1-fast-non-reasoning', 'grok-4-1-fast', 'gemini-3-flash-preview', 'chatgpt-4o-latest'],
  },
  {
    id: 'ollama',
    name: '本地 Ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen3vl',
    visionModels: ['qwen3vl', 'qwen2.5vl', 'llava', 'llama3.2-vision'],
  },
];

export const DeepSeekKeyModal: React.FC<UniversalApiSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaveSettings,
  settings,
  visionSettings,
  onSaveVisionSettings,
}) => {
  // 图片反推（VLM）配置状态
  const [visionBaseUrl, setVisionBaseUrl] = useState(visionSettings?.baseUrl || 'https://open.bigmodel.cn/api/paas/v4');
  const [visionApiKey, setVisionApiKey] = useState(visionSettings?.apiKey || '');
  const [visionModel, setVisionModel] = useState(visionSettings?.model || 'glm-4v-flash');
  const [visionProvider, setVisionProvider] = useState(() => {
    const base = (visionSettings?.baseUrl || '').toLowerCase();
    const match = VISION_PROVIDERS.find((p) => base.includes(p.baseUrl.toLowerCase().split('/')[2] || ''));
    return match?.id || (visionSettings?.baseUrl ? 'custom' : 'zhipu');
  });
  const [visionModelCustom, setVisionModelCustom] = useState(
    () => !VISION_PROVIDERS.some((p) => p.visionModels.includes(visionSettings?.model || '')),
  );
  const [customVisionModels, setCustomVisionModels] = useState<string[]>(visionSettings?.customModels || []);
  const [newModelName, setNewModelName] = useState('');
  // 自定义命名渠道（可多个）
  const [customVisionProviders, setCustomVisionProviders] = useState<VisionCustomProvider[]>(visionSettings?.customProviders || []);
  const [customProviderName, setCustomProviderName] = useState('');
  // 正在编辑的自定义渠道 id：'new' = 新建中，null = 非自定义渠道
  const [editingCustomProviderId, setEditingCustomProviderId] = useState<string | null>(null);
  // 内置渠道 id → 各自独立的 API Key（防止切换渠道覆盖）
  // 旧配置迁移：已有主配置 key 自动归入对应渠道
  const [visionProviderKeys, setVisionProviderKeys] = useState<Record<string, string>>(() => {
    if (visionSettings?.providerKeys) return visionSettings.providerKeys;
    if (visionSettings?.apiKey && visionSettings?.baseUrl) {
      const match = VISION_PROVIDERS.find((p) => (visionSettings.baseUrl || '').toLowerCase().includes((p.baseUrl.toLowerCase().split('/')[2] || '')));
      if (match) return { [match.id]: visionSettings.apiKey };
    }
    return {};
  });

  // 切换视觉渠道：先把当前输入框的 key 暂存到原渠道，再从目标渠道恢复 key
  const switchVisionProvider = (targetId: string, targetBaseUrl: string, targetModel: string, targetKey?: string) => {
    setVisionProviderKeys((prev) => {
      const next = { ...prev };
      if (visionProvider && visionApiKey.trim()) next[visionProvider] = visionApiKey.trim();
      if (targetKey) next[targetId] = targetKey;
      return next;
    });
    setVisionProvider(targetId);
    setVisionBaseUrl(targetBaseUrl);
    setVisionModel(targetModel);
    setVisionApiKey(targetKey || '');
    setVisionModelCustom(!targetKey && false);
    setEditingCustomProviderId(null);
    setCustomProviderName('');
  };
  const [activeTab, setActiveTab] = useState<'llm' | 'vision'>('llm');
  // Profiles state
  const [profiles, setProfiles] = useState<ApiProfile[]>(() => {
    if (settings.profiles && settings.profiles.length > 0) {
      return settings.profiles;
    }
    // Fallback initial profiles
    return [
      {
        id: 'default-deepseek',
        name: 'DeepSeek 官方',
        baseUrl: settings.customBaseUrl || 'https://api.deepseek.com',
        apiKey: settings.apiKey || '',
        model: settings.model || 'deepseek-v4-flash',
        thinkingEnabled: settings.thinkingEnabled ?? true,
        reasoningEffort: settings.reasoningEffort || 'high',
        temperature: settings.temperature || 0.7,
      },
      {
        id: 'opencode-preset',
        name: 'OpenCode / OpenCodeGo 套餐',
        baseUrl: 'https://opencode.ai/zen/go/v1',
        apiKey: '',
        model: 'deepseek-v4-flash',
        thinkingEnabled: true,
        reasoningEffort: 'high',
        temperature: 0.7,
      },
      {
        id: 'zhipu-glm4-preset',
        name: '智谱 AI (GLM-4)',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: '',
        model: 'glm-4-flash',
        thinkingEnabled: true,
        reasoningEffort: 'high',
        temperature: 0.7,
      },
      {
        id: 'siliconflow-preset',
        name: '硅基流动 (SiliconFlow)',
        baseUrl: 'https://api.siliconflow.cn/v1',
        apiKey: '',
        model: 'deepseek-ai/DeepSeek-V3',
        thinkingEnabled: true,
        reasoningEffort: 'high',
        temperature: 0.7,
      },
    ];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    return settings.activeProfileId || profiles[0]?.id || 'default-deepseek';
  });

  // Current editing fields (syncs with active profile)
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const [editingName, setEditingName] = useState(activeProfile?.name || 'DeepSeek 官方');
  const [editingBaseUrl, setEditingBaseUrl] = useState(activeProfile?.baseUrl || 'https://api.deepseek.com');
  const [editingApiKey, setEditingApiKey] = useState(activeProfile?.apiKey || '');
  const [editingModel, setEditingModel] = useState(activeProfile?.model || 'deepseek-v4-flash');
  const [editingThinkingEnabled, setEditingThinkingEnabled] = useState(activeProfile?.thinkingEnabled ?? true);
  const [editingReasoningEffort, setEditingReasoningEffort] = useState<'low' | 'medium' | 'high'>(activeProfile?.reasoningEffort || 'high');

  // Custom model input mode toggle or quick select
  const [isCustomModelInput, setIsCustomModelInput] = useState<boolean>(true);

  // Testing connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync state when activeProfileId changes
  useEffect(() => {
    const prof = profiles.find((p) => p.id === activeProfileId);
    if (prof) {
      setEditingName(prof.name);
      setEditingBaseUrl(prof.baseUrl);
      setEditingApiKey(prof.apiKey);
      setEditingModel(prof.model);
      setEditingThinkingEnabled(prof.thinkingEnabled);
      setEditingReasoningEffort(prof.reasoningEffort);
      setTestResult(null);
    }
  }, [activeProfileId]);

  // Close on Esc key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Save changes to current profile
  const updateCurrentProfileInList = (updatedFields: Partial<ApiProfile>) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === activeProfileId ? { ...p, ...updatedFields } : p))
    );
  };

  // Add new profile
  const handleAddNewProfile = (template?: typeof PROVIDER_TEMPLATES[0]) => {
    const newId = 'prof-' + Date.now();
    const newProfile: ApiProfile = {
      id: newId,
      name: template ? template.name : '新 API 渠道配置',
      baseUrl: template ? template.baseUrl : 'https://api.deepseek.com',
      apiKey: '',
      model: template ? template.defaultModel : 'deepseek-v4-flash',
      thinkingEnabled: true,
      reasoningEffort: 'high',
      temperature: 0.7,
    };
    setProfiles((prev) => [...prev, newProfile]);
    setActiveProfileId(newId);
  };

  // Delete profile
  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (profiles.length <= 1) {
      alert('至少需要保留一个 API 配置渠道');
      return;
    }
    const filtered = profiles.filter((p) => p.id !== id);
    setProfiles(filtered);
    if (activeProfileId === id) {
      setActiveProfileId(filtered[0].id);
    }
  };

  // Duplicate profile
  const handleDuplicateProfile = (prof: ApiProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = 'prof-' + Date.now();
    const duplicated: ApiProfile = {
      ...prof,
      id: newId,
      name: `${prof.name} (副本)`,
    };
    setProfiles((prev) => [...prev, duplicated]);
    setActiveProfileId(newId);
  };

  // Test connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/deepseek/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: editingApiKey.trim(),
          baseUrl: editingBaseUrl.trim(),
          model: editingModel.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setTestResult({ success: true, message: data.message || 'API 连接测试成功，接口响应正常！' });
      } else {
        setTestResult({ success: false, message: data.error || '验证失败，请检查 Base URL、Key 或模型名称' });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: '网络请求超时或无法连接至后端服务' });
    } finally {
      setIsTesting(false);
    }
  };

  // Save all settings to parent App state & LocalStorage
  const handleSaveAll = () => {
    // Make sure active profile object is updated
    const updatedProfiles = profiles.map((p) => {
      if (p.id === activeProfileId) {
        return {
          ...p,
          name: editingName.trim() || '未命名渠道',
          baseUrl: editingBaseUrl.trim(),
          apiKey: editingApiKey.trim(),
          model: editingModel.trim() || 'deepseek-v4-flash',
          thinkingEnabled: editingThinkingEnabled,
          reasoningEffort: editingReasoningEffort,
        };
      }
      return p;
    });

    const activeProf = updatedProfiles.find((p) => p.id === activeProfileId) || updatedProfiles[0];

    onSaveSettings({
      apiKey: activeProf.apiKey,
      model: activeProf.model,
      customBaseUrl: activeProf.baseUrl,
      thinkingEnabled: activeProf.thinkingEnabled,
      reasoningEffort: activeProf.reasoningEffort,
      temperature: activeProf.temperature,
      activeProfileId: activeProf.id,
      profiles: updatedProfiles,
    });

    // Save vision settings if callback provided
    if (onSaveVisionSettings) {
      const nextProviderKeys = { ...visionProviderKeys };
      if (visionApiKey.trim()) nextProviderKeys[visionProvider] = visionApiKey.trim();
      else delete nextProviderKeys[visionProvider]; // 清空即删除该渠道 key
      onSaveVisionSettings({
        baseUrl: visionBaseUrl.trim() || 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: visionApiKey.trim(),
        model: visionModel.trim() || 'glm-4v-flash',
        customModels: customVisionModels,
        customProviders: customVisionProviders,
        providerKeys: nextProviderKeys,
      });
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800/80 text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>通用 API 与中转渠道管理</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  OpenAI 格式通用
                </span>
              </h3>
              <p className="text-xs text-slate-400">支持官方直连、硅基流动、OpenRouter 及各类自定义中转/前缀模型配置</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-0 bg-slate-950 border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('llm')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold transition-colors ${
              activeTab === 'llm'
                ? 'bg-slate-900 text-cyan-300 border border-b-0 border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🤖 大模型 API 配置
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vision')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold transition-colors ${
              activeTab === 'vision'
                ? 'bg-slate-900 text-emerald-300 border border-b-0 border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🖼️ 图片反推 API 配置
          </button>
        </div>

        {/* LLM Tab Body */}
        {activeTab === 'llm' && (
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
          
          {/* Left Channel Profile List */}
          <div className="md:col-span-4 bg-slate-950/70 border-r border-slate-800/80 p-3 flex flex-col space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>已保存渠道 ({profiles.length})</span>
              </span>
              <button
                onClick={() => handleAddNewProfile()}
                className="p-1 rounded-md text-cyan-400 hover:bg-cyan-950 hover:text-cyan-300 border border-cyan-900/60 transition-colors"
                title="新建配置渠道"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile List Buttons */}
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5">
              {profiles.map((prof) => {
                const isActive = prof.id === activeProfileId;
                return (
                  <div
                    key={prof.id}
                    onClick={() => setActiveProfileId(prof.id)}
                    className={`group relative w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      isActive
                        ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-100 shadow-md shadow-cyan-950/40'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs flex items-center gap-1.5 truncate pr-2">
                        <Server className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span className="truncate">{prof.name || '未命名渠道'}</span>
                      </div>
                      
                      {/* Action buttons (Duplicate, Delete) */}
                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={(e) => handleDuplicateProfile(prof, e)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                          title="复制该配置"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {profiles.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteProfile(prof.id, e)}
                            className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-300"
                            title="删除配置"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 truncate flex items-center justify-between">
                      <span className="truncate">{prof.model}</span>
                      {prof.apiKey ? (
                        <span className="text-[9px] text-emerald-400 font-sans">已填 Key</span>
                      ) : (
                        <span className="text-[9px] text-amber-500 font-sans">未填 Key</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Template Selector */}
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 px-1">快速从预设模板新建:</div>
              <div className="grid grid-cols-1 gap-1">
                {PROVIDER_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddNewProfile(tmpl)}
                    className="w-full text-left p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 hover:border-cyan-800 hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-[11px] text-slate-300 group-hover:text-cyan-300 truncate">{tmpl.name}</span>
                    <Plus className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Editing Form */}
          <div className="md:col-span-8 p-6 space-y-4 overflow-y-auto">
            
            {/* Profile Name & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-200">配置/渠道别名</label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => {
                    setEditingName(e.target.value);
                    updateCurrentProfileInList({ name: e.target.value });
                  }}
                  placeholder="例如: 硅基流动 - DeepSeek V3"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>接口 Base URL (服务地址)</span>
                </label>
                <input
                  type="text"
                  value={editingBaseUrl}
                  onChange={(e) => {
                    setEditingBaseUrl(e.target.value);
                    updateCurrentProfileInList({ baseUrl: e.target.value });
                  }}
                  placeholder="https://api.deepseek.com 或 https://api.siliconflow.cn/v1"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>API 访问密钥 (API Key)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">保存在本地浏览器 LocalStorage</span>
              </label>
              <input
                type="password"
                value={editingApiKey}
                onChange={(e) => {
                  setEditingApiKey(e.target.value);
                  updateCurrentProfileInList({ apiKey: e.target.value });
                }}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-100 focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
              />
            </div>

            {/* Model Name specification (Supports custom prefixed model names) */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>模型名称 (支持指定带前缀的自定义模型)</span>
                </label>
                <span className="text-[10px] text-cyan-400 font-mono">自定义模型支持</span>
              </div>

              {/* Main Model Input Field */}
              <div className="relative">
                <input
                  type="text"
                  value={editingModel}
                  onChange={(e) => {
                    setEditingModel(e.target.value);
                    updateCurrentProfileInList({ model: e.target.value });
                  }}
                  placeholder="如: deepseek-v4-pro, deepseek-ai/DeepSeek-V3, deepseek/deepseek-r1"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Quick Model Tags for convenience */}
              <div className="space-y-1 pt-1">
                <div className="text-[10px] text-slate-400">常用模型快速填入:</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    'deepseek-v4-pro',
                    'deepseek-v4-flash',
                    'opencode-go',
                    'opencode-go-pro',
                    'glm-4-flash',
                    'codegeex-4',
                    'deepseek-ai/DeepSeek-V3',
                    'deepseek-ai/DeepSeek-R1',
                    'deepseek/deepseek-r1',
                    'gpt-4o-mini',
                  ].map((mName) => (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => {
                        setEditingModel(mName);
                        updateCurrentProfileInList({ model: mName });
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                        editingModel === mName
                          ? 'bg-purple-950 text-purple-300 border-purple-600 font-semibold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {mName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Thinking Mode & Reasoning Effort */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="font-semibold text-slate-200 text-xs">思考模式 (Thinking Mode)</div>
                    <div className="text-[10px] text-slate-400">若所选模型支持 CoT，将展示镜头逻辑分析与深度拆解</div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingThinkingEnabled}
                    onChange={(e) => {
                      setEditingThinkingEnabled(e.target.checked);
                      updateCurrentProfileInList({ thinkingEnabled: e.target.checked });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {editingThinkingEnabled && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-cyan-400" />
                    <span>推理深度 (Reasoning Effort):</span>
                  </span>
                  
                  <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    {(['low', 'medium', 'high'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => {
                          setEditingReasoningEffort(lvl);
                          updateCurrentProfileInList({ reasoningEffort: lvl });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono transition-all ${
                          editingReasoningEffort === lvl
                            ? 'bg-purple-600 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Test Connection Result */}
            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <span className="break-all">{testResult.message}</span>
              </div>
            )}

          </div>
        </div>
        )}

        {/* Vision Tab Body */}
        {activeTab === 'vision' && (
        <>
        <div className="flex-1 overflow-y-auto border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800/80 text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>图片反推 API（视觉模型）</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                  OpenAI 兼容视觉
                </span>
              </h3>
              <p className="text-xs text-slate-400">用于参考图 → 核心内容提示词反推，选择渠道并配置视觉模型</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px]">
            <div className="md:col-span-4 bg-slate-950/70 border-r border-slate-800/80 p-3 flex flex-col space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>视觉渠道</span>
                </span>
              </div>
              <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5">
                {VISION_PROVIDERS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => switchVisionProvider(p.id, p.baseUrl, p.defaultModel, visionProviderKeys[p.id] || '')}
                    className={`group relative w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      visionProvider === p.id
                        ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-100 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs flex items-center gap-1.5 truncate">
                        <span className={`w-2 h-2 rounded-full ${visionProvider === p.id ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        <span className="truncate">{p.name}</span>
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate flex items-center justify-between">
                      <span className="truncate">{p.defaultModel}</span>
                      {visionProviderKeys[p.id] || (visionProvider === p.id && visionApiKey) ? (
                        <span className="text-[9px] text-emerald-400 font-sans shrink-0">已填 Key</span>
                      ) : (
                        <span className="text-[9px] text-slate-600 font-sans shrink-0">{p.visionModels.length} 模型</span>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    // 新建自定义渠道：先暂存当前渠道 key
                    setVisionProviderKeys((prev) => (visionProvider && visionApiKey.trim() ? { ...prev, [visionProvider]: visionApiKey.trim() } : prev));
                    setVisionProvider('custom');
                    setVisionBaseUrl('');
                    setVisionApiKey('');
                    setVisionModel('');
                    setVisionModelCustom(true);
                    setCustomProviderName('');
                    setEditingCustomProviderId('new');
                  }}
                  className={`group relative w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    visionProvider === 'custom' && editingCustomProviderId === 'new'
                      ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-100 shadow-md shadow-emerald-950/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>＋ 新建自定义渠道</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">命名 + 任意 OpenAI 兼容 Base URL</div>
                </button>

                {/* 已保存的自定义渠道 */}
                {customVisionProviders.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <div className="px-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">我的自定义渠道</div>
                    {customVisionProviders.map((cp) => (
                      <div
                        key={cp.id}
                        onClick={() => {
                          setVisionProviderKeys((prev) => (visionProvider && visionApiKey.trim() ? { ...prev, [visionProvider]: visionApiKey.trim() } : prev));
                          setVisionProvider('custom');
                          setVisionBaseUrl(cp.baseUrl);
                          setVisionApiKey(cp.apiKey || '');
                          setVisionModel(cp.model || '');
                          setVisionModelCustom(true);
                          setCustomProviderName(cp.name);
                          setEditingCustomProviderId(cp.id);
                        }}
                        className={`group relative w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                          visionProvider === 'custom' && editingCustomProviderId === cp.id
                            ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-100 shadow-md shadow-emerald-950/40'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs flex items-center gap-1.5 truncate">
                            <span className={`w-2 h-2 rounded-full ${visionProvider === 'custom' && editingCustomProviderId === cp.id ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            <span className="truncate">{cp.name}</span>
                          </span>
                          <button
                            type="button"
                            title="删除该自定义渠道"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomVisionProviders((prev) => prev.filter((x) => x.id !== cp.id));
                              if (editingCustomProviderId === cp.id) {
                                setEditingCustomProviderId(null);
                                setVisionProvider('zhipu');
                                const zp = VISION_PROVIDERS.find((p) => p.id === 'zhipu')!;
                                setVisionBaseUrl(zp.baseUrl);
                                setVisionModel(zp.defaultModel);
                                setVisionModelCustom(false);
                              }
                            }}
                            className="shrink-0 rounded px-1 text-[10px] text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate flex items-center justify-between">
                          <span className="truncate">{cp.model || '未设默认模型'}</span>
                          <span className="text-[9px] text-slate-600 font-sans shrink-0">{cp.apiKey ? '已填 Key' : '无 Key'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-8 p-6 space-y-4 overflow-y-auto">
              {visionProvider === 'custom' && (
                <div className="flex items-end gap-2 rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      <span>渠道名称（必填，保存后可在列表中命名区分）</span>
                    </label>
                    <input
                      type="text"
                      value={customProviderName}
                      onChange={(e) => setCustomProviderName(e.target.value)}
                      placeholder="例如：公司 OneAPI 中转 / 免费 GLM 测试"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const name = customProviderName.trim();
                      if (!name) return;
                      if (!visionBaseUrl.trim()) return;
                      if (editingCustomProviderId === 'new') {
                        const newCp: VisionCustomProvider = {
                          id: `cp-${Date.now()}`,
                          name,
                          baseUrl: visionBaseUrl.trim(),
                          apiKey: visionApiKey.trim(),
                          model: visionModel.trim() || undefined,
                        };
                        setCustomVisionProviders((prev) => [...prev, newCp]);
                        setEditingCustomProviderId(newCp.id);
                      } else if (editingCustomProviderId) {
                        setCustomVisionProviders((prev) =>
                          prev.map((x) =>
                            x.id === editingCustomProviderId
                              ? { ...x, name, baseUrl: visionBaseUrl.trim(), apiKey: visionApiKey.trim(), model: visionModel.trim() || undefined }
                              : x,
                          ),
                        );
                      }
                    }}
                    disabled={!customProviderName.trim() || !visionBaseUrl.trim()}
                    className="shrink-0 rounded-xl border border-emerald-600 bg-emerald-950/60 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {editingCustomProviderId === 'new' ? '保存为新渠道' : '保存修改'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>接口 Base URL</span>
                  </label>
                  <input
                    type="text"
                    value={visionBaseUrl}
                    onChange={(e) => setVisionBaseUrl(e.target.value)}
                    placeholder="https://open.bigmodel.cn/api/paas/v4"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>API Key</span>
                  </label>
                  <input
                    type="password"
                    value={visionApiKey}
                    onChange={(e) => setVisionApiKey(e.target.value)}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-100 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    <span>视觉模型</span>
                  </label>
                  {visionModelCustom ? (
                    <button
                      type="button"
                      onClick={() => {
                        const provider = VISION_PROVIDERS.find((p) => p.id === visionProvider);
                        if (provider) {
                          setVisionModel(provider.defaultModel);
                          setVisionModelCustom(false);
                        }
                      }}
                      className="text-[10px] text-emerald-400 font-mono hover:text-emerald-300"
                    >
                      使用渠道默认模型
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVisionModelCustom(true)}
                      className="text-[10px] text-slate-400 font-mono hover:text-slate-200"
                    >
                      自定义模型名 →
                    </button>
                  )}
                </div>
                {visionModelCustom ? (
                  <input
                    type="text"
                    value={visionModel}
                    onChange={(e) => setVisionModel(e.target.value)}
                    placeholder="输入自定义视觉模型名"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                ) : (
                  <select
                    value={visionModel}
                    onChange={(e) => setVisionModel(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {(VISION_PROVIDERS.find((p) => p.id === visionProvider)?.visionModels || []).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {customVisionModels.map((m) => (
                      <option key={m} value={m}>{m} ★</option>
                    ))}
                  </select>
                )}
                {!visionModelCustom && (VISION_PROVIDERS.find((p) => p.id === visionProvider)?.visionModels || []).length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] text-slate-400">该渠道支持的可选模型:</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(VISION_PROVIDERS.find((p) => p.id === visionProvider)?.visionModels || []).map((mName) => (
                        <button
                          key={mName}
                          type="button"
                          onClick={() => setVisionModel(mName)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                            visionModel === mName
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-semibold'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {mName}
                        </button>
                      ))}
                      {/* Custom models */}
                      {customVisionModels.map((mName) => (
                        <div key={mName} className="flex items-center">
                          <button
                            type="button"
                            onClick={() => setVisionModel(mName)}
                            className={`px-2 py-0.5 rounded-l text-[10px] font-mono border-r-0 border transition-all ${
                              visionModel === mName
                                ? 'bg-amber-950 text-amber-300 border-amber-600 font-semibold'
                                : 'bg-slate-900 text-amber-400 border-amber-900 hover:border-amber-700 hover:text-amber-300'
                            }`}
                          >
                            {mName} ★
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomVisionModels((prev) => prev.filter((m) => m !== mName));
                              if (visionModel === mName) {
                                const provider = VISION_PROVIDERS.find((p) => p.id === visionProvider);
                                setVisionModel(provider?.defaultModel || 'glm-4v-flash');
                              }
                            }}
                            className="rounded-r border border-amber-900 bg-slate-900 px-1 py-0.5 text-[9px] text-rose-400 hover:bg-rose-950"
                            title="删除自定义模型"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add custom model */}
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/60">
                  <input
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newModelName.trim()) {
                        e.preventDefault();
                        if (!customVisionModels.includes(newModelName.trim())) {
                          setCustomVisionModels((prev) => [...prev, newModelName.trim()]);
                        }
                        setNewModelName('');
                      }
                    }}
                    placeholder="输入模型名并回车，添加到自定义列表"
                    className="min-w-0 flex-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const name = newModelName.trim();
                      if (name && !customVisionModels.includes(name)) {
                        setCustomVisionModels((prev) => [...prev, name]);
                      }
                      setNewModelName('');
                    }}
                    className="shrink-0 rounded-lg border border-emerald-700 bg-emerald-950/50 px-2 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-900"
                  >
                    + 添加
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/50 text-[11px] text-slate-400 leading-relaxed">
                支持智谱 GLM-4V、通义千问 VL、硅基流动、OpenRouter、xFlow、本地 Ollama 及任意自定义 OpenAI 兼容视觉接口。
                保存后在"参考图生提示词"中上传图片即可反推核心内容提示词。
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-t border-slate-800">
          {activeTab === 'llm' && (
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !editingApiKey.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50 transition-all border border-slate-700"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isTesting ? '正在测试连接...' : '测试当前渠道连接'}</span>
          </button>
          )}
          {activeTab === 'vision' && <span className="text-[10px] text-slate-500">配置保存后可在"参考图生提示词"中使用</span>}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              取消
            </button>
            
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 transition-all"
            >
              保存所有本地配置
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export const UniversalApiSettingsModal = DeepSeekKeyModal;
