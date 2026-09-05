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
for (const ref of jsRefs) {
  const source = fs.readFileSync(path.join(root, ref), 'utf8');
  new vm.Script(source, { filename: ref });
}

const dataRefs = jsRefs.filter(ref => ref.startsWith('data/'));
const coreIndex = jsRefs.indexOf('js/app.js');
const legacyIndex = jsRefs.indexOf('js/legacy-features.js');
const bootstrapIndex = jsRefs.indexOf('js/bootstrap.js');
const featureRefs = ['js/exercises.js', 'js/progress.js', 'js/lessons.js', 'js/career.js', 'js/dictionary.js', 'js/admin.js', 'js/auth.js'];
if (!dataRefs.length || coreIndex < 0 || legacyIndex < 0 || bootstrapIndex < 0) {
  throw new Error('Required data/core/compatibility/bootstrap scripts are missing');
}
if (dataRefs.some(ref => jsRefs.indexOf(ref) > coreIndex)) {
  throw new Error('Content data must load before the shared runtime');
}
if (featureRefs.some(ref => !jsRefs.includes(ref) || jsRefs.indexOf(ref) < coreIndex || jsRefs.indexOf(ref) > legacyIndex)) {
  throw new Error('Feature modules must load between app.js and the compatibility layer');
}
if (bootstrapIndex !== jsRefs.length - 1 || bootstrapIndex < legacyIndex) {
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
const legacySource = fs.readFileSync(path.join(root, 'js/legacy-features.js'), 'utf8');
if (/ensureContentIds\(\);\s*view\(\);\s*\}\)\(\);\s*$/.test(legacySource)) {
  throw new Error('legacy-features.js must not duplicate bootstrap initialization');
}
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
for (const namespace of ['state', 'utils', 'app', 'lessons', 'exercises', 'dictionary', 'progress', 'admin', 'auth']) {
  if (!appSource.includes(`Deutschraum.${namespace}`)) throw new Error(`Missing shared runtime namespace: ${namespace}`);
}
for (const removedBlock of ['function renderTask(', 'function focusTraining(', 'function enrichVocabularyWord(', 'window.openEverydaySituation=function']) {
  if (legacySource.includes(removedBlock)) throw new Error(`Extracted implementation remains duplicated in legacy-features.js: ${removedBlock}`);
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

console.log(`Smoke check passed: ${refs.length} assets, ${jsRefs.length} scripts, ${dataRefs.length} data files, ${handlers.length} inline handlers.`);
