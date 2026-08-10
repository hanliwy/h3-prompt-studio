import assert from 'node:assert/strict';
import {
  invalidateGenerationControllers,
  replaceGenerationController,
  type GenerationControllerSlot,
} from '../src/components/PromptGenerator';

const createSlot = (): GenerationControllerSlot => ({ current: null });

const videoSlot = createSlot();
const imageSlot = createSlot();
const firstVideoController = replaceGenerationController(videoSlot);
const firstImageController = replaceGenerationController(imageSlot);
assert.equal(videoSlot.current, firstVideoController, 'video generation owns its controller slot');
assert.equal(imageSlot.current, firstImageController, 'image generation owns its controller slot at the same time');

let imageSlotAtAbort: AbortController | null | undefined;
firstImageController.signal.addEventListener('abort', () => {
  imageSlotAtAbort = imageSlot.current;
});
invalidateGenerationControllers(imageSlot);
assert.equal(imageSlot.current, null, 'stopping image invalidates the image slot');
assert.equal(imageSlotAtAbort, null, 'image abort observers see the image slot already invalidated');
assert.equal(firstImageController.signal.aborted, true, 'stopping image aborts the image request');
assert.equal(videoSlot.current, firstVideoController, 'stopping image does not affect video');
assert.equal(firstVideoController.signal.aborted, false, 'stopping image does not abort video');

const replacementImageController = replaceGenerationController(imageSlot);
let videoSlotAtReplacementAbort: AbortController | null | undefined;
firstVideoController.signal.addEventListener('abort', () => {
  videoSlotAtReplacementAbort = videoSlot.current;
});
const replacementVideoController = replaceGenerationController(videoSlot);
assert.equal(firstVideoController.signal.aborted, true, 'replacing video aborts the previous video request');
assert.equal(videoSlot.current, replacementVideoController, 'replacement video controller owns the video slot before the old abort fires');
assert.equal(videoSlotAtReplacementAbort, replacementVideoController, 'old video abort observers cannot pass the old identity guard');
assert.equal(replacementImageController.signal.aborted, false, 'replacing video does not abort image');
assert.equal(imageSlot.current, replacementImageController, 'replacing video does not change the image slot');

let videoSlotAtCleanupAbort: AbortController | null | undefined;
let imageSlotAtCleanupAbort: AbortController | null | undefined;
let imageSlotSeenByVideoAbort: AbortController | null | undefined;
let videoSlotSeenByImageAbort: AbortController | null | undefined;
replacementVideoController.signal.addEventListener('abort', () => {
  videoSlotAtCleanupAbort = videoSlot.current;
  imageSlotSeenByVideoAbort = imageSlot.current;
});
replacementImageController.signal.addEventListener('abort', () => {
  imageSlotAtCleanupAbort = imageSlot.current;
  videoSlotSeenByImageAbort = videoSlot.current;
});
invalidateGenerationControllers(videoSlot, imageSlot);
assert.equal(videoSlot.current, null, 'cleanup invalidates the video slot');
assert.equal(imageSlot.current, null, 'cleanup invalidates the image slot');
assert.equal(replacementVideoController.signal.aborted, true, 'cleanup aborts video');
assert.equal(replacementImageController.signal.aborted, true, 'cleanup aborts image');
assert.equal(videoSlotAtCleanupAbort, null, 'video abort observers see the video slot invalidated');
assert.equal(imageSlotAtCleanupAbort, null, 'image abort observers see the image slot invalidated');
assert.equal(imageSlotSeenByVideoAbort, null, 'video abort observers see the image slot invalidated too');
assert.equal(videoSlotSeenByImageAbort, null, 'image abort observers see the video slot invalidated too');

console.log('generation controller isolation tests passed');
