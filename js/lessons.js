/* Deutschraum: lessons responsibilities. Classic scripts preserve HTML handler compatibility. */
function levels(){let p=prof()||{done:[],answers:0,right:0},q=p.answers?Math.round(p.right/p.answers*100):0;return '<div class="hero"><p class="eyebrow">DEIN LERNWEG</p><h1>Deutsch, das sich nach deinem Leben anfühlt.</h1><p>Kurze Lektionen, echte Dialoge und dein Fortschritt an einem Ort.</p></div><div class="head"><div><p class="eyebrow">SPRACHNIVEAUS</p><h2>Wähle dein Niveau</h2></div><small>'+p.done.length+' Lektionen abgeschlossen</small></div><div class="levels">'+['A1','A2','B1','B2'].map(x=>'<button class="'+(s.level===x?'active':'')+'" onclick="s.level=\''+x+'\';view()">'+x+'</button>').join('')+'</div>'+((db.settings.money&&(s.level==='B1'||s.level==='B2'))?gate():'')+'<div class="grid cards"><article class="card"><h3>🌱 Grundlagen</h3><p class="muted">Sich vorstellen und Alltag.</p><button class="primary" onclick="lesson(\'Grundlagen\')">Lektion starten</button></article><article class="card"><h3>✦ Grammatik</h3><p class="muted">Regeln verstehen und üben.</p><button class="primary" onclick="lesson(\'Grammatik\')">Üben</button></article><article class="card wide"><p class="eyebrow">FORTSCHRITT</p><h3>Quiz-Ergebnis: '+q+' %</h3><div class="progress"><i style="width:'+Math.min(100,p.done.length*18)+'%"></i></div><p class="muted">'+p.right+' richtige Antworten von '+p.answers+'.</p></article></div>'}

