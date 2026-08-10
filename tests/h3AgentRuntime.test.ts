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

const validPortraitPrompt = `integrated_multimodal_description: [Shot 1] Cinematic, live-action, a medium shot frames a young woman in a sunlit meadow, the camera pushing in with small amplitude at slow speed as wind stirs individual strands of her hair.\n\noverall_soundscape: Gentle breeze moves through the grass while soft breath and distant birdsong fill the meadow.\n\nnon_diegetic_music: Sparse piano notes at a slow tempo with sustained low strings.`;

const validPortraitResult = {
  id: 'natural_portrait',
  titleCn: '自然人像特写',
  titleEn: 'Natural Portrait Close-up',
  promptEn: validPortraitPrompt,
  promptCn: '综合多模态描述：阳光草地中的少女，镜头缓慢推进。\n整体声景：微风、呼吸和远处鸟鸣。\n非画内音乐：稀疏钢琴与持续低音弦乐。',
  negativePromptEn: 'blurry, distorted face, stiff motion',
  negativePromptCn: '模糊、脸部变形、动作僵硬',
};

const defaultResolvedParams = {
  targetModel: {
    value: 'minimax-h3',
    source: 'system-default',
    promptEvidence: 'integrated_multimodal_description',
  },
  camera: {
    value: 'slow push-in',
    source: 'skill-recommended',
    presetId: 'tracking_shot',
    promptEvidence: 'camera pushing in',
  },
  lens: {
    value: 'medium shot',
    source: 'skill-recommended',
    presetId: '35mm_anamorphic',
    promptEvidence: 'medium shot',
  },
  lighting: {
    value: 'sunlit natural light',
    source: 'skill-recommended',
    presetId: 'sunlit_natural',
    promptEvidence: 'sunlit meadow',
  },
};

const response = (
  result: Record<string, unknown>,
  reason = '按所选 Skill 生成并完成自检',
  resolvedParams: Record<string, unknown> = defaultResolvedParams,
) => ({
  content: '',
  tool_calls: [
    {
      id: 'submit_result',
           name: 'submit_generated_prompt',
      args: {
        confidence: 'high',
        reason,
        resolvedParams,
        result,
      },
    },
  ],
});

const baseOptions = {
  skillId: 'h3-prompt-writing',
  inputMode: 'text' as const,
  aspectRatio: '16:9',
  duration: '6s',
  motionSpeed: 5,
};

// A valid first response is final: the model is called exactly once.
{
  let calls = 0;
  let receivedSystemPrompt = '';
  const llm: H3AgentLlmCall = async ({ systemPrompt }) => {
    calls += 1;
    receivedSystemPrompt = systemPrompt;
    return response(validPortraitResult);
  };

  const result = await runH3AgentGeneration({
    userPrompt: '一个女孩',
    skills,
    skillsRoot,
    callLlm: llm,
    options: baseOptions,
  });

  assert.equal(calls, 1, 'valid output must finish after one model call');
  assert.match(receivedSystemPrompt, /h3-prompt-writing\/SKILL\.md/);
  assert.match(receivedSystemPrompt, /integrated_multimodal_description/);
  assert.equal(result.variants.length, 1);
  assert.equal(result.variants[0].promptEn, validPortraitPrompt);
  assert.equal(result.review.isValidH3Format, true);
  assert.equal(result.review.fixedInRepairTurn, false);
  assert.equal((result as any).resolvedParams.targetModel.value, 'minimax-h3');
  assert.match(receivedSystemPrompt, /同一次调用|自然语言/);
  assert.doesNotMatch(receivedSystemPrompt, /camera=按 Skill 决定/);
  assert.equal(validateH3AgentResult(result).isValidH3Format, true);
}

