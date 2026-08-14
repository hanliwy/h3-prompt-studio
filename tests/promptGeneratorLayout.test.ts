import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const componentPath = path.join(process.cwd(), 'src', 'components', 'PromptGenerator.tsx');
const source = fs.readFileSync(componentPath, 'utf8').replace(/\r\n/g, '\n');

const skillsIndex = source.indexOf('data-workspace-column="skills"');
const composerControlsIndex = source.indexOf('data-workspace-column="composer-controls"');
const composerIndex = source.indexOf('data-workspace-column="composer"');
const resultIndex = source.indexOf('data-workspace-column="result"');
const inputModeIndex = source.indexOf('data-composer-panel="input-mode"');
const auxiliaryParamsIndex = source.indexOf('data-composer-panel="auxiliary-params"');
const promptInputIndex = source.indexOf('aria-label="核心画面创意或场景描述"');
const liveStreamLogIndex = source.indexOf('data-live-stream-log');
const liveStreamLogTag = source.slice(liveStreamLogIndex, source.indexOf('>', liveStreamLogIndex) + 1);
const promptStreamRowIndex = source.indexOf('data-prompt-stream-row');
const promptStreamRowTag = source.slice(promptStreamRowIndex, source.indexOf('>', promptStreamRowIndex) + 1);
const streamCardIndex = source.indexOf('data-workspace-section="stream"');
const streamCardTag = source.slice(streamCardIndex, source.indexOf('>', streamCardIndex) + 1);
const liveStreamWrapperIndex = source.lastIndexOf('<div className="', streamCardIndex);
const liveStreamWrapperTag = source.slice(liveStreamWrapperIndex, source.indexOf('>', liveStreamWrapperIndex) + 1);
const liveStreamToggleIconIndex = source.indexOf('{isLiveStreamOpen ? <ChevronUp');
const liveStreamToggleButtonIndex = source.lastIndexOf('<button', liveStreamToggleIconIndex);
const liveStreamToggleButtonSource = source.slice(
	liveStreamToggleButtonIndex,
	source.indexOf('</button>', liveStreamToggleButtonIndex),
);
const modeChangeStart = source.indexOf('const handleGeneratorModeChange');
const modeChangeEnd = source.indexOf('// Select a skill template', modeChangeStart);
const modeChangeSource = source.slice(modeChangeStart, modeChangeEnd);
const imageGenerateStart = source.indexOf('const handleGenerateImage');
const imageGenerateEnd = source.indexOf('const handleGenerate =', imageGenerateStart);
const imageGenerateSource = source.slice(imageGenerateStart, imageGenerateEnd);
const videoGenerateStart = imageGenerateEnd;
const videoGenerateEnd = source.indexOf('const handleStopGenerate', videoGenerateStart);
const videoGenerateSource = source.slice(videoGenerateStart, videoGenerateEnd);
const stopGenerateStart = videoGenerateEnd;
const stopGenerateEnd = source.indexOf('const triggerToast', stopGenerateStart);
const stopGenerateSource = source.slice(stopGenerateStart, stopGenerateEnd);
const controllerCleanupStart = source.indexOf('useEffect(() => () =>');
const controllerCleanupEnd = source.indexOf('\n\n', controllerCleanupStart);
const controllerCleanupSource = source.slice(controllerCleanupStart, controllerCleanupEnd);
const imageStyleRandomizeHandlerStart = source.indexOf('const handleRandomizeImageStyles');
const imageStyleRandomizeHandlerEnd = source.indexOf('\n  };', imageStyleRandomizeHandlerStart);
const imageStyleRandomizeHandlerSource = imageStyleRandomizeHandlerStart >= 0 && imageStyleRandomizeHandlerEnd >= 0
	? source.slice(imageStyleRandomizeHandlerStart, imageStyleRandomizeHandlerEnd + '\n  };'.length)
	: '';

