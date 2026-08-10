import assert from 'node:assert/strict';
import path from 'node:path';
import {
  runH3AgentGeneration,
  validateH3AgentResult,
  type H3AgentLlmCall,
} from '../src/server/h3AgentRuntime';
import { loadH3SkillDefinitions } from '../src/server/h3SkillRuntime';

const skillsRoot = path.join(process.cwd(), 'data', 'h3-skills');
const skills = loadH3SkillDefinitions(skillsRoot);

const submitResponse = (result: Record<string, unknown>, reason: string) => {
  const promptEvidence = String(result.promptEn || '').trim().slice(0, 32);
  return {
    content: '',
    tool_calls: [
      {
        id: 'submit_result',
        name: 'submit_generated_prompt',
        args: {
          confidence: 'high',
          reason,
          resolvedParams: {
            targetModel: { value: 'minimax-h3', source: 'system-default', promptEvidence },
            camera: { value: '按 Skill 规划运镜', source: 'system-default', promptEvidence },
            lens: { value: '按 Skill 规划镜头', source: 'system-default', promptEvidence },
            lighting: { value: '按 Skill 规划光影', source: 'system-default', promptEvidence },
          },
          result,
        },
      },
    ],
  };
};

const validBasePrompt = `integrated_multimodal_description: [Shot 1] Cinematic, live-action, a rain-soaked neo-Tokyo intersection frames a female assassin riding a luminous hoverbike into suspended traffic. The camera tracks beside her with large amplitude at fast speed as she leans through the first gap. [Shot 2] At 00:04.000, the shot cuts to a low-angle front-quarter view while she passes beneath a cargo vehicle and rain streaks across her visor. [Shot 3] At 00:07.500, the camera arcs around her with small amplitude at slow speed as she clears the traffic and disappears into the neon avenue.\n\noverall_soundscape: Heavy rain hisses against armor and asphalt while the hoverbike emits a rising electric whine. Passing vehicles produce layered engine wash and brief Doppler sweeps.\n\nnon_diegetic_music: Fast pulsing synth bass with metallic percussion, increasing in density before stopping on the final cut.`;

const baseResult = {
  id: 'neo_tokyo_chase',
  titleCn: '雨夜新东京追逐',
  titleEn: 'Neo-Tokyo Rain Chase',
  promptEn: validBasePrompt,
  promptCn: '综合多模态描述：雨夜新东京的女刺客驾驶光轮摩托穿过悬浮车流，按三个镜头完成追逐。\n整体声景：暴雨、装甲雨滴声、摩托电流声与飞车掠过声。\n非画内音乐：快速合成器低音与金属打击乐。',
  negativePromptEn: 'identity drift, incoherent vehicle motion, broken traffic continuity',
  negativePromptCn: '人物漂移、车辆运动不连贯、交通空间连续性错误',
};

