import assert from 'node:assert/strict';
import { createH3OpenAiCall } from '../src/server/h3OpenAiAdapter';
import type { ReasoningUsage } from '../src/types';

const submitTool = {
  type: 'function' as const,
  function: {
    name: 'submit_generated_prompt',
    description: 'submit result',
    parameters: { type: 'object', properties: {} },
  },
};

const asyncChunks = (chunks: unknown[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const chunk of chunks) yield chunk;
  },
});

const callArgs = {
  systemPrompt: 'system rules',
  messages: [{ role: 'user' as const, content: 'user request' }],
  tools: [submitTool],
  temperature: 0.5,
};

// DeepSeek retries without thinking when forced tool_choice is incompatible.
{
  const requests: any[] = [];
  const reasoning: ReasoningUsage = { requested: true, applied: true };
  const client = {
    chat: {
      completions: {
        create: async (params: any) => {
          requests.push({ ...params });
          if (params.thinking) {
            throw Object.assign(
              new Error('Thinking mode does not support this tool_choice'),
              { status: 400 },
            );
          }
          return asyncChunks([
            {
              choices: [{
                delta: {
                  tool_calls: [{
                    index: 0,
                    id: 'deepseek_retry',
                    function: {
                      name: 'submit_generated_prompt',
                      arguments: '{"result":{"promptEn":"ok","promptCn":"好"}}',
                    },
                  }],
                },
              }],
            },
          ]);
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'deepseek-v4-flash', reasoning });
  const result = await callLlm(callArgs);

  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].thinking, { type: 'enabled' });
  assert.equal(requests[1].thinking, undefined);
  assert.deepEqual(requests[1].tool_choice, {
    type: 'function',
    function: { name: 'submit_generated_prompt' },
  });
  assert.equal(reasoning.applied, false);
  assert.equal(result.tool_calls[0].name, 'submit_generated_prompt');
}

// Thinking mode must not force tool_choice; the model may still stream a tool call.
{
  const requests: any[] = [];
  const reasoning: ReasoningUsage = { requested: true, applied: true, effort: 'high' };
  const client = {
    chat: {
      completions: {
        create: async (params: any) => {
          requests.push({ ...params });
          return asyncChunks([
            {
              choices: [{
                delta: {
                  tool_calls: [{
                    index: 0,
                    id: 'thinking_auto',
                    function: {
                      name: 'submit_generated_prompt',
                      arguments: '{"result":{"promptEn":"ok","promptCn":"好"}}',
                    },
                  }],
                },
              }],
            },
          ]);
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'deepseek-v4-flash', reasoning });
  const result = await callLlm(callArgs);

  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].thinking, { type: 'enabled' });
  assert.equal(requests[0].reasoning_effort, 'high');
  assert.equal(requests[0].tool_choice, undefined);
  assert.equal(result.tool_calls[0].name, 'submit_generated_prompt');
}