assert.ok(source.includes('const isImageTaskGenerating = imageRequestState.isGenerating;'), 'image style randomization follows only the image request state');
assert.ok(
	!source.includes('activeGenerationMode'),
	'the temporary active generation mode is removed once request state is isolated',
);
assert.ok(source.includes('xl:grid-cols-[280px_420px_minmax(520px,1fr)]'), 'desktop uses a narrow skills column and compact composer');
assert.ok(skillsIndex >= 0, 'workspace exposes a left skills column');
assert.ok(composerIndex > skillsIndex, 'composer follows the left skills column');
assert.ok(resultIndex > composerIndex, 'result column follows the composer');
assert.ok(source.includes('data-workspace-section="result" className="order-2'), 'final result is visually below the live stream');
assert.ok(source.includes('data-workspace-section="stream" className="order-1'), 'live stream is visually first in the result column');
assert.ok(source.includes('正在生成新版本，当前保留上一版结果'), 'new generations explicitly preserve the previous result');
assert.ok(source.includes('最终结果将在这里持续保留'), 'result column has a persistent empty state');
assert.ok(
	source.includes('data-skill-template-grid') && source.includes('grid-cols-4'),
	'official skill templates use a compact four-column grid',
);
assert.ok(source.includes('h-[60px]'), 'official skill cards use the approved compact height');
assert.ok(source.includes('非参考图提示词'), 'text mode uses the requested label');
assert.ok(source.includes('参考图生提示词'), 'image mode uses the requested label');
assert.ok(!source.includes('非图片模式'), 'the old text mode label is removed from the interface');
assert.ok(!source.includes('图片模式'), 'the old image mode label is removed from the interface');
assert.equal(
	(source.match(/<option value="">无（由提示词 \/ Skill 判断）<\/option>/g) || []).length,
	4,
	'the four semantic auxiliary controls expose an empty option',
);
assert.ok(source.includes('manualAuxiliaryParams'), 'only explicit non-empty auxiliary selections are submitted');
assert.ok(
	!source.includes('initialInputOptions?.cameraMotion || selectedSkill.recommendedParams.cameraMotion'),
	'camera motion no longer defaults to the Skill recommendation',
);
assert.ok(
	!source.includes('initialInputOptions?.lensType || selectedSkill.recommendedParams.lens'),
	'lens no longer defaults to the Skill recommendation',
);
assert.ok(
	!source.includes('initialInputOptions?.lightingStyle || selectedSkill.recommendedParams.lighting'),
	'lighting no longer defaults to the Skill recommendation',
);
assert.ok(composerControlsIndex > skillsIndex, 'compact controls follow the skills column');
assert.ok(composerIndex > composerControlsIndex, 'prompt composer follows the compact controls');
assert.ok(
	source.includes('xl:col-start-2 xl:row-start-1'),
	'input mode sits in the second desktop column',
);
assert.ok(
	source.includes('data-workspace-column="auxiliary-column"') && source.includes('xl:col-start-3 xl:row-start-1'),
	'auxiliary parameters sit in the third desktop column',
);
assert.ok(source.includes('xl:grid-cols-2'), 'auxiliary selectors expand horizontally on desktop (narrow 420px column)');
assert.ok(source.includes('data-composer-panel="input-mode" className="space-y-2 rounded-xl'), 'input mode panel uses the compact height');
assert.ok(source.includes('data-composer-panel="auxiliary-params" className="space-y-2 rounded-xl'), 'auxiliary panel uses the compact height');
assert.ok(source.includes('xl:col-start-2 xl:row-start-2'), 'prompt composer starts below input mode');
assert.ok(source.includes('xl:col-start-3 xl:row-start-2'), 'result column aligns below auxiliary parameters');
assert.ok(
	source.includes('data-result-language-grid className="grid grid-cols-1 gap-4 xl:grid-cols-2"'),
	'English and Chinese results use a responsive side-by-side grid',
);
assert.ok(source.includes('data-live-stream-log'), 'live stream log exposes a stable layout target');
assert.ok(source.includes('max-h-[clamp(3.5rem,16dvh,9rem)]'), 'live stream height remains compact inside the viewport');
assert.ok(imageStyleRandomizeHandlerSource, 'image auxiliary parameters expose a dedicated random-combination handler');
assert.ok(
	source.includes('data-image-style-randomize') && source.includes('onClick={handleRandomizeImageStyles}'),
	'image auxiliary parameters expose a random-combination button wired to the dedicated handler',
);
const imageStyleCombinationResult = imageStyleRandomizeHandlerSource.match(
	/const\s+([A-Za-z_$][\w$]*)\s*=\s*randomizeImageStyleCombination\s*\(/,
);
assert.ok(imageStyleCombinationResult, 'the image style randomization handler calls randomizeImageStyleCombination');
const imageStyleCombinationVariable = imageStyleCombinationResult[1];
for (const [setter, field] of [
	['setImageDirectorStyle', 'directorStyle'],
	['setImagePhotoStyle', 'photoStyle'],
	['setImageCaptureFilm', 'captureFilm'],
	['setImagePrintFilm', 'printFilm'],
	['setImageStyleIntensity', 'styleIntensity'],
] as const) {
	assert.match(
		imageStyleRandomizeHandlerSource,
		new RegExp(`${setter}\\(\\s*${imageStyleCombinationVariable}\\.${field}\\s*\\)`),
		`the image style randomization handler writes ${field} through ${setter}`,
	);
}
for (const className of ['min-w-0', 'max-w-full', 'break-words', '[overflow-wrap:anywhere]']) {
	assert.ok(liveStreamLogTag.includes(className), `live stream log constrains long content with ${className}`);
}
assert.ok(
	promptStreamRowIndex >= 0 && promptStreamRowTag.includes('min-w-0') && promptStreamRowTag.includes('w-full'),
	'the horizontal prompt/stream container can shrink within the result column',
);
assert.ok(
	streamCardTag.includes('min-w-0') && streamCardTag.includes('max-w-full'),
	'the live stream card can shrink without widening its sibling',
);
assert.ok(
	liveStreamWrapperTag.includes('lg:contents') && liveStreamWrapperTag.includes('xl:block') && liveStreamWrapperTag.includes('xl:flex-1'),
	'the live stream wrapper restores a box at xl so its flex ratio applies',
);
assert.ok(source.includes('id="live-stream-content"'), 'live stream content exposes a stable controlled-region id');
assert.ok(
	liveStreamToggleButtonSource.includes('aria-expanded={isLiveStreamOpen}')
	&& liveStreamToggleButtonSource.includes('aria-controls="live-stream-content"')
	&& liveStreamToggleButtonSource.includes("aria-label={isLiveStreamOpen ? '收起实时流' : '展开实时流'}"),
	'the live stream icon toggle exposes its state, controlled region, and accessible action label',
);
assert.ok(inputModeIndex > composerControlsIndex, 'input mode panel is inside the second-column controls');
assert.ok(auxiliaryParamsIndex > inputModeIndex, 'auxiliary parameters follow input mode in the composer');
assert.ok(promptInputIndex > composerIndex, 'prompt input remains in the composer below the compact controls');
assert.ok(source.includes('export const replaceGenerationController'), 'generation exposes a testable controller replacement helper');
assert.ok(source.includes('export const invalidateGenerationControllers'), 'generation exposes a testable controller invalidation helper');
assert.ok(source.includes('signal: generationController.signal'), 'fetch receives the generation signal');
assert.ok(stopGenerateSource.includes('invalidateGenerationControllers(activeControllerSlot)'), 'the stop action invalidates and aborts only the active slot');
assert.ok(source.includes('停止生成'), 'an explicit stop button is available while generating');
assert.ok(source.includes("err?.name === 'AbortError'"), 'user cancellation is not shown as a request failure');
assert.ok(source.includes("buffer.replace(/\\r\\n/g, '\\n')"), 'SSE parsing normalizes CRLF frame separators');
assert.ok(source.includes('data-generator-mode-tabs'), 'generator exposes top-level video/image task tabs');
assert.ok(source.includes('视频提示词') && source.includes('图片提示词'), 'task tabs clearly separate video and image prompts');
assert.ok(source.includes("useState<GeneratorMode>('video')"), 'video mode remains the default');
assert.ok(source.includes('videoDraftRef') && source.includes('imageDraftRef'), 'video and image drafts are retained independently');
assert.ok(!modeChangeSource.includes('.abort()'), 'switching generator modes does not abort an active request');
for (const mutation of ['setLiveStreamSegments', 'setStreamStage', 'setStreamStatus', 'setErrorMessage', 'setVideoRequestState', 'setImageRequestState', 'setCurrentRequestState']) {
	assert.ok(!modeChangeSource.includes(mutation), `switching generator modes does not mutate request state through ${mutation}`);
}
assert.ok(
	source.includes('videoGenerationControllerRef') && source.includes('imageGenerationControllerRef'),
	'generation controllers are isolated for video and image requests',
);
assert.ok(
	source.includes('interface GenerationRequestState')
	&& source.includes('videoRequestState')
	&& source.includes('imageRequestState'),
	'generation request state is isolated for video and image modes',
);
assert.ok(imageGenerateSource.includes('replaceGenerationController(imageGenerationControllerRef)'), 'image generation replaces only the previous image request');
assert.ok(!imageGenerateSource.includes('replaceGenerationController(videoGenerationControllerRef)'), 'image generation never replaces a video request');
assert.ok(imageGenerateSource.includes('setImageRequestState'), 'image generation writes image request state');
assert.ok(!imageGenerateSource.includes('setVideoRequestState'), 'image generation never writes video request state');
assert.ok(imageGenerateSource.includes('setImageResult'), 'image generation writes only the image final result');
assert.ok(!imageGenerateSource.includes('setStructuredResult'), 'image generation never overwrites the video final result');
assert.ok(imageGenerateSource.includes('imageGenerationControllerRef.current === generationController'), 'image async cleanup rejects stale image requests');
assert.ok(videoGenerateSource.includes('replaceGenerationController(videoGenerationControllerRef)'), 'video generation replaces only the previous video request');
assert.ok(!videoGenerateSource.includes('replaceGenerationController(imageGenerationControllerRef)'), 'video generation never replaces an image request');
assert.ok(videoGenerateSource.includes('setVideoRequestState'), 'video generation writes video request state');
assert.ok(!videoGenerateSource.includes('setImageRequestState'), 'video generation never writes image request state');
assert.ok(videoGenerateSource.includes('setStructuredResult'), 'video generation writes only the video final result');
assert.ok(!videoGenerateSource.includes('setImageResult'), 'video generation never overwrites the image final result');
assert.ok(videoGenerateSource.includes('videoGenerationControllerRef.current === generationController'), 'video async cleanup rejects stale video requests');
assert.ok(
	stopGenerateSource.includes("generatorMode === 'video'")
	&& stopGenerateSource.includes('videoGenerationControllerRef')
	&& stopGenerateSource.includes('imageGenerationControllerRef')
	&& stopGenerateSource.includes('invalidateGenerationControllers(activeControllerSlot)'),
	'the stop action selects only the visible mode controller',
);
assert.ok(
	controllerCleanupSource.includes('invalidateGenerationControllers(videoGenerationControllerRef, imageGenerationControllerRef)'),
	'component cleanup invalidates and aborts both mode controller slots together',
);
assert.ok(source.includes('目标图片模型格式'), 'image mode exposes a target format selector');
assert.ok(source.includes("'/api/image-prompt/generate-stream'"), 'image mode uses its dedicated streaming endpoint');
assert.ok(source.includes('requestThinkingEnabled'), 'generation has a request-scoped thinking toggle');
assert.ok(source.includes('requestReasoningEffort'), 'generation has a request-scoped reasoning strength');
assert.ok(source.includes('思考强度'), 'thinking strength is available beside generation');
assert.ok(
	source.includes('<div\n              role="button"\n              tabIndex={0}\n              onClick={() => setInputMode(\'text\')}'),
	'the text input mode card uses a keyboard-accessible non-button container',
);
assert.ok(
	!source.includes('<button\n              type="button"\n              onClick={() => setInputMode(\'text\')}'),
	'the text input mode card cannot wrap the API configuration button in another button',
);

console.log('promptGeneratorLayout tests passed');
