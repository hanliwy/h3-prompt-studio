import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { PromptGenerator } from './components/PromptGenerator';
import { SkillsVaultView } from './components/SkillsVaultView';
import { InspirationGallery } from './components/InspirationGallery';
import { GalleryDrawer } from './components/GalleryDrawer';
import { AddGalleryItemModal } from './components/AddGalleryItemModal';
import { DeepSeekKeyModal } from './components/DeepSeekKeyModal';
import { PromptHistory } from './components/PromptHistory';
import { CommandPalette } from './components/CommandPalette';

import { 
  DeepSeekSettings, 
  GalleryItem, 
  PromptHistoryItem, 
  PromptGenInputOptions,
  StylePreset,
  VideoModelTarget,
  AspectRatio,
  CameraMotion,
  LensType,
  LightingStyle,
  MiniMaxSkill,
  ImageSkill,
  VisionSettings
} from './types';
import { INITIAL_GALLERY_ITEMS } from './data/galleryData';
import { MINIMAX_SKILLS } from './data/skills';

export default function App() {
  const historySaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [activeTab, setActiveTab] = useState<'generator' | 'skills' | 'gallery' | 'history'>('generator');

  // DeepSeek Settings state
  const [settings, setSettings] = useState<DeepSeekSettings>(() => {
    const saved = localStorage.getItem('deepseek_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      apiKey: '',
      model: 'deepseek-v4-flash',
      thinkingEnabled: true,
      reasoningEffort: 'high',
      temperature: 0.7,
    };
  });

  // 图片反推提示词（VLM）配置
  const [visionSettings, setVisionSettings] = useState<VisionSettings>(() => {
    const saved = localStorage.getItem('vision_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { apiKey: '', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4v-flash' };
  });

  // Skills state (dynamically fetched from backend or local seed)
  const [skills, setSkills] = useState<MiniMaxSkill[]>(MINIMAX_SKILLS);
  const [imageSkills, setImageSkills] = useState<ImageSkill[]>([]);

  // Gallery items state (dynamically fetched from backend or local seed)
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(INITIAL_GALLERY_ITEMS);

  // Prompt History state
  const [historyItems, setHistoryItems] = useState<PromptHistoryItem[]>(() => {
    const saved = localStorage.getItem('minimax_prompt_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'hist-init-1',
        createdAt: '20:15',
        userQuery: '雨夜新东京街头，身穿荧光战甲的女刺客骑着光轮摩托',
        skillId: 'cyberpunk_scifi',
        modelUsed: 'deepseek-v4-flash',
        isFavorite: true,
        thinkingProcess: '已解析赛博朋克雨夜细节，配置 Low Angle Backward Tracking 运镜与 35mm 宽银幕镜头',
        structuredOutput: {
          title: '雨夜赛博朋克装甲武士',
          englishPrompt: 'Cinematic 8K video, a futuristic armored samurai walking through a drenched cyberpunk alleyway in Neo-Tokyo. Neon signs reflect on wet asphalt. Low angle tracking shot, 35mm anamorphic lens, volumetric light rays, 24fps.',
          chineseTranslation: '电影级8K视频，一位身穿未来科技装甲的武士行走在新东京被雨水浸湿的赛博朋克巷道中。霓虹招牌在湿沥青路面上折射出绚丽光影。低角度追踪镜头，35mm变形宽银幕镜头，24帧/秒。',
          subjectDescription: '主角装甲高清晰细腻，雨滴沿金属反光滑落',
          cameraMovement: 'Low Angle Backward Tracking Shot (低角度后退追踪)',
          lightingAndAtmosphere: 'Cyberpunk Neon & Wet Asphalt Reflections',
          styleAndAesthetics: '8K IMAX 影院光影',
          negativePrompt: 'blurry, morphing, low quality, static shot',
          soundCue: '细腻雨滴声与远处科幻轰鸣声',
          technicalParams: {
            targetModel: 'minimax-h3',
            aspectRatio: '16:9',
            fps: 24,
            duration: '6s',
            motionSpeed: 7,
          },
        },
      },
    ];
  });

  // Modals and Drawer state
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<GalleryItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Generator preset transfer options
  const [generatorInputOptions, setGeneratorInputOptions] = useState<Partial<PromptGenInputOptions>>({});

  // Fetch Skills from backend
  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        const nextSkills = Array.isArray(data) ? data : data.skills;
        if (Array.isArray(nextSkills) && nextSkills.length > 0) {
          setSkills(nextSkills);
        }
      }
    } catch (err) {
      console.warn('API /api/skills unreachable, using default skills.');
    }
  };

  const fetchImageSkills = async () => {
    try {
      const res = await fetch('/api/image-skills');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.skills)) setImageSkills(data.skills);
    } catch {
      console.warn('API /api/image-skills unreachable, image prompt skills unavailable.');
    }
  };

  // Fetch Gallery Items from backend
  const fetchGallery = async () => {
    try {
      const res = await fetch('/api/gallery');
      if (res.ok) {
        const data = await res.json();
        const nextItems = Array.isArray(data) ? data : data.items;
        if (Array.isArray(nextItems) && nextItems.length > 0) {
          setGalleryItems(nextItems);
        }
      }
    } catch (err) {
      console.warn('API /api/gallery unreachable, using default gallery.');
    }
  };

  const fetchServerConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) return;
      const data = await res.json();
      const config = data.config;
      if (config && (config.apiKey || config.profiles?.length || config.model)) {
        setSettings((prev) => ({ ...prev, ...config }));
      }
      // 同步服务器端图片反推（VLM）配置：config.json 是权威来源
      if (config?.visionSettings) {
        setVisionSettings((prev) => ({ ...prev, ...config.visionSettings }));
      }
    } catch (err) {
      console.warn('API /api/config unreachable, using browser settings.');
    }
  };

  const fetchServerHistory = async () => {
    try {
      const res = await fetch('/api/history?limit=300');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.history) && data.history.length > 0) {
        setHistoryItems(data.history);
      }
    } catch (err) {
      console.warn('API /api/history unreachable, using browser history.');
    }
  };

  useEffect(() => {
    fetchServerConfig();
    fetchSkills();
    fetchImageSkills();
    fetchGallery();
    fetchServerHistory();
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('deepseek_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('vision_settings', JSON.stringify(visionSettings));
  }, [visionSettings]);

  useEffect(() => {
    localStorage.setItem('minimax_prompt_history', JSON.stringify(historyItems));
  }, [historyItems]);

  // Gallery drawer handler
  const handleSelectGalleryItem = (item: GalleryItem) => {
    setSelectedGalleryItem(item);
    setIsDrawerOpen(true);
  };

  const handleToggleLikeGalleryItem = (itemId: string) => {
    setGalleryItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              isLiked: !item.isLiked,
              likesCount: item.isLiked ? item.likesCount - 1 : item.likesCount + 1,
            }
          : item
      )
    );
    if (selectedGalleryItem && selectedGalleryItem.id === itemId) {
      setSelectedGalleryItem((prev) =>
        prev
          ? {
              ...prev,
              isLiked: !prev.isLiked,
              likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1,
            }
          : null
      );
    }
  };

  const handleUpdateGalleryPrompt = (itemId: string, prompt: string) => {
    setGalleryItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              promptCn: prompt,
              promptEn: item.promptEn === item.title || item.promptEn === item.titleEn ? prompt : item.promptEn,
              language: /[\u3400-\u9fff]/.test(prompt) ? 'zh' : 'en',
            }
          : item
      )
    );
    setSelectedGalleryItem((prev) =>
      prev && prev.id === itemId
        ? {
            ...prev,
            promptCn: prompt,
            promptEn: prev.promptEn === prev.title || prev.promptEn === prev.titleEn ? prompt : prev.promptEn,
            language: /[\u3400-\u9fff]/.test(prompt) ? 'zh' : 'en',
          }
        : prev
    );
  };

  const handleAddGalleryItem = (newItem: GalleryItem) => {
    setGalleryItems((prev) => [newItem, ...prev]);
    fetchGallery(); // sync with server
  };

  const handleAddSkill = (newSkill: MiniMaxSkill) => {
    setSkills((prev) => [newSkill, ...prev]);
    fetchSkills(); // sync with server
  };

  // Remix gallery item in generator
  const handleRemixInGenerator = (item: GalleryItem) => {
    setIsDrawerOpen(false);
    setGeneratorInputOptions({
      userPrompt: item.promptCn || item.promptEn,
      targetModel: item.targetModel,
      aspectRatio: item.aspectRatio,
    });
    setActiveTab('generator');
  };

  // History handlers
  const handleSaveToHistory = (item: PromptHistoryItem) => {
    setHistoryItems((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (!existing) return [item, ...prev];
      return prev.map((entry) => (
        entry.id === item.id
          ? { ...entry, ...item, isFavorite: entry.isFavorite || item.isFavorite }
          : entry
      ));
    });
    historySaveQueueRef.current = historySaveQueueRef.current.then(async () => {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!response.ok) throw new Error(`History save failed: ${response.status}`);
    }).catch(() => {
      console.warn('API /api/history save failed, kept browser history only.');
    });
  };

  const handleToggleFavoriteHistory = (id: string) => {
    setHistoryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
  };

  const handleDeleteHistory = (id: string) => {
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    fetch('/api/history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {
      console.warn('API /api/history delete failed, removed from browser history only.');
    });
  };

  const handleClearAllHistory = () => {
    if (confirm('确定要清空所有的历史追溯记录吗？')) {
      setHistoryItems([]);
      fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => {
        console.warn('API /api/history clear failed, cleared browser history only.');
      });
    }
  };

  const handleSendHistoryToGenerator = (historyItem: PromptHistoryItem) => {
    const technical = historyItem.structuredOutput?.technicalParams;
    setGeneratorInputOptions({
      userPrompt: historyItem.userQuery,
      skillPreset: historyItem.skillId,
      targetModel: (technical?.targetModel as VideoModelTarget) || undefined,
      aspectRatio: (technical?.aspectRatio as AspectRatio) || undefined,
      duration: technical?.duration || undefined,
      motionSpeed: technical?.motionSpeed,
      cameraMotion: historyItem.resolvedParams?.camera?.presetId as CameraMotion | undefined,
      lensType: historyItem.resolvedParams?.lens?.presetId as LensType | undefined,
      lightingStyle: historyItem.resolvedParams?.lighting?.presetId as LightingStyle | undefined,
      gavenStyleCodes: historyItem.gavenStyleCodes,
      inputMode: 'text',
    });
    setActiveTab('generator');
  };

  // Skill selection handler from Skills Vault
  const handleSelectSkillFromVault = (skill: MiniMaxSkill) => {
    setGeneratorInputOptions({
      skillPreset: skill.id as StylePreset,
      userPrompt: skill.sampleInput,
      cameraMotion: skill.recommendedParams.cameraMotion,
      lensType: skill.recommendedParams.lens,
      lightingStyle: skill.recommendedParams.lighting,
      duration: skill.recommendedParams.duration,
    });
    setActiveTab('generator');
  };

  const handleSaveSettings = (nextSettings: DeepSeekSettings) => {
    setSettings(nextSettings);
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextSettings),
    }).catch(() => {
      console.warn('API /api/config save failed, kept browser settings only.');
    });
  };

  const handleSaveVisionSettings = (nextVision: VisionSettings) => {
    setVisionSettings(nextVision);
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visionSettings: nextVision }),
    }).catch(() => {
      console.warn('API /api/config vision save failed, kept browser settings only.');
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openKeyModal={() => setIsKeyModalOpen(true)}
        openAddModal={() => setIsAddModalOpen(true)}
        openCommandPalette={() => setIsCommandPaletteOpen(true)}
        settings={settings}
      />

      {/* Main Content Area */}
      <main className="pb-16">
        <div className={activeTab === 'generator' ? '' : 'hidden'}>
          <PromptGenerator
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onSaveToHistory={handleSaveToHistory}
            initialInputOptions={generatorInputOptions}
            onOpenKeyModal={() => setIsKeyModalOpen(true)}
            visionSettings={visionSettings}
            onSaveVisionSettings={handleSaveVisionSettings}
            skills={skills}
            imageSkills={imageSkills}
          />
        </div>

        {activeTab === 'skills' && (
          <SkillsVaultView
            skills={skills}
            onSelectSkill={handleSelectSkillFromVault}
            onRefreshSkills={fetchSkills}
            onAddSkill={handleAddSkill}
          />
        )}

        {activeTab === 'gallery' && (
          <InspirationGallery
            items={galleryItems}
            onSelectItem={handleSelectGalleryItem}
            onToggleLike={handleToggleLikeGalleryItem}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onRefreshGallery={fetchGallery}
          />
        )}

        {activeTab === 'history' && (
          <PromptHistory
            historyItems={historyItems}
            onToggleFavoriteHistory={handleToggleFavoriteHistory}
            onDeleteHistory={handleDeleteHistory}
            onClearAllHistory={handleClearAllHistory}
            onSendToGenerator={handleSendHistoryToGenerator}
          />
        )}
      </main>

      {/* Modals & Slide Drawer */}
      <GalleryDrawer
        item={selectedGalleryItem}
        allGalleryItems={galleryItems}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRemixInGenerator={handleRemixInGenerator}
        onToggleLike={handleToggleLikeGalleryItem}
        onSelectOtherItem={(item) => setSelectedGalleryItem(item)}
        onPromptUpdated={handleUpdateGalleryPrompt}
        onRefreshGallery={fetchGallery}
      />

      <DeepSeekKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        visionSettings={visionSettings}
        onSaveVisionSettings={handleSaveVisionSettings}
      />

      <AddGalleryItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddItem={handleAddGalleryItem}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

    </div>
  );
}
