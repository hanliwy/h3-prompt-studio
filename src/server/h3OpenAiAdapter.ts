import type { ReasoningUsage } from '../types';
import type { H3AgentLlmCall } from './h3AgentRuntime';
import { reasoningFallbackAction } from './imagePromptRuntime';

interface OpenAiClientLike {
  chat: {
    completions: {
      create: any;
    };
  };
}

interface CreateH3OpenAiCallOptions {
  client: OpenAiClientLike;
  model: string;
  reasoning?: ReasoningUsage;
  onDelta?: (text: string, kind: 'reasoning' | 'content') => void;
  onCompatibility?: (message: string) => void;
}

const isAbortError = (error: any, signal?: AbortSignal) =>
  signal?.aborted || error?.name === 'AbortError' || error?.code === 'ABORT_ERR';

const adjustMaxTokens = (error: any, completionParams: Record<string, any>) => {
  const message = String(error?.message || error?.error?.message || '');
  // 兼容多种文案：`max_tokens [a, b]` 范围、`supports at most N` 上限、
  // 以及 `maximum context length is N ... x of text input, y of tool input` 上下文超限
  let maxAllowed = 0;
  const rangeMatch = message.match(/max_tokens.*?\[(\d+),\s*(\d+)\]/i);
  if (rangeMatch) {
    maxAllowed = Number.parseInt(rangeMatch[2], 10);
  } else {
    const atMostMatch = message.match(/supports at most (\d+)/i);
    if (atMostMatch) {
      maxAllowed = Number.parseInt(atMostMatch[1], 10);
    } else {
      const contextMatch = message.match(/maximum context length is (\d+)/i);
      if (contextMatch) {
        const contextLimit = Number.parseInt(contextMatch[1], 10);
        const textTokens = Number.parseInt(message.match(/(\d+) of text input/i)?.[1] || '0', 10);
        const toolTokens = Number.parseInt(message.match(/(\d+) of tool input/i)?.[1] || '0', 10);
        // 上下文上限减去输入 token，并留 512 token 余量
        maxAllowed = contextLimit - textTokens - toolTokens - 512;
      }
    }
  }
  if (maxAllowed <= 0) return false;
  const current = Number(completionParams.max_tokens || 0);
  if (current <= maxAllowed) return false;
  completionParams.max_tokens = maxAllowed;
  return true;
};

const toOpenAiMessage = (message: any) => {
  if (message.role === 'assistant' && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    return {
      role: 'assistant',
      content: message.content || null,
      tool_calls: message.tool_calls.map((toolCall: any) => ({
        id: toolCall.id,
        type: 'function',
        function: {
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.args ?? {}),
        },
      })),
    };
  }
  if (message.role === 'tool') {
    return {
      role: 'tool',
      tool_call_id: message.tool_call_id,
      content: message.content,
    };
  }
  return { role: message.role, content: message.content };
};

const parseToolCall = (toolCall: any) => {
  const rawArguments = String(toolCall.function?.arguments || '');
  let args: Record<string, unknown> = {};
  try {
    args = rawArguments ? JSON.parse(rawArguments) : {};
  } catch {
    args = { _raw: rawArguments };
  }
  return {
    id: toolCall.id || `call_${Math.random().toString(36).slice(2, 10)}`,
    name: toolCall.function?.name || '',
    args,
  };
};

