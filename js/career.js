/* Deutschraum: Beruf & Spezial everyday-situation extension. */
(function(runtime,contentData){
  runtime.lessons.installEverydayCareer=function(deps){
    const {esc,wordify,renderChatSimulator,renderTrueFalseTask}=deps;
    const everydaySituations=contentData.career.everydaySituations;
    /* Alltagssituationen innerhalb von Beruf & Spezial. */
    const retainedEverydayCareer=window.career;
    window.career=function(){const base=retainedEverydayCareer();return base+'<section class="everyday-section"><div class="head"><div><p class="eyebrow">BERUF & ALLTAG</p><h2>Alltagssituationen</h2><p class="muted">Reale Dialoge, passender Wortschatz und interaktive Übungen.</p></div></div><div class="grid cards everyday-grid">'+everydaySituations.map(item=>'<article class="card everyday-card"><span class="everyday-icon">'+item.icon+'</span><h3>'+esc(item.title)+'</h3><p class="muted">'+esc(item.intro)+'</p><button class="primary" onclick="openEverydaySituation(\''+item.id+'\')">Situation üben</button></article>').join('')+'</div></section>'};
    window.openEverydaySituation=function(id){const item=everydaySituations.find(entry=>entry.id===id);if(!item)return;window.open('<div class="dialog everyday-dialog"><div class="dialog-top"><div><p class="eyebrow">ALLTAGSSITUATION</p><h2>'+item.icon+' '+esc(item.title)+'</h2></div><button class="icon">✕</button></div><section class="everyday-intro"><h3>Einführung</h3><p class="clickable-copy">'+wordify(item.intro)+'</p></section><section><h3>Realistischer Dialog</h3>'+renderChatSimulator(item.dialog)+'</section><section><h3>Wortschatz</h3><div class="everyday-vocab">'+item.vocab.map(word=>'<button class="word-tile" onclick="openWordMenu(\''+esc(word).replace(/&#39;/g,"\\'")+'\')">'+esc(word)+' <span>＋</span></button>').join('')+'</div></section><section><h3>Interaktive Übung</h3>'+renderTrueFalseTask(item.statement)+'</section></div>')};

  };
})(window.Deutschraum,window.DeutschraumData);
