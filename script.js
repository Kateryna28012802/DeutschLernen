/* Deutschraum – Admin, Vorschau, Zahlungsarten und Aufgabenrenderer */
(function () {
  const normalize = value => String(value || '').trim().toUpperCase();
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const originalOpen = window.open;
  const originalLevels = window.levels;

  window.open = function (content) {
    originalOpen(content);
    bindModal();
  };

  function bindModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    const closeButton = modal.querySelector('.dialog-top .icon');
    if (closeButton && !closeButton.dataset.closeReady) {
      closeButton.dataset.closeReady = 'true';
      closeButton.classList.add('modal-close');
      closeButton.addEventListener('click', event => closeModal(event), { once: true });
    }
    configureAdmin(modal);
  }

  function closeModal(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    window.close();
  }

  function configureAdmin(modal) {
    const section = modal.querySelector('#sect');
    if (!section) return;
    const selected = normalize(section.value);
    section.innerHTML = '<option value="A1">Sprachniveau A1</option><option value="A2">Sprachniveau A2</option><option value="B1">Sprachniveau B1</option><option value="B2">Sprachniveau B2</option><option value="C1">Sprachniveau C1</option><option value="C2">Sprachniveau C2</option><option value="Beruf & Spezial">Beruf & Spezial</option><option value="Wortschatz">Wortschatz</option>';
    if ([...section.options].some(option => option.value === selected)) section.value = selected;

    const topicInput = modal.querySelector('#topic');
    if (topicInput) {
      topicInput.placeholder = 'Thema erstellen oder wählen, z. B. Sich vorstellen';
      const topicLabel = topicInput.closest('label');
      if (topicLabel && !topicLabel.dataset.topicReady) {
        topicLabel.dataset.topicReady = 'true';
        topicLabel.firstChild.textContent = 'Themenmodul';
      }
    }

    const type = modal.querySelector('#type');
    if (type && !type.dataset.typeReady) {
      ['Zuordnung', 'Freitext', 'Schreiben', 'Sprechen'].forEach(name => {
        if (![...type.options].some(option => option.value === name)) {
          type.insertAdjacentHTML('beforeend', '<option>' + name + '</option>');
        }
      });
      type.dataset.typeReady = 'true';
      type.addEventListener('change', () => { updateTypeHint(); configureWritingFields(modal); configureSpeakingFields(modal); });
    }
    updateTypeHint();
    configureWritingFields(modal);
    configureSpeakingFields(modal);

    const audioInput = modal.querySelector('#audio');
    if (audioInput && !modal.querySelector('#video')) {
      audioInput.closest('label').insertAdjacentHTML('afterend', '<label>video_url (MP4, YouTube oder Vimeo)<input id="video" type="url" placeholder="https://…"></label>');
    }

    const adminAside = section.closest('.dialog')?.querySelector('aside');
    if (adminAside && !adminAside.querySelector('.admin-payment-note')) {
      adminAside.insertAdjacentHTML('beforeend',
        '<div class="admin-payment-note notice"><strong>Checkout-Zahlungsarten</strong><br>💳 Kreditkarte · PayPal ·  Apple Pay · G Pay · Klarna · SEPA</div>'
      );
    }

    const previewButton = modal.querySelector('button[onclick="preview()"]');
    if (previewButton && !previewButton.dataset.previewReady) {
      previewButton.dataset.previewReady = 'true';
      previewButton.id = 'previewButton';
      previewButton.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        window.preview();
      });
    }
  }

  function updateTypeHint() {
    const type = document.getElementById('type');
    const task = document.getElementById('task');
    if (!type || !task) return;
    const hints = {
      'Multiple Choice':'Frage: Wie heißt du?\n[ Ich heiße Lena. | Ich heißen Lena. -> Ich heiße Lena. ]',
      'Lückentext':'Ich [[wohne]] in Berlin und [[lerne]] Deutsch.\nJede [[Lösung]] wird automatisch zum Baustein.',
      'Fehlerkorrektur':'Ich [[geht|gehe]] morgen in die Schule.\nFormat: [[falsches Wort|richtige Korrektur]]',
      'Satzbau':'Ich | lerne | heute | Deutsch',
      'Kontext-Übung':'Im Café ___ ich einen Kaffee. | Optionen: möchte, möchten, möchtet',
      'Hörverstehen':'Audio-URL eintragen und darunter Verständnisfragen formulieren.',
      'Interaktiver Dialog':'Ich möchte ___, bitte. | Optionen: einen Kaffee, einen Tee',
      'Grammatik-Regel':'Verbposition 2: Heute lerne ich Deutsch. Wort A ➔ Wort B',
      'Zuordnung':'Wort: Haus | Bild: Haus; Wort: Auto | Bild: Auto',
      'Freitext':'Beschreibe deinen Tag auf Deutsch.'
      ,'Schreiben':'Schreibe eine E-Mail an den Vermieter. Gehe auf Reparatur, Termin und Rückmeldung ein.'
      ,'Sprechen':'Sprich den Satz deutlich nach: Guten Tag, ich möchte einen Termin vereinbaren.'
    };
    task.placeholder = hints[type.value] || 'Aufgabeninhalt eingeben.';
  }

  function configureWritingFields(modal) {
    const type = modal.querySelector('#type');
    const task = modal.querySelector('#task');
    if (!type || !task) return;
    modal.querySelector('.writing-admin-fields')?.remove();
    if (type.value !== 'Schreiben') return;
    task.closest('label').insertAdjacentHTML('afterend', '<div class="writing-admin-fields"><label>Kontext<input id="writingContext" placeholder="z. B. E-Mail an den Vermieter"></label><label>Inhaltspunkte<textarea id="writingPoints" placeholder="Reparatur melden\nTermin vorschlagen\nUm Rückmeldung bitten"></textarea></label><label>Musterlösung<textarea id="writingModel" placeholder="Sehr geehrte Damen und Herren, …"></textarea></label></div>');
  }

  function configureSpeakingFields(modal) {
    const type = modal.querySelector('#type'); const task = modal.querySelector('#task');
    modal.querySelector('.speaking-admin-fields')?.remove();
    if (!type || !task || type.value !== 'Sprechen') return;
    task.closest('label').insertAdjacentHTML('afterend','<div class="speaking-admin-fields notice"><strong>Audio-Musterlösung</strong><p class="muted">Trage die MP3-URL unten in <b>audio_url</b> ein. Ohne Datei wird der Aufgabentext per deutscher Sprachausgabe vorgelesen.</p></div>');
  }

  window.preview = function () {
    const modal = document.getElementById('modal');
    const type = modal.querySelector('#type');
    const task = modal.querySelector('#task');
    const box = modal.querySelector('#prev');
    if (!type || !task || !box) return;
    const content = task.value.trim() || task.placeholder;
    box.innerHTML = '<div class="preview-surface"><p class="eyebrow">' + esc(type.value) + '</p><h3>Live-Vorschau</h3>' + renderTask(type.value, content, modal.querySelector('#audio')?.value || '') + '</div>';
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior:'smooth', block:'nearest' });
  };

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
      const yt = video.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
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

  function renderTask(type, content, audioUrl) {
    const safe = esc(content);
    const example = exampleBox(type);
    const customType=(db.customTaskTypes||[]).find(item=>item.name===type);
    if(customType)return example+'<section class="custom-exercise"><p class="task-text">'+wordify(content||customType.instruction)+'</p><div class="option-cards">'+customType.options.map((option,index)=>'<button class="option-card" onclick="choiceCheck(this,'+(index===Number(customType.correct))+')">'+esc(option)+'</button>').join('')+'</div><p class="task-feedback" aria-live="polite"></p></section>';
    if (type === 'Lückentext') return example + renderGapTask(content);
    if (type === 'Multiple Choice') {
      return example + '<div class="option-cards">' + ['Ich heiße Lena.','Ich heißen Lena.','Ich heißt Lena.'].map((option, index) => '<button class="option-card" onclick="choiceCheck(this,' + (index === 0) + ')">' + option + '</button>').join('') + '</div>';
    }
    if (type === 'Satzbau') {
      const tiles = content.split('|').map(word => word.trim()).filter(Boolean);
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
    if (correct === slots.length) completeCurrentTask(button);
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
    if (ok) { const solved = document.createElement('span'); solved.className = 'correction-solved'; solved.textContent = correct; input.nextElementSibling?.remove(); input.replaceWith(solved); feedback.textContent = '✓ Richtig korrigiert!'; completeCurrentTask(solved); }
    else feedback.textContent = 'Noch nicht richtig. Versuche es noch einmal.';
  }
  window.choiceCheck = function (button, correct) {const scope=button.closest('.custom-exercise,.dialog,.student-preview')||document,feedback=scope.querySelector('.task-feedback')||(()=>{const node=document.createElement('p');node.className='task-feedback';node.setAttribute('aria-live','polite');button.closest('.option-cards').after(node);return node})();if(correct){button.classList.remove('incorrect');button.classList.add('correct');feedback.textContent='Richtig! 🎉';completeCurrentTask(button)}else{button.classList.add('incorrect');feedback.textContent='Falsch, versuche es noch einmal! 💡';setTimeout(()=>button.classList.remove('incorrect'),700)}};
  window.appendTile = function (tile) { const target = document.getElementById('sentenceDrop'); if (target) { target.textContent = (target.textContent === 'Baue hier deinen Satz …' ? '' : target.textContent + ' ') + tile.textContent; tile.disabled = true; } };
  window.contextCheck = function (select, correct) {const ok=select.value===correct;select.classList.toggle('correct',ok);select.classList.toggle('incorrect',!!select.value&&!ok);let feedback=select.parentElement.querySelector('.task-feedback');if(!feedback){feedback=document.createElement('small');feedback.className='task-feedback';select.parentElement.append(feedback)}feedback.textContent=ok?'Richtig! 🎉':'Falsch, versuche es noch einmal! 💡';if(!ok)setTimeout(()=>select.classList.remove('incorrect'),700);else completeCurrentTask(select)};
  window.correctError = function (button) { const input = document.createElement('input'); input.className = 'inline-gap'; input.placeholder = 'Korrektur'; input.onchange = () => { if (input.value === 'wohne') { input.classList.add('correct'); input.title = 'Richtig!'; } else { input.classList.add('incorrect'); input.title = 'Richtig wäre: wohne'; } }; button.replaceWith(input); input.focus(); };
  window.selectMatch = function (button) { const selected = document.querySelector('.matching-grid .selected'); if (!selected) { button.classList.add('selected'); return; } selected.classList.remove('selected'); selected.classList.add('correct'); button.classList.add('correct'); };
  window.insertChar = function (char) { const field = document.querySelector('.open-answer'); if (field) { field.setRangeText(char, field.selectionStart, field.selectionEnd, 'end'); field.focus(); } };

  function completeCurrentTask(element) {
    const date = Number(element?.closest('.dialog')?.dataset.taskDate || element?.closest('[data-task-date]')?.dataset.taskDate || 0);
    if (!date || !window.prof?.()) return;
    const profile = window.prof(); const key = 'task-' + date;
    if (!profile.done.includes(key)) profile.done.push(key);
    const item=(db.content||[]).find(entry=>Number(entry.date)===date);if(item)item.isNew=false;
    save();
  }

  window.markTaskDone = function (date, button) {
    if (!window.prof?.()) return login('login');
    const profile = window.prof(); const key = 'task-' + Number(date);
    if (!profile.done.includes(key)) profile.done.push(key);
    const item=(db.content||[]).find(entry=>Number(entry.date)===Number(date));if(item)item.isNew=false;
    save(); button.textContent = '✓ Erledigt'; button.disabled = true;
  };

  const lexicalInfo = {
    gehen:{kind:'Verb',forms:'gehen, ging, ist gegangen'},kommen:{kind:'Verb',forms:'kommen, kam, ist gekommen'},lernen:{kind:'Verb',forms:'lernen, lernte, hat gelernt'},wohnen:{kind:'Verb',forms:'wohnen, wohnte, hat gewohnt'},sprechen:{kind:'Verb',forms:'sprechen, sprach, hat gesprochen'},
    Tisch:{kind:'Nomen',forms:'der Tisch, die Tische'},Haus:{kind:'Nomen',forms:'das Haus, die Häuser'},Wohnung:{kind:'Nomen',forms:'die Wohnung, die Wohnungen'},Bahnhof:{kind:'Nomen',forms:'der Bahnhof, die Bahnhöfe'},Schule:{kind:'Nomen',forms:'die Schule, die Schulen'}
  };
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
    feedback.classList.remove('hidden'); completeCurrentTask(task); const skillDialog=task.closest('.dialog[data-skill-level]'); if(skillDialog) completeSkill(skillDialog.dataset.skillLevel,skillDialog.dataset.skillType,button);
  };

  let activeRecorder = null, activeStream = null, recordedChunks = [];
  window.toggleRecording = async function (button) {
    const panel = button.closest('.recorder-panel'); const status = panel.querySelector('.record-status');
    if (activeRecorder?.state === 'recording') { activeRecorder.stop(); button.setAttribute('aria-pressed','false'); button.querySelector('span:last-child').textContent='Aufnahme starten'; return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { status.textContent='Aufnahme wird von diesem Browser nicht unterstützt.'; return; }
    try {
      activeStream = await navigator.mediaDevices.getUserMedia({audio:true}); recordedChunks=[]; activeRecorder=new MediaRecorder(activeStream);
      activeRecorder.ondataavailable = event => { if (event.data.size) recordedChunks.push(event.data); };
      activeRecorder.onstop = () => { const audio=panel.querySelector('.recorded-audio'); audio.src=URL.createObjectURL(new Blob(recordedChunks,{type:activeRecorder.mimeType||'audio/webm'})); audio.classList.remove('hidden'); status.textContent='Aufnahme bereit – jetzt vergleichen.'; activeStream?.getTracks().forEach(track=>track.stop()); activeRecorder=null; activeStream=null; completeCurrentTask(panel); const skillDialog=panel.closest('.dialog[data-skill-level]'); if(skillDialog){const key='skill-'+skillDialog.dataset.skillLevel+'-'+skillDialog.dataset.skillType;if(window.prof?.()&&!window.prof().done.includes(key)){window.prof().done.push(key);save();}} };
      activeRecorder.start(); button.setAttribute('aria-pressed','true'); button.querySelector('span:last-child').textContent='Aufnahme stoppen'; status.textContent='● Aufnahme läuft …';
    } catch (error) { status.textContent='Mikrofonzugriff wurde nicht erteilt.'; }
  };

  window.publish = function () {
    const modal = document.getElementById('modal');
    const get = id => modal.querySelector('#' + id);
    const section = get('sect'), topic = get('topic'), type = get('type'), task = get('task');
    if (!section || !topic || !type || !task) return;
    const rawSection = section.value;
    const level = ['A1','A2','B1','B2','C1','C2'].includes(normalize(rawSection)) ? normalize(rawSection) : rawSection;
    const item = { section:level, level, topic:topic.value.trim() || 'Neue Aufgabe', type:type.value, content:task.value.trim(), image_url:get('img')?.value.trim() || '', audio_url:get('audio')?.value.trim() || '', video_url:get('video')?.value.trim() || '', data:{ writingContext:get('writingContext')?.value.trim() || '', writingPoints:get('writingPoints')?.value.trim() || '', writingModel:get('writingModel')?.value.trim() || '' }, date:Date.now() };
    db.content = Array.isArray(db.content) ? db.content : [];
    db.content.push(item); save();
    const message = get('msg');
    if (message) { message.textContent = '✓ Aufgabe für ' + level + ' veröffentlicht.'; message.classList.remove('hidden'); }
    if (['A1','A2','B1','B2','C1','C2'].includes(level)) { s.page='levels'; s.level=level; window.view(); }
  };

  const standardTopics = {
    A1: [
      { name:'Sich vorstellen', vocab:['heißen','wohnen','kommen'], grammar:'Personalpronomen und Verbkonjugation' },
      { name:'Im Alltag', vocab:['Kaffee','Uhrzeit','Einkaufen'], grammar:'Artikel: der, die, das' },
      { name:'Unterwegs', vocab:['Bahnhof','links','geradeaus'], grammar:'Fragen mit wo und wohin' }
    ],
    A2: [
      { name:'Wohnen und Nachbarschaft', vocab:['Miete','Wohnung','Nachbar'], grammar:'Wechselpräpositionen' },
      { name:'Gesundheit', vocab:['Arzt','Termin','Schmerzen'], grammar:'Modalverben und Imperativ' }
    ],
    B1: [
      { name:'Arbeit und Beruf', vocab:['Bewerbung','Erfahrung','Team'], grammar:'Nebensätze mit dass und weil' },
      { name:'Medien und Meinung', vocab:['Nachricht','Meinung','Quelle'], grammar:'Indirekte Fragen' }
    ],
    B2: [
      { name:'Diskussion und Argumentation', vocab:['Standpunkt','Folge','Lösung'], grammar:'Konjunktiv II und Satzverbindungen' },
      { name:'Gesellschaft und Kultur', vocab:['Wandel','Vielfalt','Teilnahme'], grammar:'Partizipialattribute' }
    ],
    C1: [
      { name:'Sprache und Wirkung', vocab:['Nuance','Stilmittel','Register'], grammar:'Nominalstil, Kohäsion und komplexe Satzgefüge' },
      { name:'Wissenschaft und Diskurs', vocab:['These','Befund','Einwand'], grammar:'Indirekte Rede und differenzierte Modalität' }
    ],
    C2: [
      { name:'Rhetorik und Präzision', vocab:['Implikation','Prämisse','Ambiguität'], grammar:'Stilistische Verdichtung und Informationsstruktur' },
      { name:'Literatur und Interpretation', vocab:['Erzählperspektive','Motiv','Deutung'], grammar:'Komplexe Attribute und elliptische Strukturen' }
    ]
  };

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

  const translations = {Kaffee:'кофе',Sprache:'язык',sprechen:'говорить',Tisch:'стол',Haus:'дом',Wohnung:'квартира',Bahnhof:'вокзал',Schule:'школа',gehen:'идти',kommen:'приходить',lernen:'учить',wohnen:'жить',Termin:'встреча / запись',Arbeit:'работа',Beruf:'профессия'};
  function translationFor(wordValue) { const clean=String(wordValue||'').replace(/^(der|die|das)\s+/i,'').trim(); return translations[clean] || translations[clean.toLowerCase()] || 'Übersetzung noch nicht hinterlegt'; }
  window.translateWord = function () { const input=document.getElementById('dictionarySearch'); const box=document.getElementById('translationResult'); if (!input||!box) return; const value=input.value.trim(); box.innerHTML=value ? '<strong>'+esc(value)+'</strong> → '+esc(translationFor(value))+' <button class="secondary" onclick="saveClickedWord(\''+esc(value).replace(/&#39;/g,"\\'")+'\')">Speichern</button>' : 'Bitte ein Wort eingeben.'; };
  window.dict = function () {
    const profile=window.prof?.()||{words:[]}; const words=profile.words||[];
    const mine=words.length ? words.map(value=>'<article class="card dictionary-card"><p class="eyebrow">DEUTSCH → РУССКИЙ</p><h3>'+esc(value)+'</h3><p class="translation">'+esc(translationFor(value))+'</p><button class="speaker" onclick="say(\''+esc(value).replace(/&#39;/g,"\\'")+'\')">🔊 Aussprache</button></article>').join('') : '<article class="card wide"><h3>Dein Wörterbuch wartet auf dich.</h3><p class="muted">Tippe Wörter in Lektionstexten an oder nutze die Suche.</p></article>';
    return '<div class="head"><div><p class="eyebrow">DEIN WORTSCHATZ</p><h2>Wörter, die bleiben</h2></div><button class="secondary" onclick="cards()">🃏 Karteikarten</button></div><div class="dictionary-search"><input id="dictionarySearch" placeholder="Deutsches Wort eingeben" onkeydown="if(event.key===\'Enter\')translateWord()"><button class="primary" onclick="translateWord()">Übersetzen</button></div><p id="translationResult" class="notice hidden-result" aria-live="polite"></p><div class="levels"><button class="'+(s.tab==='topics'?'active':'')+'" onclick="s.tab=\'topics\';view()">Thematische Wörterbücher</button><button class="'+(s.tab==='mine'?'active':'')+'" onclick="s.tab=\'mine\';view()">Mein Wörterbuch ('+words.length+')</button></div><div class="grid cards">'+(s.tab==='mine'?mine:[['der Kaffee','die Kaffees'],['die Sprache','die Sprachen'],['sprechen','sprach · hat gesprochen']].map(pair=>'<article class="card dictionary-card"><h3>'+pair[0]+'</h3><p class="translation">'+esc(translationFor(pair[0]))+'</p><p class="muted">'+pair[1]+'</p><button class="secondary" onclick="saveClickedWord(\''+pair[0]+'\')">＋ Speichern</button></article>').join(''))+'</div>';
  };
  let flashcardIndex=0;
  window.cards = function () { const words=window.prof?.()?.words||[]; if(!words.length)return window.open('<div class="dialog"><div class="dialog-top"><h2>Karteikarten</h2><button class="icon">✕</button></div><p class="notice">Speichere zuerst Wörter in deinem Wörterbuch.</p></div>'); flashcardIndex=0; showFlashcard(words); };
  function showFlashcard(words) { const value=words[flashcardIndex%words.length]; window.open('<div class="dialog"><div class="dialog-top"><h2>Karteikarte '+(flashcardIndex+1)+' / '+words.length+'</h2><button class="icon">✕</button></div><button class="flashcard" onclick="this.classList.toggle(\'flipped\')"><span class="flash-front">'+esc(value)+'<small>Antippen zum Umdrehen</small></span><span class="flash-back">'+esc(translationFor(value))+'<small>🔊 Aussprache</small></span></button><div class="flash-actions"><button class="secondary" onclick="say(\''+esc(value).replace(/&#39;/g,"\\'")+'\')">🔊</button><button class="primary" onclick="nextFlashcard()">Nächste</button></div></div>'); }
  window.nextFlashcard=function(){const words=window.prof?.()?.words||[];flashcardIndex=(flashcardIndex+1)%words.length;showFlashcard(words);};

  const defaultSpecialTopics = ['Medizin & Pflege','Kita & Erzieher','Ämter & Behörden','Logistik & Transport','Handwerk','Gastronomie & Hotel','IT & Büro','Einzelhandel','Beauty & Wellness'].map(name=>({name,subs:[{title:'Praxisstart',category:'Praxisdialoge',content:'Guten Tag, wie kann ich Ihnen helfen?',audio_url:'',video_url:''}]}));
  window.career = function () {
    db.specialTopics=Array.isArray(db.specialTopics)?db.specialTopics:[]; const custom=db.specialTopics; const all=[...defaultSpecialTopics,...custom];
    const add=adminOK()?'<button class="primary special-add" onclick="openSpecialAdmin()">＋ Haupt- oder Unterthema</button>':'';
    return '<div class="hero"><p class="eyebrow">BERUFSDEUTSCH</p><h1>Kompetent sprechen. Sicher auftreten.</h1><p>Wortschatz, Praxisdialoge, Lesen und Hören für deinen Beruf.</p></div><div class="head"><div><p class="eyebrow">BERUF & SPEZIAL</p><h2>Fachbereiche</h2></div>'+add+'</div>'+(db.settings.money?gate():'')+'<div class="grid cards">'+all.map((topic,index)=>'<article class="card special-card"><h3>💼 '+esc(topic.name)+'</h3><p class="muted">'+topic.subs.length+' Unterthemen</p><div class="topic-meta">'+[...new Set(topic.subs.map(sub=>sub.category))].map(cat=>'<span>'+esc(cat)+'</span>').join('')+'</div><button class="primary" onclick="openSpecialTopic('+(index-defaultSpecialTopics.length)+',\''+esc(topic.name).replace(/&#39;/g,"\\'")+'\')">Module öffnen</button></article>').join('')+'</div>';
  };
  window.openSpecialAdmin=function(){if(!adminOK())return;const names=[...defaultSpecialTopics,...(db.specialTopics||[])].map(item=>item.name);window.open('<div class="dialog"><div class="dialog-top"><div><p class="eyebrow">ADMIN · BERUF & SPEZIAL</p><h2>Inhalt hinzufügen</h2></div><button class="icon">✕</button></div><form class="form" onsubmit="event.preventDefault();saveSpecialTopic()"><label>Hauptthema<input id="specialMain" list="specialMainList" required placeholder="z. B. Medizin & Pflege"><datalist id="specialMainList">'+names.map(name=>'<option value="'+esc(name)+'">').join('')+'</datalist></label><label>Unterthema<input id="specialSub" required placeholder="z. B. Aufnahmegespräch"></label><label>Bereich<select id="specialCategory"><option>Wortschatz</option><option>Praxisdialoge</option><option>Lesen</option><option>Hören</option></select></label><label>Inhalt<textarea id="specialContent" required></textarea></label><label>audio_url (MP3)<input id="specialAudio" type="url"></label><label>video_url (MP4, YouTube, Vimeo)<input id="specialVideo" type="url"></label><button class="primary">＋ Speichern</button></form></div>');};
  window.saveSpecialTopic=function(){if(!adminOK())return;db.specialTopics=Array.isArray(db.specialTopics)?db.specialTopics:[];const main=document.getElementById('specialMain').value.trim();let topic=db.specialTopics.find(item=>item.name.toLowerCase()===main.toLowerCase());if(!topic){topic={name:main,subs:[]};db.specialTopics.push(topic)}topic.subs.push({title:document.getElementById('specialSub').value.trim(),category:document.getElementById('specialCategory').value,content:document.getElementById('specialContent').value.trim(),audio_url:document.getElementById('specialAudio').value.trim(),video_url:document.getElementById('specialVideo').value.trim()});save();window.close();view();};
  window.openSpecialTopic=function(customIndex,name){if(db.settings.money)return premium();const topic=customIndex>=0?(db.specialTopics||[])[customIndex]:defaultSpecialTopics.find(item=>item.name===name);if(!topic)return;db.analytics.views[name]=(db.analytics.views[name]||0)+1;save();const modules=topic.subs.map((sub,index)=>'<article class="special-module"><div><p class="eyebrow">'+esc(sub.category)+'</p><h3>'+esc(sub.title)+'</h3><p class="clickable-copy">'+wordify(sub.content)+'</p>'+mediaHtml(sub)+(adminOK()&&customIndex>=0?'<button class="danger-button" onclick="deleteSpecialModule('+customIndex+','+index+')">🗑️ Löschen</button>':'')+'</div></article>').join('');window.open('<div class="dialog"><div class="dialog-top"><h2>'+esc(topic.name)+'</h2><button class="icon">✕</button></div><div class="special-modules">'+modules+'</div></div>');};

  window.premium = function () {
    if (db.analytics) { db.analytics.premium = (db.analytics.premium || 0) + 1; save(); }
    const methods = [
      ['💳', 'Kreditkarte', 'Sicherer Stripe Checkout'],
      ['🅿️', 'PayPal', 'Direkt mit PayPal bezahlen'],
      ['', 'Apple Pay / Google Pay', 'Schneller Wallet-Checkout'],
      ['K', 'Klarna', 'Flexibel bezahlen'],
      ['€', 'SEPA-Lastschrift', 'Direkt vom Bankkonto']
    ];
    const buttons = methods.map(method =>
      '<button class="checkout-method" onclick="demoPay(\'' + method[1] + '\',this)">' +
        '<span class="payment-icon">' + method[0] + '</span><span>' + method[1] +
        '<span class="payment-copy">' + method[2] + '</span></span><span class="payment-badge">Sicher</span></button>'
    ).join('');
    window.open('<div class="dialog"><div class="dialog-top"><div><p class="eyebrow">DEUTSCHRAUM PREMIUM · TESTMODUS</p><h2>Demo-Zahlung</h2></div><button class="icon">✕</button></div><p>Wähle eine Zahlungsart. Es wird <strong>kein echtes Geld</strong> übertragen.</p><div class="checkout-methods">' + buttons + '</div><p id="demoPaymentResult" class="notice">Sicherer Testmodus – keine echten Zahlungsdaten erforderlich.</p></div>');
  };

  window.selectPayment = function (method) {
    const message = '„' + method + '“ ist ausgewählt. Der sichere Checkout wird nach Server-Konfiguration gestartet.';
    const dialog = document.querySelector('#modal .dialog');
    if (dialog) dialog.insertAdjacentHTML('beforeend', '<p class="notice">' + esc(message) + '</p>');
  };
  window.demoPay=function(method,button){document.querySelectorAll('.checkout-method').forEach(item=>item.disabled=true);button.classList.add('payment-success');const result=document.getElementById('demoPaymentResult');result.className='notice payment-success-message';result.innerHTML='✓ <strong>Test-Zahlung erfolgreich</strong><br>'+esc(method)+' wurde ausschließlich simuliert. Es fand keine Geldtransaktion statt.';};

  /* Kumulative Erweiterung: Wortanalyse, Muttersprache, Lehrer-Dashboard und Niveau-Blöcke */
  const languageOptions=['Ukrainisch / Українська','Russisch / Русский','Englisch / English','Türkisch / Türkçe','Arabisch / العربية','Polnisch / Polski','Rumänisch / Română','Spanisch / Español','Französisch / Français','Italienisch / Italiano','Portugiesisch / Português','Persisch / فارسی','Kurdisch / Kurdî','Paschtu / پښتو','Dari / دری','Tigrinya / ትግርኛ','Bulgarisch / Български','Ungarisch / Magyar','Griechisch / Ελληνικά','Albanisch / Shqip','Serbokroatisch / Bosanski / Hrvatski / Srpski','Tschechisch / Čeština','Slowakisch / Slovenčina','Chinesisch / 中文','Vietnamesisch / Tiếng Việt','Hindi / हिन्दी','Urdu / اردو','Bengalisch / বাংলা','Japanisch / 日本語','Koreanisch / 한국어'];
  const grammarLexicon={
    können:{kind:'Verb',base:'können',forms:'können | kann, konnte, hat gekonnt',aliases:['kann','kannst','könnt','konnte','konnten','gekonnt']},
    sein:{kind:'Verb',base:'sein',forms:'sein | ist, war, ist gewesen',aliases:['bin','bist','ist','sind','seid','war','waren','gewesen']},
    haben:{kind:'Verb',base:'haben',forms:'haben | hat, hatte, hat gehabt',aliases:['habe','hast','hat','haben','hatte','gehabt']},
    gehen:{kind:'Verb',base:'gehen',forms:'gehen | geht, ging, ist gegangen',aliases:['gehe','gehst','geht','ging','gingen','gegangen']},
    kommen:{kind:'Verb',base:'kommen',forms:'kommen | kommt, kam, ist gekommen',aliases:['komme','kommst','kommt','kam','kamen','gekommen']},
    sprechen:{kind:'Verb',base:'sprechen',forms:'sprechen | spricht, sprach, hat gesprochen',aliases:['spreche','sprichst','spricht','sprach','gesprochen']},
    lernen:{kind:'Verb',base:'lernen',forms:'lernen | lernt, lernte, hat gelernt',aliases:['lerne','lernst','lernt','lernte','gelernt']},
    Tisch:{kind:'Nomen',base:'Tisch',forms:'der Tisch, die Tische',aliases:['Tisch','Tische','Tischen']},
    Haus:{kind:'Nomen',base:'Haus',forms:'das Haus, die Häuser',aliases:['Haus','Hauses','Häuser','Häusern']},
    Schule:{kind:'Nomen',base:'Schule',forms:'die Schule, die Schulen',aliases:['Schule','Schulen']},
    machen:{kind:'Verb',base:'machen',forms:'machen | macht, machte, hat gemacht',aliases:['mache','machst','macht','machte','gemacht']},
    gut:{kind:'Adjektiv',base:'gut',forms:'gut | besser, am besten',aliases:['gut','gute','guter','gutes','guten','besser','beste','besten']},
    groß:{kind:'Adjektiv',base:'groß',forms:'groß | größer, am größten',aliases:['groß','große','großer','großes','großen','größer','größte','größten']},
    schnell:{kind:'Adjektiv',base:'schnell',forms:'schnell | schneller, am schnellsten',aliases:['schnell','schnelle','schneller','schnelles','schnellen','schnellste','schnellsten']}
  };
  function analyzeGrammarWord(raw){const clean=String(raw||'').replace(/[^A-Za-zÄÖÜäöüß-]/g,'');for(const entry of Object.values(grammarLexicon)){if(entry.base.toLowerCase()===clean.toLowerCase()||entry.aliases.some(alias=>alias.toLowerCase()===clean.toLowerCase()))return {...entry,clicked:clean}}const noun=/^[A-ZÄÖÜ]/.test(clean);if(noun)return{kind:'Nomen',base:clean,clicked:clean,forms:'Artikel und Plural werden beim nächsten Wörterbuchabgleich ergänzt.'};if(/(en|ern|eln)$/.test(clean))return{kind:'Verb',base:clean,clicked:clean,forms:clean+' | Präsens, Präteritum und Perfekt werden ergänzt.'};return{kind:'Wort / Adjektiv',base:clean.toLowerCase(),clicked:clean,forms:'Grundform: '+clean.toLowerCase()};}
  const multilingual={
    Ukrainisch:{können:'могти',gehen:'йти',kommen:'приходити',sprechen:'говорити',lernen:'вчити',Tisch:'стіл',Haus:'будинок',Schule:'школа',gut:'добрий',groß:'великий'},
    Russisch:{können:'мочь',gehen:'идти',kommen:'приходить',sprechen:'говорить',lernen:'учить',Tisch:'стол',Haus:'дом',Schule:'школа',gut:'хороший',groß:'большой'},
    Englisch:{können:'can / to be able to',gehen:'to go',kommen:'to come',sprechen:'to speak',lernen:'to learn',Tisch:'table',Haus:'house',Schule:'school',gut:'good',groß:'big'},
    Türkisch:{können:'-ebilmek',gehen:'gitmek',kommen:'gelmek',sprechen:'konuşmak',lernen:'öğrenmek',Tisch:'masa',Haus:'ev',Schule:'okul'},
    Arabisch:{können:'يستطيع',gehen:'يذهب',kommen:'يأتي',sprechen:'يتكلم',lernen:'يتعلم',Tisch:'طاولة',Haus:'بيت',Schule:'مدرسة'},
    Polnisch:{können:'móc',gehen:'iść',kommen:'przychodzić',sprechen:'mówić',lernen:'uczyć się',Tisch:'stół',Haus:'dom',Schule:'szkoła'}
  };
  function nativeLanguage(){return window.prof?.()?.nativeLanguage||'Russisch'}
  function dynamicTranslation(wordValue){const analysis=analyzeGrammarWord(wordValue);const table=multilingual[nativeLanguage()]||multilingual.Englisch;return table[analysis.base]||'Übersetzung selbst ergänzen';}
  window.openWordMenu=function(rawWord){const info=analyzeGrammarWord(rawWord);window.open('<div class="dialog word-modal"><div class="dialog-top"><div><p class="eyebrow">PERSÖNLICHER WORTSCHATZ</p><h2>'+esc(info.clicked)+'</h2></div><button class="icon">✕</button></div>'+(info.clicked.toLowerCase()!==info.base.toLowerCase()?'<p class="base-detected">Erkannte Grundform: <strong>'+esc(info.base)+'</strong></p>':'')+'<p class="word-type">'+esc(info.kind)+'</p><div class="grammar-forms"><strong>Grammatische Formen</strong><p>'+esc(info.forms)+'</p></div><p class="translation"><strong>Deutsch → '+esc(nativeLanguage())+':</strong> '+esc(dynamicTranslation(info.base))+'</p><div class="word-actions"><button class="secondary" onclick="say(\''+esc(info.base).replace(/&#39;/g,"\\'")+'\')">🔊 Aussprache</button><button class="primary" onclick="saveAnalyzedWord(\''+esc(info.base).replace(/&#39;/g,"\\'")+'\')">＋ Im Vokabelheft speichern</button></div><p id="wordSaveMessage" class="task-feedback"></p></div>');};
  window.saveAnalyzedWord=function(base){if(!window.prof?.())return login('login');const words=window.prof().words;if(!words.includes(base))words.push(base);save();const message=document.getElementById('wordSaveMessage');if(message)message.textContent='✓ Grundform und Grammatikformen gespeichert';};

  window.login=function(mode){const languages=languageOptions.map(lang=>'<option>'+lang+'</option>').join('');window.open('<div class="dialog"><div class="dialog-top"><h2>'+(mode==='login'?'Anmelden':'Registrieren')+'</h2><button class="icon">✕</button></div><form class="form" style="margin-top:15px" onsubmit="event.preventDefault();finishAccount(\''+mode+'\')"><label>E-Mail<input id="email" required type="email"></label><label>Passwort<input required type="password" minlength="4"></label>'+(mode==='register'?'<label>Muttersprache<select id="nativeLanguage" required><option value="">Bitte auswählen</option>'+languages+'</select></label>':'')+'<button class="primary">'+(mode==='login'?'Anmelden':'Konto erstellen')+'</button></form></div>');};
  window.finishAccount=function(mode){const address=document.getElementById('email').value.trim().toLowerCase();user={email:address};if(!db.users[address])db.users[address]={done:[],right:0,answers:0,words:[],last:{page:'levels',level:'A1'},nativeLanguage:'Russisch',lastActive:Date.now()};const profile=db.users[address];if(mode==='register')profile.nativeLanguage=document.getElementById('nativeLanguage').value;profile.lastActive=Date.now();s=profile.last||{page:'levels',level:'A1'};save();window.close();view();};
  window.profile=function(){const profile=window.prof();if(!profile)return;profile.nativeLanguage=profile.nativeLanguage||'Russisch';window.open('<div class="dialog"><div class="dialog-top"><div><p class="eyebrow">SCHÜLERPROFIL</p><h2>Mein Profil</h2></div><button class="icon">✕</button></div><p>'+esc(user.email)+'</p><p class="muted">'+profile.done.length+' Lektionen · '+profile.words.length+' Wörter · '+profile.answers+' Aufgaben</p><form class="form" onsubmit="event.preventDefault();saveProfileLanguage()"><label>Muttersprache<select id="profileNativeLanguage">'+languageOptions.map(lang=>'<option '+(lang===profile.nativeLanguage||lang.startsWith(profile.nativeLanguage+' /')?'selected':'')+'>'+lang+'</option>').join('')+'</select></label><button class="primary">Einstellungen speichern</button><p id="profileMessage" class="task-feedback"></p></form></div>');};
  window.saveProfileLanguage=function(){const profile=window.prof();profile.nativeLanguage=document.getElementById('profileNativeLanguage').value;save();document.getElementById('profileMessage').textContent='✓ Muttersprache gespeichert';};

  window.levels=function(){const level=normalize(s.level);s.levelBlock=s.levelBlock||'grammar';const profile=window.prof?.()||{done:[]};db.deletedTopics=Array.isArray(db.deletedTopics)?db.deletedTopics:[];const items=(db.content||[]).filter(item=>normalize(item.level||item.section)===level);const tabs='<div class="level-block-tabs"><button class="'+(s.levelBlock==='grammar'?'active':'')+'" onclick="s.levelBlock=\'grammar\';view()">Grammatik & Übungen</button><button class="'+(s.levelBlock==='skills'?'active':'')+'" onclick="s.levelBlock=\'skills\';view()">'+(level==='A1'?'Praxis & Fertigkeiten':'Prüfungstrainer')+'</button></div>';let block='';if(s.levelBlock==='grammar'){const map=new Map();(standardTopics[level]||[]).filter(topic=>!db.deletedTopics.includes(level+'::'+topic.name.toLowerCase())).forEach(topic=>map.set(topic.name.toLowerCase(),{...topic,tasks:[]}));items.filter(item=>item.block!=='skills').forEach(item=>{const name=item.topic||'Neues Thema',key=name.toLowerCase();if(!map.has(key))map.set(key,{name,vocab:[],grammar:'Integrierte Grammatikerklärung',tasks:[]});map.get(key).tasks.push(item)});block='<div class="grid cards">'+[...map.values()].map(topic=>{const solved=topic.tasks.filter(item=>profile.done.includes('task-'+Number(item.date))).length,percent=topic.tasks.length?Math.round(solved/topic.tasks.length*100):0;return '<article class="card topic-card" data-topic="'+esc(topic.name)+'" data-level="'+esc(level)+'"><p class="eyebrow">GRAMMATIKTHEMA · '+esc(level)+'</p><h3>'+esc(topic.name)+'</h3><div class="topic-stats"><strong>Übungen: '+topic.tasks.length+'</strong><span>Fortschritt: '+percent+'%</span><div class="progress"><i style="width:'+percent+'%"></i></div></div><div class="card-actions"><button class="primary" onclick="openTopicCard(this)">Thema öffnen</button>'+(adminOK()?'<button class="danger-button" onclick="deleteTopic(this)">Löschen</button>':'')+'</div></article>'}).join('')+'</div>'}else{db.deletedSkills=Array.isArray(db.deletedSkills)?db.deletedSkills:[];const skills=[['📖','Lesen'],['🎧','Hören'],['✍️','Schreiben'],['🗣️','Sprechen']].filter(skill=>!db.deletedSkills.includes(level+'::'+skill[1]));block='<div class="grid cards skill-grid">'+skills.map(skill=>{const skillTasks=items.filter(item=>item.block==='skills'&&item.skill===skill[1]),done=profile.done.includes('skill-'+level+'-'+skill[1])||(skillTasks.length&&skillTasks.every(item=>profile.done.includes('task-'+Number(item.date))));return '<article class="card skill-card"><span class="skill-icon">'+skill[0]+'</span><p class="eyebrow">AUFGABEN WIE IN DER PRÜFUNG</p><h3>'+skill[1]+'</h3><p class="muted">'+(skill[1]==='Lesen'?'Lesetext, Signalwörter und Verständnisfragen.':skill[1]==='Hören'?'Hörverstehen mit Audio und Transkription.':skill[1]==='Schreiben'?'E-Mail oder Brief mit strukturiertem Feedback.':'Aufnehmen und mit einer Musterlösung vergleichen.')+'</p><div class="topic-stats"><strong>Übungen: '+skillTasks.length+'</strong><span>Fortschritt: '+(done?100:0)+'%</span></div><div class="card-actions"><button class="primary" onclick="openSkillModule(\''+level+'\',\''+skill[1]+'\')">Modul öffnen</button>'+(adminOK()?'<button class="danger-button" onclick="deleteSkillCard(\''+level+'\',\''+skill[1]+'\')">🗑️ Löschen</button>':'')+'</div></article>'}).join('')+'</div>'}return '<div class="hero"><p class="eyebrow">THEMENBASIERTER LERNWEG</p><h1>Deutsch lernen – Thema für Thema.</h1><p>Grammatik, Fertigkeiten und prüfungsnahe Aufgaben in einem Lernweg.</p></div><div class="head"><div><p class="eyebrow">SPRACHNIVEAUS</p><h2>Niveau '+esc(level)+'</h2></div><small>'+profile.done.length+' Aufgaben abgeschlossen</small></div><div class="levels">'+['A1','A2','B1','B2','C1','C2'].map(item=>'<button class="'+(level===item?'active':'')+'" onclick="s.level=\''+item+'\';view()">'+item+'</button>').join('')+'</div>'+tabs+block;};
  window.openSkillModule=function(level,type){let body='';if(type==='Lesen')body=exampleBox(type)+'<div class="reading-task"><p>Viele Menschen lernen Deutsch, <mark>weil</mark> sie in Deutschland arbeiten. <mark>Deshalb</mark> üben sie regelmäßig.</p><button class="option-card" onclick="completeSkill(\''+level+'\',\''+type+'\',this)">Warum lernen viele Menschen Deutsch?</button></div>';else if(type==='Hören')body=exampleBox(type)+'<div class="listening-task"><button class="secondary" onclick="say(\'Der Zug nach Berlin fährt heute von Gleis drei.\')">🔊 Hörtext abspielen</button><button class="transcript-toggle" onclick="this.nextElementSibling.classList.toggle(\'hidden\')">Transkription einblenden</button><p class="notice hidden">Der Zug nach Berlin fährt heute von Gleis drei.</p><button class="primary" onclick="completeSkill(\''+level+'\',\''+type+'\',this)">Als bearbeitet markieren</button></div>';else if(type==='Schreiben')body=renderWritingTask({date:0,content:'Schreibe eine kurze E-Mail und gehe auf alle Inhaltspunkte ein.',data:{writingContext:'E-Mail an eine Sprachschule',writingPoints:'Grund der Nachricht\nBitte um Informationen\nFreundlicher Abschluss',writingModel:'Sehr geehrte Damen und Herren, ich interessiere mich für Ihren Deutschkurs. Bitte senden Sie mir Informationen zu Terminen und Preisen. Mit freundlichen Grüßen'}});else body=renderSpeakingTask('Guten Tag, ich möchte mich kurz vorstellen.','');window.open('<div class="dialog" data-skill-level="'+level+'" data-skill-type="'+type+'"><div class="dialog-top"><div><p class="eyebrow">'+level+' · '+type.toUpperCase()+'</p><h2>Aufgaben wie in der Prüfung</h2></div><button class="icon">✕</button></div>'+body+'</div>');};
  window.completeSkill=function(level,type,button){if(!window.prof?.())return login('login');const key='skill-'+level+'-'+type;if(!window.prof().done.includes(key))window.prof().done.push(key);save();button.textContent='✓ Erledigt';button.disabled=true;};

  window.dict=function(){const profile=window.prof?.()||{words:[],nativeLanguage:'Russisch'};profile.nativeLanguage=profile.nativeLanguage||'Russisch';db.teacherVocab=Array.isArray(db.teacherVocab)?db.teacherVocab:[];const personal=(profile.words||[]).map(wordValue=>{const info=analyzeGrammarWord(wordValue);return '<article class="card dictionary-card"><p class="eyebrow">DEUTSCH → '+esc(profile.nativeLanguage).toUpperCase()+'</p><h3>'+esc(info.base)+'</h3><p class="word-type">'+esc(info.kind)+'</p><p class="muted">'+esc(info.forms)+'</p><p class="translation">'+esc(dynamicTranslation(info.base))+'</p><button class="speaker" onclick="say(\''+esc(info.base).replace(/&#39;/g,"\\'")+'\')">🔊 Aussprache</button></article>'}).join('');const official=db.teacherVocab.map((entry,index)=>'<article class="card dictionary-card"><p class="eyebrow">LEHRER-WORTSCHATZ · '+esc(entry.level)+'</p><h3>'+esc(entry.word)+'</h3><label class="student-translation">Deine Übersetzung<input placeholder="Selbst eintragen" value="'+esc(profile.teacherTranslations?.[entry.id]||'')+'" onchange="saveTeacherTranslation(\''+entry.id+'\',this.value)"></label><button class="speaker" onclick="say(\''+esc(entry.word).replace(/&#39;/g,"\\'")+'\')">🔊</button>'+(adminOK()?'<button class="danger-button" onclick="deleteTeacherWord('+index+')">Löschen</button>':'')+'</article>').join('');return '<div class="head"><div><p class="eyebrow">WORTSCHATZ</p><h2>Wörter verstehen und behalten</h2></div><button class="secondary" onclick="cards()">🃏 Karteikarten</button></div><div class="dictionary-search"><input id="dictionarySearch" placeholder="Deutsches Wort eingeben" onkeydown="if(event.key===\'Enter\')translateWordDynamic()"><button class="primary" onclick="translateWordDynamic()">Analysieren</button></div><p id="translationResult" class="notice hidden-result" aria-live="polite"></p><div class="levels"><button class="'+(s.tab==='topics'?'active':'')+'" onclick="s.tab=\'topics\';view()">Offizieller Lehrer-Wortschatz</button><button class="'+(s.tab==='mine'?'active':'')+'" onclick="s.tab=\'mine\';view()">Mein Wörterbuch ('+(profile.words||[]).length+')</button></div><div class="grid cards">'+(s.tab==='mine'?(personal||'<article class="card wide"><h3>Dein Wörterbuch wartet auf dich.</h3></article>'):(official||'<article class="card wide"><h3>Noch kein Lehrer-Wortschatz</h3><p class="muted">Der Lehrer kann im Dashboard deutsche Wörter hinzufügen.</p></article>'))+'</div>';};
  window.translateWordDynamic=function(){const input=document.getElementById('dictionarySearch'),box=document.getElementById('translationResult');if(!input||!box)return;const info=analyzeGrammarWord(input.value);box.innerHTML='<strong>'+esc(info.clicked)+'</strong>'+(info.clicked.toLowerCase()!==info.base.toLowerCase()?' → Grundform <strong>'+esc(info.base)+'</strong>':'')+'<br>'+esc(info.forms)+'<br>Deutsch → '+esc(nativeLanguage())+': <strong>'+esc(dynamicTranslation(info.base))+'</strong> <button class="secondary" onclick="saveAnalyzedWord(\''+esc(info.base).replace(/&#39;/g,"\\'")+'\')">Speichern</button>';};
  window.saveTeacherTranslation=function(id,value){if(!window.prof?.())return login('login');const profile=window.prof();profile.teacherTranslations=profile.teacherTranslations||{};profile.teacherTranslations[id]=value;save();};
  window.deleteTeacherWord=function(index){if(!adminOK())return;db.teacherVocab.splice(index,1);save();view();};
  window.cards=function(){const words=window.prof?.()?.words||[];if(!words.length)return window.open('<div class="dialog"><div class="dialog-top"><h2>Karteikarten</h2><button class="icon">✕</button></div><p class="notice">Speichere zuerst Wörter.</p></div>');flashcardIndex=0;showDynamicFlashcard(words);};
  function showDynamicFlashcard(words){const info=analyzeGrammarWord(words[flashcardIndex%words.length]);window.open('<div class="dialog"><div class="dialog-top"><h2>Karteikarte '+(flashcardIndex+1)+' / '+words.length+'</h2><button class="icon">✕</button></div><button class="flashcard" onclick="this.classList.toggle(\'flipped\')"><span class="flash-front">'+esc(info.base)+'<small>'+esc(info.kind)+' · Antippen zum Umdrehen</small></span><span class="flash-back">'+esc(dynamicTranslation(info.base))+'<small>'+esc(info.forms)+'</small></span></button><div class="flash-actions"><button class="secondary" onclick="say(\''+esc(info.base).replace(/&#39;/g,"\\'")+'\')">🔊</button><button class="primary" onclick="nextDynamicFlashcard()">Nächste</button></div></div>');}
  window.nextDynamicFlashcard=function(){const words=window.prof?.()?.words||[];flashcardIndex=(flashcardIndex+1)%words.length;showDynamicFlashcard(words);};

  window.admin=function(){if(!adminOK())return;db.adminPayment=db.adminPayment||{};window.open('<div class="dialog admin-dashboard"><div class="dialog-top"><div><p class="eyebrow">LEHRER-DASHBOARD</p><h2>Verwaltung & Einstellungen</h2></div><button class="icon">✕</button></div><div class="admin-tabs"><button class="active" onclick="switchAdminTab(\'tasks\',this)">Aufgaben-Verwaltung</button><button onclick="switchAdminTab(\'analytics\',this)">Schüler-Statistik</button><button onclick="switchAdminTab(\'payments\',this)">Zahlungen & Rechnungsdaten</button></div><section id="adminTabContent"></section></div>');renderAdminTab('tasks');};
  window.switchAdminTab=function(tab,button){document.querySelectorAll('.admin-tabs button').forEach(item=>item.classList.remove('active'));button.classList.add('active');renderAdminTab(tab);};
  function renderAdminTab(tab){const host=document.getElementById('adminTabContent');if(!host)return;if(tab==='tasks'){host.innerHTML='<div class="admin-panel-grid"><form class="card form" onsubmit="event.preventDefault();publish()"><h3>Aufgabe oder Lektion erstellen</h3><label>Niveau / Kurs<select id="sect"><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option><option>Beruf & Spezial</option></select></label><label>Themenmodul<input id="topic" required></label><label>Aufgabentyp<select id="type"><option>Multiple Choice</option><option>Lückentext</option><option>Fehlerkorrektur</option><option>Satzbau</option><option>Lesen</option><option>Hörverstehen</option><option>Schreiben</option><option>Sprechen</option><option>Grammatik-Regel</option></select></label><label>Inhalt<textarea id="task" required></textarea></label><label>audio_url<input id="audio" type="url"></label><label>video_url<input id="video" type="url"></label><label>image_url<input id="img" type="url"></label><button class="primary">Veröffentlichen</button><p id="msg" class="notice hidden"></p></form><form class="card form" onsubmit="event.preventDefault();addTeacherWord()"><h3>Offizieller Lehrer-Wortschatz</h3><p class="muted">Nur das deutsche Wort eingeben. Schüler ergänzen ihre Übersetzung selbst.</p><label>Niveau<select id="teacherWordLevel"><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option></select></label><label>Deutsches Wort<input id="teacherWord" required></label><button class="primary">＋ Wort hinzufügen</button></form></div>';configureAdmin(document.getElementById('modal'));appendAdminTaskManager(host);return}if(tab==='analytics'){const students=Object.entries(db.users||{}).filter(([email])=>email.toLowerCase()!==ADMIN.toLowerCase()).map(([,value])=>value);const levels=['A1','A2','B1','B2','C1','C2'],distribution=levels.map(level=>[level,students.filter(item=>(item.last?.level||'A1')===level).length]),languages={};students.forEach(item=>{const lang=item.nativeLanguage||'Nicht angegeben';languages[lang]=(languages[lang]||0)+1});const avg=students.length?(students.reduce((sum,item)=>sum+(item.done?.length||0),0)/students.length).toFixed(1):'0';host.innerHTML='<div class="grid metrics"><article class="card metric">Aktive Schüler<b>'+students.length+'</b></article><article class="card metric">Ø Übungen<b>'+avg+'</b></article><article class="card metric">Aufgaben gesamt<b>'+(db.content||[]).length+'</b></article></div><div class="analytics-grid"><article class="card"><h3>Verteilung nach Niveau</h3>'+distribution.map(row=>'<div class="analytics-row"><span>'+row[0]+'</span><div class="analytics-bar"><i style="width:'+(students.length?row[1]/students.length*100:0)+'%"></i></div><b>'+row[1]+'</b></div>').join('')+'</article><article class="card"><h3>Muttersprachen</h3>'+Object.entries(languages).map(row=>'<div class="analytics-row"><span>'+esc(row[0])+'</span><b>'+row[1]+'</b></div>').join('')+'</article></div>';return}const p=db.adminPayment||{};host.innerHTML='<form class="card form payment-settings" onsubmit="event.preventDefault();saveAdminPayment()"><h3>Händler- und Rechnungsdaten</h3><div class="form-cols"><label>Name / Firmenname<input id="payName" value="'+esc(p.name||'')+'"></label><label>Adresse<input id="payAddress" value="'+esc(p.address||'')+'"></label><label>Steuernummer / USt-ID<input id="payTax" value="'+esc(p.tax||'')+'"></label><label>IBAN<input id="payIban" value="'+esc(p.iban||'')+'"></label><label>BIC<input id="payBic" value="'+esc(p.bic||'')+'"></label><label>Bankname<input id="payBank" value="'+esc(p.bank||'')+'"></label><label>Stripe Public Key<input id="payStripePublic" value="'+esc(p.stripePublic||'')+'"></label><label>Stripe Secret Key<input id="payStripeSecret" type="password" value="'+esc(p.stripeSecret||'')+'"></label><label>PayPal API-Key<input id="payPaypal" type="password" value="'+esc(p.paypal||'')+'"></label><label>Mollie API-Key<input id="payMollie" type="password" value="'+esc(p.mollie||'')+'"></label></div><p class="notice">Diese statische Demo speichert Angaben ausschließlich lokal in diesem Browser. Für Live-Zahlungen gehören geheime Schlüssel in ein geschütztes Server-Backend.</p><button class="primary">Zahlungsdaten speichern</button><p id="paymentSaveMessage" class="task-feedback"></p></form>';}
  window.addTeacherWord=function(){if(!adminOK())return;db.teacherVocab=Array.isArray(db.teacherVocab)?db.teacherVocab:[];db.teacherVocab.push({id:'word-'+Date.now(),level:document.getElementById('teacherWordLevel').value,word:document.getElementById('teacherWord').value.trim()});save();document.getElementById('teacherWord').value='';};
  window.saveAdminPayment=function(){if(!adminOK())return;const value=id=>document.getElementById(id).value.trim();db.adminPayment={name:value('payName'),address:value('payAddress'),tax:value('payTax'),iban:value('payIban'),bic:value('payBic'),bank:value('payBank'),stripePublic:value('payStripePublic'),stripeSecret:value('payStripeSecret'),paypal:value('payPaypal'),mollie:value('payMollie')};save();document.getElementById('paymentSaveMessage').textContent='✓ Zahlungsdaten gespeichert. Das System ist bereit für den Empfang von Zahlungen.';};

  function appendAdminTaskManager(host){const entries=(db.content||[]).slice().reverse();host.querySelector('.admin-panel-grid').insertAdjacentHTML('beforeend','<article class="card admin-content-list wide"><h3>Vorhandene Inhalte bearbeiten</h3>'+(entries.length?entries.map(item=>'<div class="admin-content-row"><span><strong>'+esc(item.topic)+'</strong><small>'+esc(item.section)+' · '+esc(item.type)+'</small></span><div><button class="secondary" onclick="editAdminTask('+Number(item.date)+')">Bearbeiten</button><button class="danger-button" onclick="removeAdminTask('+Number(item.date)+')">Löschen</button></div></div>').join(''):'<p class="muted">Noch keine veröffentlichten Aufgaben.</p>')+'</article>');}
  window.editAdminTask=function(date){if(!adminOK())return;const item=(db.content||[]).find(entry=>Number(entry.date)===Number(date));if(!item)return;window.open('<div class="dialog"><div class="dialog-top"><div><p class="eyebrow">AUFGABE BEARBEITEN</p><h2>'+esc(item.topic)+'</h2></div><button class="icon">✕</button></div><form class="form" onsubmit="event.preventDefault();saveEditedTask('+Number(date)+')"><label>Niveau / Kurs<input id="editSection" value="'+esc(item.section)+'"></label><label>Thema<input id="editTopic" value="'+esc(item.topic)+'" required></label><label>Typ<input id="editType" value="'+esc(item.type)+'" required></label><label>Inhalt<textarea id="editContent" required>'+esc(item.content||item.data?.content||'')+'</textarea></label><label>audio_url<input id="editAudio" value="'+esc(item.audio_url||'')+'"></label><label>video_url<input id="editVideo" value="'+esc(item.video_url||'')+'"></label><button class="primary">Änderungen speichern</button></form></div>');};
  window.saveEditedTask=function(date){if(!adminOK())return;const item=(db.content||[]).find(entry=>Number(entry.date)===Number(date));if(!item)return;item.section=document.getElementById('editSection').value.trim();item.level=item.section;item.topic=document.getElementById('editTopic').value.trim();item.type=document.getElementById('editType').value.trim();item.content=document.getElementById('editContent').value.trim();item.audio_url=document.getElementById('editAudio').value.trim();item.video_url=document.getElementById('editVideo').value.trim();save();window.close();admin();};
  window.removeAdminTask=function(date){if(!adminOK()||!confirm('Diese Aufgabe löschen?'))return;db.content=(db.content||[]).filter(item=>Number(item.date)!==Number(date));save();renderAdminTab('tasks');};
  window.openStructuredAdmin=function(){if(!adminOK())return;window.open('<div class="dialog admin-dashboard"><div class="dialog-top"><div><p class="eyebrow">LEHRER-DASHBOARD</p><h2>Verwaltung & Einstellungen</h2></div><button class="icon">✕</button></div><div class="admin-tabs"><button class="active" onclick="renderStructuredAdminTab()">Aufgaben-Verwaltung</button><button onclick="switchAdminTab(\'analytics\',this)">Schüler-Statistik</button><button onclick="switchAdminTab(\'payments\',this)">Zahlungen & Rechnungsdaten</button></div><section id="adminTabContent"></section></div>');renderStructuredAdminTab();};
  window.renderStructuredAdminTab=function(){const host=document.getElementById('adminTabContent');if(!host)return;host.innerHTML='<form class="card form structured-create" onsubmit="event.preventDefault();publishStructuredTask()"><h3>Aufgabe oder Lektion erstellen</h3><div class="step-label"><b>1</b><span>Zielbereich wählen</span></div><label>Kategorie / Bereich<select id="destCategory" onchange="updateDestinationFields()"><option value="levels">Sprachniveaus (A1–C2)</option><option value="vocab">Wortschatz</option><option value="special">Beruf & Spezial</option></select></label><div id="destinationFields"></div><div id="taskDetails"><div class="step-label"><b>3</b><span>Aufgabentyp und Inhalt</span></div><label>Thema / Titel<input id="structuredTopic" required></label><label>Aufgabentyp<select id="structuredType" onchange="updateStructuredPreview()"><option>Multiple Choice</option><option>Lückentext</option><option>Fehlerkorrektur</option><option>Satzbau</option><option>Lesen</option><option>Hörverstehen</option><option>Schreiben</option><option>Sprechen</option><option>Grammatik-Regel</option></select></label><label>Inhalt<textarea id="structuredContent" required oninput="updateStructuredPreview()"></textarea><small id="structuredHint" class="input-hint"></small></label><label>audio_url<input id="structuredAudio" type="url" oninput="updateStructuredPreview()"></label><section class="student-preview"><p class="eyebrow">VORSCHAU FÜR SCHÜLER</p><div id="structuredPreview"></div></section><label>video_url<input id="structuredVideo" type="url"></label><button class="primary">Veröffentlichen</button></div><p id="structuredMessage" class="notice hidden"></p></form><div id="structuredContentManager"></div>';updateDestinationFields();renderStructuredManager();updateStructuredPreview();};
  window.updateDestinationFields=function(){const category=document.getElementById('destCategory')?.value,host=document.getElementById('destinationFields'),details=document.getElementById('taskDetails');if(!host)return;const step='<div class="step-label"><b>2</b><span>Ziel innerhalb des Bereichs</span></div>';if(category==='levels'){host.innerHTML=step+'<div class="form-cols"><label>Niveau<select id="destLevel"><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option></select></label><label>Ziel-Block<select id="destBlock" onchange="updateSkillField()"><option value="grammar">Grammatik & Übungen</option><option value="skills">Prüfungstrainer / Praxis</option></select></label></div><div id="skillField"></div>';details.classList.remove('vocab-mode');updateSkillField()}else if(category==='special'){const names=[...defaultSpecialTopics,...(db.specialTopics||[])].map(item=>item.name);host.innerHTML=step+'<div class="form-cols"><label>Fachbereich<select id="destSpecial">'+names.map(name=>'<option>'+esc(name)+'</option>').join('')+'<option value="__new">Neuen Fachbereich anlegen</option></select></label><label>Modul-Typ<select id="destModule"><option>Wortschatz</option><option>Praxisdialoge</option><option>Lesen</option><option>Hören</option></select></label></div>';details.classList.remove('vocab-mode')}else{host.innerHTML=step+'<label>Niveau<select id="destVocabLevel"><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option></select></label><p class="muted">Nur das deutsche Wort eingeben; Schüler ergänzen die Übersetzung selbst.</p>';details.classList.add('vocab-mode')}details.querySelectorAll('select,textarea,input').forEach(field=>field.disabled=category==='vocab');document.getElementById('structuredTopic').disabled=false;};
  window.updateSkillField=function(){const host=document.getElementById('skillField');if(host)host.innerHTML=document.getElementById('destBlock')?.value==='skills'?'<label>Fertigkeit<select id="destSkill"><option>Lesen</option><option>Hören</option><option>Schreiben</option><option>Sprechen</option></select></label>':'';};
  window.publishStructuredTask=function(){if(!adminOK())return;const category=document.getElementById('destCategory').value,title=document.getElementById('structuredTopic').value.trim(),content=document.getElementById('structuredContent').value.trim(),type=document.getElementById('structuredType').value,audio=document.getElementById('structuredAudio').value.trim(),video=document.getElementById('structuredVideo').value.trim();if(category==='vocab'){db.teacherVocab=Array.isArray(db.teacherVocab)?db.teacherVocab:[];db.teacherVocab.push({id:'word-'+Date.now(),level:document.getElementById('destVocabLevel').value,word:title});save()}else if(category==='special'){let name=document.getElementById('destSpecial').value;if(name==='__new')name=title;db.specialTopics=Array.isArray(db.specialTopics)?db.specialTopics:[];let topic=db.specialTopics.find(item=>item.name.toLowerCase()===name.toLowerCase());if(!topic){topic={name,subs:[]};db.specialTopics.push(topic)}topic.subs.push({id:Date.now(),title,category:document.getElementById('destModule').value,content,audio_url:audio,video_url:video});save()}else{const level=document.getElementById('destLevel').value,block=document.getElementById('destBlock').value;db.content=Array.isArray(db.content)?db.content:[];db.content.push({id:'task-'+Date.now(),section:level,level,block,skill:block==='skills'?document.getElementById('destSkill').value:'',topic:title,type,content,audio_url:audio,video_url:video,date:Date.now(),createdAt:Date.now(),isNew:true});save()}const message=document.getElementById('structuredMessage');message.textContent='✓ Inhalt exakt im gewählten Zielbereich gespeichert.';message.classList.remove('hidden');renderStructuredManager();};
  function renderStructuredManager(){const host=document.getElementById('structuredContentManager');if(!host)return;const tasks=(db.content||[]).slice().reverse();host.innerHTML='<article class="card admin-content-list"><h3>Erstellte Aufgaben</h3>'+(tasks.length?tasks.map(item=>'<div class="admin-content-row"><span><strong>'+esc(item.topic)+'</strong><small>'+esc(item.level||item.section)+' · '+esc(item.block||'Grammatik')+(item.skill?' · '+esc(item.skill):'')+'</small></span><div><button class="secondary" onclick="editAdminTask('+Number(item.date)+')">Bearbeiten</button><button class="danger-button" onclick="deleteCreatedTask('+Number(item.date)+')">🗑️ Löschen</button></div></div>').join(''):'<p class="muted">Noch keine Aufgaben.</p>')+'</article>';}
  window.deleteCreatedTask=function(date){if(!adminOK()||!confirm('Möchtest du dieses Element wirklich löschen?'))return;db.content=(db.content||[]).filter(item=>Number(item.date)!==Number(date));save();renderStructuredManager();};
  const retainedOpenSkillModule=window.openSkillModule;
  window.openSkillModule=function(level,type){const tasks=(db.content||[]).filter(item=>normalize(item.level||item.section)===normalize(level)&&item.block==='skills'&&item.skill===type);if(!tasks.length)return retainedOpenSkillModule(level,type);const done=window.prof?.()?.done||[];window.open('<div class="dialog"><div class="dialog-top"><div><p class="eyebrow">'+esc(level)+' · '+esc(type).toUpperCase()+'</p><h2>Prüfungstrainer</h2></div><button class="icon">✕</button></div><div class="task-list">'+tasks.map(item=>'<div class="task-list-item"><button class="secondary task-open" onclick="openPublishedTask('+Number(item.date)+')"><span>'+esc(item.type)+': '+esc(item.topic)+'</span><small>'+(done.includes('task-'+Number(item.date))?'✓ Erledigt':(item.isNew?'✨ Neu':'Öffnen'))+'</small></button>'+(adminOK()?'<button class="danger-button" onclick="deleteSkillTask('+Number(item.date)+',\''+esc(level)+'\',\''+esc(type)+'\')">🗑️ Löschen</button>':'')+'</div>').join('')+'</div></div>');};
  window.deleteSkillTask=function(date,level,type){if(!adminOK()||!confirm('Möchtest du dieses Element wirklich löschen?'))return;db.content=(db.content||[]).filter(item=>Number(item.date)!==Number(date));save();window.close();openSkillModule(level,type);};
  window.deleteSkillCard=function(level,type){if(!adminOK()||!confirm('Möchtest du dieses Element wirklich löschen?'))return;db.deletedSkills=Array.isArray(db.deletedSkills)?db.deletedSkills:[];const key=level+'::'+type;if(!db.deletedSkills.includes(key))db.deletedSkills.push(key);db.content=(db.content||[]).filter(item=>!(normalize(item.level||item.section)===normalize(level)&&item.block==='skills'&&item.skill===type));save();view();};
  const translationLanguageCodes={'Ukrainisch':'uk','Russisch':'ru','Englisch':'en','Türkisch':'tr','Arabisch':'ar','Polnisch':'pl','Rumänisch':'ro','Spanisch':'es','Französisch':'fr','Italienisch':'it','Portugiesisch':'pt','Persisch':'fa','Kurdisch':'ku','Paschtu':'ps','Dari':'fa','Tigrinya':'ti','Bulgarisch':'bg','Ungarisch':'hu','Griechisch':'el','Albanisch':'sq','Serbokroatisch':'bs','Tschechisch':'cs','Slowakisch':'sk','Chinesisch':'zh-CN','Vietnamesisch':'vi','Hindi':'hi','Urdu':'ur','Bengalisch':'bn','Japanisch':'ja','Koreanisch':'ko'};
  function baseLanguageName(value){return String(value||'Russisch').split(' / ')[0].trim()}
  function dynamicTranslation(wordValue){const info=analyzeGrammarWord(wordValue),lang=baseLanguageName(nativeLanguage()),table=multilingual[lang]||multilingual.Englisch;return db.translationCache?.[lang]?.[info.base]||table[info.base]||'Übersetzung wird geladen …'}
  const pronounWords=new Set(('ich mich mir du dich dir er ihn ihm sie ihr es wir uns ihr euch ihnen meiner deiner seiner ihrer unser euer dieser diese dieses diesen diesem jener jene jenes jenen jenem jeder jede jedes jeden jedem welcher welche welches welchen welchem wer wen wem was man jemand niemand etwas nichts derselbe dieselbe dasselbe selbst selber mein meine meinen meinem meiner meines dein deine deinen deinem deiner deines sein seine seinen seinem seiner seines unser unsere unseren unserem unserer unseres euer eure euren eurem eurer eures').split(' '));
  const articleWords=new Set(('der die das den dem des ein eine einen einem einer eines kein keine keinen keinem keiner keines').split(' '));
  const prepositionWords=new Set(('an auf aus bei durch für gegen hinter in mit nach neben ohne seit über um unter von vor zu zwischen gegenüber trotz während wegen statt').split(' '));
  const adverbParticleWords=new Set(('aber auch bald bereits besonders da dann dort eben etwas fast gern gestern heute hier immer jetzt kaum leider morgen nicht noch nur oft schon sehr so vielleicht wieder wohl ziemlich zurück zusammen').split(' '));
  function functionalWordInfo(clean){const word=clean.toLocaleLowerCase('de-DE');if(pronounWords.has(word)){let detail='Pronomen';if(word==='ihnen'||word==='sie')detail='Pronomen / Höflichkeitsform';else if(['mir','dir','ihm','ihr','uns','euch'].includes(word))detail='Personalpronomen / Dativ';return{kind:detail,base:word,clicked:clean,forms:'',validated:true,functionWord:true}}if(articleWords.has(word))return{kind:'Artikel',base:word,clicked:clean,forms:'',validated:true,functionWord:true};if(prepositionWords.has(word))return{kind:'Präposition',base:word,clicked:clean,forms:'',validated:true,functionWord:true};if(adverbParticleWords.has(word))return{kind:'Adverb / Partikel',base:word,clicked:clean,forms:'',validated:true,functionWord:true};return null}
  function analyzeGrammarWord(raw){const clean=String(raw||'').trim().replace(/[^A-Za-zÄÖÜäöüß-]/g,'');if(!clean)return{kind:'Unbekannt',base:'',clicked:'',forms:'',validated:false};const functional=functionalWordInfo(clean);if(functional)return functional;for(const entry of Object.values(grammarLexicon)){if(entry.base.toLowerCase()===clean.toLowerCase()||entry.aliases.some(alias=>alias.toLowerCase()===clean.toLowerCase()))return{...entry,clicked:clean,validated:true,functionWord:false}}return{kind:'Wortart nicht sicher erkannt',base:clean.toLocaleLowerCase('de-DE'),clicked:clean,forms:'',validated:true,functionWord:false}}
  function cachedTranslation(word){const lang=baseLanguageName(nativeLanguage());return db.translationCache?.[lang]?.[word]||null}
  async function requestTranslation(word){const lang=baseLanguageName(nativeLanguage()),code=translationLanguageCodes[lang]||'en';try{const response=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(word)+'&langpair=de|'+encodeURIComponent(code),{headers:{Accept:'application/json'}});if(!response.ok)throw new Error('translation failed');const data=await response.json(),translated=String(data?.responseData?.translatedText||'').trim();if(!translated||translated.toLowerCase()===word.toLowerCase())throw new Error('empty translation');db.translationCache=db.translationCache||{};db.translationCache[lang]=db.translationCache[lang]||{};db.translationCache[lang][word]=translated;save();return translated}catch(error){const table=multilingual[lang]||multilingual.Englisch;return table[word]||dynamicTranslation(word)}}
  async function hydrateTranslation(word,targetId){const target=document.getElementById(targetId);if(!target)return;target.classList.add('translation-loading');target.textContent=cachedTranslation(word)||dynamicTranslation(word);const translated=await requestTranslation(word);if(document.getElementById(targetId)){target.textContent=translated;target.classList.remove('translation-loading')}}
  window.openWordMenu=function(rawWord){const info=analyzeGrammarWord(rawWord);if(!info.validated)return;const id='liveTranslation-'+Date.now(),forms=info.forms?'<div class="grammar-forms strict-forms"><strong>Grammatische Pflichtformen</strong><p>'+esc(info.forms)+'</p></div>':'';window.open('<div class="dialog word-modal"><div class="dialog-top"><div><p class="eyebrow">PERSÖNLICHER WORTSCHATZ</p><h2>'+esc(info.clicked)+'</h2></div><button class="icon">✕</button></div>'+(info.clicked.toLowerCase()!==info.base.toLowerCase()?'<p class="base-detected">Erkannte Grundform: <strong>'+esc(info.base)+'</strong></p>':'')+'<p class="word-type">'+esc(info.kind)+'</p>'+forms+'<p class="translation"><strong>Deutsch → '+esc(baseLanguageName(nativeLanguage()))+':</strong> <span id="'+id+'">'+esc(cachedTranslation(info.base)||dynamicTranslation(info.base))+'</span></p><div class="word-actions"><button class="secondary" onclick="say(\''+esc(info.base).replace(/&#39;/g,"\\'")+'\')">🔊 Aussprache</button><button class="primary" onclick="saveAnalyzedWord(\''+esc(info.base).replace(/&#39;/g,"\\'")+'\')">＋ Speichern</button></div><p id="wordSaveMessage" class="task-feedback"></p></div>');hydrateTranslation(info.base,id);};
  window.translateWordDynamic=async function(){const input=document.getElementById('dictionarySearch'),box=document.getElementById('translationResult');if(!input||!box||!input.value.trim())return;const info=analyzeGrammarWord(input.value);if(!info.validated)return;const id='analysisTranslation',forms=info.forms?'<p class="strict-form-line">'+esc(info.forms)+'</p>':'';box.innerHTML='<div class="analysis-result"><p><strong>'+esc(info.clicked)+'</strong>'+(info.clicked.toLowerCase()!==info.base.toLowerCase()?' → Grundform <strong>'+esc(info.base)+'</strong>':'')+'</p><p class="word-type">'+esc(info.kind)+'</p>'+forms+'<p>Deutsch → '+esc(baseLanguageName(nativeLanguage()))+': <strong id="'+id+'">'+esc(cachedTranslation(info.base)||dynamicTranslation(info.base))+'</strong></p><button class="secondary" onclick="saveAnalyzedWord(\''+esc(info.base).replace(/&#39;/g,"\\'")+'\')">Speichern</button></div>';await hydrateTranslation(info.base,id);};
  const structuredPreviewSamples={
    'Lückentext':'Ich [[wohne]] in Berlin und [[lerne]] Deutsch.',
    'Fehlerkorrektur':'Ich [[geht|gehe]] morgen in die Schule.',
    'Multiple Choice':'Frage: Wie heißt du?',
    'Schreiben':'Schreibe eine kurze E-Mail an deine Sprachschule.',
    'Sprechen':'Guten Tag, ich möchte einen Termin vereinbaren.',
    'Satzbau':'Ich | lerne | heute | Deutsch',
    'Hörverstehen':'Was hörst du in der Aufnahme?',
    'Lesen':'Lies den Text und beantworte die Frage.',
    'Grammatik-Regel':'Das Verb steht im Hauptsatz auf Position 2.'
  };
  const structuredHints={
    'Lückentext':'Lösungen mit doppelten Klammern markieren: Ich [[wohne]] in Berlin.',
    'Fehlerkorrektur':'Fehler und Korrektur eingeben: Ich [[geht|gehe]] nach Hause.',
    'Multiple Choice':'Frage und Antwortmöglichkeiten im Inhalt beschreiben.',
    'Schreiben':'Kontext, Inhaltspunkte und gewünschte Textsorte angeben.',
    'Sprechen':'Sprechtext eingeben; optional eine MP3-Musterlösung hinterlegen.'
  };
  window.updateStructuredPreview=function(){const type=document.getElementById('structuredType')?.value,contentField=document.getElementById('structuredContent'),preview=document.getElementById('structuredPreview'),hint=document.getElementById('structuredHint');if(!type||!preview)return;const sample=structuredPreviewSamples[type]||'Beispielinhalt für die Aufgabe.';if(contentField&&!contentField.value&&document.activeElement!==contentField)contentField.placeholder=sample;if(hint)hint.textContent=structuredHints[type]||'Die Vorschau verwendet dieselbe interaktive Ansicht wie die Schüleraufgabe.';const content=contentField?.value.trim()||sample,audio=document.getElementById('structuredAudio')?.value||'';preview.innerHTML=type==='Schreiben'?renderWritingTask({date:0,content,data:{writingContext:content,writingPoints:'Inhaltspunkt 1\nInhaltspunkt 2',writingModel:'Dies ist eine mögliche Musterlösung.'}}):renderTask(type,content,audio);};
  const defaultVocabCategories=['Allgemein','Familie & Beziehungen','Beruf & Arbeit','Essen & Trinken','Gesundheit','Wohnen'];
  function ensureVocabularyState(){db.vocabCategories=Array.isArray(db.vocabCategories)&&db.vocabCategories.length?db.vocabCategories:defaultVocabCategories.slice();db.teacherVocab=Array.isArray(db.teacherVocab)?db.teacherVocab:[];Object.values(db.users||{}).forEach(profile=>{profile.words=Array.isArray(profile.words)?profile.words:[]});}
  function wordRecord(value,index=0){if(value&&typeof value==='object'){const source=value.word||value.base||'';const info=analyzeGrammarWord(source);return{id:value.id||('personal-'+index+'-'+String(source).toLowerCase()),word:source,base:value.base||info.base,kind:value.kind||info.kind,forms:value.forms!==undefined?value.forms:info.forms,translation:value.translation||dynamicTranslation(info.base),category:value.category||'Allgemein',createdAt:value.createdAt||Date.now()}}const info=analyzeGrammarWord(value);return{id:'personal-'+index+'-'+String(value).toLowerCase(),word:String(value),base:info.base,kind:info.kind,forms:info.forms,translation:dynamicTranslation(info.base),category:'Allgemein',createdAt:Date.now()}}
  function categoryOptions(selected,allowNew=true){ensureVocabularyState();return db.vocabCategories.map(category=>'<option '+(category===selected?'selected':'')+'>'+esc(category)+'</option>').join('')+(allowNew?'<option value="__new">＋ Neue Kategorie erstellen</option>':'')}
  function selectedCategory(selectId){const field=document.getElementById(selectId);let category=field?.value||'Allgemein';if(category==='__new'){category=(prompt('Name der neuen Kategorie:')||'').trim();if(!category)return'';if(!db.vocabCategories.includes(category))db.vocabCategories.push(category)}return category}
  const retainedAnalyzedWordSaver=window.saveAnalyzedWord;
  window.saveAnalyzedWord=function(base,selectId){const profile=window.prof?.();if(!profile)return login('login');ensureVocabularyState();const info=analyzeGrammarWord(base),message=document.getElementById('wordSaveMessage');if(!info.functionWord&&!info.forms){if(message)message.textContent='Dieses Wort wird erst nach lexikalischer Prüfung gespeichert – es werden keine Formen geraten.';return}if(!selectId)return openCategorySaveDialog(base);const category=selectedCategory(selectId);if(!category)return;const existing=profile.words.map(wordRecord).find(entry=>entry.base.toLowerCase()===info.base.toLowerCase());if(existing){const index=profile.words.findIndex((entry,i)=>wordRecord(entry,i).id===existing.id);profile.words[index]={...existing,kind:info.kind,forms:info.forms,category}}else profile.words.push({id:'personal-'+Date.now(),word:info.clicked||base,base:info.base,kind:info.kind,forms:info.forms,translation:cachedTranslation(info.base)||dynamicTranslation(info.base),category,createdAt:Date.now()});save();if(message)message.textContent='✓ Unter „'+category+'“ gespeichert';};
  window.saveClickedWord=function(wordValue){saveAnalyzedWord(wordValue)};
  window.openCategorySaveDialog=function(base){window.open('<div class="dialog compact-dialog"><div class="dialog-top"><h2>Vokabel speichern</h2><button class="icon">✕</button></div><label>Kategorie auswählen<select id="personalWordCategory">'+categoryOptions('Allgemein')+'</select></label><button class="primary" onclick="saveAnalyzedWord(\''+esc(base).replace(/&#39;/g,"\\'")+'\',\'personalWordCategory\');close()">Speichern</button></div>')};
  const retainedOpenWordMenuWithGrammar=window.openWordMenu;
  window.openWordMenu=function(rawWord){retainedOpenWordMenuWithGrammar(rawWord);const actions=document.querySelector('.word-modal .word-actions');if(!actions)return;const base=analyzeGrammarWord(rawWord).base,aiId='aiWordCheck-'+Date.now();actions.insertAdjacentHTML('beforebegin','<label class="word-category-select">Kategorie auswählen<select id="clickedWordCategory">'+categoryOptions('Allgemein')+'</select></label>');actions.insertAdjacentHTML('beforeend','<button class="secondary" onclick="requestAiWordAnalysis(\''+esc(base).replace(/&#39;/g,"\\'")+'\',\''+aiId+'\')">KI fragen 🤖</button>');actions.insertAdjacentHTML('afterend','<p id="'+aiId+'" class="ai-status"></p>');const saveButton=actions.querySelector('.primary');if(saveButton)saveButton.setAttribute('onclick',"saveAnalyzedWord('"+esc(base).replace(/&#39;/g,"\\'")+"','clickedWordCategory')")};
  window.filterVocabulary=function(category){s.vocabCategory=decodeURIComponent(category);view()};
  window.dict=function(){ensureVocabularyState();const profile=window.prof?.()||{words:[],nativeLanguage:'Russisch'},records=(profile.words||[]).map(wordRecord),source=s.tab==='mine'?records:db.teacherVocab.map((entry,index)=>({...entry,id:entry.id||'teacher-'+index,base:entry.word,category:entry.category||'Allgemein'}));const categories=['Alle',...new Set(source.map(entry=>entry.category||'Allgemein'))],active=categories.includes(s.vocabCategory)?s.vocabCategory:'Alle',visible=active==='Alle'?source:source.filter(entry=>(entry.category||'Allgemein')===active);const folders='<div class="vocab-folders">'+categories.map(category=>'<button class="'+(category===active?'active':'')+'" onclick="filterVocabulary(\''+encodeURIComponent(category)+'\')">📁 '+esc(category)+'</button>').join('')+'</div>';const personal=visible.map((entry,index)=>'<article class="card dictionary-card"><p class="eyebrow">'+esc(entry.category)+' · DEUTSCH → '+esc(profile.nativeLanguage||'Russisch').toUpperCase()+'</p><h3>'+esc(entry.base)+'</h3><p class="word-type">'+esc(entry.kind)+'</p>'+(entry.forms?'<p class="muted">'+esc(entry.forms)+'</p>':'')+'<p class="translation">'+esc(entry.translation)+'</p><button class="speaker" onclick="say(\''+esc(entry.base).replace(/&#39;/g,"\\'")+'\')">🔊 Aussprache</button>'+(adminOK()?'<button class="danger-button" onclick="deletePersonalWordById(\''+esc(entry.id)+'\')">🗑️ Löschen</button>':'')+'</article>').join('');const official=visible.map(entry=>'<article class="card dictionary-card"><p class="eyebrow">'+esc(entry.category||'Allgemein')+' · LEHRER-WORTSCHATZ · '+esc(entry.level||'A1')+'</p><h3>'+esc(entry.word)+'</h3><label class="student-translation">Deine Übersetzung<input placeholder="Selbst eintragen" value="'+esc(profile.teacherTranslations?.[entry.id]||'')+'" onchange="saveTeacherTranslation(\''+entry.id+'\',this.value)"></label><button class="speaker" onclick="say(\''+esc(entry.word).replace(/&#39;/g,"\\'")+'\')">🔊</button>'+(adminOK()?'<button class="danger-button" onclick="deleteTeacherWordById(\''+entry.id+'\')">🗑️ Löschen</button>':'')+'</article>').join('');return'<div class="head"><div><p class="eyebrow">WORTSCHATZ</p><h2>Wörter verstehen und behalten</h2></div><button class="secondary" onclick="cards()">🃏 Karteikarten</button></div><div class="dictionary-search"><input id="dictionarySearch" placeholder="Deutsches Wort eingeben" onkeydown="if(event.key===\'Enter\')translateWordDynamic()"><button class="primary" onclick="translateWordDynamic()">Analysieren</button></div><p id="translationResult" class="notice hidden-result" aria-live="polite"></p><div class="levels"><button class="'+(s.tab==='topics'?'active':'')+'" onclick="s.tab=\'topics\';s.vocabCategory=\'Alle\';view()">Offizieller Lehrer-Wortschatz</button><button class="'+(s.tab==='mine'?'active':'')+'" onclick="s.tab=\'mine\';s.vocabCategory=\'Alle\';view()">Mein Wörterbuch ('+records.length+')</button></div>'+folders+'<div class="grid cards">'+(s.tab==='mine'?(personal||'<article class="card wide"><h3>In dieser Kategorie sind noch keine Wörter.</h3></article>'):(official||'<article class="card wide"><h3>In dieser Kategorie ist noch kein Lehrer-Wortschatz vorhanden.</h3></article>'))+'</div>'};
  window.deletePersonalWordById=function(id){if(!adminOK()||!confirm('Möchtest du diese Vokabel wirklich löschen?'))return;const profile=window.prof();profile.words=(profile.words||[]).filter((entry,index)=>wordRecord(entry,index).id!==id);save();view()};
  window.deleteTeacherWordById=function(id){if(!adminOK()||!confirm('Möchtest du diese Vokabel wirklich löschen?'))return;db.teacherVocab=db.teacherVocab.filter(entry=>entry.id!==id);save();view()};
  window.cards=function(){const records=(window.prof?.()?.words||[]).map(wordRecord);if(!records.length)return window.open('<div class="dialog"><div class="dialog-top"><h2>Karteikarten</h2><button class="icon">✕</button></div><p class="notice">Speichere zuerst Wörter.</p></div>');flashcardIndex=0;showDynamicFlashcard(records.map(entry=>entry.base))};
  window.nextDynamicFlashcard=function(){const words=(window.prof?.()?.words||[]).map(wordRecord).map(entry=>entry.base);if(!words.length)return;flashcardIndex=(flashcardIndex+1)%words.length;showDynamicFlashcard(words)};
  const retainedStructuredDestination=window.updateDestinationFields;
  window.updateDestinationFields=function(){retainedStructuredDestination();if(document.getElementById('destCategory')?.value!=='vocab')return;document.getElementById('destinationFields').insertAdjacentHTML('beforeend','<label>Kategorie auswählen<select id="destVocabCategory">'+categoryOptions('Allgemein')+'</select></label>')};
  const retainedStructuredPublisher=window.publishStructuredTask;
  window.publishStructuredTask=function(){const vocab=document.getElementById('destCategory')?.value==='vocab',category=vocab?selectedCategory('destVocabCategory'):'';if(vocab&&!category)return;retainedStructuredPublisher();if(vocab&&db.teacherVocab.length){db.teacherVocab[db.teacherVocab.length-1].category=category;save()}};
  const retainedStructuredAdmin=window.openStructuredAdmin;
  window.openStructuredAdmin=function(){retainedStructuredAdmin();const tabs=document.querySelector('.admin-tabs');if(tabs&&!document.getElementById('vocabModerationTab'))tabs.insertAdjacentHTML('beforeend','<button id="vocabModerationTab" onclick="switchAdminTab(\'vocab-moderation\',this)">Vokabel-Moderation</button>')};
  const retainedAdminTabSwitch=window.switchAdminTab;
  window.switchAdminTab=function(tab,button){if(tab!=='vocab-moderation')return retainedAdminTabSwitch(tab,button);document.querySelectorAll('.admin-tabs button').forEach(item=>item.classList.remove('active'));button.classList.add('active');renderVocabularyModeration()};
  window.renderVocabularyModeration=function(){const host=document.getElementById('adminTabContent');if(!host)return;ensureVocabularyState();const rows=[];Object.entries(db.users||{}).filter(([email])=>email.toLowerCase()!==ADMIN.toLowerCase()).forEach(([email,profile])=>(profile.words||[]).forEach((value,index)=>rows.push({email,index,entry:wordRecord(value,index)})));host.innerHTML='<article class="card moderation-card"><div class="head"><div><p class="eyebrow">SCHÜLER-WÖRTERBÜCHER</p><h3>Vokabel-Moderation</h3></div><span>'+rows.length+' Einträge</span></div><div class="moderation-table"><div class="moderation-row moderation-head"><b>Schüler</b><b>Deutsches Wort & Formen</b><b>Übersetzung</b><b>Wortart & Kategorie</b><b>Aktionen</b></div>'+rows.map(row=>'<div class="moderation-row"><span data-label="Schüler">'+esc(row.email)+'</span><span data-label="Wort"><strong>'+esc(row.entry.base)+'</strong><small>'+esc(row.entry.forms||'Keine Formen')+'</small></span><span data-label="Übersetzung">'+esc(row.entry.translation||'—')+'</span><span data-label="Wortart & Kategorie">'+esc(row.entry.kind)+'<small>📁 '+esc(row.entry.category)+'</small></span><span class="moderation-actions"><button class="secondary" onclick="editStudentVocabulary(\''+encodeURIComponent(row.email)+'\','+row.index+')">✏️ Bearbeiten</button><button class="danger-button" onclick="deleteStudentVocabulary(\''+encodeURIComponent(row.email)+'\','+row.index+')">🗑️ Löschen</button></span></div>').join('')+'</div>'+(rows.length?'':'<p class="muted">Noch keine persönlichen Schüler-Vokabeln vorhanden.</p>')+'</article>'};
  window.editStudentVocabulary=function(encodedEmail,index){const email=decodeURIComponent(encodedEmail),entry=wordRecord(db.users[email].words[index],index);window.open('<div class="dialog"><div class="dialog-top"><h2>Vokabel korrigieren</h2><button class="icon">✕</button></div><form class="form" onsubmit="event.preventDefault();saveStudentVocabulary(\''+encodedEmail+'\','+index+')"><label>Deutsches Wort<input id="moderateWord" value="'+esc(entry.base)+'" required></label><label>Wortart<input id="moderateKind" value="'+esc(entry.kind)+'"></label><label>Artikel, Plural oder Verbformen<textarea id="moderateForms">'+esc(entry.forms)+'</textarea></label><label>Übersetzung<input id="moderateTranslation" value="'+esc(entry.translation)+'"></label><label>Kategorie<select id="moderateCategory">'+categoryOptions(entry.category)+'</select></label><button class="primary">Korrektur speichern</button></form></div>')};
  window.saveStudentVocabulary=function(encodedEmail,index){const email=decodeURIComponent(encodedEmail),profile=db.users[email],old=wordRecord(profile.words[index],index),category=selectedCategory('moderateCategory'),kind=document.getElementById('moderateKind').value.trim(),forms=document.getElementById('moderateForms').value.trim();if(!category)return;if(/Nomen|Verb|Adjektiv/i.test(kind)&&!forms)return alert('Für Nomen, Verben und Adjektive sind vollständige Pflichtformen erforderlich.');profile.words[index]={...old,word:document.getElementById('moderateWord').value.trim(),base:document.getElementById('moderateWord').value.trim(),kind,forms,translation:document.getElementById('moderateTranslation').value.trim(),category};save();close();renderVocabularyModeration()};
  window.deleteStudentVocabulary=function(encodedEmail,index){if(!confirm('Möchtest du diese Vokabel wirklich löschen?'))return;const email=decodeURIComponent(encodedEmail);db.users[email].words.splice(index,1);save();renderVocabularyModeration()};
  function ensureCustomTaskTypes(){db.customTaskTypes=Array.isArray(db.customTaskTypes)?db.customTaskTypes:[]}
  const retainedStructuredAdminRenderer=window.renderStructuredAdminTab;
  window.renderStructuredAdminTab=function(){ensureCustomTaskTypes();retainedStructuredAdminRenderer();const type=document.getElementById('structuredType');db.customTaskTypes.forEach(item=>type?.insertAdjacentHTML('beforeend','<option>'+esc(item.name)+'</option>'));const manager=document.getElementById('structuredContentManager');manager?.insertAdjacentHTML('beforebegin','<div class="cms-tools"><form class="card form" onsubmit="event.preventDefault();saveCustomTaskType()"><p class="eyebrow">MANUELLER AUFGABENTYP-MANAGER</p><h3>Eigenen Aufgabentyp anlegen</h3><label>Name des Aufgabentyps<input id="customTypeName" required></label><label>Aufgabenstellung<textarea id="customTypeInstruction" required></textarea></label><div class="head"><strong>Antwortoptionen</strong><button type="button" class="secondary" onclick="addAnswerEditorRow()">＋ Option</button></div><div id="customAnswerRows"></div><p class="input-hint">Markiere mit dem Auswahlkreis die richtige Antwort.</p><button class="primary">Aufgabentyp speichern</button><p id="customTypeMessage" class="task-feedback"></p></form><form class="card form ai-panel" onsubmit="event.preventDefault();generateContentWithAi()"><p class="eyebrow">KI-CONTENT-GENERATOR</p><h3>Mit KI generieren 🪄</h3><label>Niveau<select id="aiLevel"><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option></select></label><label>Thema<input id="aiTopic" placeholder="z. B. Vorstellungsgespräch" required></label><label>Server-Endpunkt (optional)<input id="aiEndpoint" type="url" placeholder="https://…/api/ai" value="'+esc(db.settings.aiEndpoint||'')+'"></label><p class="input-hint">API-Schlüssel gehören ausschließlich auf den Server, niemals in diese Website.</p><button class="primary">Mit KI generieren</button><p id="aiGeneratorStatus" class="ai-status"></p></form></div>');addAnswerEditorRow();addAnswerEditorRow();renderStructuredManager()};
  window.addAnswerEditorRow=function(value=''){const host=document.getElementById('customAnswerRows');if(!host)return;const index=host.children.length,row=document.createElement('div');row.className='answer-editor-row';row.innerHTML='<input type="radio" name="customCorrect" value="'+index+'" '+(index===0?'checked':'')+' aria-label="Richtige Antwort"><input class="custom-answer" value="'+esc(value)+'" placeholder="Antwortoption" required><button type="button" class="danger-button" onclick="this.parentElement.remove()">✕</button>';host.append(row)};
  window.saveCustomTaskType=function(){ensureCustomTaskTypes();const name=document.getElementById('customTypeName').value.trim(),instruction=document.getElementById('customTypeInstruction').value.trim(),rows=[...document.querySelectorAll('.answer-editor-row')],options=rows.map(row=>row.querySelector('.custom-answer').value.trim()).filter(Boolean),selected=document.querySelector('input[name="customCorrect"]:checked'),correct=Math.max(0,rows.indexOf(selected?.closest('.answer-editor-row')));if(options.length<2)return document.getElementById('customTypeMessage').textContent='Bitte mindestens zwei Antwortoptionen anlegen.';const existing=db.customTaskTypes.find(item=>item.name.toLowerCase()===name.toLowerCase()),record={id:existing?.id||'custom-'+Date.now(),name,instruction,options,correct};if(existing)Object.assign(existing,record);else db.customTaskTypes.push(record);save();renderStructuredAdminTab()};
  window.callAiAssistant=async function(promptText,options={}){const endpoint=options.endpoint||db.settings.aiEndpoint;if(!endpoint)return{demo:true,text:'Demo-Entwurf: '+promptText,lesson:'Lesetext zum Thema '+(options.topic||'Deutschlernen')+'.',gap:'Ich [[lerne]] heute Deutsch.',question:'Welche Aussage passt zum Text?',answers:['Die Person lernt Deutsch.','Die Person fährt nach Hause.','Die Person schläft.'],correct:0};const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:promptText,options:{...options,endpoint:undefined}})});if(!response.ok)throw new Error('KI-Server antwortet mit Status '+response.status);return response.json()};
  window.generateContentWithAi=async function(){const level=document.getElementById('aiLevel').value,topic=document.getElementById('aiTopic').value.trim(),endpoint=document.getElementById('aiEndpoint').value.trim(),status=document.getElementById('aiGeneratorStatus');db.settings.aiEndpoint=endpoint;save();status.textContent='Entwurf wird erstellt …';try{const result=await callAiAssistant('Erstelle einen deutschen Lesetext, Wortschatz und interaktive Übungen.',{level,topic,endpoint});document.getElementById('structuredTopic').value=topic;document.getElementById('structuredContent').value=result.lesson||result.text||'';document.getElementById('structuredType').value='Lesen';updateStructuredPreview();status.textContent=result.demo?'Demo-Entwurf eingefügt. Für echte KI einen sicheren Server-Endpunkt konfigurieren.':'KI-Entwurf eingefügt und manuell bearbeitbar.'}catch(error){status.textContent='KI-Anfrage fehlgeschlagen: '+error.message}};
  window.openAiTutor=function(context=''){window.open('<div class="dialog"><div class="dialog-top"><div><p class="eyebrow">KI-LERNHELFER</p><h2>Frag den Tutor 🤖</h2></div><button class="icon">✕</button></div><div id="aiChatLog" class="ai-chat-log"><div class="ai-message">Ich erkläre Wörter, Sätze und Grammatik in deiner Muttersprache.</div></div><label>Deine Frage<textarea id="aiTutorQuestion">'+esc(context)+'</textarea></label><button class="primary" onclick="askAiTutor()">KI fragen</button><p id="aiTutorStatus" class="ai-status"></p></div>')};
  window.askAiTutor=async function(){const question=document.getElementById('aiTutorQuestion').value.trim(),status=document.getElementById('aiTutorStatus'),log=document.getElementById('aiChatLog');if(!question)return;status.textContent='Antwort wird vorbereitet …';try{const result=await callAiAssistant('Erkläre auf '+baseLanguageName(nativeLanguage())+': '+question,{role:'tutor'});log.insertAdjacentHTML('beforeend','<div class="ai-message"><strong>Du:</strong> '+esc(question)+'</div><div class="ai-message"><strong>KI-Tutor:</strong> '+esc(result.text||result.explanation||'Bitte konfiguriere einen KI-Server-Endpunkt.')+'</div>');status.textContent=result.demo?'Demo-Modus':'Antwort erhalten'}catch(error){status.textContent='KI-Anfrage fehlgeschlagen: '+error.message}};
  window.requestAiWordAnalysis=async function(word,targetId){const target=document.getElementById(targetId);if(!target)return;target.textContent='KI-Prüfung läuft …';try{const result=await callAiAssistant('Analysiere das deutsche Wort „'+word+'“. Gib Wortart und nur lexikalisch sichere Formen zurück.',{task:'word-analysis',word});target.textContent=result.analysis||result.text}catch(error){target.textContent='Prüfung fehlgeschlagen: '+error.message}};
  function ensureMessages(){db.messages=Array.isArray(db.messages)?db.messages:[]}
  const retainedAdminWithModeration=window.openStructuredAdmin;
  window.openStructuredAdmin=function(){retainedAdminWithModeration();ensureMessages();const tabs=document.querySelector('.admin-tabs');if(tabs&&!document.getElementById('messageInboxTab'))tabs.insertAdjacentHTML('beforeend','<button id="messageInboxTab" onclick="switchAdminTab(\'messages\',this)">Nachrichten / Posteingang 📥'+unreadAdminMessages()+'</button>')};
  function unreadAdminMessages(){ensureMessages();const count=db.messages.filter(message=>message.from==='student'&&!message.readByAdmin).length;return count?' ('+count+')':''}
  const retainedAdminTabWithModeration=window.switchAdminTab;
  window.switchAdminTab=function(tab,button){if(tab!=='messages')return retainedAdminTabWithModeration(tab,button);document.querySelectorAll('.admin-tabs button').forEach(item=>item.classList.remove('active'));button.classList.add('active');renderMessageInbox()};
  window.openStudentMessages=function(){if(!user?.email)return login('login');ensureMessages();db.messages.filter(message=>message.studentEmail===user.email&&message.from==='admin').forEach(message=>message.readByStudent=true);save();const thread=db.messages.filter(message=>message.studentEmail===user.email).sort((a,b)=>a.date-b.date);window.open('<div class="dialog message-dialog"><div class="dialog-top"><div><p class="eyebrow">DEIN POSTFACH</p><h2>Nachricht an Lehrerin ✉️</h2></div><button class="icon">✕</button></div><div class="message-thread">'+(thread.map(message=>messageBubble(message)).join('')||'<p class="muted">Noch keine Nachrichten. Stelle deiner Lehrerin eine Frage.</p>')+'</div><form class="form message-compose" onsubmit="event.preventDefault();sendStudentMessage()"><label>Neue Nachricht<textarea id="studentMessageText" required placeholder="Deine Frage oder dein Feedback …"></textarea></label><button class="primary">Nachricht senden</button><p id="studentMessageStatus" class="task-feedback"></p></form></div>')};
  function messageBubble(message){return'<article class="message-bubble '+(message.from==='admin'?'teacher':'student')+'"><strong>'+(message.from==='admin'?'Lehrerin':'Du')+'</strong><p>'+esc(message.text)+'</p><small>'+new Date(message.date).toLocaleString('de-DE')+'</small></article>'}
  window.sendStudentMessage=function(){const field=document.getElementById('studentMessageText'),text=field?.value.trim();if(!text)return;ensureMessages();db.messages.push({id:'message-'+Date.now(),studentEmail:user.email,from:'student',text,date:Date.now(),readByAdmin:false,readByStudent:true});save();close();openStudentMessages()};
  window.renderMessageInbox=function(){ensureMessages();const host=document.getElementById('adminTabContent');if(!host)return;db.messages.filter(message=>message.from==='student').forEach(message=>message.readByAdmin=true);save();const students=[...new Set(db.messages.map(message=>message.studentEmail))];host.innerHTML='<article class="card"><div class="head"><div><p class="eyebrow">INTERNE MITTEILUNGEN</p><h3>Nachrichten / Posteingang</h3></div><span>'+students.length+' Unterhaltungen</span></div><div class="inbox-list">'+(students.map(email=>{const thread=db.messages.filter(message=>message.studentEmail===email).sort((a,b)=>a.date-b.date),last=thread.at(-1);return'<article class="inbox-thread"><div><strong>'+esc(email)+'</strong><p>'+esc(last?.text||'')+'</p><small>'+new Date(last?.date||Date.now()).toLocaleString('de-DE')+'</small></div><button class="secondary" onclick="openAdminConversation(\''+encodeURIComponent(email)+'\')">Öffnen & antworten</button></article>'}).join('')||'<p class="muted">Noch keine Schülernachrichten.</p>')+'</div></article>'};
  window.openAdminConversation=function(encodedEmail){const email=decodeURIComponent(encodedEmail),thread=db.messages.filter(message=>message.studentEmail===email).sort((a,b)=>a.date-b.date);window.open('<div class="dialog message-dialog"><div class="dialog-top"><div><p class="eyebrow">UNTERHALTUNG</p><h2>'+esc(email)+'</h2></div><button class="icon">✕</button></div><div class="message-thread">'+thread.map(message=>'<article class="message-bubble '+(message.from==='admin'?'teacher':'student')+'"><strong>'+(message.from==='admin'?'Lehrerin':esc(email))+'</strong><p>'+esc(message.text)+'</p><small>'+new Date(message.date).toLocaleString('de-DE')+'</small></article>').join('')+'</div><form class="form" onsubmit="event.preventDefault();sendTeacherReply(\''+encodedEmail+'\')"><label>Antwort<textarea id="teacherReplyText" required></textarea></label><button class="primary">Antwort senden</button></form></div>')};
  window.sendTeacherReply=function(encodedEmail){const email=decodeURIComponent(encodedEmail),text=document.getElementById('teacherReplyText').value.trim();if(!text)return;db.messages.push({id:'message-'+Date.now(),studentEmail:email,from:'admin',text,date:Date.now(),readByAdmin:true,readByStudent:false});save();close();openAdminConversation(encodedEmail)};
  const retainedShellForMessages=window.shell;
  window.shell=function(){retainedShellForMessages();document.getElementById('aiTutorLaunch')?.remove();const actions=document.querySelector('.top .actions');if(user?.email&&!adminOK()&&actions&&!document.getElementById('studentMessageButton')){ensureMessages();const unread=db.messages.filter(message=>message.studentEmail===user.email&&message.from==='admin'&&!message.readByStudent).length,button=document.createElement('button');button.id='studentMessageButton';button.className='message-button';button.textContent='Nachricht an Lehrerin ✉️'+(unread?' ('+unread+')':'');button.onclick=openStudentMessages;actions.prepend(button)}};
  function ensureContentIds(){let changed=false;(db.content||[]).forEach(item=>{if(!item.id){item.id='task-'+Number(item.date||Date.now());changed=true}if(!item.createdAt){item.createdAt=Number(item.date||Date.now());changed=true}});if(changed)save()}
  function taskIdentity(item){return String(item.id||('task-'+Number(item.date)))}
  function renderStructuredManager(){const host=document.getElementById('structuredContentManager');if(!host)return;ensureContentIds();const tasks=(db.content||[]).slice().reverse();host.innerHTML='<article class="card admin-content-list"><h3>Erstellte Aufgaben</h3>'+(tasks.length?tasks.map(item=>'<div class="admin-content-row"><span><strong>'+esc(item.topic)+'</strong><small>'+esc(item.level||item.section)+' · '+esc(item.block||'Grammatik')+(item.skill?' · '+esc(item.skill):'')+'</small></span><div><button class="secondary" onclick="editAdminTask('+Number(item.date)+')">Bearbeiten</button><button class="danger-button" onclick="deleteTaskById(\''+esc(taskIdentity(item))+'\')">🗑️ Löschen</button></div></div>').join(''):'<p class="muted">Noch keine Aufgaben.</p>')+'</article>';}
  window.deleteTaskById=function(id,context,level,name){if(!adminOK()||!confirm('Möchtest du dieses Element wirklich löschen?'))return;db.content=(db.content||[]).filter(item=>taskIdentity(item)!==String(id));Object.values(db.users||{}).forEach(profile=>{profile.done=(profile.done||[]).filter(key=>{const existing=(db.content||[]).find(item=>'task-'+Number(item.date)===key);return !!existing||!key.startsWith('task-')})});save();if(context==='topic'){close();openTopic(level,name)}else if(context==='skill'){close();openSkillModule(level,name)}else if(document.getElementById('structuredContentManager'))renderStructuredManager();else view();};
  const retainedLevelsWithBinarySkillProgress=window.levels;
  window.levels=function(){let html=retainedLevelsWithBinarySkillProgress();if(s.levelBlock!=='skills')return html;const level=normalize(s.level),profile=window.prof?.()||{done:[]};['Lesen','Hören','Schreiben','Sprechen'].forEach(skill=>{const tasks=(db.content||[]).filter(item=>normalize(item.level||item.section)===level&&item.block==='skills'&&item.skill===skill);const percent=tasks.length?Math.round(tasks.filter(item=>profile.done.includes('task-'+Number(item.date))).length/tasks.length*100):(profile.done.includes('skill-'+level+'-'+skill)?100:0);html=html.replace(/Fortschritt: (?:0|100)%/, 'Fortschritt: '+percent+'%')});return html;};
  window.openSkillModule=function(level,type){const tasks=(db.content||[]).filter(item=>normalize(item.level||item.section)===normalize(level)&&item.block==='skills'&&item.skill===type);if(!tasks.length)return retainedOpenSkillModule(level,type);const done=window.prof?.()?.done||[];window.open('<div class="dialog"><div class="dialog-top"><div><p class="eyebrow">'+esc(level)+' · '+esc(type).toUpperCase()+'</p><h2>Prüfungstrainer</h2></div><button class="icon">✕</button></div><div class="task-list">'+tasks.map(item=>'<div class="task-list-item"><button class="secondary task-open" onclick="openPublishedTask('+Number(item.date)+')"><span>'+esc(item.type)+': '+esc(item.topic)+'</span><small>'+(done.includes('task-'+Number(item.date))?'✓ Erledigt':(item.isNew?'<span class="new-badge">✨ Neu</span>':'Öffnen'))+'</small></button>'+(adminOK()?'<button class="danger-button" onclick="deleteTaskById(\''+esc(taskIdentity(item))+'\',\'skill\',\''+esc(level)+'\',\''+esc(type)+'\')">🗑️ Löschen</button>':'')+'</div>').join('')+'</div></div>');};
  const isAdminAccount=()=>!!(user&&user.email&&user.email.toLowerCase()===ADMIN.toLowerCase());
  const retainedShell=window.shell;
  window.adminOK=function(){return isAdminAccount()&&(db.settings.previewRole||'admin')==='admin';};
  window.admin=window.openStructuredAdmin;
  window.shell=function(){retainedShell();const actions=document.querySelector('.top .actions');document.body.classList.toggle('preview-student',isAdminAccount()&&!adminOK());if(isAdminAccount()&&actions&&!document.getElementById('rolePreviewToggle')){const button=document.createElement('button');button.id='rolePreviewToggle';button.className='role-toggle';button.onclick=togglePreviewRole;actions.prepend(button)}const button=document.getElementById('rolePreviewToggle');if(button){button.textContent=adminOK()?'Ansicht: Admin ⚙️':'Ansicht: Schüler 🎓';button.setAttribute('aria-pressed',String(!adminOK()))}};
  const retainedView=window.view;
  window.view=function(){retainedView();if(adminOK())decorateAdminElements();};
  function decorateAdminElements(){if(s.page==='dict'&&s.tab==='mine'){document.querySelectorAll('.dictionary-card').forEach((card,index)=>{if(card.querySelector('.danger-button'))return;const button=document.createElement('button');button.className='danger-button';button.textContent='🗑️ Löschen';button.onclick=()=>deletePersonalWord(index);card.append(button)})}if(s.page==='career'){const cards=[...document.querySelectorAll('.special-card')];cards.slice(defaultSpecialTopics.length).forEach((card,index)=>{if(card.querySelector('.danger-button'))return;const button=document.createElement('button');button.className='danger-button';button.textContent='🗑️ Löschen';button.onclick=()=>deleteSpecialArea(index);card.append(button)})}};
  window.deletePersonalWord=function(index){if(!adminOK()||!confirm('Möchtest du dieses Element wirklich löschen?'))return;window.prof().words.splice(index,1);save();view();};
  window.deleteSpecialArea=function(index){if(!adminOK()||!confirm('Möchtest du dieses Element wirklich löschen?'))return;db.specialTopics.splice(index,1);save();view();};
  window.deleteSpecialModule=function(areaIndex,moduleIndex){if(!adminOK()||!confirm('Möchtest du dieses Element wirklich löschen?'))return;const area=db.specialTopics?.[areaIndex];if(!area)return;area.subs.splice(moduleIndex,1);save();window.close();openSpecialTopic(areaIndex,area.name);};
  window.togglePreviewRole=function(){if(!isAdminAccount())return;db.settings.previewRole=adminOK()?'student':'admin';save();window.close();view();};
  document.addEventListener('click', event => { if (event.target.closest('.modal-close')) closeModal(event); });
  ensureContentIds();
  view();
})();