export function createH3OpenAiCall({
  client,
  model,
  reasoning,
  onDelta,
  onCompatibility,
}: CreateH3OpenAiCallOptions): H3AgentLlmCall {
  return async ({ systemPrompt, messages, tools, temperature, signal }) => {
    const submitToolOnly = Array.isArray(tools)
      && tools.length === 1
      && tools[0].function.name === 'submit_generated_prompt';
    // 参考 pi(packages/ai/src/api/simple-options.ts) 的 thinking budget：
    // 按 effort 限定思考预算，避免 high + 384K 任由模型长时间思考拖慢响应
    const THINKING_BUDGETS: Record<string, number> = { minimal: 1024, low: 2048, medium: 8192, high: 16384 };
    const ANSWER_BUDGET = 16384;
    const effortKey = reasoning?.applied ? String(reasoning.effort || 'medium') : '';
    const thinkingBudget = effortKey ? (THINKING_BUDGETS[effortKey] ?? 8192) : 0;
    const maxOutputTokens = thinkingBudget + ANSWER_BUDGET;

    const completionParams: Record<string, any> = {
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages.map(toOpenAiMessage)],
      temperature,
      stream: true,
      max_tokens: maxOutputTokens,
    };

    if (Array.isArray(tools) && tools.length > 0) {
      completionParams.tools = tools.map((tool) => ({ type: 'function', function: tool.function }));
      // 思考模式下省略 tool_choice（默认 auto）：部分渠道（如 OpenCode Go）对 thinking+tool_choice 直接 400
      if (submitToolOnly && !reasoning?.applied) {
        completionParams.tool_choice = { type: 'function', function: { name: 'submit_generated_prompt' } };
      }
    }
    if (reasoning?.applied) {
      completionParams.thinking = { type: 'enabled' };
      if (reasoning.effort) completionParams.reasoning_effort = reasoning.effort;
    }

    const applyReasoningFallback = (error: any, params: Record<string, any>) => {
      const action = reasoningFallbackAction({
        status: Number(error?.status || error?.statusCode || 0),
        message: String(error?.message || error?.error?.message || ''),
      });
      if (action === 'drop-effort' && params.reasoning_effort) {
        delete params.reasoning_effort;
        if (reasoning) {
          reasoning.effort = undefined;
          reasoning.downgradeReason = '当前模型不支持思考强度，已保留思考模式。';
          onCompatibility?.(reasoning.downgradeReason);
        }
        return true;
      }
      if (action === 'disable-thinking' && params.thinking) {
        delete params.thinking;
        delete params.reasoning_effort;
        // 思考模式关闭后可重新强制唯一工具调用
        if (submitToolOnly) {
          params.tool_choice = { type: 'function', function: { name: 'submit_generated_prompt' } };
        }
        if (reasoning) {
          reasoning.applied = false;
          reasoning.effort = undefined;
          reasoning.downgradeReason = '当前模型不支持思考模式，已自动关闭。';
          onCompatibility?.(reasoning.downgradeReason);
        }
        return true;
      }
      return false;
    };

    const runStream = async (params: Record<string, any> = completionParams) => {
      let content = '';
      const toolCallMap = new Map<number, { id: string; name: string; argsRaw: string }>();
      const stream = await client.chat.completions.create(params, { signal });
      for await (const chunk of stream as any) {
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.reasoning_content) {
          content += delta.reasoning_content;
          onDelta?.(delta.reasoning_content, 'reasoning');
        }
        if (delta?.content) {
          content += delta.content;
          onDelta?.(delta.content, 'content');
        }
        if (!Array.isArray(delta?.tool_calls)) continue;
        for (const toolCall of delta.tool_calls) {
          const index = typeof toolCall.index === 'number' ? toolCall.index : 0;
          if (!toolCallMap.has(index)) {
            toolCallMap.set(index, { id: toolCall.id || '', name: '', argsRaw: '' });
          }
          const entry = toolCallMap.get(index)!;
          if (toolCall.id) entry.id = toolCall.id;
          if (toolCall.function?.name) entry.name += toolCall.function.name;
          if (toolCall.function?.arguments) entry.argsRaw += toolCall.function.arguments;
        }
      }
      const tool_calls = Array.from(toolCallMap.values()).map((toolCall) =>
        parseToolCall({
          id: toolCall.id,
          function: { name: toolCall.name, arguments: toolCall.argsRaw },
        }),
      );
      return { content, tool_calls };
    };

    let streamedResult: Awaited<ReturnType<typeof runStream>> | undefined;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        streamedResult = await runStream();
        break;
      } catch (error: any) {
        if (isAbortError(error, signal)) throw error;
        if (adjustMaxTokens(error, completionParams)) continue;
        if (applyReasoningFallback(error, completionParams)) continue;
        throw error;
      }
    }
    if (!streamedResult) throw new Error('模型兼容重试次数已用尽。');
    // 唯一工具提交被截断（JSON 解析失败）且思考模式开启：思考占用输出预算，关闭后重新生成完整成品
    const isSubmissionTruncated = submitToolOnly
      && streamedResult.tool_calls.some((tc) => tc && '_raw' in (tc.args || {}));
    if (isSubmissionTruncated && completionParams.thinking && reasoning) {
      delete completionParams.thinking;
      delete completionParams.reasoning_effort;
      completionParams.tool_choice = { type: 'function', function: { name: 'submit_generated_prompt' } };
      reasoning.applied = false;
      reasoning.effort = undefined;
      reasoning.downgradeReason = '生成内容过长导致结果被截断，已自动关闭思考模式重新生成完整成品。';
      onCompatibility?.(reasoning.downgradeReason);
      try {
        streamedResult = await runStream();
      } catch (error: any) {
        if (isAbortError(error, signal)) throw error;
        // 重新生成失败则保留原截断结果，交由后续修复流程兜底
      }
    }
    if (streamedResult.tool_calls.length > 0 || !submitToolOnly) return streamedResult;
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new DOMException('生成已取消。', 'AbortError');
    }

    const repairParams: Record<string, any> = { ...completionParams, stream: false };
    // repair 目标只是拿回工具调用；关闭思考，避免非流式 thinking+tool_choice 在部分渠道 400
    if (repairParams.thinking) {
      delete repairParams.thinking;
      delete repairParams.reasoning_effort;
      repairParams.tool_choice = submitToolOnly
        ? { type: 'function', function: { name: 'submit_generated_prompt' } }
        : 'auto';
      if (reasoning) {
        reasoning.applied = false;
        reasoning.effort = undefined;
        reasoning.downgradeReason = '结果补全阶段已自动关闭思考模式。';
        onCompatibility?.(reasoning.downgradeReason);
      }
    }
    if (submitToolOnly && Array.isArray(repairParams.messages)) {
      repairParams.messages = [
        ...repairParams.messages,
        {
          role: 'user',
          content: '以上结果未通过服务器校验。你必须直接调用 submit_generated_prompt 工具提交唯一完整结果，禁止输出普通文本回复或解释。',
        },
      ];
    }
    let repairCompletion: any;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        if (repairParams.stream) {
          // 部分渠道仅流式支持工具调用：流式重试
          const streamed = await runStream(repairParams);
          if (streamed.tool_calls.length === 0) {
            throw new Error('当前渠道在流式及非流式模式下均未返回强制工具调用 submit_generated_prompt，无法安全接收唯一结构化结果。');
          }
          return { content: streamed.content, tool_calls: streamed.tool_calls };
        }
        repairCompletion = await client.chat.completions.create(repairParams, { signal });
        const repairMessage = repairCompletion.choices?.[0]?.message;
        const repairToolCalls = Array.isArray(repairMessage?.tool_calls) ? repairMessage.tool_calls : [];
        if (repairToolCalls.length > 0) break;
        // 非流式未返回工具调用：改用流式再试
        repairParams.stream = true;
        repairCompletion = undefined;
      } catch (error: any) {
        if (isAbortError(error, signal)) throw error;
        if (adjustMaxTokens(error, repairParams)) continue;
        if (applyReasoningFallback(error, repairParams)) continue;
        throw error;
      }
    }
    if (!repairCompletion) throw new Error('模型兼容重试次数已用尽。');
    const repairMessage = repairCompletion.choices?.[0]?.message;
    const repairToolCalls = Array.isArray(repairMessage?.tool_calls)
      ? repairMessage.tool_calls.map(parseToolCall)
      : [];
    if (repairToolCalls.length === 0) {
      throw new Error('当前渠道在流式及非流式模式下均未返回强制工具调用 submit_generated_prompt，无法安全接收唯一结构化结果。');
    }
    return {
      content: String(repairMessage?.content || ''),
      tool_calls: repairToolCalls,
    };
  };
}
