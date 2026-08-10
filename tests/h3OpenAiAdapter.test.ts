import assert from 'node:assert/strict';
import { createH3OpenAiCall } from '../src/server/h3OpenAiAdapter';

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
  assert.deepEqual(requests[1].messages, requests[0].messages, 'repair reuses only the original conversation');
  assert.equal(JSON.stringify(requests[1].messages).includes('plain text response'), false);
  assert.deepEqual(requests[1].tool_choice, {
    type: 'function',
    function: { name: 'submit_generated_prompt' },
  });
  assert.equal(result.tool_calls[0].name, 'submit_generated_prompt');
}

// A provider that ignores the forced tool in both modes stops after two requests.
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
  assert.equal(calls, 2);
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
