/* Deutschraum: dictionary responsibilities. Classic scripts preserve HTML handler compatibility. */
function dict(){let p=prof()||{words:[]};return '<div class="head"><div><p class="eyebrow">DEIN WORTSCHATZ</p><h2>Wörter, die bleiben</h2></div><button class="secondary" onclick="cards()">🃏 Karteikarten</button></div><div class="levels"><button class="'+(s.tab==='topics'?'active':'')+'" onclick="s.tab=\'topics\';view()">Thematische Wörterbücher</button><button class="'+(s.tab==='mine'?'active':'')+'" onclick="s.tab=\'mine\';view()">Mein Wörterbuch ('+p.words.length+')</button></div>'+(s.tab==='topics'?'<div class="grid cards">'+[['der Kaffee','die Kaffees'],['die Sprache','die Sprachen'],['sprechen','sprach · hat gesprochen']].map(w=>'<article class="card"><h3>'+w[0]+' <button class="speaker" onclick="say(\''+w[0]+'\')">🔊</button></h3><p class="muted">'+w[1]+'</p><button class="secondary" onclick="word(\''+w[0]+'\')">➕ Speichern</button></article>').join('')+'</div>':'<div class="grid cards">'+(p.words.length?p.words.map(w=>'<article class="card"><h3>'+w+'</h3><button class="speaker" onclick="say(\''+w+'\')">🔊 Aussprache</button></article>').join(''):'<article class="card wide"><h3>Dein Wörterbuch wartet auf dich.</h3></article>')+'</div>')}
function lookup(w){open('<div class="dialog"><div class="dialog-top"><h2>'+w+' <button class="speaker" onclick="say(\''+w+'\')">🔊</button></h2><button class="icon" onclick="close()">✕</button></div><p><strong>heißen – hieß – hat geheißen</strong></p><button class="primary" onclick="word(\''+w+'\');close()">➕ In mein Wörterbuch speichern</button></div>')}
function word(w){if(!user)return login('login');let a=prof().words;if(!a.includes(w))a.push(w);save();view()}
function cards(){let w=prof()?.words[0]||'Noch keine Wörter';open('<div class="dialog"><div class="dialog-top"><h2>Karteikarte</h2><button class="icon" onclick="close()">✕</button></div><div class="lock"><h2>'+w+'</h2><button class="speaker" onclick="say(\''+w+'\')">🔊</button></div></div>')}

