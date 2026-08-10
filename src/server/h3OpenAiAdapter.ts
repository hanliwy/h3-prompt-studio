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
  const rangeMatch = message.match(/max_tokens.*?\[(\d+),\s*(\d+)\]/i);
  if (!rangeMatch) return false;
  const maxAllowed = Number.parseInt(rangeMatch[2], 10);
  const current = Number(completionParams.max_tokens || 0);
  if (maxAllowed <= 0 || current <= maxAllowed) return false;
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
    const completionParams: Record<string, any> = {
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages.map(toOpenAiMessage)],
      temperature,
      stream: true,
      max_tokens: 393216,
    };

    if (Array.isArray(tools) && tools.length > 0) {
      completionParams.tools = tools.map((tool) => ({ type: 'function', function: tool.function }));
      completionParams.tool_choice = submitToolOnly
        ? { type: 'function', function: { name: 'submit_generated_prompt' } }
        : 'auto';
    }
    if (reasoning?.applied) {
      completionParams.thinking = { type: 'enabled' };
      if (reasoning.effort) completionParams.reasoning_effort = reasoning.effort;
    }

    const runStream = async () => {
      let content = '';
      const toolCallMap = new Map<number, { id: string; name: string; argsRaw: string }>();
      const stream = await client.chat.completions.create(completionParams, { signal });
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
        const action = reasoningFallbackAction({
          status: Number(error?.status || error?.statusCode || 0),
          message: String(error?.message || error?.error?.message || ''),
        });
        if (action === 'drop-effort' && completionParams.reasoning_effort) {
          delete completionParams.reasoning_effort;
          if (reasoning) {
            reasoning.effort = undefined;
            reasoning.downgradeReason = '当前模型不支持思考强度，已保留思考模式。';
            onCompatibility?.(reasoning.downgradeReason);
          }
          continue;
        }
        if (action === 'disable-thinking' && completionParams.thinking) {
          delete completionParams.thinking;
          delete completionParams.reasoning_effort;
          if (reasoning) {
            reasoning.applied = false;
            reasoning.effort = undefined;
            reasoning.downgradeReason = '当前模型不支持思考模式，已自动关闭。';
            onCompatibility?.(reasoning.downgradeReason);
          }
          continue;
        }
        throw error;
      }
    }
    if (!streamedResult) throw new Error('模型兼容重试次数已用尽。');
    if (streamedResult.tool_calls.length > 0 || !submitToolOnly) return streamedResult;
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new DOMException('生成已取消。', 'AbortError');
    }

    const repairParams = { ...completionParams, stream: false };
    const repairCompletion = await client.chat.completions.create(repairParams, { signal });
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