// Thinking + auto yields no tool call in stream; repair disables thinking and forces the tool.
{
  const requests: any[] = [];
  const reasoning: ReasoningUsage = { requested: true, applied: true };
  const client = {
    chat: {
      completions: {
        create: async (params: any) => {
          requests.push({ ...params });
          if (params.stream) {
            return asyncChunks([{ choices: [{ delta: { content: 'thinking text' } }] }]);
          }
          return {
            choices: [{
              message: {
                role: 'assistant',
                content: '',
                tool_calls: [{
                  id: 'repair_forced',
                  type: 'function',
                  function: {
                    name: 'submit_generated_prompt',
                    arguments: '{"result":{"promptEn":"ok","promptCn":"好"}}',
                  },
                }],
              },
            }],
          };
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'deepseek-v4-flash', reasoning });
  const result = await callLlm(callArgs);

  assert.equal(requests.length, 2);
  assert.equal(requests[0].stream, true);
  assert.equal(requests[0].thinking !== undefined, true);
  assert.equal(requests[0].tool_choice, undefined);
  assert.equal(requests[1].stream, false);
  assert.equal(requests[1].thinking, undefined);
  assert.deepEqual(requests[1].tool_choice, {
    type: 'function',
    function: { name: 'submit_generated_prompt' },
  });
  assert.equal(reasoning.applied, false);
  assert.equal(result.tool_calls[0].id, 'repair_forced');
}

// Thinking enabled + truncated tool arguments: disable thinking and regenerate a complete submission.
{
  const requests: any[] = [];
  const reasoning: ReasoningUsage = { requested: true, applied: true, effort: 'high' };
  const client = {
    chat: {
      completions: {
        create: async (params: any) => {
          requests.push({ ...params });
          if (params.thinking) {
            // Streaming tool call whose JSON arguments are truncated mid-string.
            return asyncChunks([
              {
                choices: [{
                  delta: {
                    tool_calls: [{
                      index: 0,
                      id: 'truncated',
                      function: {
                        name: 'submit_generated_prompt',
                        arguments: '{"result":{"promptEn":"partial unfinished',
                      },
                    }],
                  },
                }],
              },
            ]);
          }
          return asyncChunks([
            {
              choices: [{
                delta: {
                  tool_calls: [{
                    index: 0,
                    id: 'complete',
                    function: {
                      name: 'submit_generated_prompt',
                      arguments: '{"result":{"promptEn":"ok","promptCn":"好"}}',
                    },
                  }],
                },
              }],
            },
          ]);
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'deepseek-v4-flash', reasoning });
  const result = await callLlm(callArgs);

  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].thinking, { type: 'enabled' });
  assert.equal(requests[1].thinking, undefined);
  assert.deepEqual(requests[1].tool_choice, {
    type: 'function',
    function: { name: 'submit_generated_prompt' },
  });
  assert.equal(reasoning.applied, false);
  assert.equal(result.tool_calls[0].id, 'complete');
  assert.equal('_raw' in result.tool_calls[0].args, false);
}

// Provider caps completion tokens: retry with the reported model max_tokens.
{
  const requests: any[] = [];
  const client = {
    chat: {
      completions: {
        create: async (params: any) => {
          requests.push({ ...params });
          if (params.max_tokens === 393216) {
            throw Object.assign(
              new Error('bad request: max_tokens is too large: 393216. This model supports at most 131072 completion tokens.'),
              { status: 400 },
            );
          }
          return asyncChunks([
            {
              choices: [{
                delta: {
                  tool_calls: [{
                    index: 0,
                    id: 'capped',
                    function: {
                      name: 'submit_generated_prompt',
                      arguments: '{"result":{"promptEn":"ok","promptCn":"好"}}',
                    },
                  }],
                },
              }],
            },
          ]);
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'opencode-go-flash' });
  const result = await callLlm(callArgs);

  assert.equal(requests.length, 2);
  assert.equal(requests[0].max_tokens, 393216);
  assert.equal(requests[1].max_tokens, 131072);
  assert.equal(result.tool_calls[0].name, 'submit_generated_prompt');
}

// Context-length error: shrink max_tokens to (context limit - input tokens - margin).
{
  const requests: any[] = [];
  const client = {
    chat: {
      completions: {
        create: async (params: any) => {
          requests.push({ ...params });
          if (params.max_tokens === 393216) {
            throw Object.assign(
              new Error("This endpoint's maximum context length is 262144 tokens. However, you requested about 399045 tokens (5303 of text input, 526 of tool input, 393216 in the output). Please reduce the length of either one."),
              { status: 400 },
            );
          }
          return asyncChunks([
            {
              choices: [{
                delta: {
                  tool_calls: [{
                    index: 0,
                    id: 'context_capped',
                    function: {
                      name: 'submit_generated_prompt',
                      arguments: '{"result":{"promptEn":"ok","promptCn":"好"}}',
                    },
                  }],
                },
              }],
            },
          ]);
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'opencode-go' });
  const result = await callLlm(callArgs);

  assert.equal(requests.length, 2);
  assert.equal(requests[1].max_tokens, 262144 - 5303 - 526 - 512);
  assert.equal(result.tool_calls[0].name, 'submit_generated_prompt');
}

// A normal streaming tool submission is returned without fallback.
{
  const requests: any[] = [];
  const client = {
    chat: {
      completions: {
        create: async (params: any) => {
          requests.push(params);
          return asyncChunks([
            {
              choices: [{
                delta: {
                  tool_calls: [{
                    index: 0,
                    id: 'call_1',
                    function: {
                      name: 'submit_generated_prompt',
                      arguments: '{"result":{"promptEn":"ok","promptCn":"好"}}',
                    },
                  }],
                },
              }],
            },
          ]);
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'deepseek-v4-flash' });
  const result = await callLlm(callArgs);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].stream, true);
  assert.deepEqual(requests[0].tool_choice, {
    type: 'function',
    function: { name: 'submit_generated_prompt' },
  });
  assert.equal(result.tool_calls.length, 1);
  assert.equal(result.tool_calls[0].name, 'submit_generated_prompt');
}

// A successful stream with no tool call receives one non-stream protocol repair.
{
  const requests: any[] = [];
  const client = {
    chat: {
      completions: {
        create: async (params: any) => {
          requests.push(params);
          if (params.stream) {
            return asyncChunks([
              { choices: [{ delta: { content: 'plain text response' } }] },
            ]);
          }
          return {
            choices: [{
              message: {
                content: '',
                tool_calls: [{
                  id: 'repair_1',
                  function: {
                    name: 'submit_generated_prompt',
                    arguments: '{"result":{"promptEn":"fixed","promptCn":"修复"}}',
                  },
                }],
              },
            }],
          };
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'deepseek-v4-flash' });
  const result = await callLlm(callArgs);

  assert.equal(requests.length, 2, 'protocol repair must run at most once');
  assert.equal(requests[0].stream, true);
  assert.equal(requests[1].stream, false);
  assert.equal(requests[1].messages.length, requests[0].messages.length + 1, 'repair appends a tool-call instruction');
  assert.equal(
    JSON.stringify(requests[1].messages[requests[1].messages.length - 1]).includes('submit_generated_prompt'),
    true,
  );
  assert.equal(JSON.stringify(requests[1].messages).includes('plain text response'), false);
  assert.deepEqual(requests[1].tool_choice, {
    type: 'function',
    function: { name: 'submit_generated_prompt' },
  });
  assert.equal(result.tool_calls[0].name, 'submit_generated_prompt');
}

// A provider that ignores the forced tool in both modes: non-stream repair falls back to stream, then stops.
{
  let calls = 0;
  const client = {
    chat: {
      completions: {
        create: async (params: any) => {
          calls += 1;
          if (params.stream) {
            return asyncChunks([{ choices: [{ delta: { content: 'plain text' } }] }]);
          }
          return { choices: [{ message: { content: 'still plain text', tool_calls: [] } }] };
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'deepseek-v4-flash' });
  await assert.rejects(
    () => callLlm(callArgs),
    /流式及非流式模式下均未返回强制工具调用 submit_generated_prompt/,
  );
  assert.equal(calls, 3);
}

// A repair request runs without thinking and forces the tool (no thinking/tool_choice conflict).
{
  const requests: any[] = [];
  const compatibilityMessages: string[] = [];
  const reasoning: ReasoningUsage = { requested: true, applied: true, effort: 'high' };
  const client = {
    chat: {
      completions: {
        create: async (params: any) => {
          requests.push({ ...params });
          if (params.stream) {
            return asyncChunks([{ choices: [{ delta: { content: 'plain text' } }] }]);
          }
          return {
            choices: [{
              message: {
                content: '',
                tool_calls: [{
                  id: 'repair_without_thinking',
                  function: {
                    name: 'submit_generated_prompt',
                    arguments: '{"result":{"promptEn":"fixed","promptCn":"修复"}}',
                  },
                }],
              },
            }],
          };
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({
    client: client as any,
    model: 'deepseek-v4-flash',
    reasoning,
    onCompatibility: (message) => compatibilityMessages.push(message),
  });
  const result = await callLlm(callArgs);

  assert.equal(requests.length, 2);
  assert.equal(requests[0].stream, true);
  assert.equal(requests[1].stream, false);
  assert.equal(requests[1].thinking, undefined);
  assert.equal(requests[1].reasoning_effort, undefined);
  assert.deepEqual(requests[1].tool_choice, {
    type: 'function',
    function: { name: 'submit_generated_prompt' },
  });
  assert.equal(reasoning.applied, false);
  assert.match(reasoning.downgradeReason || '', /自动关闭/);
  assert.equal(compatibilityMessages.length, 1);
  assert.equal(result.tool_calls[0].name, 'submit_generated_prompt');
}

// Existing tool calls, including malformed arguments, never trigger the no-tool fallback.
{
  let calls = 0;
  const client = {
    chat: {
      completions: {
        create: async () => {
          calls += 1;
          return asyncChunks([
            {
              choices: [{
                delta: {
                  tool_calls: [{
                    index: 0,
                    function: { name: 'submit_generated_prompt', arguments: '{"result":' },
                  }],
                },
              }],
            },
          ]);
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'deepseek-v4-flash' });
  const result = await callLlm(callArgs);
  assert.equal(calls, 1);
  assert.equal('_raw' in result.tool_calls[0].args, true);
}

// Multiple tool calls are preserved for Runtime validation and never trigger repair.
{
  let calls = 0;
  const client = {
    chat: {
      completions: {
        create: async () => {
          calls += 1;
          return asyncChunks([
            {
              choices: [{
                delta: {
                  tool_calls: [0, 1].map((index) => ({
                    index,
                    id: `duplicate_${index}`,
                    function: {
                      name: 'submit_generated_prompt',
                      arguments: '{"result":{"promptEn":"ok","promptCn":"好"}}',
                    },
                  })),
                },
              }],
            },
          ]);
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'deepseek-v4-flash' });
  const result = await callLlm(callArgs);
  assert.equal(calls, 1);
  assert.equal(result.tool_calls.length, 2);
}

// Cancellation after a no-tool stream prevents the non-stream repair request.
{
  let calls = 0;
  const controller = new AbortController();
  const client = {
    chat: {
      completions: {
        create: async () => {
          calls += 1;
          return {
            async *[Symbol.asyncIterator]() {
              yield { choices: [{ delta: { content: 'plain text' } }] };
              controller.abort(new DOMException('cancelled', 'AbortError'));
            },
          };
        },
      },
    },
  };

  const callLlm = createH3OpenAiCall({ client: client as any, model: 'deepseek-v4-flash' });
  await assert.rejects(() => callLlm({ ...callArgs, signal: controller.signal }), /cancel|abort/i);
  assert.equal(calls, 1);
}

console.log('h3 OpenAI adapter tests passed');