/* Final dictionary UI, storage compatibility migration and safe word-form enrichment. */
(function(runtime,contentData){
  function simpleVocabularyRecord(value,index=0){
    if(value&&typeof value==='object')return{id:value.id||('vocab-'+index),german:String(value.german||value.word||value.base||''),translation:String(value.translation||'')};
    return{id:'vocab-'+index,german:String(value||''),translation:''};
  }
  runtime.dictionary.simpleVocabularyRecord=simpleVocabularyRecord;
  runtime.dictionary.installFinalDictionary=function(deps){
    const {db,s,save,view,close,esc,adminOK}=deps;
    const vocabularyForms=contentData.vocabulary.forms;
    /* Einmalige, verlustfreie Bereinigung bereits gespeicherter UTF-8-Inhalte. */
    function repairStoredEncoding(value){
      if(typeof value==='string'){
        if(!/[\u0400-\u045f\u2013-\u2026]/.test(value))return value;
        try{
          const legacyDecoder=new TextDecoder('windows-1251'),utf8Decoder=new TextDecoder('utf-8',{fatal:true}),reverse=new Map();
          for(let byte=0;byte<256;byte++){const char=legacyDecoder.decode(Uint8Array.of(byte));if(!reverse.has(char))reverse.set(char,byte)}
          return value.replace(/[^\x00-\x7f]+/g,run=>{const bytes=[];for(const char of run){if(!reverse.has(char))return run;bytes.push(reverse.get(char))}try{return utf8Decoder.decode(Uint8Array.from(bytes))}catch{return run}})
        }catch{return value}
      }
      if(Array.isArray(value))return value.map(repairStoredEncoding);
      if(value&&typeof value==='object'){Object.keys(value).forEach(key=>{value[key]=repairStoredEncoding(value[key])});return value}
      return value;
    }
    function migrateStoredContent(){
      db.settings=db.settings||{};
      if(db.settings.utf8MigrationVersion===2)return;
      repairStoredEncoding(db);
      Object.values(db.users||{}).forEach(profile=>{
        profile.words=Array.isArray(profile.words)?profile.words.map((entry,index)=>{
          if(entry&&typeof entry==='object'){const german=String(entry.german||entry.word||entry.base||'');return{...entry,id:entry.id||('vocab-migrated-'+index),german,word:entry.word||german,base:entry.base||german,translation:String(entry.translation||'')}}
          const german=String(entry||'');return{id:'vocab-migrated-'+index,german,word:german,base:german,translation:''}
        }):[];
      });
      db.settings.utf8MigrationVersion=2;
      save();
    }
    migrateStoredContent();
    /* Vereinfachter persoenlicher Wortschatz: bewusst manuell, ohne KI, Wortarterkennung oder Kategorien. */
    window.pronounceVocabularyInput=function(){const value=document.getElementById('simpleGermanWord')?.value.trim();if(value)say(value)};
    window.saveSimpleVocabulary=function(){
      const profile=window.prof?.();if(!profile)return login('login');
      const german=document.getElementById('simpleGermanWord')?.value.trim()||'',translation=document.getElementById('simpleTranslation')?.value.trim()||'';
      if(!german||!translation)return;
      profile.words=Array.isArray(profile.words)?profile.words:[];
      profile.words.push({id:'vocab-'+Date.now(),german,word:german,base:german,translation,createdAt:Date.now()});
      save();view();
    };
    window.saveWordFromModal=function(){
      const profile=window.prof?.();if(!profile)return login('login');
      const german=document.getElementById('modalGermanWord')?.value.trim()||'',translation=document.getElementById('modalWordTranslation')?.value.trim()||'';
      if(!german||!translation)return;
      profile.words=Array.isArray(profile.words)?profile.words:[];
      profile.words.push({id:'vocab-'+Date.now(),german,word:german,base:german,translation,createdAt:Date.now()});
      save();close();view();
    };
    window.openWordMenu=function(rawWord){
      const word=String(rawWord||'').trim();
      window.open('<div class="dialog compact-dialog simple-word-dialog"><div class="dialog-top"><div><p class="eyebrow">PERSÖNLICHER WORTSCHATZ</p><h2>Vokabel speichern</h2></div><button class="icon">✕</button></div><form class="form simple-vocab-form" onsubmit="event.preventDefault();saveWordFromModal()"><label>Wort / Phrase auf Deutsch<input id="modalGermanWord" value="'+esc(word)+'" required></label><label>Übersetzung<input id="modalWordTranslation" placeholder="z. B. auf Russisch" required></label><div class="simple-vocab-actions"><button type="button" class="secondary" onclick="say(document.getElementById(\'modalGermanWord\').value)">🔊 Aussprache</button><button class="primary">+ Speichern</button></div></form></div>');
    };
    window.saveClickedWord=function(wordValue){openWordMenu(wordValue)};
    window.dict=function(){
      const profile=window.prof?.()||{words:[]},records=(profile.words||[]).map(simpleVocabularyRecord).filter(entry=>entry.german);
      const cards=records.map(entry=>'<article class="card dictionary-card simple-vocab-card"><div><p class="eyebrow">DEUTSCH</p><h3>'+esc(entry.german)+'</h3><p class="translation">'+esc(entry.translation||'Übersetzung noch nicht eingetragen')+'</p></div><div class="simple-vocab-card-actions"><button class="speaker" onclick="say(\''+esc(entry.german).replace(/&#39;/g,"\\'")+'\')" aria-label="Aussprache anhören">🔊 Aussprache</button>'+(adminOK()?'<button class="danger-button" onclick="deletePersonalWordById(\''+esc(entry.id)+'\')">🗑️ Löschen</button>':'')+'</div></article>').join('');
      return '<div class="head"><div><p class="eyebrow">PERSÖNLICHER WORTSCHATZ</p><h2>Meine Vokabeln</h2><p class="muted">Trage die vollständige deutsche Form und deine Übersetzung selbst ein.</p></div><button class="secondary" onclick="cards()">🃏 Karteikarten</button></div><form class="card simple-vocab-form" onsubmit="event.preventDefault();saveSimpleVocabulary()"><label>Wort / Phrase auf Deutsch<input id="simpleGermanWord" placeholder="der Tisch, die Tische oder gehen | geht, ging, ist gegangen" required></label><label>Übersetzung<input id="simpleTranslation" placeholder="z. B. auf Russisch" required></label><div class="simple-vocab-actions"><button type="button" class="secondary" onclick="pronounceVocabularyInput()">🔊 Aussprache</button><button class="primary">+ Speichern</button></div></form><div class="grid cards simple-vocab-list">'+(cards||'<article class="card wide simple-vocab-empty"><h3>Noch keine Vokabeln gespeichert.</h3><p class="muted">Deine neuen Wörter erscheinen hier als klare Lernkarten.</p></article>')+'</div>';
    };
    window.deletePersonalWordById=function(id){if(!confirm('Möchtest du diese Vokabel wirklich löschen?'))return;const profile=window.prof?.();if(!profile)return;profile.words=(profile.words||[]).filter((entry,index)=>simpleVocabularyRecord(entry,index).id!==id);save();view()};
    /* Sichere automatische Formen aus einem integrierten deutschen Lernlexikon. */
    function enrichVocabularyWord(raw){const source=String(raw||'').trim().replace(/\s+/g,' ');if(!source)return{source:'',base:'',display:'',kind:'Grundform',enriched:false};if(/[|,]/.test(source))return{source,base:source.split(/[|,]/)[0].replace(/^(der|die|das)\s+/i,'').trim(),display:source,kind:'Vollständige Form',enriched:true};const key=source.replace(/[.!?;:()]/g,'').toLocaleLowerCase('de-DE');const found=Object.values(vocabularyForms).find(entry=>entry.aliases.includes(key));if(found)return{source,base:found.base,display:found.display,kind:found.kind,enriched:true};return{source,base:source,display:source,kind:'Grundform',enriched:false}}
    function enrichedRecord(value,index=0){const original=simpleVocabularyRecord(value,index),stored=value&&typeof value==='object'?value:{},info=enrichVocabularyWord(stored.source||original.german);return{...original,source:stored.source||info.source,base:stored.base||info.base,german:stored.german&&stored.enriched!==undefined?stored.german:info.display,kind:stored.kind||info.kind,enriched:stored.enriched!==undefined?stored.enriched:info.enriched}}
    window.previewVocabularyEnrichment=function(input,targetId){const target=document.getElementById(targetId),info=enrichVocabularyWord(input.value);if(!target)return;target.innerHTML=info.source?'<span>'+(info.enriched?'Automatisch ergänzt:':'Grundform:')+'</span><strong>'+esc(info.display)+'</strong>':''};
    window.saveSimpleVocabulary=function(){const profile=window.prof?.();if(!profile)return login('login');const source=document.getElementById('simpleGermanWord')?.value.trim()||'',translation=document.getElementById('simpleTranslation')?.value.trim()||'';if(!source||!translation)return;const info=enrichVocabularyWord(source);profile.words=Array.isArray(profile.words)?profile.words:[];profile.words.push({id:'vocab-'+Date.now(),source:info.source,base:info.base,german:info.display,word:info.display,kind:info.kind,enriched:info.enriched,translation,createdAt:Date.now()});save();view()};
    window.saveWordFromModal=function(){const profile=window.prof?.();if(!profile)return login('login');const source=document.getElementById('modalGermanWord')?.value.trim()||'',translation=document.getElementById('modalWordTranslation')?.value.trim()||'';if(!source||!translation)return;const info=enrichVocabularyWord(source);profile.words=Array.isArray(profile.words)?profile.words:[];profile.words.push({id:'vocab-'+Date.now(),source:info.source,base:info.base,german:info.display,word:info.display,kind:info.kind,enriched:info.enriched,translation,createdAt:Date.now()});save();close();view()};
    window.openWordMenu=function(rawWord){const word=String(rawWord||'').trim();window.open('<div class="dialog compact-dialog simple-word-dialog"><div class="dialog-top"><div><p class="eyebrow">PERSÖNLICHER WORTSCHATZ</p><h2>Vokabel speichern</h2></div><button class="icon">✕</button></div><form class="form personal-vocab-form" onsubmit="event.preventDefault();saveWordFromModal()"><label>Deutsches Wort<input id="modalGermanWord" value="'+esc(word)+'" oninput="previewVocabularyEnrichment(this,\'modalEnrichmentPreview\')" required></label><div id="modalEnrichmentPreview" class="enrichment-preview"></div><label>Eigene Übersetzung<input id="modalWordTranslation" required></label><div class="simple-vocab-actions"><button type="button" class="secondary" onclick="say(document.getElementById(\'modalGermanWord\').value)">🔊 Aussprache</button><button class="primary">+ Speichern</button></div></form></div>');previewVocabularyEnrichment(document.getElementById('modalGermanWord'),'modalEnrichmentPreview')};
    function normalizeTeacherVocabulary(){db.teacherVocab=Array.isArray(db.teacherVocab)?db.teacherVocab:[];let changed=false;db.teacherVocab.forEach((entry,index)=>{entry.id=entry.id||'teacher-'+index;const info=enrichVocabularyWord(entry.source||entry.word);if(!entry.source)entry.source=entry.word||info.source;if(entry.word!==info.display||!entry.kind){entry.word=info.display;entry.base=info.base;entry.kind=info.kind;entry.enriched=info.enriched;changed=true}});if(changed)save()}
    window.addTeacherWord=function(){if(!adminOK())return;normalizeTeacherVocabulary();const input=document.getElementById('teacherWord'),info=enrichVocabularyWord(input.value);if(!info.source)return;db.teacherVocab.push({id:'word-'+Date.now(),level:document.getElementById('teacherWordLevel').value,source:info.source,base:info.base,word:info.display,kind:info.kind,enriched:info.enriched});save();input.value=''};
    window.setVocabularyLevel=function(level){s.vocabLevel=level;view()};
    window.dict=function(){
      normalizeTeacherVocabulary();s.tab=s.tab==='mine'?'mine':'topics';s.vocabLevel=s.vocabLevel||s.level||'A1';const profile=window.prof?.()||{words:[],teacherTranslations:{}},records=(profile.words||[]).map(enrichedRecord).filter(entry=>entry.german),teacher=db.teacherVocab.filter(entry=>(entry.level||'A1')===s.vocabLevel);
      const tabs='<div class="vocabulary-tabs" role="tablist"><button role="tab" aria-selected="'+(s.tab==='topics')+'" class="'+(s.tab==='topics'?'active':'')+'" onclick="s.tab=\'topics\';view()">Lektions-Wortschatz / Pflicht-Vokabeln</button><button role="tab" aria-selected="'+(s.tab==='mine')+'" class="'+(s.tab==='mine'?'active':'')+'" onclick="s.tab=\'mine\';view()">Mein persönlicher Wortschatz <span>'+records.length+'</span></button></div>';
      if(s.tab==='topics'){const levels='<div class="levels vocab-levels">'+['A1','A2','B1','B2','C1','C2'].map(level=>'<button class="'+(s.vocabLevel===level?'active':'')+'" onclick="setVocabularyLevel(\''+level+'\')">'+level+'</button>').join('')+'</div>',cards=teacher.map(entry=>'<article class="card dictionary-card lesson-vocab-card"><p class="eyebrow">PFLICHT-VOKABEL · '+esc(entry.level||'A1')+'</p><h3>'+esc(entry.word)+'</h3><p class="word-type">'+esc(entry.kind||'Grundform')+'</p><label class="student-translation">Deine Übersetzung<input placeholder="Übersetzung selbst eintragen" value="'+esc(profile.teacherTranslations?.[entry.id]||'')+'" onchange="saveTeacherTranslation(\''+entry.id+'\',this.value)"></label><button class="speaker" onclick="say(\''+esc(entry.base||entry.word).replace(/&#39;/g,"\\'")+'\')">🔊 Aussprache</button>'+(adminOK()?'<button class="danger-button" onclick="deleteTeacherWordById(\''+entry.id+'\')">🗑️ Löschen</button>':'')+'</article>').join('');return'<div class="head"><div><p class="eyebrow">WORTSCHATZ</p><h2>Lektions-Wortschatz</h2><p class="muted">Pflicht-Vokabeln der Lehrerin mit vollständigen deutschen Formen.</p></div></div>'+tabs+levels+'<div class="grid cards lesson-vocab-grid">'+(cards||'<article class="card wide"><h3>Noch keine Pflicht-Vokabeln für '+esc(s.vocabLevel)+'</h3></article>')+'</div>'}
      const cards=records.map(entry=>'<article class="card dictionary-card personal-vocab-card"><div><p class="eyebrow">'+esc(entry.kind)+'</p><h3>'+esc(entry.german)+'</h3>'+(!entry.enriched?'<small class="form-note">Keine sichere Zusatzform im lokalen Lexikon – Grundform beibehalten.</small>':'')+'<p class="translation">'+esc(entry.translation||'Übersetzung noch nicht eingetragen')+'</p></div><div class="simple-vocab-card-actions"><button class="speaker" onclick="say(\''+esc(entry.base||entry.german).replace(/&#39;/g,"\\'")+'\')">🔊 Aussprache</button><button class="danger-button" onclick="deletePersonalWordById(\''+entry.id+'\')">🗑️ Löschen</button></div></article>').join('');return'<div class="head"><div><p class="eyebrow">WORTSCHATZ</p><h2>Mein persönlicher Wortschatz</h2><p class="muted">Ein Wort eingeben – sichere Artikel, Plural- oder Verbformen werden automatisch ergänzt.</p></div><button class="secondary" onclick="cards()">🃏 Karteikarten</button></div>'+tabs+'<form class="card personal-vocab-form" onsubmit="event.preventDefault();saveSimpleVocabulary()"><label>Deutsches Wort<input id="simpleGermanWord" placeholder="z. B. Name oder gehen" oninput="previewVocabularyEnrichment(this,\'personalEnrichmentPreview\')" required></label><div id="personalEnrichmentPreview" class="enrichment-preview" aria-live="polite"></div><label>Eigene Übersetzung<input id="simpleTranslation" placeholder="z. B. auf Russisch" required></label><div class="simple-vocab-actions"><button type="button" class="secondary" onclick="pronounceVocabularyInput()">🔊 Aussprache</button><button class="primary">+ Speichern</button></div></form><div class="grid cards personal-vocab-grid">'+(cards||'<article class="card wide"><h3>Noch keine persönlichen Vokabeln gespeichert.</h3></article>')+'</div>';
    };

    Object.assign(runtime.dictionary,{enrichVocabularyWord,enrichedRecord,normalizeTeacherVocabulary});
  };
})(window.Deutschraum,window.DeutschraumData);