// The selected base Skill is fully loaded by the server and submitted in one model call.
{
  let calls = 0;
  const result = await runH3AgentGeneration({
    userPrompt: '雨夜新东京街头，身穿荧光战甲的女刺客骑着光轮摩托在悬浮飞车群中穿梭',
    skills,
    skillsRoot,
    callLlm: async ({ systemPrompt, tools }) => {
      calls += 1;
      assert.match(systemPrompt, /h3-prompt-writing\/references\/base-en\.txt/);
      assert.deepEqual(tools?.map((tool) => tool.function.name), ['submit_generated_prompt']);
      return submitResponse(baseResult, '按基础 H3 格式完成三镜头追逐规划并通过校验');
    },
    options: {
      skillId: 'h3-prompt-writing',
      inputMode: 'text',
      targetModel: 'minimax-h3',
      aspectRatio: '16:9',
      duration: '10s',
      motionSpeed: 8,
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.variants.length, 1);
  assert.equal(result.structuredOutput.englishPrompt, validBasePrompt);
  assert.equal(result.review.isValidH3Format, true);
  assert.equal(validateH3AgentResult(result).isValidH3Format, true);
}

const validHanddrawnPrompt = `15秒，16:9横版视频。将实拍的雨天厨房水槽与手绘发光动画融合的影像。\n实拍空间保持手机手持拍摄质感，潮湿窗光落在金属水槽和木质台面上。\n0-3秒：一条橙黄色粉笔线从水滴边缘长出，缠住拍摄者伸来的食指，清晰形成真实接触。\n3-6秒：粉笔线保留橙色拖痕，变成一只扁平小纸船，沿水槽边缘逃跑，拍摄者慢半拍向右平移追赶。\n6-10秒：小纸船撞到玻璃杯后延伸成藤蔓，绕过水龙头并轻轻拨动清洁海绵，拍摄者伸手抓空。\n10-13秒：藤蔓沿台面滑向窗边，连续变形成几只粗糙蜡笔小鸟，最后一只慢半拍落在掌心。\n13-15秒：橙色线条扩散到墙面和窗户，变成覆盖厨房的巨大夕阳花田，一片花瓣粘到镜头上形成可爱笑点。\n手绘质感保持蜡笔、粉笔与彩色铅笔的粗糙毛边、轻微抖动和逐帧重画感。\n相机始终慢半拍追随，不把动画稳定居中，在实体离开画面边缘后再平移、俯仰或前进。\n画面保持温柔生活感，角色连续变形并保留上一形态的色彩拖痕和身体曲线。\n环境音包含雨滴敲窗、水槽细流、手指触碰金属和纸船滑动的轻响。\n下一步建议：如果你确认这个 prompt，我可以继续用 H3 模型生成 15 秒 16:9 视频。`;

// Native-format skills keep their own validator instead of being forced into H3 base sections.
{
  let calls = 0;
  const llm: H3AgentLlmCall = async () => {
    calls += 1;
    return submitResponse(
      {
        id: 'handdrawn_kitchen',
        titleCn: '雨天厨房手绘追逐',
        titleEn: 'Handdrawn Kitchen Chase',
        promptEn: validHanddrawnPrompt,
        promptCn: validHanddrawnPrompt,
        negativePromptEn: '',
        negativePromptCn: '',
      },
      '遵循手绘实拍融合 Skill 的固定五段结构',
    );
  };

  const result = await runH3AgentGeneration({
    userPrompt: '雨天厨房里，一条发光手绘线从水槽爬出来和手指互动',
    skills,
    skillsRoot,
    callLlm: llm,
    options: {
      skillId: 'handdrawn-live-video-generator',
      inputMode: 'text',
      targetModel: 'minimax-h3',
      duration: '15s',
      aspectRatio: '16:9',
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.review.isValidH3Format, true);
  assert.equal(result.structuredOutput.englishPrompt, validHanddrawnPrompt);
}

// The largest bundled Skill loads its main file and all five required references without truncation.
{
  let calls = 0;
  const prompt3d = `生成一段15秒的3D动画短片。Shot 1（0-5秒）：一台圆头小机器人走进废弃温室，镜头缓慢推进，玻璃穹顶漏下金色晨光，角色外形、划痕和蓝色眼灯保持一致。Shot 2（5-10秒）：机器人拨开藤蔓发现发光种子，镜头切到近景并沿手臂小幅环绕，种子的冷蓝光照亮金属表面，动作接触和受力清晰。Shot 3（10-15秒）：机器人把种子埋入土中，嫩芽迅速生长并点亮整座温室，镜头拉远收束，场景空间、角色比例、光线方向与前镜头连续。声音包含脚步、藤蔓摩擦、泥土颗粒和柔和能量脉冲，配乐从稀疏钢琴过渡到温暖弦乐。`;
  const result = await runH3AgentGeneration({
    userPrompt: '一个小机器人在废弃温室里发现会发光的种子，并把它种下',
    skills,
    skillsRoot,
    callLlm: async ({ systemPrompt }) => {
      calls += 1;
      assert.match(systemPrompt, /3d-animation-short-generator\/SKILL\.cn\.md/);
      assert.match(systemPrompt, /references\/shot-table-spec\.md/);
      assert.match(systemPrompt, /references\/storyboard-guidelines\.md/);
      assert.match(systemPrompt, /references\/model-selection\.md/);
      assert.match(systemPrompt, /references\/fallback-policy\.md/);
      assert.match(systemPrompt, /references\/qc-checklist\.md/);
      return submitResponse(
        {
          id: 'robot_greenhouse',
          titleCn: '机器人温室种子',
          titleEn: 'Robot Greenhouse Seed',
          promptEn: prompt3d,
          promptCn: prompt3d,
          negativePromptEn: '',
          negativePromptCn: '',
        },
        '按 3D 动画 Skill 完成三镜头连续叙事',
      );
    },
    options: {
      skillId: '3d-animation-short-generator',
      inputMode: 'text',
      targetModel: 'minimax-h3',
      duration: '15s',
      aspectRatio: '16:9',
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.review.isValidH3Format, true);
}

// Multimode skills require an explicit scene mode before any model call.
{
  let calls = 0;
  await assert.rejects(
    () =>
      runH3AgentGeneration({
        userPrompt: '两名旧友在车站重逢',
        skills,
        skillsRoot,
        callLlm: async () => {
          calls += 1;
          return submitResponse(baseResult, '不会执行');
        },
        options: {
          skillId: 'h3-multimode-10s',
          inputMode: 'text',
          duration: '10s',
          aspectRatio: '16:9',
        },
      }),
    /文戏|武戏|九宫格|sceneMode/,
  );
  assert.equal(calls, 0);
}

console.log('h3AgentRuntime next tests passed');