/* Level/topic renderer: static data + local Admin tasks -> lesson UI. */
(function (runtime, contentData) {
  const normalize = runtime.utils.normalize;
  const esc = runtime.utils.escape;
  const taskIdentity = runtime.app.taskIdentity;
  const standardTopics = contentData.levels;
  const { renderTask, renderWritingTask, mediaHtml, wordify } = runtime.exercises;
  window.levels = function () {
    const level = normalize(s.level);
    const progress = window.prof ? window.prof() : { done:[], answers:0, right:0 };
    const items = (db.content || []).filter(item => normalize(item.level || item.section) === level);
    db.deletedTopics = Array.isArray(db.deletedTopics) ? db.deletedTopics : [];
    const map = new Map();
    (standardTopics[level] || []).filter(topic => !db.deletedTopics.includes(level + '::' + topic.name.toLowerCase())).forEach(topic => map.set(topic.name.toLowerCase(), { ...topic, tasks:[] }));
    items.forEach(item => {
      const name = item.topic || 'Neues Thema';
      const key = name.toLowerCase();
      if (!map.has(key)) map.set(key, { name, vocab:[], grammar:'Integrierte Grammatikregel wird mit dem Thema ergänzt.', tasks:[] });
      map.get(key).tasks.push(item);
    });
    const cards = [...map.values()].map(topic => {
      const taskCount = topic.tasks.length;
      const solved = topic.tasks.filter(item => (progress.done || []).includes('task-' + Number(item.date))).length;
      const percent = taskCount ? Math.round(solved / taskCount * 100) : 0;
      return '<article class="card topic-card" data-topic="' + esc(topic.name) + '" data-level="' + esc(level) + '"><p class="eyebrow">THEMENMODUL · ' + esc(level) + '</p><h3>' + esc(topic.name) + '</h3><div class="topic-stats"><strong>Übungen: ' + taskCount + '</strong><span>Fortschritt: ' + percent + '% abgeschlossen</span><div class="progress"><i style="width:' + percent + '%"></i></div></div><div class="card-actions"><button class="primary" onclick="openTopicCard(this)">Thema öffnen</button>' + (adminOK() ? '<button class="danger-button" onclick="deleteTopic(this)">Löschen</button>' : '') + '</div></article>';
    }).join('');
    return '<div class="hero"><p class="eyebrow">THEMENBASIERTER LERNWEG</p><h1>Deutsch lernen – Thema für Thema.</h1><p>Jedes Modul verbindet Wortschatz, passende Grammatik und interaktive Übungen.</p></div><div class="head"><div><p class="eyebrow">SPRACHNIVEAUS</p><h2>Niveau ' + esc(level) + ' – Themen</h2></div><small>' + (progress.done || []).length + ' Lektionen abgeschlossen</small></div><div class="levels">' + ['A1','A2','B1','B2','C1','C2'].map(item => '<button class="' + (level === item ? 'active' : '') + '" onclick="s.level=\'' + item + '\';view()">' + item + '</button>').join('') + '</div><div class="grid cards">' + (cards || '<article class="card wide"><h3>Noch keine Themen</h3><p class="muted">Lege im Admin-Bereich ein neues Themenmodul an.</p></article>') + '</div>';
  };

  window.openTopicCard = button => { const card = button.closest('.topic-card'); window.openTopic(card.dataset.topic, card.dataset.level); };
  window.deleteTopic = button => {
    if (!adminOK()) return;
    const card = button.closest('.topic-card'); const name = card.dataset.topic; const level = card.dataset.level;
    if (!confirm('Thema „' + name + '“ und alle zugehörigen Aufgaben löschen?')) return;
    db.content = (db.content || []).filter(item => !(normalize(item.level || item.section) === normalize(level) && String(item.topic || '').toLowerCase() === name.toLowerCase()));
    db.deletedTopics = Array.isArray(db.deletedTopics) ? db.deletedTopics : []; const key = level + '::' + name.toLowerCase(); if (!db.deletedTopics.includes(key)) db.deletedTopics.push(key);
    save(); view();
  };

  window.openTopic = function (name, level) {
    const topic = (standardTopics[level] || []).find(item => item.name === name) || { name, vocab:[], grammar:'Integrierte Grammatikregel' };
    const tasks = (db.content || []).filter(item => normalize(item.level || item.section) === normalize(level) && String(item.topic || '').toLowerCase() === String(name).toLowerCase());
    const done = window.prof?.()?.done || [];
    const taskHtml = tasks.length ? tasks.map(item => '<div class="task-list-item"><button class="secondary task-open" onclick="openPublishedTask(' + Number(item.date) + ')"><span>' + esc(item.type) + '</span><small>' + (done.includes('task-' + Number(item.date)) ? '✓ Erledigt' : (item.isNew ? '<span class="new-badge">✨ Neu</span>' : 'Öffnen')) + '</small></button>' + (adminOK() ? '<button class="danger-button" onclick="deleteTaskById(\'' + esc(taskIdentity(item)) + '\',\'topic\',\'' + esc(level) + '\',\'' + esc(name).replace(/&#39;/g,"\\'") + '\')">Löschen</button>' : '') + '</div>').join('') : '<p class="muted">Für dieses Thema sind noch keine zusätzlichen Übungen veröffentlicht.</p>';
    window.open('<div class="dialog"><div class="dialog-top"><div><p class="eyebrow">NIVEAU ' + esc(level) + ' · THEMENMODUL</p><h2>' + esc(name) + '</h2></div><button class="icon">✕</button></div><div class="topic-panel grammar-first"><h4>✦ Grammatikerklärung</h4><p class="clickable-copy">' + wordify(topic.grammar) + '</p></div><div class="topic-panel"><h4>🧩 Interaktive Übungen</h4><div class="task-list">' + taskHtml + '</div></div></div>');
  };

  window.deleteTask = function (date, topicName, level) {
    if (!adminOK()) return;
    if (!confirm('Diese Aufgabe löschen?')) return;
    db.content = (db.content || []).filter(item => Number(item.date) !== Number(date)); save(); window.close(); window.openTopic(topicName, level);
  };

  window.openPublishedTask = function (date) {
    const item = (db.content || []).find(task => Number(task.date) === Number(date));
    if (!item) return;
    const body = item.type === 'Schreiben' ? renderWritingTask(item) : renderTask(item.type, item.content || item.data?.content || '', item.audio_url);
    const isDone = window.prof?.()?.done?.includes('task-' + Number(item.date));
    window.open('<div class="dialog" data-task-date="' + Number(item.date) + '"><div class="dialog-top"><div><p class="eyebrow">' + esc(item.section) + ' · ' + esc(item.type) + '</p><h2>' + esc(item.topic) + '</h2></div><button class="icon">✕</button></div>' + mediaHtml(item) + body + '<div class="task-completion"><button class="secondary" ' + (isDone ? 'disabled' : '') + ' onclick="markTaskDone(' + Number(item.date) + ',this)">' + (isDone ? '✓ Erledigt' : 'Als erledigt markieren') + '</button></div></div>');
  };


  Object.assign(runtime.lessons, { levels:window.levels, openTopic:window.openTopic, openPublishedTask:window.openPublishedTask });
})(window.Deutschraum, window.DeutschraumData);
