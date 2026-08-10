import assert from 'node:assert/strict';
import {
  randomizeImageStyleCombination,
  type ImageStyleCombination,
} from '../src/components/PromptGenerator';
import {
  DIRECTOR_STYLES,
  PHOTO_STYLES,
  CAPTURE_FILMS,
  PRINT_FILMS,
  STYLE_INTENSITIES,
} from '../src/data/presetOptions';

const directorValues = new Set(DIRECTOR_STYLES.map((item) => item.value));
const photoValues = new Set(PHOTO_STYLES.map((item) => item.value));
const captureValues = new Set(CAPTURE_FILMS.map((item) => item.value));
const printValues = new Set(PRINT_FILMS.map((item) => item.value));
const intensityValues = new Set(STYLE_INTENSITIES.map((item) => item.value));

const emptyCombination: ImageStyleCombination = {
  directorStyle: '',
  photoStyle: '',
  captureFilm: '',
  printFilm: '',
  styleIntensity: 'S2',
};

const directorCombination = randomizeImageStyleCombination(emptyCombination, () => 0);
assert.ok(directorValues.has(directorCombination.directorStyle), 'director branch selects a legal D value');
assert.equal(directorCombination.photoStyle, '', 'director branch clears the P value');
assert.ok(captureValues.has(directorCombination.captureFilm), 'random combination selects one legal C value');
assert.ok(printValues.has(directorCombination.printFilm), 'random combination selects one legal R value');
assert.ok(intensityValues.has(directorCombination.styleIntensity), 'random combination selects one legal S value');

const photoCombination = randomizeImageStyleCombination(emptyCombination, () => 0.999999);
assert.equal(photoCombination.directorStyle, '', 'photo branch clears the D value');
assert.ok(photoValues.has(photoCombination.photoStyle), 'photo branch selects a legal P value');
assert.ok(captureValues.has(photoCombination.captureFilm), 'photo branch selects one legal C value');
assert.ok(printValues.has(photoCombination.printFilm), 'photo branch selects one legal R value');
assert.ok(intensityValues.has(photoCombination.styleIntensity), 'photo branch selects one legal S value');
assert.ok(
  Number(Boolean(photoCombination.directorStyle)) + Number(Boolean(photoCombination.photoStyle)) === 1,
  'a random combination contains exactly one D/P main visual',
);

const repeatedCombination: ImageStyleCombination = {
  directorStyle: 'D01',
  photoStyle: '',
  captureFilm: 'C01',
  printFilm: 'R01',
  styleIntensity: 'S1',
};
const fallbackCombination = randomizeImageStyleCombination(repeatedCombination, () => 0);
assert.notDeepEqual(fallbackCombination, repeatedCombination, 'randomization always changes the combination');
assert.equal(fallbackCombination.styleIntensity, 'S2', 'finite duplicate retries advance S as a fallback');

const currentWithUnrelatedFields = Object.freeze({
  ...emptyCombination,
  aspectRatio: '21:9',
  imagePromptFormat: 'flux',
});
const isolatedCombination = randomizeImageStyleCombination(currentWithUnrelatedFields, () => 0.25);
assert.deepEqual(
  Object.keys(isolatedCombination).sort(),
  ['captureFilm', 'directorStyle', 'photoStyle', 'printFilm', 'styleIntensity'].sort(),
  'randomization only returns D/P/C/R/S fields',
);
assert.equal(currentWithUnrelatedFields.aspectRatio, '21:9', 'randomization does not affect aspect ratio');
assert.equal(currentWithUnrelatedFields.imagePromptFormat, 'flux', 'randomization does not affect target format');

console.log('image style randomization tests passed');
