/* Deutschraum: exercises responsibilities. Classic scripts preserve HTML handler compatibility. */
function lesson(topic){if(db.settings.money&&(s.level==='B1'||s.level==='B2'))return premium();open('<div class="dialog"><div class="dialog-top"><div><p class="eyebrow">'+s.level+' · '+topic+'</p><h2>Kurze Übung</h2></div><button class="icon" onclick="close()">✕</button></div><p><button class="word" onclick="lookup(\'heiße\')">Wie heißt du?</button><button class="speaker" onclick="say(\'Wie heißt du?\')">🔊</button></p><div class="options"><button class="option" onclick="answer(this,true,\''+topic+'\')">Ich heiße Lena.</button><button class="option" onclick="answer(this,false,\''+topic+'\')">Ich heißen Lena.</button></div></div>')}

/* Exercise renderer and interaction engine extracted from the legacy closure. */
(function (runtime, contentData) {
  const esc = runtime.utils.escape;
  const lexicalInfo = contentData.vocabulary.lexicalInfo;
  function exampleBox(type) {
    const gap = type === 'Lückentext';
    const demo = gap
      ? 'Ich <span class="example-answer">wohne</span> in Berlin.'
      : type === 'Fehlerkorrektur'
        ? 'Ich <span class="example-old">geht</span> <span class="example-arrow">→</span> <span class="example-answer">gehe</span> nach Hause.'
        : '<span class="example-answer">✓ Ein Schritt ist bereits richtig gelöst.</span>';
    const note = gap ? 'Baustein in die passende Lücke ziehen oder antippen.' : type === 'Fehlerkorrektur' ? 'Fehlerwort wählen, Korrektur eingeben und prüfen.' : 'Probiere die Aufgabe danach auf dieselbe Weise.';
    return '<aside class="exercise-example" aria-label="Interaktives Beispiel"><div><p class="example-label">BEISPIEL</p><div class="example-demo">' + demo + '</div><small>' + note + '</small></div><button type="button" class="example-replay" onclick="toggleExample(this)" aria-label="Beispiel wiederholen">↻</button></aside>';
  }

  function parseGapTask(content) {
    const answers = [];
    const html = esc(content || 'Ich [[wohne]] in Berlin.').replace(/\[\[([^\]|]+)\]\]/g, (_, answer) => {
      const index = answers.push(answer.trim()) - 1;
      return '<button type="button" class="gap-drop" data-gap="' + index + '" data-correct="' + esc(answer.trim()) + '" onclick="placeSelectedTile(this)" ondragover="gapDragOver(event)" ondragleave="this.classList.remove(\'drag-over\')" ondrop="dropTile(event,this)" aria-label="Leere Textlücke">&nbsp;</button>';
    }).replace(/\n/g, '<br>');
    return { html, answers };
  }

  function renderGapTask(content) {
    const parsed = parseGapTask(content);
    const tiles = parsed.answers.map((answer, index) => ({ answer, index })).sort(() => Math.random() - .5);
    if (!tiles.length) return '<p class="notice">Bitte im Admin-Panel Lösungen als <strong>[[Lösung]]</strong> markieren.</p>';
    return '<div class="gap-exercise" data-checked="false"><p class="task-text">' + parsed.html + '</p><div class="word-bank" aria-label="Wort-Bausteine">' + tiles.map(tile => '<button type="button" draggable="true" class="word-chip draggable gap-tile" data-answer="' + esc(tile.answer) + '" data-tile="' + tile.index + '" onclick="selectGapTile(this)" ondragstart="startTileDrag(event,this)" ondragend="endTileDrag(this)">' + esc(tile.answer) + '</button>').join('') + '</div><button type="button" class="primary check-task" onclick="checkGapTask(this)">Antworten prüfen</button><p class="task-feedback" aria-live="polite"></p></div>';
  }

  function renderCorrectionTask(content) {
    const source = content || 'Ich [[geht|gehe]] morgen in die Schule.';
    let targetIndex = 0;
    const marked = source.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, wrong, correct) => '§§' + (targetIndex++) + '§§' + wrong + '§§' + correct + '§§');
    const tokens = marked.split(/(\s+)/);
    const words = tokens.map(token => {
      if (/^\s+$/.test(token)) return token;
      const match = token.match(/^§§(\d+)§§(.*?)§§(.*?)§§([.,!?;:]*)$/);
      if (match) return '<button type="button" class="correction-word" data-error="true" data-correct="' + esc(match[3]) + '" onclick="chooseCorrectionWord(this)">' + esc(match[2] + match[4]) + '</button>';
      return '<button type="button" class="correction-word" data-error="false" onclick="chooseCorrectionWord(this)">' + esc(token) + '</button>';
    }).join('');
    if (!targetIndex) return '<p class="notice">Bitte Fehler als <strong>[[falsch|richtig]]</strong> markieren.</p>';
    return '<div class="correction-exercise"><p class="task-text correction-sentence">' + words + '</p><p class="muted">Klicke das fehlerhafte Wort an.</p><p class="task-feedback" aria-live="polite"></p></div>';
  }

  function wordify(text) {
    return esc(text || '').replace(/([A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)?)/g, '<button type="button" class="word-clickable" onclick="openWordMenu(\'$1\')">$1</button>').replace(/\n/g, '<br>');
  }

  function renderWritingTask(item) {
    const data = item?.data || {};
    const context = data.writingContext || item?.content || 'Schreibe einen kurzen Text zum Thema.';
    const points = String(data.writingPoints || '').split(/\n|;/).map(point => point.trim()).filter(Boolean);
    return exampleBox('Schreiben') + '<section class="writing-task" data-task-date="' + Number(item?.date || 0) + '"><div class="writing-brief"><p class="eyebrow">SCHREIBAUFTRAG</p><h3>' + wordify(context) + '</h3>' + (points.length ? '<ul>' + points.map(point => '<li>' + wordify(point) + '</li>').join('') + '</ul>' : '') + '</div><label class="writing-label">Dein Text<textarea class="writing-answer open-answer" placeholder="Schreibe hier deinen Text …"></textarea></label><button type="button" class="primary" onclick="evaluateWriting(this)">Text abgeben</button><div class="writing-feedback hidden" aria-live="polite"></div></section>';
  }

  function mediaHtml(item) {
    const audio = item?.audio_url || '';
    const video = item?.video_url || '';
    let html = '';
    if (item?.image_url) html += '<div class="lesson-media"><p class="eyebrow">BILD</p><img src="' + esc(item.image_url) + '" alt="Illustration zur Aufgabe" loading="lazy"></div>';
    if (audio) html += '<div class="lesson-media"><p class="eyebrow">AUDIO</p><audio controls preload="metadata" src="' + esc(audio) + '">Audio nicht verfügbar.</audio></div>';
    if (video) {
      const yt = video.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]+)/) || (/^[\w-]{11}$/.test(video) ? [video,video] : null);
      const vm = video.match(/vimeo\.com\/(\d+)/);
      if (yt) html += '<div class="lesson-media"><p class="eyebrow">VIDEO</p><iframe src="https://www.youtube-nocookie.com/embed/' + esc(yt[1]) + '" title="Lektionsvideo" loading="lazy" allowfullscreen></iframe></div>';
      else if (vm) html += '<div class="lesson-media"><p class="eyebrow">VIDEO</p><iframe src="https://player.vimeo.com/video/' + esc(vm[1]) + '" title="Lektionsvideo" loading="lazy" allowfullscreen></iframe></div>';
      else html += '<div class="lesson-media"><p class="eyebrow">VIDEO</p><video controls preload="metadata" src="' + esc(video) + '">Video nicht verfügbar.</video></div>';
    }
    return html;
  }

  function renderSpeakingTask(content, audioUrl) {
    const sample = audioUrl ? '<audio controls preload="metadata" src="' + esc(audioUrl) + '">Audio nicht verfügbar.</audio>' : '<button type="button" class="secondary" onclick="say(\'' + esc(content).replace(/&#39;/g,"\\'") + '\')">🔊 Musterlösung anhören</button>';
    return exampleBox('Sprechen') + '<section class="speaking-task"><div class="speaking-prompt"><p class="eyebrow">SPRICH DEN TEXT</p><p class="clickable-copy">' + wordify(content || 'Guten Tag, ich möchte einen Termin vereinbaren.') + '</p></div><div class="sample-audio"><strong>Audio-Musterlösung</strong>' + sample + '</div><div class="recorder-panel"><button type="button" class="record-button" onclick="toggleRecording(this)" aria-pressed="false"><span class="record-dot"></span><span>Aufnahme starten</span></button><span class="record-status" aria-live="polite">Bereit</span><audio class="recorded-audio hidden" controls></audio></div><p class="muted">Nimm deine Stimme auf und vergleiche sie direkt mit der Musterlösung. Die Aufnahme bleibt nur in diesem Browser-Tab.</p></section>';
  }

  function renderCategorizationTask(content){const groups=String(content||'der: Tisch,Apfel; die: Schule,Banane; das: Haus,Brot').split(/;|\n/).map(row=>{const parts=row.split(':');return{name:(parts.shift()||'Kategorie').trim(),items:parts.join(':').split(',').map(item=>item.trim()).filter(Boolean)}}).filter(group=>group.items.length),items=groups.flatMap(group=>group.items.map(item=>({item,group:group.name}))).sort(()=>Math.random()-.5);return exampleBox('Kategorisierung')+'<section class="categorization-exercise"><p class="muted">Ziehe ein Wort in die passende Kategorie oder tippe zuerst das Wort und dann die Kategorie an.</p><div class="sorting-bank">'+items.map((entry,index)=>'<button class="sort-item" draggable="true" data-id="sort-'+index+'" data-correct="'+esc(entry.group)+'" onclick="selectSortItem(this)" ondragstart="startSortDrag(event,this)">'+esc(entry.item)+'</button>').join('')+'</div><div class="sorting-columns">'+groups.map(group=>'<button type="button" class="sorting-column" data-category="'+esc(group.name)+'" onclick="placeSelectedSortItem(this)" ondragover="event.preventDefault()" ondrop="dropSortItem(event,this)"><strong>'+esc(group.name)+'</strong><span class="sorting-dropzone"></span></button>').join('')+'</div><button class="primary check-task" onclick="checkCategorization(this)">Antworten prüfen</button><p class="task-feedback" aria-live="polite"></p></section>'}
  function renderTrueFalseTask(content){const rows=String(content||'Berlin ist die Hauptstadt Deutschlands.|richtig\nHamburg liegt in Österreich.|falsch').split(/\n|;/).map(row=>{const parts=row.split('|');return{text:(parts[0]||'').trim(),correct:/^(richtig|wahr|true)$/i.test((parts[1]||'richtig').trim())}}).filter(row=>row.text);return exampleBox('Richtig / Falsch')+'<section class="true-false-exercise">'+rows.map(row=>'<article class="tf-row" data-solved="false"><p>'+wordify(row.text)+'</p><div><button onclick="answerTrueFalse(this,true,'+row.correct+')">Richtig</button><button onclick="answerTrueFalse(this,false,'+row.correct+')">Falsch</button></div><small class="task-feedback" aria-live="polite"></small></article>').join('')+'</section>'}
  function renderChatSimulator(content){const rows=String(content||'Hallo! Wie geht es dir? => Danke, gut!* | Ich heiße Anna.\nWas machst du heute? => Ich lerne Deutsch.* | Blau.').split(/\n/).map(row=>{const parts=row.split('=>'),options=(parts[1]||'').split('|').map(option=>option.trim()).filter(Boolean);return{message:(parts[0]||'').trim(),options:options.map(option=>({text:option.replace(/\*$/,'').trim(),correct:/\*$/.test(option)}))}}).filter(row=>row.message&&row.options.length);return exampleBox('Chat-Simulator')+'<section class="chat-simulator" data-step="0">'+rows.map((row,index)=>'<article class="chat-step '+(index?'hidden':'')+'" data-chat-step="'+index+'"><div class="chat-bubble partner">'+wordify(row.message)+'</div><div class="chat-options">'+row.options.map(option=>'<button onclick="answerChat(this,'+option.correct+')">'+esc(option.text)+'</button>').join('')+'</div><p class="task-feedback"></p></article>').join('')+'</section>'}
  function renderOddOneOut(content){const words=String(content||'Apfel | Banane | Brot* | Orange').split('|').map(word=>word.trim()).filter(Boolean);return exampleBox('Odd One Out')+'<section class="odd-exercise"><p class="muted">Welches Wort passt nicht in die Reihe?</p><div class="odd-options">'+words.map(word=>'<button onclick="answerOddOne(this,'+/\*$/.test(word)+')">'+esc(word.replace(/\*$/,''))+'</button>').join('')+'</div><p class="task-feedback" aria-live="polite"></p></section>'}

  function renderTask(type, content, audioUrl) {
    const safe = esc(content);
    const example = exampleBox(type);
    const customType=(db.customTaskTypes||[]).find(item=>item.name===type);
    if(customType)return example+'<section class="custom-exercise"><p class="task-text">'+wordify(content||customType.instruction)+'</p><div class="option-cards">'+customType.options.map((option,index)=>'<button class="option-card" onclick="choiceCheck(this,'+(index===Number(customType.correct))+')">'+esc(option)+'</button>').join('')+'</div><p class="task-feedback" aria-live="polite"></p></section>';
    if (type === 'Lückentext') return example + renderGapTask(content);
    if (type === 'Kategorisierung') return renderCategorizationTask(content);
    if (type === 'Richtig / Falsch') return renderTrueFalseTask(content);
    if (type === 'Chat-Simulator') return renderChatSimulator(content);
    if (type === 'Odd One Out') return renderOddOneOut(content);
    if (type === 'Multiple Choice') {
      return example + '<div class="option-cards">' + ['Ich heiße Lena.','Ich heißen Lena.','Ich heißt Lena.'].map((option, index) => '<button class="option-card" onclick="choiceCheck(this,' + (index === 0) + ')">' + option + '</button>').join('') + '</div>';
    }
    if (type === 'Satzbau') {
      const tiles = String(content || '').split('|').map(word => word.trim()).filter(Boolean);
      return example + '<div class="drag-zone"><div class="sentence-result" id="sentenceDrop">Baue hier deinen Satz …</div></div><div class="word-bank">' + tiles.map(word => '<button draggable="true" class="word-chip draggable" ontouchstart="this.classList.add(\'dragging\')" onclick="appendTile(this)">' + esc(word) + '</button>').join('') + '</div>';
    }
    if (type === 'Zuordnung') {
      return example + '<div class="matching-grid"><button class="match-left" onclick="selectMatch(this)">Haus</button><button class="match-right" onclick="selectMatch(this)">🏠 Haus</button><button class="match-left" onclick="selectMatch(this)">Auto</button><button class="match-right" onclick="selectMatch(this)">🚗 Auto</button></div><p class="muted">Wähle jeweils ein Wort und das passende Gegenstück.</p>';
    }
    if (type === 'Freitext') {
      return example + '<textarea class="open-answer" placeholder="Schreibe deine Antwort auf Deutsch …"></textarea><div class="special-keys">' + ['ä','ö','ü','ß'].map(char => '<button class="word-chip" onclick="insertChar(\'' + char + '\')">' + char + '</button>').join('') + '</div>';
    }
    if (type === 'Kontext-Übung') {
      return example + '<p class="task-text">Im Café <select class="context-select" onchange="contextCheck(this,\'möchte\')"><option value="">Wähle …</option><option>möchte</option><option>möchten</option><option>möchtet</option></select> ich einen Kaffee.</p>';
    }
    if (type === 'Hörverstehen') {
      return example + '<audio controls class="task-audio" src="' + esc(audioUrl) + '"></audio><button class="speaker" onclick="say(\'Guten Tag, wo ist der Bahnhof?\')">🔊 Hörtext anhören</button><p>' + safe + '</p>';
    }
    if (type === 'Interaktiver Dialog') {
      return example + '<div class="dialog-line">👩 Guten Tag, was möchten Sie? <button class="speaker" onclick="say(\'Guten Tag, was möchten Sie?\')">🔊</button></div><div class="dialog-line">👤 Ich möchte <select onchange="contextCheck(this,\'einen Kaffee\')"><option>…</option><option>einen Kaffee</option><option>eine Kaffee</option></select>, bitte. <button class="speaker" onclick="say(\'Ich möchte einen Kaffee, bitte.\')">🔊</button></div>';
    }
    if (type === 'Fehlerkorrektur') {
      return example + renderCorrectionTask(content);
    }
    if (type === 'Schreiben') return example + '<p class="notice">Die vollständige Schreibansicht wird beim Öffnen der veröffentlichten Aufgabe angezeigt.</p>';
    if (type === 'Sprechen') return renderSpeakingTask(content, audioUrl);
    if (type === 'Grammatik-Regel') {
      return example + '<div class="rule-preview"><strong>Verbposition 2:</strong> ' + wordify(content || 'Heute lerne ich Deutsch. Das Verb steht im Hauptsatz auf Position 2.') + '</div>';
    }
    return example + '<p class="clickable-copy">' + wordify(content) + '</p>';
  }

  let selectedGapTile = null;
  window.toggleExample = button => { const box = button.closest('.exercise-example'); box.classList.toggle('replaying'); button.textContent = box.classList.contains('replaying') ? '✓' : '↻'; };
  window.selectGapTile = tile => { document.querySelectorAll('.gap-tile.selected').forEach(item => item.classList.remove('selected')); selectedGapTile = tile; tile.classList.add('selected'); };
  window.placeSelectedTile = slot => { if (selectedGapTile) placeTile(selectedGapTile, slot); };
  window.startTileDrag = (event, tile) => { selectedGapTile = tile; tile.classList.add('dragging'); event.dataTransfer.setData('text/plain', tile.dataset.tile); event.dataTransfer.effectAllowed = 'move'; };
  window.endTileDrag = tile => { tile.classList.remove('dragging'); document.querySelectorAll('.gap-drop.drag-over').forEach(slot => slot.classList.remove('drag-over')); };
  window.gapDragOver = event => { event.preventDefault(); event.currentTarget.classList.add('drag-over'); event.dataTransfer.dropEffect = 'move'; };
  window.dropTile = (event, slot) => { event.preventDefault(); slot.classList.remove('drag-over'); if (selectedGapTile) placeTile(selectedGapTile, slot); };
  function placeTile(tile, slot) {
    const previousId = slot.dataset.tile;
    if (previousId !== undefined) { const previous = document.querySelector('.gap-tile[data-tile="' + previousId + '"]'); if (previous) previous.hidden = false; }
    const oldSlot = document.querySelector('.gap-drop[data-tile="' + tile.dataset.tile + '"]');
    if (oldSlot) { oldSlot.innerHTML = '&nbsp;'; delete oldSlot.dataset.tile; delete oldSlot.dataset.answer; }
    slot.textContent = tile.dataset.answer; slot.dataset.answer = tile.dataset.answer; slot.dataset.tile = tile.dataset.tile;
    slot.classList.remove('correct','incorrect'); tile.hidden = true; tile.classList.remove('selected'); selectedGapTile = null;
  }
  window.checkGapTask = button => {
    const exercise = button.closest('.gap-exercise'); const slots = [...exercise.querySelectorAll('.gap-drop')]; let correct = 0;
    slots.forEach(slot => { const ok = slot.dataset.answer === slot.dataset.correct; slot.classList.toggle('correct', ok); slot.classList.toggle('incorrect', !ok); if (ok) correct++; });
    exercise.dataset.checked = 'true'; exercise.querySelector('.task-feedback').textContent = correct === slots.length ? '✓ Alles richtig!' : correct + ' von ' + slots.length + ' richtig. Probiere die roten Lücken noch einmal.';
    if (correct === slots.length) runtime.progress.completeCurrentTask(button);
  };
  window.chooseCorrectionWord = button => {
    const sentence = button.closest('.correction-sentence'); if (sentence.querySelector('.correction-input')) return;
    if (button.dataset.error !== 'true') {const feedback=button.closest('.correction-exercise').querySelector('.task-feedback');button.classList.add('incorrect');feedback.textContent='Falsch, versuche es noch einmal! 💡';setTimeout(()=>button.classList.remove('incorrect'),700);return;}
    const input = document.createElement('input'); input.className = 'correction-input'; input.placeholder = 'Korrektur'; input.dataset.correct = button.dataset.correct; input.dataset.original = button.textContent;
    input.addEventListener('keydown', event => { if (event.key === 'Enter') submitCorrection(input); });
    const submit = document.createElement('button'); submit.type = 'button'; submit.className = 'primary correction-submit'; submit.textContent = 'Prüfen'; submit.onclick = () => submitCorrection(input);
    button.replaceWith(input, submit); input.focus();
  };
  function submitCorrection(input) {
    const value = input.value.trim(); const correct = input.dataset.correct; const ok = value.toLocaleLowerCase('de-DE') === correct.toLocaleLowerCase('de-DE');
    input.classList.toggle('correct', ok); input.classList.toggle('incorrect', !ok);
    const feedback = input.closest('.correction-exercise').querySelector('.task-feedback');
    if (ok) { const solved = document.createElement('span'); solved.className = 'correction-solved'; solved.textContent = correct; input.nextElementSibling?.remove(); input.replaceWith(solved); feedback.textContent = '✓ Richtig korrigiert!'; runtime.progress.completeCurrentTask(solved); }
    else { feedback.textContent = 'Noch nicht richtig. Versuche es noch einmal.'; if (window.recordLearningError) recordLearningError(input,value,correct); }
  }
  window.choiceCheck = function (button, correct) {const scope=button.closest('.custom-exercise,.dialog,.student-preview')||document,feedback=scope.querySelector('.task-feedback')||(()=>{const node=document.createElement('p');node.className='task-feedback';node.setAttribute('aria-live','polite');button.closest('.option-cards').after(node);return node})();if(correct){button.classList.remove('incorrect');button.classList.add('correct');feedback.textContent='Richtig! 🎉';runtime.progress.completeCurrentTask(button)}else{button.classList.add('incorrect');feedback.textContent='Falsch, versuche es noch einmal! 💡';setTimeout(()=>button.classList.remove('incorrect'),700)}};
  window.appendTile = function (tile) { const target = document.getElementById('sentenceDrop'); if (target) { target.textContent = (target.textContent === 'Baue hier deinen Satz …' ? '' : target.textContent + ' ') + tile.textContent; tile.disabled = true; } };
  window.contextCheck = function (select, correct) {const ok=select.value===correct;select.classList.toggle('correct',ok);select.classList.toggle('incorrect',!!select.value&&!ok);let feedback=select.parentElement.querySelector('.task-feedback');if(!feedback){feedback=document.createElement('small');feedback.className='task-feedback';select.parentElement.append(feedback)}feedback.textContent=ok?'Richtig! 🎉':'Falsch, versuche es noch einmal! 💡';if(!ok)setTimeout(()=>select.classList.remove('incorrect'),700);else runtime.progress.completeCurrentTask(select)};
  window.correctError = function (button) { const input = document.createElement('input'); input.className = 'inline-gap'; input.placeholder = 'Korrektur'; input.onchange = () => { if (input.value === 'wohne') { input.classList.add('correct'); input.title = 'Richtig!'; } else { input.classList.add('incorrect'); input.title = 'Richtig wäre: wohne'; } }; button.replaceWith(input); input.focus(); };
  window.selectMatch = function (button) { const selected = document.querySelector('.matching-grid .selected'); if (!selected) { button.classList.add('selected'); return; } selected.classList.remove('selected'); selected.classList.add('correct'); button.classList.add('correct'); };
  window.insertChar = function (char) { const field = document.querySelector('.open-answer'); if (field) { field.setRangeText(char, field.selectionStart, field.selectionEnd, 'end'); field.focus(); } };
  let selectedSortItem=null;
  window.selectSortItem=function(item){document.querySelectorAll('.sort-item.selected').forEach(node=>node.classList.remove('selected'));selectedSortItem=item;item.classList.add('selected')};
  window.startSortDrag=function(event,item){selectedSortItem=item;event.dataTransfer.setData('text/plain',item.dataset.id)};
  function placeSortItem(column,item){if(!item)return;column.querySelector('.sorting-dropzone').append(item);item.dataset.placed=column.dataset.category;item.classList.remove('selected','correct','incorrect');selectedSortItem=null}
  window.placeSelectedSortItem=function(column){placeSortItem(column,selectedSortItem)};
  window.dropSortItem=function(event,column){event.preventDefault();placeSortItem(column,selectedSortItem)};
  window.checkCategorization=function(button){const exercise=button.closest('.categorization-exercise'),items=[...exercise.querySelectorAll('.sort-item')],correct=items.filter(item=>item.dataset.placed===item.dataset.correct);items.forEach(item=>{const ok=item.dataset.placed===item.dataset.correct;item.classList.toggle('correct',ok);item.classList.toggle('incorrect',!ok)});const feedback=exercise.querySelector('.task-feedback');feedback.textContent=correct.length===items.length?'Richtig! 🎉':'Falsch, versuche es noch einmal! 💡';if(correct.length===items.length)runtime.progress.completeCurrentTask(button)};
  window.answerTrueFalse=function(button,answer,correct){const row=button.closest('.tf-row'),ok=answer===correct,feedback=row.querySelector('.task-feedback');if(ok){button.classList.add('correct');row.dataset.solved='true';feedback.textContent='Richtig! 🎉';if([...row.closest('.true-false-exercise').querySelectorAll('.tf-row')].every(item=>item.dataset.solved==='true'))runtime.progress.completeCurrentTask(button)}else{button.classList.add('incorrect');feedback.textContent='Falsch, versuche es noch einmal! 💡';setTimeout(()=>button.classList.remove('incorrect'),700)}};
  window.answerChat=function(button,correct){const step=button.closest('.chat-step'),feedback=step.querySelector('.task-feedback');if(!correct){button.classList.add('incorrect');feedback.textContent='Falsch, versuche es noch einmal! 💡';setTimeout(()=>button.classList.remove('incorrect'),700);return}button.classList.add('correct');feedback.textContent='Richtig! 🎉';const next=step.nextElementSibling;if(next){setTimeout(()=>{step.classList.add('completed');next.classList.remove('hidden')},350)}else runtime.progress.completeCurrentTask(button)};
  window.answerOddOne=function(button,correct){const exercise=button.closest('.odd-exercise'),feedback=exercise.querySelector('.task-feedback');if(correct){button.classList.add('correct');feedback.textContent='Richtig! 🎉';runtime.progress.completeCurrentTask(button)}else{button.classList.add('incorrect');feedback.textContent='Falsch, versuche es noch einmal! 💡';setTimeout(()=>button.classList.remove('incorrect'),700)}};

  window.openWordMenu = function (rawWord) {
    const clean = String(rawWord || '').replace(/[^A-Za-zÄÖÜäöüß-]/g,'');
    const lookup = lexicalInfo[clean] || lexicalInfo[clean.toLowerCase()];
    const noun = /^[A-ZÄÖÜ]/.test(clean);
    const info = lookup || (noun ? {kind:'Nomen',forms:clean + ', Plural bitte ergänzen'} : {kind:'Wort',forms:'Grundform: ' + clean.toLowerCase()});
    window.open('<div class="dialog word-modal"><div class="dialog-top"><div><p class="eyebrow">PERSÖNLICHER WORTSCHATZ</p><h2>' + esc(clean) + '</h2></div><button class="icon">✕</button></div><p class="word-type">' + esc(info.kind) + '</p><p><strong>' + esc(info.forms) + '</strong></p><p class="translation"><strong>Übersetzung:</strong> ' + esc(translationFor(clean)) + '</p><div class="word-actions"><button class="secondary" onclick="say(\'' + esc(clean).replace(/&#39;/g,"\\'") + '\')">🔊 Aussprache</button><button class="primary" onclick="saveClickedWord(\'' + esc(clean).replace(/&#39;/g,"\\'") + '\')">＋ Im Vokabelheft speichern</button></div><p id="wordSaveMessage" class="task-feedback"></p></div>');
  };
  window.saveClickedWord = function (wordValue) {
    if (!window.prof?.()) return login('login');
    const words = window.prof().words; if (!words.includes(wordValue)) words.push(wordValue); save();
    const message = document.getElementById('wordSaveMessage'); if (message) message.textContent = '✓ Gespeichert';
  };

  window.evaluateWriting = function (button) {
    const task = button.closest('.writing-task'); const answer = task.querySelector('.writing-answer').value.trim(); const feedback = task.querySelector('.writing-feedback');
    if (answer.length < 20) { feedback.classList.remove('hidden'); feedback.innerHTML = '<p class="feedback-error">Bitte schreibe mindestens zwei vollständige Sätze.</p>'; return; }
    const item = (db.content || []).find(entry => Number(entry.date) === Number(task.dataset.taskDate)); const data = item?.data || {};
    const sentences = answer.split(/[.!?]+/).filter(Boolean).length; const words = answer.split(/\s+/).filter(Boolean).length;
    const issues = []; if (!/[.!?]$/.test(answer)) issues.push(['Rechtschreibung','Satzzeichen am Textende','Setze am Satzende einen Punkt, ein Frage- oder Ausrufezeichen.']); if (/\bich\s+[A-ZÄÖÜ]/.test(answer)) issues.push(['Rechtschreibung','Nomen und Satzanfänge prüfen','„ich“ wird nur am Satzanfang großgeschrieben.']); if (sentences < 2) issues.push(['Struktur','Nur ein Satz erkannt','Verbinde mindestens zwei vollständige Aussagen.']);
    const score = Math.min(100, Math.max(45, 55 + Math.min(25, words) + Math.min(20, sentences * 5) - issues.length * 8));
    const corrections = issues.length ? issues.map(issue => '<li><strong>' + esc(issue[0]) + ':</strong> ❌ ' + esc(issue[1]) + ' → ✅ ' + esc(issue[2]) + '</li>').join('') : '<li>✅ Keine offensichtlichen Basisfehler erkannt.</li>';
    feedback.innerHTML = '<h3>Strukturiertes Feedback</h3><ul class="correction-list">' + corrections + '</ul><div class="score-grid"><span>Inhalt <b>' + score + '%</b></span><span>Struktur <b>' + Math.max(40,score-5) + '%</b></span><span>Wortschatz <b>' + Math.min(100,score+3) + '%</b></span><span>Grammatik <b>' + Math.max(40,score-2) + '%</b></span></div><div class="model-answer"><strong>Musterlösung / optimierter Text</strong><p>' + wordify(data.writingModel || 'Sehr geehrte Damen und Herren, ich möchte Ihnen ein Problem in meiner Wohnung melden. Bitte teilen Sie mir mit, wann eine Reparatur möglich ist. Vielen Dank für Ihre Rückmeldung.') + '</p></div>';
    feedback.classList.remove('hidden'); runtime.progress.completeCurrentTask(task); const skillDialog=task.closest('.dialog[data-skill-level]'); if(skillDialog) completeSkill(skillDialog.dataset.skillLevel,skillDialog.dataset.skillType,button);
  };

  let activeRecorder = null, activeStream = null, recordedChunks = [];
  window.toggleRecording = async function (button) {
    const panel = button.closest('.recorder-panel'); const status = panel.querySelector('.record-status');
    if (activeRecorder?.state === 'recording') { activeRecorder.stop(); button.setAttribute('aria-pressed','false'); button.querySelector('span:last-child').textContent='Aufnahme starten'; return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { status.textContent='Aufnahme wird von diesem Browser nicht unterstützt.'; return; }
    try {
      activeStream = await navigator.mediaDevices.getUserMedia({audio:true}); recordedChunks=[]; activeRecorder=new MediaRecorder(activeStream);
      activeRecorder.ondataavailable = event => { if (event.data.size) recordedChunks.push(event.data); };
      activeRecorder.onstop = () => { const audio=panel.querySelector('.recorded-audio'); audio.src=URL.createObjectURL(new Blob(recordedChunks,{type:activeRecorder.mimeType||'audio/webm'})); audio.classList.remove('hidden'); status.textContent='Aufnahme bereit – jetzt vergleichen.'; activeStream?.getTracks().forEach(track=>track.stop()); activeRecorder=null; activeStream=null; runtime.progress.completeCurrentTask(panel); const skillDialog=panel.closest('.dialog[data-skill-level]'); if(skillDialog){const key='skill-'+skillDialog.dataset.skillLevel+'-'+skillDialog.dataset.skillType;if(window.prof?.()&&!window.prof().done.includes(key)){window.prof().done.push(key);save();}} };
      activeRecorder.start(); button.setAttribute('aria-pressed','true'); button.querySelector('span:last-child').textContent='Aufnahme stoppen'; status.textContent='● Aufnahme läuft …';
    } catch (error) { status.textContent='Mikrofonzugriff wurde nicht erteilt.'; }
  };


  Object.assign(runtime.exercises, {
    exampleBox, renderTask, renderWritingTask, renderSpeakingTask, mediaHtml,
    wordify, renderChatSimulator, renderTrueFalseTask
  });
})(window.Deutschraum, window.DeutschraumData);
