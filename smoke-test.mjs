import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:href|src)="([^"?#]+)(?:\?[^"#]*)?"/g)].map(match => match[1]);
const missing = refs.filter(ref => !/^(?:https?:|data:|#)/.test(ref) && !fs.existsSync(path.join(root, ref)));
if (missing.length) throw new Error(`Missing local assets: ${missing.join(', ')}`);

const jsRefs = refs.filter(ref => ref.endsWith('.js'));
if (new Set(jsRefs).size !== jsRefs.length) throw new Error('A script is loaded more than once');
for (const ref of jsRefs) {
  const source = fs.readFileSync(path.join(root, ref), 'utf8');
  new vm.Script(source, { filename: ref });
}

const dataRefs = jsRefs.filter(ref => ref.startsWith('data/'));
const coreIndex = jsRefs.indexOf('js/app.js');
const compatibilityIndex = jsRefs.indexOf('js/compatibility.js');
const bootstrapIndex = jsRefs.indexOf('js/bootstrap.js');
const featureRefs = ['js/exercises.js', 'js/progress.js', 'js/lessons.js', 'js/career.js', 'js/dictionary.js', 'js/admin.js', 'js/auth.js', 'js/payments.js'];
if (!dataRefs.length || coreIndex < 0 || compatibilityIndex < 0 || bootstrapIndex < 0) {
  throw new Error('Required data/core/compatibility/bootstrap scripts are missing');
}
if (dataRefs.some(ref => jsRefs.indexOf(ref) > coreIndex)) {
  throw new Error('Content data must load before the shared runtime');
}
if (featureRefs.some(ref => !jsRefs.includes(ref) || jsRefs.indexOf(ref) < coreIndex || jsRefs.indexOf(ref) > compatibilityIndex)) {
  throw new Error('Feature modules must load between app.js and the compatibility layer');
}
if (bootstrapIndex !== jsRefs.length - 1 || bootstrapIndex < compatibilityIndex) {
  throw new Error('bootstrap.js must initialize the application exactly once and load last');
}
const dataContext = vm.createContext({ window: {} });
dataContext.window.window = dataContext.window;
for (const ref of dataRefs) {
  new vm.Script(fs.readFileSync(path.join(root, ref), 'utf8'), { filename: ref }).runInContext(dataContext);
}
const contentData = dataContext.window.DeutschraumData;
if (!contentData || contentData.levelOrder.join(',') !== 'A1,A2,B1,B2,C1,C2') {
  throw new Error('Curriculum registry is incomplete');
}
for (const level of contentData.levelOrder) {
  if (!Array.isArray(contentData.levels[level])) throw new Error(`Missing lesson data for ${level}`);
  if (contentData.levels[level].some(topic => !topic.id || topic.level !== level || topic.section !== 'grammar')) {
    throw new Error(`Unstable topic metadata in ${level}`);
  }
}
if (!Array.isArray(contentData.career?.specialTopics) || !contentData.vocabulary?.forms) {
  throw new Error('Career or vocabulary data is missing');
}
if (jsRefs.includes('js/legacy-features.js') || fs.existsSync(path.join(root, 'js/legacy-features.js'))) {
  throw new Error('The retired legacy-features.js must not exist or be loaded');
}
const compatibilitySource = fs.readFileSync(path.join(root, 'js/compatibility.js'), 'utf8');
if (Buffer.byteLength(compatibilitySource) > 40000) {
  throw new Error('compatibility.js grew beyond the documented adapter boundary');
}
if (/ensureContentIds\(\);\s*view\(\);\s*\}\)\(\);\s*$/.test(compatibilitySource)) {
  throw new Error('compatibility.js must not duplicate bootstrap initialization');
}
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
for (const namespace of ['state', 'utils', 'app', 'lessons', 'exercises', 'dictionary', 'progress', 'admin', 'auth', 'payments']) {
  if (!appSource.includes(`Deutschraum.${namespace}`)) throw new Error(`Missing shared runtime namespace: ${namespace}`);
}
for (const removedBlock of ['function renderTask(', 'function focusTraining(', 'function enrichVocabularyWord(', 'window.openEverydaySituation=function']) {
  if (compatibilitySource.includes(removedBlock)) throw new Error(`Extracted implementation remains duplicated in compatibility.js: ${removedBlock}`);
}
if (!fs.readFileSync(path.join(root, 'js/exercises.js'), 'utf8').includes('runtime.exercises') ||
    !fs.readFileSync(path.join(root, 'js/lessons.js'), 'utf8').includes('runtime.lessons') ||
    !fs.readFileSync(path.join(root, 'js/dictionary.js'), 'utf8').includes('runtime.dictionary') ||
    !fs.readFileSync(path.join(root, 'js/progress.js'), 'utf8').includes('runtime.progress')) {
  throw new Error('Feature modules do not publish their runtime APIs');
}

