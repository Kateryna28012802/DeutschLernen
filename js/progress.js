/* Deutschraum: progress responsibilities. Classic scripts preserve HTML handler compatibility. */
function answer(e,ok,t){document.querySelectorAll('.option').forEach(x=>x.disabled=true);if(ok)e.classList.add('ok');if(user){let p=prof();p.answers++;if(ok){p.right++;if(!p.done.includes(s.level+'-'+t))p.done.push(s.level+'-'+t)}save()}setTimeout(()=>{close();view()},550)}

/* Progress persistence extracted from the exercise engine. */
(function (runtime) {
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

  runtime.progress.completeCurrentTask = completeCurrentTask;
  runtime.progress.markTaskDone = window.markTaskDone;
})(window.Deutschraum);

/* Premium error tracking and spaced-repetition focus view. */
(function(runtime){
  runtime.progress.installFocusTraining=function(deps){
    const {db,esc,save,adminOK,nav,s,getUser,prof,shell,view,renderUnifiedModeControl}=deps;
    /* Premium: Fehlerprotokoll, Fokus-Training und Spaced Repetition. */
    function activeTaskFor(element){const date=Number(element?.closest?.('[data-task-date]')?.dataset.taskDate);return Number.isFinite(date)?(db.content||[]).find(item=>Number(item.date)===date):null}
    function errorCategory(item,text=''){const source=((item?.topic||'')+' '+(item?.type||'')+' '+text).toLowerCase();const rules=[['Akkusativ',/akkusativ|\bden\b|\beinen\b/],['Dativ',/dativ|\bdem\b|\beinem\b/],['sein / haben',/sein|haben|ist|sind|hat|haben/],['Artikel',/artikel|\bder\b|\bdie\b|\bdas\b/],['Verbformen',/verb|konjug|präteritum|perfekt/],['Wortstellung',/satzbau|wortstellung|position/]];return rules.find(([,pattern])=>pattern.test(source))?.[0]||item?.topic||item?.type||'Wortschatz'}
    window.recordLearningError=function(element,detail='',correctAnswer=''){
      const profile=window.prof?.();if(!profile||adminOK())return;const item=activeTaskFor(element),category=errorCategory(item,detail+' '+correctAnswer);profile.userErrors=profile.userErrors||{};
      const entry=profile.userErrors[category]||{count:0,streak:0,intervalDays:0,nextReview:0,examples:[]};entry.count++;entry.streak=0;entry.intervalDays=0;entry.lastWrong=Date.now();entry.nextReview=Date.now();entry.type=item?.type||'Übung';entry.topic=item?.topic||category;entry.detail=String(detail||'').trim();entry.correctAnswer=String(correctAnswer||'').trim();entry.examples=[...new Set([...(entry.examples||[]),entry.detail].filter(Boolean))].slice(-5);profile.userErrors[category]=entry;save();
    };
    window.completeFocusReview=function(encodedCategory,known=true){const profile=window.prof?.(),category=decodeURIComponent(encodedCategory),entry=profile?.userErrors?.[category];if(!entry)return;if(known){entry.streak=(entry.streak||0)+1;entry.intervalDays=[1,3,7,14,30][Math.min(entry.streak-1,4)];entry.nextReview=Date.now()+entry.intervalDays*86400000}else{entry.count++;entry.streak=0;entry.intervalDays=0;entry.nextReview=Date.now()+10*60000}save();view()};
    window.reviewVocabulary=function(index,known){const profile=window.prof?.(),word=profile?.words?.[index];if(!word||typeof word!=='object')return;word.review=word.review||{streak:0,nextReview:0};if(known){word.review.streak++;word.review.intervalDays=[1,3,7,14,30][Math.min(word.review.streak-1,4)];word.review.nextReview=Date.now()+word.review.intervalDays*86400000}else{word.review.streak=0;word.review.intervalDays=0;word.review.nextReview=Date.now()+10*60000}save();view()};
    function focusTraining(){
      const profile=window.prof?.();if(!profile)return'<article class="card"><h2>Persönliche Wiederholung</h2><p>Bitte melde dich an, damit deine Fehler lokal gespeichert werden.</p><button class="primary" onclick="login(\'login\')">Anmelden</button></article>';
      const errors=Object.entries(profile.userErrors||{}).sort((a,b)=>(b[1].count-a[1].count)||((a[1].nextReview||0)-(b[1].nextReview||0))),now=Date.now();
      const errorCards=errors.map(([category,entry])=>{const due=!entry.nextReview||entry.nextReview<=now;return'<article class="card focus-card '+(due?'due':'scheduled')+'"><div class="focus-card-head"><span class="premium-badge">PREMIUM</span><span class="review-status">'+(due?'Jetzt wiederholen':'Geplant')+'</span></div><h3>'+esc(category)+'</h3><p class="muted">'+esc(entry.topic||entry.type||'Übung')+' · '+entry.count+' Fehler</p>'+(entry.detail?'<div class="focus-question"><strong>Dein Fokus:</strong> '+esc(entry.detail)+'</div>':'')+(entry.correctAnswer?'<details><summary>Lösung anzeigen</summary><p>'+esc(entry.correctAnswer)+'</p></details>':'')+'<div class="focus-actions"><button class="secondary" onclick="completeFocusReview(\''+encodeURIComponent(category)+'\',false)">Noch üben</button><button class="primary" onclick="completeFocusReview(\''+encodeURIComponent(category)+'\',true)">Gewusst ✓</button></div>'+(entry.intervalDays?'<small>Nächste Stufe: '+entry.intervalDays+' Tag(e)</small>':'')+'</article>'}).join('');
      const words=(profile.words||[]).map((value,index)=>({entry:runtime.dictionary.simpleVocabularyRecord(value,index),raw:value,index})).filter(({raw})=>!raw?.review?.nextReview||raw.review.nextReview<=now).slice(0,6).map(({entry,index})=>'<article class="card focus-card vocab-review"><p class="eyebrow">VOKABEL-WIEDERHOLUNG</p><h3>'+esc(entry.german)+'</h3><details><summary>Übersetzung anzeigen</summary><p class="translation">'+esc(entry.translation||'Noch nicht eingetragen')+'</p></details><button class="speaker" onclick="say(\''+esc(entry.german).replace(/&#39;/g,"\\'")+'\')">🔊 Aussprache</button><div class="focus-actions"><button class="secondary" onclick="reviewVocabulary('+index+',false)">Noch üben</button><button class="primary" onclick="reviewVocabulary('+index+',true)">Gewusst ✓</button></div></article>').join('');
      return'<div class="hero focus-hero"><p class="eyebrow">PERSÖNLICHE WIEDERHOLUNG · PREMIUM</p><h1>Meine Schwachstellen</h1><p>Häufige Fehler zuerst, danach Wiederholungen in wachsenden Abständen.</p></div><div class="head"><div><h2>Fokus-Training</h2><p class="muted">'+errors.filter(([,entry])=>!entry.nextReview||entry.nextReview<=now).length+' Themen sind jetzt fällig.</p></div></div><div class="grid cards focus-grid">'+(errorCards||'<article class="card wide"><h3>Noch keine Schwachstellen erkannt 🎉</h3><p class="muted">Falsche Antworten aus Übungen erscheinen automatisch hier.</p></article>')+'</div><div class="head focus-vocab-head"><div><h2>Vokabeln wiederholen</h2><p class="muted">Nach dem Karteikarten-Prinzip geplant.</p></div></div><div class="grid cards focus-grid">'+(words||'<article class="card wide"><p class="muted">Aktuell sind keine Vokabeln fällig.</p></article>')+'</div>';
    }
    if(typeof nav!=='undefined'&&!nav.some(item=>item[0]==='focus'))nav.splice(2,0,['focus','🎯','Fokus-Training']);
    const retainedFocusView=window.view;
    window.view=function(){if(s.page!=='focus')return retainedFocusView();if(getUser()){prof().last={page:s.page,level:s.level};save()}shell();document.getElementById('headerTitle').textContent='Persönliche Wiederholung';document.getElementById('appView').innerHTML=focusTraining();renderUnifiedModeControl()};
    const retainedTrackedChoice=window.choiceCheck;window.choiceCheck=function(button,correct){if(!correct){const right=[...button.parentElement.querySelectorAll('button')].find(node=>/choiceCheck\(this,\s*true/.test(node.getAttribute('onclick')||''));recordLearningError(button,button.textContent.trim(),right?.textContent.trim()||'')}return retainedTrackedChoice(button,correct)};
    const retainedTrackedContext=window.contextCheck;window.contextCheck=function(select,correct){if(select.value&&select.value!==correct)recordLearningError(select,select.value,correct);return retainedTrackedContext(select,correct)};
    const retainedTrackedGap=window.checkGapTask;window.checkGapTask=function(button){retainedTrackedGap(button);button.closest('.gap-exercise')?.querySelectorAll('.gap-drop.incorrect').forEach(slot=>recordLearningError(slot,slot.dataset.answer||'Leere Lücke',slot.dataset.correct||''))};
    const retainedTrackedCorrectionWord=window.chooseCorrectionWord;window.chooseCorrectionWord=function(button){if(button.dataset.error!=='true')recordLearningError(button,button.textContent.trim(),'Fehlerwort finden');return retainedTrackedCorrectionWord(button)};
    const retainedTrackedCategory=window.checkCategorization;window.checkCategorization=function(button){retainedTrackedCategory(button);button.closest('.categorization-exercise')?.querySelectorAll('.sort-item.incorrect').forEach(item=>recordLearningError(item,item.textContent.trim(),item.dataset.correct||''))};
    const retainedTrackedTf=window.answerTrueFalse;window.answerTrueFalse=function(button,answer,correct){if(answer!==correct)recordLearningError(button,answer,correct);return retainedTrackedTf(button,answer,correct)};
    const retainedTrackedChat=window.answerChat;window.answerChat=function(button,correct){if(!correct)recordLearningError(button,button.textContent.trim(),'Passende Dialogantwort');return retainedTrackedChat(button,correct)};
    const retainedTrackedOdd=window.answerOddOne;window.answerOddOne=function(button,correct){if(!correct)recordLearningError(button,button.textContent.trim(),'Unpassendes Wort');return retainedTrackedOdd(button,correct)};

    runtime.progress.focusTraining=focusTraining;
  };
})(window.Deutschraum);
