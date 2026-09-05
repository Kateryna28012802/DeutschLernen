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
const rendererIndex = jsRefs.indexOf('js/legacy-features.js');
if (!dataRefs.length || dataRefs.some(ref => jsRefs.indexOf(ref) > rendererIndex)) {
  throw new Error('Content data must load before the legacy renderer');
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