if (/<style\b|<script(?!\s+src=)/i.test(html)) {
  throw new Error('index.html still contains inline style or JavaScript blocks');
}

const combined = [html, ...jsRefs.map(ref => fs.readFileSync(path.join(root, ref), 'utf8'))].join('\n');
const handlers = [...combined.matchAll(/\bon[a-z]+="([^"]+)"/gi)].map(match => match[1]);
const called = new Set(handlers.flatMap(code => [...code.matchAll(/(?<!\.)\b([A-Za-z_$][\w$]*)\s*\(/g)].map(match => match[1])));
const ignored = new Set(['Number', 'alert', 'confirm', 'encodeURIComponent', 'if']);
const globals = new Set([
  ...combined.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g),
].map(match => match[1]));
for (const match of combined.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=/g)) globals.add(match[1]);
const unresolved = [...called].filter(name => !ignored.has(name) && !globals.has(name));
if (unresolved.length) throw new Error(`Unresolved inline handlers: ${unresolved.sort().join(', ')}`);

const requiredCompatibilityGlobals = [
  'go', 'view', 'open', 'close', 'login', 'logout', 'profile', 'admin',
  'levels', 'openTopic', 'openSkillModule', 'openPublishedTask',
  'dict', 'cards', 'openWordMenu', 'saveSimpleVocabulary',
  'premium', 'demoPay', 'toggleMobileMenu', 'renderStructuredAdminTab',
  'publishStructuredTask', 'updateStructuredPreview', 'markTaskDone'
];
const missingGlobals = requiredCompatibilityGlobals.filter(name => !globals.has(name));
if (missingGlobals.length) throw new Error(`Missing required compatibility globals: ${missingGlobals.join(', ')}`);

const storageSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
if (!storageSource.includes("K='deutschraum-live-v1'") || !storageSource.includes("K+'-session'")) {
  throw new Error('Backward-compatible localStorage keys changed');
}