// Natural-language photography constraints are resolved inside the single generation call.
{
  let calls = 0;
  const userPrompt = '镜头像摄影师绕着雕塑缓慢走半圈，使用压缩空间感的人像视角，夕阳从人物背后勾出金边，按可灵的方式输出。';
  const promptEn = `integrated_multimodal_description: [Shot 1] Kling-compatible motion continuity frames a sculptor beside a marble statue. The camera walks a slow half-circle around the statue with compressed portrait perspective while golden rim light from behind traces the subject's silhouette and preserves stable spatial geometry.\n\noverall_soundscape: Soft footsteps circle the stone plinth while distant city air and cloth movement remain spatially coherent.\n\nnon_diegetic_music: Restrained warm strings sustain a calm pulse.`;
  const resolvedParams = {
    targetModel: {
      value: 'kling-ai',
      source: 'user-text',
      userEvidence: '按可灵的方式输出',
      promptEvidence: 'Kling-compatible motion continuity',
    },
    camera: {
      value: 'slow half-orbit around the statue',
      source: 'user-text',
      userEvidence: '镜头像摄影师绕着雕塑缓慢走半圈',
      promptEvidence: 'camera walks a slow half-circle around the statue',
    },
    lens: {
      value: 'compressed portrait perspective',
      source: 'user-text',
      userEvidence: '压缩空间感的人像视角',
      promptEvidence: 'compressed portrait perspective',
    },
    lighting: {
      value: 'golden rim light from behind',
      source: 'user-text',
      userEvidence: '夕阳从人物背后勾出金边',
      promptEvidence: 'golden rim light from behind',
    },
  };
  const llm: H3AgentLlmCall = async () => {
    calls += 1;
    return response(
      { ...validPortraitResult, promptEn },
      '在生成成品的同一次调用中解析自然语言摄影参数',
      resolvedParams,
    );
  };

  const result = await runH3AgentGeneration({
    userPrompt,
    skills,
    skillsRoot,
    callLlm: llm,
    options: baseOptions,
  });

  assert.equal(calls, 1, 'semantic parameter resolution must not add a confirmation call');
  assert.equal((result as any).resolvedParams.camera.value, 'slow half-orbit around the statue');
  assert.equal(result.structuredOutput.technicalParams.targetModel, 'kling-ai');
}

// A conflicting natural-language interpretation returns with warnings; no auto-repair.
{
  let calls = 0;
  const userPrompt = '镜头围绕人物旋转，拍摄一位站在草地上的女孩。';
  const manualCamera = {
    targetModel: defaultResolvedParams.targetModel,
    camera: {
      value: '固定视角 (Static Shot)',
      source: 'manual-ui',
      presetId: 'static',
      promptEvidence: 'locked-off static camera',
    },
    lens: defaultResolvedParams.lens,
    lighting: defaultResolvedParams.lighting,
  };
  const conflictingCamera = {
    ...manualCamera,
    camera: {
      value: 'orbiting camera',
      source: 'user-text',
      userEvidence: '镜头围绕人物旋转',
      promptEvidence: 'camera pushing in',
    },
  };
  const llm: H3AgentLlmCall = async () => {
    calls += 1;
    return response(validPortraitResult, '错误地采用了文本运镜', conflictingCamera);
  };

  const result = await runH3AgentGeneration({
    userPrompt,
    skills,
    skillsRoot,
    callLlm: llm,
    options: {
      ...baseOptions,
      manualAuxiliaryParams: {
        camera: { presetId: 'static', value: '固定视角 (Static Shot)' },
      },
    } as any,
  });

  assert.equal(calls, 1, 'no auto-repair; result returns immediately with warnings');
  assert.equal(result.review.isValidH3Format, false, 'conflict issues are flagged');
  assert.ok(result.variants[0].promptEn, 'result is still returned');
}

// An invalid first response returns immediately with warnings; no auto-repair.
{
  let calls = 0;
  const llm: H3AgentLlmCall = async () => {
    calls += 1;
    return response({ ...validPortraitResult, promptEn: '一个女孩站在草地上。' });
  };

  const result = await runH3AgentGeneration({
    userPrompt: '一个女孩',
    skills,
    skillsRoot,
    callLlm: llm,
    options: baseOptions,
  });

  assert.equal(calls, 1, 'no auto-repair; result returns immediately');
  assert.equal(result.review.isValidH3Format, false, 'format issues are flagged');
  assert.ok(result.variants[0].promptEn, 'result is still returned');
}

