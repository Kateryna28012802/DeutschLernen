/* Deutschraum: app responsibilities. Classic scripts preserve HTML handler compatibility. */
window.Deutschraum = window.Deutschraum || {};
Deutschraum.state = Deutschraum.state || {};
Deutschraum.utils = Deutschraum.utils || {};
Deutschraum.app = Deutschraum.app || {};
Deutschraum.lessons = Deutschraum.lessons || {};
Deutschraum.exercises = Deutschraum.exercises || {};
Deutschraum.dictionary = Deutschraum.dictionary || {};
Deutschraum.progress = Deutschraum.progress || {};
Deutschraum.admin = Deutschraum.admin || {};
Deutschraum.auth = Deutschraum.auth || {};
Deutschraum.payments = Deutschraum.payments || {};
const ADMIN='e.sokolenko280128@gmail.com',K='deutschraum-live-v1',D={users:{},content:[],analytics:{premium:0,views:{}},settings:{money:false,stripePublic:'',legal:{name:'[Name]',address:'[Adresse]',email:'[E-Mail]',tax:'[Steuernummer]'}}};
function readStored(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
const storedDb=readStored(K,{});
let db=Object.assign({},D,storedDb);
db.settings=Object.assign({},D.settings,storedDb.settings||{});
db.settings.legal=Object.assign({},D.settings.legal,storedDb.settings?.legal||{});
db.analytics=Object.assign({},D.analytics,storedDb.analytics||{});
let user=readStored(K+'-session',null),s={page:'levels',level:'A1',tab:'topics'};const nav=[['levels','📚','Niveaus'],['dict','📖','Wortschatz'],['career','💼','Beruf']];
function save(){localStorage.setItem(K,JSON.stringify(db));localStorage.setItem(K+'-session',JSON.stringify(user))}
function adminOK(){return user&&user.email.toLowerCase()===ADMIN}
function prof(){if(!user)return null;return db.users[user.email]||(db.users[user.email]={done:[],right:0,answers:0,words:[],last:{page:'levels',level:'A1'}})}
function go(p){s.page=p;view()}
function n(i){return '<button class="'+(s.page===i[0]?'active':'')+'" onclick="go(\''+i[0]+'\')">'+i[1]+' '+i[2]+'</button>'}
function shell(){document.getElementById('sideNav').innerHTML=nav.map(n).join('');document.getElementById('mobileNav').innerHTML=nav.map(n).join('');document.getElementById('adminOpen').classList.toggle('is-admin',adminOK());document.getElementById('auth').innerHTML=!user?'<button class="secondary" onclick="login(\'login\')">Anmelden</button><button class="primary" onclick="login(\'register\')">Registrieren</button>':'<button class="icon" onclick="document.getElementById(\'menu\').classList.toggle(\'hidden\')">'+user.email[0].toUpperCase()+'</button><div id="menu" class="profile hidden"><p class="muted">'+user.email+'</p><button onclick="profile()">Mein Profil</button><button onclick="logout()">Abmelden</button></div>'}
function view(){if(user){prof().last={page:s.page,level:s.level};save()}shell();document.getElementById('headerTitle').textContent=s.page==='levels'?'Deutsche Sprachniveaus':s.page==='dict'?'Wortschatz & Mein Wörterbuch':'Beruf & Spezial';document.getElementById('appView').innerHTML=s.page==='levels'?levels():s.page==='dict'?dict():career()}
function career(){let a=['Medizin & Pflege','Kita & Erzieher','Ämter & Behörden','Logistik & Transport','Handwerk','Gastronomie & Hotel','IT & Büro','Einzelhandel','Beauty & Wellness'];return '<div class="hero"><p class="eyebrow">BERUFSDEUTSCH</p><h1>Kompetent sprechen. Sicher auftreten.</h1><p>Praxisdialoge und Fachwortschatz für deinen Beruf.</p></div>'+(db.settings.money?gate():'')+'<div class="grid cards">'+a.map(x=>'<article class="card"><h3>💼 '+x+'</h3><p class="muted">Fachwortschatz und Praxisdialoge.</p><button class="primary" onclick="course(\''+x+'\')">Module öffnen</button></article>').join('')+'</div>'}
function course(x){if(db.settings.money)return premium();db.analytics.views[x]=(db.analytics.views[x]||0)+1;save();open('<div class="dialog"><div class="dialog-top"><h2>'+x+'</h2><button class="icon" onclick="close()">✕</button></div><p>Guten Tag, wie kann ich Ihnen helfen? <button class="speaker" onclick="say(\'Guten Tag, wie kann ich Ihnen helfen?\')">🔊</button></p></div>')}
function gate(){return '<div class="lock"><h3>🔒 Premium-Bereich</h3><p class="muted">Dieser Inhalt ist mit aktivierter Monetarisierung Teil von Premium.</p><button class="primary" onclick="premium()">Premium freischalten</button></div>'}
function legal(t){let l=db.settings.legal;open('<div class="dialog"><div class="dialog-top"><h2>'+ (t==='imp'?'Impressum':'Datenschutzerklärung') +'</h2><button class="icon" onclick="close()">✕</button></div>'+(t==='imp'?'<p><b>'+esc(l.name)+'</b><br>'+esc(l.address)+'<br>E-Mail: '+esc(l.email)+'<br>Steuernummer: '+esc(l.tax)+'</p><p class="muted">Vor Livegang rechtlich vervollständigen und prüfen.</p>':'<p>Diese statische Demo speichert Sitzung, Lernfortschritt und Wörter lokal im Browser. Beim Einsatz eines Backends müssen Datenschutzhinweise vollständig ergänzt werden.</p>')+'</div>')}
function say(x){speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(x);u.lang='de-DE';speechSynthesis.speak(u)}
function open(x){const modalEl=document.getElementById('modal');modalEl.innerHTML=x;modalEl.classList.add('show');configureAdminSection();const closeButton=modalEl.querySelector('.dialog-top .icon');if(closeButton){closeButton.classList.add('modal-close');closeButton.addEventListener('click',close)}}
function close(){const modalEl=document.getElementById('modal');modalEl.classList.remove('show');modalEl.innerHTML=''}
function esc(x){return String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function normalize(x){return String(x||'').trim().toUpperCase()}
function taskIdentity(item){return String(item.id||('task-'+Number(item.date)))}

Object.defineProperties(Deutschraum.state, {
  db: { get: () => db },
  user: { get: () => user },
  route: { get: () => s },
  storageKey: { value: K, enumerable: true }
});
Deutschraum.utils.escape = esc;
Deutschraum.utils.normalize = normalize;
Object.assign(Deutschraum.app, { save, go, shell, view, open, close, say, taskIdentity });
