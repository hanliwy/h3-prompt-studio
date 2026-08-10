import React, { useState } from 'react';
import { ArrowRight, FileVideo, FolderOpen, Layers, Play, Plus, Trash2 } from 'lucide-react';
import { MiniMaxSkill } from '../types';
import { AddSkillModal } from './AddSkillModal';

interface SkillsVaultViewProps {
  skills: MiniMaxSkill[];
  onSelectSkill: (skill: MiniMaxSkill) => void;
  onRefreshSkills?: () => void;
  onAddSkill?: (skill: MiniMaxSkill) => void;
}

export const SkillsVaultView: React.FC<SkillsVaultViewProps> = ({
  skills,
  onSelectSkill,
  onRefreshSkills,
  onAddSkill,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [playingSkillId, setPlayingSkillId] = useState<string | null>(null);

  const handleOpenLocalFolder = async () => {
    try {
      const res = await fetch('/api/open-local-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderType: 'media' }),
      });
      const data = await res.json();
      alert(data.message || '正在系统后台打开本地素材文件夹。');
    } catch {
      alert('也可以直接进入项目根目录下的 data/media 文件夹，放置与官方 Skill ID 同名的 mp4/gif/jpg 文件。');
    }
  };

  const handleDeleteSkill = async (event: React.MouseEvent, skillId: string) => {
    event.stopPropagation();
    if (!confirm(`确定要删除技能预设 "${skillId}" 吗？`)) return;

    try {
      await fetch(`/api/skills/${encodeURIComponent(skillId)}`, { method: 'DELETE' });
      onRefreshSkills?.();
    } catch {
      alert('删除失败，请检查网络或后端服务。');
    }
  };

  return (
    <div className="mx-auto max-w-[1900px] px-2 sm:px-4 py-4 text-slate-100">
      <div className="mb-3 flex flex-col gap-3 border-b border-slate-800 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-black tracking-tight">MiniMax-H3 官方案例格式库</h2>
            <span className="rounded-full border border-cyan-800 bg-cyan-950 px-2.5 py-0.5 text-xs font-mono font-black text-cyan-300">
              {skills.length} formats
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-400">
            生成时后端会读取官方 skill 文件；这里展示的是对应格式、样例输入和 demo 预览。放置同名素材到 <code className="rounded bg-slate-950 px-1 py-0.5 font-mono text-amber-300">data/media</code> 可覆盖预览。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenLocalFolder}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-slate-900 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-slate-800"
          >
            <FolderOpen className="h-4 w-4" />
            打开样本目录
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-black text-white hover:bg-cyan-500"
          >
            <Plus className="h-4 w-4" />
            新建自定义格式
          </button>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
        <span className="font-black text-slate-200">样本视频规则：</span>
        例如放入 <code className="font-mono text-cyan-300">minimalist-product-ad-generator.mp4</code>、<code className="font-mono text-cyan-300">brand-promo-video-generator.gif</code>、<code className="font-mono text-cyan-300">h3-prompt-writing.jpg</code>，后端会按 Skill ID 自动匹配。
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {skills.map((skill) => {
          const hasMedia = Boolean(skill.mediaPreviewUrl);
          const isPlaying = playingSkillId === skill.id;
          const isVideo = skill.mediaPreviewUrl?.endsWith('.mp4') || skill.mediaPreviewUrl?.endsWith('.webm');

          return (
            <article
              key={skill.id}
              className="group overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-sm transition hover:border-cyan-500/70 hover:shadow-cyan-950/20"
            >
              <button
                type="button"
                onClick={() => onSelectSkill(skill)}
                onMouseEnter={() => setPlayingSkillId(skill.id)}
                onMouseLeave={() => setPlayingSkillId(null)}
                className="relative block h-28 w-full overflow-hidden bg-slate-950 text-left"
              >
                {hasMedia ? (
                  isVideo ? (
                    <video
                      src={skill.mediaPreviewUrl}
                      muted
                      loop
                      playsInline
                      autoPlay={isPlaying}
                      preload="metadata"
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <img src={skill.mediaPreviewUrl} alt={skill.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                  )
                ) : (
                  <div className="grid h-full place-items-center border-b border-dashed border-slate-800 text-center">
                    <div className="space-y-1 px-2">
                      <FileVideo className="mx-auto h-6 w-6 text-slate-600" />
                      <p className="truncate text-[10px] font-mono text-slate-500">{skill.id}.mp4</p>
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                <span className="absolute left-2 top-2 rounded bg-black/75 px-2 py-0.5 text-[10px] font-black text-cyan-200 ring-1 ring-white/20">
                  {hasMedia ? 'demo' : '待补样片'}
                </span>
                {hasMedia && (
                  <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-slate-950 shadow">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                )}
                <h3 className="absolute bottom-2 left-2 right-2 truncate text-sm font-black text-white drop-shadow">{skill.title}</h3>
              </button>

              <div className="space-y-2 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate rounded bg-slate-800 px-2 py-0.5 text-[10px] font-black text-cyan-300">{skill.category}</span>
                  <span className="shrink-0 font-mono text-[10px] font-bold text-slate-500">{skill.recommendedParams.duration}</span>
                </div>

                <p className="line-clamp-2 min-h-[34px] text-[11px] font-medium leading-4 text-slate-300">{skill.description}</p>

                <div className="flex flex-wrap gap-1">
                  <span className="max-w-full truncate rounded bg-slate-950 px-1.5 py-1 text-[10px] font-semibold text-slate-400">{skill.recommendedParams.cameraMotion}</span>
                  <span className="max-w-full truncate rounded bg-slate-950 px-1.5 py-1 text-[10px] font-semibold text-slate-400">{skill.recommendedParams.lens}</span>
                  <span className="max-w-full truncate rounded bg-slate-950 px-1.5 py-1 text-[10px] font-semibold text-slate-400">{skill.recommendedParams.lighting}</span>
                </div>

                <p className="truncate rounded bg-slate-950 px-2 py-1.5 font-mono text-[10px] text-slate-400" title={skill.sampleInput}>
                  {skill.sampleInput}
                </p>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="min-w-0 truncate font-mono text-[10px] text-slate-500">{skill.id}</span>
                  <div className="flex items-center gap-1">
                    {skill.id.startsWith('custom_') && (
                      <button
                        onClick={(event) => handleDeleteSkill(event, skill.id)}
                        className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-red-950/50 hover:text-red-300"
                        title="删除自定义预设"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onSelectSkill(skill)}
                      className="inline-flex items-center gap-1 rounded-md bg-cyan-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-cyan-500"
                    >
                      套用
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <AddSkillModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSkill={(newSkill) => {
          onAddSkill?.(newSkill);
          onRefreshSkills?.();
        }}
      />
    </div>
  );
};