// Invalid responses return immediately with warnings; no second call.
{
  let calls = 0;
  const llm: H3AgentLlmCall = async () => {
    calls += 1;
    return response({ ...validPortraitResult, promptEn: '仍然无效。' });
  };

  const result = await runH3AgentGeneration({
    userPrompt: '一个女孩',
    skills,
    skillsRoot,
    callLlm: llm,
    options: baseOptions,
  });
  assert.equal(calls, 1, 'no auto-repair; single call only');
  assert.equal(result.review.isValidH3Format, false, 'review flags the format issues');
  assert.ok(result.review.issues.length > 0, 'issues are preserved for user visibility');
  assert.ok(result.variants[0].promptEn, 'result is still returned for the user');
}

// Multiple submissions return with warnings; no second call.
{
  let calls = 0;
  const llm: H3AgentLlmCall = async () => {
    calls += 1;
    const first = response(validPortraitResult).tool_calls[0];
    return { content: '', tool_calls: [first, { ...first, id: `duplicate_${calls}` }] };
  };

  const result = await runH3AgentGeneration({
    userPrompt: '一个女孩',
    skills,
    skillsRoot,
    callLlm: llm,
    options: baseOptions,
  });
  assert.equal(calls, 1);
  assert.equal(result.review.isValidH3Format, false, 'duplicate submissions are flagged');
  assert.ok(result.variants[0].promptEn, 'result is still returned despite protocol issues');
}

// Malformed tool JSON has no usable result and rejects without salvage.
{
  let calls = 0;
  await assert.rejects(
    () =>
      runH3AgentGeneration({
        userPrompt: '一个女孩',
        skills,
        skillsRoot,
        callLlm: async () => {
          calls += 1;
          return {
            content: '',
            tool_calls: [
              {
                id: 'malformed',
                name: 'submit_generated_prompt',
                args: { _raw: '{"result":' },
              },
            ],
          };
        },
        options: baseOptions,
      }),
    /不是有效 JSON|修复后仍未通过/,
  );
  assert.equal(calls, 1, 'malformed JSON with no salvageable content rejects after one call');
}

// Plain text without the required tool call fails as a single protocol error.
{
  let calls = 0;
  await assert.rejects(
    () =>
      runH3AgentGeneration({
        userPrompt: '一个女孩',
        skills,
        skillsRoot,
        callLlm: async () => {
          calls += 1;
          return {
            content: '模型返回了普通正文，但没有提交结构化工具结果。',
            tool_calls: [],
          };
        },
        options: baseOptions,
      }),
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      assert.match(message, /没有调用 submit_generated_prompt|未按协议调用 submit_generated_prompt/);
      assert.doesNotMatch(message, /integrated_multimodal_description|overall_soundscape|resolvedParams|中文对照/);
      return true;
    },
  );
  assert.equal(calls, 1, 'runtime must not retry or treat plain text as a final result');
}

// Cancellation after the first call prevents validation repair and returns promptly.
{
  let calls = 0;
  const controller = new AbortController();
  const llm: H3AgentLlmCall = async ({ signal }) => {
    calls += 1;
    assert.equal(signal, controller.signal);
    controller.abort();
    return response({ ...validPortraitResult, promptEn: '无效结果。' });
  };

  await assert.rejects(
    () =>
      runH3AgentGeneration({
        userPrompt: '一个女孩',
        skills,
        skillsRoot,
        callLlm: llm,
        options: baseOptions,
        signal: controller.signal,
      }),
    /abort|取消|中止/i,
  );
  assert.equal(calls, 1, 'aborted generation must not enter the repair call');
}

// Missing mode is rejected before calling the model.
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
          return response(validPortraitResult);
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

// Forged manual preset/value pairs are rejected at the server boundary before any model call.
{
  let calls = 0;
  await assert.rejects(
    () =>
      runH3AgentGeneration({
        userPrompt: '固定机位拍摄草地上的女孩',
        skills,
        skillsRoot,
        callLlm: async () => {
          calls += 1;
          return response(validPortraitResult);
        },
        options: {
          ...baseOptions,
          manualAuxiliaryParams: {
            camera: { presetId: 'static', value: '360° 环绕 (Orbital Arc)' },
          },
        },
      }),
    /手动辅助参数无效|value 与 presetId 不匹配/,
  );
  assert.equal(calls, 0, 'invalid manual parameters must be rejected before calling the model');
}

console.log('h3AgentRuntime tests passed');