const logicSources = featureRefs.map(ref => fs.readFileSync(path.join(root, ref), 'utf8')).join('\n');
if (/const\s+(?:standardTopics|defaultSpecialTopics|everydaySituations|vocabularyForms)\s*=\s*[\[{]/.test(logicSources)) {
  throw new Error('Declarative curriculum or vocabulary data leaked back into logic modules');
}

function fakeElement() {
  const element = {
    style: {}, dataset: {}, value: '', textContent: '', innerHTML: '', children: [], options: [],
    childNodes: [{ textContent: '' }], firstChild: { textContent: '' },
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() { return false; } },
    querySelector: () => fakeElement(), querySelectorAll: () => [], closest() { return this; },
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute() { return ''; },
    insertAdjacentHTML() {}, insertAdjacentElement() {}, append() {}, prepend() {}, remove() {},
    replaceWith() {}, scrollIntoView() {}, focus() {}
  };
  element.parentElement = element;
  element.content = element;
  return element;
}

const runtimeStorage = new Map();
runtimeStorage.set('deutschraum-live-v1', JSON.stringify({
  users: { 'qa@example.test': { done: ['A1-existing'], right: 2, answers: 3, words: ['gehen'], last: { page: 'levels', level: 'A1' } } },
  content: [{ id: 'existing-task', date: 1, level: 'A1', section: 'A1', topic: 'Existing', type: 'Freitext', content: 'Alt' }],
  settings: { qaPersistenceMarker: true }
}));
runtimeStorage.set('deutschraum-live-v1-session', JSON.stringify({ email: 'qa@example.test' }));
const runtimeContext = vm.createContext({
  console, TextDecoder, TextEncoder, Uint8Array, Blob, URL, Map, Set, Date, Math, JSON,
  Promise, Array, Object, String, Number, RegExp, Error, encodeURIComponent, decodeURIComponent,
  setTimeout: () => 0, clearTimeout() {}, alert() {}, confirm: () => false, prompt: () => '',
  fetch: async () => ({ ok: false, json: async () => ({}) }),
  localStorage: { getItem: key => runtimeStorage.get(key) || null, setItem: (key, value) => runtimeStorage.set(key, value) },
  speechSynthesis: { cancel() {}, speak() {} }, SpeechSynthesisUtterance: function () {},
  navigator: {}, NodeFilter: { SHOW_TEXT: 4 }, Event: function () {}, FileReader: function () {}, MediaRecorder: function () {}
});
runtimeContext.document = {
  body: fakeElement(), activeElement: null, getElementById: () => fakeElement(),
  querySelector: () => fakeElement(), querySelectorAll: () => [], createElement: () => fakeElement(),
  createDocumentFragment: () => fakeElement(), createTextNode: value => ({ textContent: value }),
  createTreeWalker: () => ({ nextNode: () => false }), addEventListener() {}
};
runtimeContext.window = runtimeContext;
runtimeContext.globalThis = runtimeContext;
for (const ref of jsRefs) {
  new vm.Script(fs.readFileSync(path.join(root, ref), 'utf8'), { filename: ref }).runInContext(runtimeContext);
}
const persistedState = runtimeContext.Deutschraum.state.db;
if (!persistedState.settings.qaPersistenceMarker || !persistedState.users['qa@example.test'].done.includes('A1-existing') ||
    !persistedState.content.some(item => item.id === 'existing-task') || !persistedState.users['qa@example.test'].words.length) {
  throw new Error('Existing localStorage data was not preserved during runtime initialization/migration');
}
if ([...runtimeStorage.keys()].some(key => !['deutschraum-live-v1', 'deutschraum-live-v1-session'].includes(key))) {
  throw new Error('Unexpected localStorage key created');
}

const exerciseTypes = ['Multiple Choice', 'Lückentext', 'Zuordnung', 'Kategorisierung', 'Richtig / Falsch',
  'Fehlerkorrektur', 'Satzbau', 'Kontext-Übung', 'Lesen', 'Hörverstehen', 'Interaktiver Dialog',
  'Chat-Simulator', 'Odd One Out', 'Grammatik-Regel', 'Freitext', 'Schreiben', 'Sprechen'];
for (const type of exerciseTypes) {
  const rendered = runtimeContext.Deutschraum.exercises.renderTask(type, 'Test | Inhalt', '');
  if (typeof rendered !== 'string' || !rendered) throw new Error(`Exercise renderer failed for ${type}`);
  const emptyRendered = runtimeContext.Deutschraum.exercises.renderTask(type, null, null);
  if (typeof emptyRendered !== 'string' || !emptyRendered) throw new Error(`Exercise renderer failed on empty data for ${type}`);
}
if (!runtimeContext.Deutschraum.exercises.renderTask('Unbekannter Typ', null, null)) throw new Error('Unknown exercise fallback failed');
for (const page of ['levels', 'dict', 'career', 'focus']) {
  runtimeContext.Deutschraum.state.route.page = page;
  runtimeContext.view();
}
for (const skill of ['Lesen', 'Hören', 'Schreiben', 'Sprechen']) runtimeContext.openSkillModule('A1', skill);
runtimeContext.login('login');
runtimeContext.login('register');
runtimeContext.premium();
runtimeContext.openEverydaySituation('supermarkt');
runtimeContext.legal('imp');

console.log(`Smoke check passed: ${refs.length} assets, ${jsRefs.length} scripts, ${dataRefs.length} data files, ${handlers.length} inline handlers.`);
