import React, { useState } from 'react';
import { X, Sparkles, FolderOpen, Save, Plus, HelpCircle } from 'lucide-react';
import { MiniMaxSkill, CameraMotion, LensType, LightingStyle } from '../types';

interface AddSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSkill: (skill: MiniMaxSkill) => void;
}

export const AddSkillModal: React.FC<AddSkillModalProps> = ({
  isOpen,
  onClose,
  onAddSkill,
}) => {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [category, setCategory] = useState('自定义风格');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [cameraMotion, setCameraMotion] = useState<CameraMotion>('dolly_in');
  const [lens, setLens] = useState<LensType>('35mm_anamorphic');
  const [lighting, setLighting] = useState<LightingStyle>('volumetric_rays');
  const [tagsInput, setTagsInput] = useState('自定义, 预设模板');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('请输入预设技能名称');

    const cleanId = id.trim()
      ? id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : `custom_skill_${Date.now()}`;

    const tags = tagsInput
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const newSkill: MiniMaxSkill = {
      id: cleanId,
      title: title.trim(),
      titleEn: titleEn.trim() || title.trim(),
      category: category.trim() || '自定义预设',
      icon: 'Sparkles',
      description: description.trim() || '用户自定义导算预设规程',
      systemPrompt: systemPrompt.trim() || `You are an expert prompt generator for MiniMax-H3 video creation. Refine: ${title}`,
      sampleInput: sampleInput.trim() || '请输入一段主体画面描述...',
      recommendedParams: {
        cameraMotion,
        lens,
        lighting,
        fps: 30,
        duration: '6s',
      },
      tags,
    };

    try {
      await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSkill),
      });
    } catch (err) {
      console.warn('Failed to save skill to backend, fallback to local state:', err);
    }

    onAddSkill(newSkill);
    onClose();
  };

  const handleOpenMediaFolder = async () => {
    try {
      const res = await fetch('/api/open-local-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderType: 'media' }),
      });
      const data = await res.json();
      alert(data.message || '已成功请求系统打开本地素材目录！');
    } catch (err) {
      alert('正在尝试打开目录，请确认程序运行在 Windows / macOS 本地。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-950 border border-purple-800 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-bold text-sm text-slate-100">新增/修改自定义提示词技能预设</h2>
              <p className="text-[11px] text-slate-400">配有同名视频时可在画廊与生成器中实时预览视效</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Tip Banner */}
          <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-purple-200 space-y-1.5">
            <div className="flex items-center justify-between font-bold text-xs">
              <span className="flex items-center gap-1.5 text-purple-300">
                <HelpCircle className="w-4 h-4 text-purple-400" />
                <span>💡 如何添加同名视频/图片预览？</span>
              </span>
              <button
                type="button"
                onClick={handleOpenMediaFolder}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-900 hover:bg-purple-800 text-white text-[11px] font-semibold border border-purple-700"
              >
                <FolderOpen className="w-3.5 h-3.5 text-purple-300" />
                <span>打开本地素材目录</span>
              </button>
            </div>
            <p className="text-[11px] text-purple-300/80 leading-relaxed">
              设置预设ID（例如 <code className="bg-purple-900/80 px-1 py-0.5 rounded text-white font-mono">my_cyberpunk</code>），在打开的本地素材文件夹中放入同名视频或图片文件（如 <code className="bg-purple-900/80 px-1 py-0.5 rounded text-white font-mono">my_cyberpunk.mp4</code>），系统将自动匹配并在此预设卡片上展示视频悬浮播放预览！
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">技能预设 ID (英文唯一标志)</label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="例如: cyberpunk_neon_v2"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">预设分类标签</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="例如: 科幻大片 / 人像赛道"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">技能中文标题 *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如: 极窄巷道低角度推进大师"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">英文标题 (Title En)</label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Narrow Alley Low-Angle Dolly In"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">技能简短说明</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="概括该模板适合解决什么镜头或视效场景..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">AI 系统提示词微调法则 (System Prompt)</label>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="指导 LLM 在生成英文 Prompt 时遵循的微观规则..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">默认示例灵感 Prompt</label>
            <input
              type="text"
              value={sampleInput}
              onChange={(e) => setSampleInput(e.target.value)}
              placeholder="例如: 湿滑狭窄的巷道中，雨滴从霓虹战甲滑落..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">默认运镜</label>
              <input
                type="text"
                value={cameraMotion}
                onChange={(e) => setCameraMotion(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">默认镜头</label>
              <input
                type="text"
                value={lens}
                onChange={(e) => setLens(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">默认光影</label>
              <input
                type="text"
                value={lighting}
                onChange={(e) => setLighting(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">标签 (以逗号分隔)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="低角度, 赛博朋克, 极窄视角"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30"
            >
              <Save className="w-4 h-4" />
              <span>保存技能规程</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
