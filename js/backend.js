/* Deutschraum backend boundary. Feature modules must not call Supabase directly. */
(function (runtime, config) {
  const backend = runtime.backend = runtime.backend || {};
  const url = String(config?.supabaseUrl || '').trim();
  const publishableKey = String(config?.supabasePublishableKey || '').trim();
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) && /^(?:sb_publishable_|eyJ)[A-Za-z0-9._-]+$/.test(publishableKey);
  const sdkUrl = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  let client = null;
  let adminRole = false;
  let entitlement = null;

  function normalizeError(error, fallback = 'Verbindung fehlgeschlagen. Bitte später erneut versuchen.') {
    if (window.console?.warn) console.warn('[Deutschraum backend]', error?.code || error?.name || 'request_failed');
    return { message: fallback, code: error?.code || 'BACKEND_ERROR' };
  }

  function loadSdk() {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-deutschraum-supabase]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once:true });
        existing.addEventListener('error', () => reject(new Error('SUPABASE_SDK_LOAD_FAILED')), { once:true });
        return;
      }
      const script = document.createElement('script');
      script.src = sdkUrl;
      script.async = true;
      script.dataset.deutschraumSupabase = 'true';
      script.addEventListener('load', () => window.supabase?.createClient ? resolve(window.supabase) : reject(new Error('SUPABASE_SDK_UNAVAILABLE')), { once:true });
      script.addEventListener('error', () => reject(new Error('SUPABASE_SDK_LOAD_FAILED')), { once:true });
      document.head.append(script);
    });
  }

  backend.mode = configured ? 'supabase' : 'legacy';
  backend.isConfigured = () => configured;
  backend.isActive = () => Boolean(client);
  backend.hasAdminRole = () => configured ? adminRole : false;
  backend.hasPremiumEntitlement = () => configured && ['active','trialing'].includes(entitlement?.status);
  backend.normalizeError = normalizeError;

  backend.ready = configured
    ? loadSdk().then(sdk => {
        client = sdk.createClient(url, publishableKey, {
          auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
        });
        return client;
      }).catch(error => {
        normalizeError(error);
        return null;
      })
    : Promise.resolve(null);

  async function requireClient() {
    const active = await backend.ready;
    if (!active) throw normalizeError(null, 'Backend ist nicht konfiguriert.');
    return active;
  }

  async function currentUser(active) {
    const { data, error } = await active.auth.getUser();
    if (error) throw error;
    if (!data.user) throw { code:'AUTH_REQUIRED' };
    return data.user;
  }

  backend.auth = {
    async signUp(email, password) {
      try { const active=await requireClient(); const {data,error}=await active.auth.signUp({email,password}); if(error)throw error; return {ok:true,...data}; }
      catch(error){return{ok:false,error:normalizeError(error,'Registrierung fehlgeschlagen. Bitte Eingaben prüfen.')}}
    },
    async signIn(email, password) {
      try { const active=await requireClient(); const {data,error}=await active.auth.signInWithPassword({email,password}); if(error)throw error; return {ok:true,...data}; }
      catch(error){return{ok:false,error:normalizeError(error,'Anmeldung fehlgeschlagen. E-Mail oder Passwort prüfen.')}}
    },
    async signOut() {
      try { const active=await requireClient(); const {error}=await active.auth.signOut(); if(error)throw error; adminRole=false;entitlement=null;return{ok:true}; }
      catch(error){return{ok:false,error:normalizeError(error,'Abmeldung fehlgeschlagen. Bitte erneut versuchen.')}}
    },
    async getSession() {
      try { const active=await requireClient(); const {data,error}=await active.auth.getSession(); if(error)throw error; return{ok:true,session:data.session}; }
      catch(error){return{ok:false,session:null,error:normalizeError(error)}}
    },
    async getUser() {
      try { const active=await requireClient(); const user=await currentUser(active); return{ok:true,user}; }
      catch(error){return{ok:false,user:null,error:normalizeError(error,'Anmeldung erforderlich.')}}
    },
    async onAuthStateChange(callback) {
      const active=await backend.ready;
      if(!active)return{data:{subscription:null}};
      return active.auth.onAuthStateChange((event,session)=>callback(event,session));
    }
  };

  backend.profile = {
    async get() { try {const active=await requireClient(),user=await currentUser(active);const {data,error}=await active.from('profiles').select('id,display_name,role,created_at,updated_at').eq('id',user.id).single();if(error)throw error;return{ok:true,data}}catch(error){return{ok:false,data:null,error:normalizeError(error)}} },
    async update(values) { try {const active=await requireClient(),user=await currentUser(active),allowed={display_name:String(values?.display_name||'').trim()||null};const {data,error}=await active.from('profiles').update(allowed).eq('id',user.id).select('id,display_name,role,updated_at').single();if(error)throw error;return{ok:true,data}}catch(error){return{ok:false,data:null,error:normalizeError(error)}} }
  };

  backend.isAdmin = async function () {
    if (!configured) return false;
    const result = await backend.profile.get();
    adminRole = result.ok && result.data?.role === 'admin';
    return adminRole;
  };

  backend.getEntitlement = async function () {
    if (!configured) return null;
    try {const active=await requireClient(),user=await currentUser(active);const {data,error}=await active.from('entitlements').select('plan,status,provider,valid_until,updated_at').eq('user_id',user.id).maybeSingle();if(error)throw error;entitlement=data;return data}
    catch(error){normalizeError(error);entitlement=null;return null}
  };

  backend.progress = {
    async getProgress(){try{const active=await requireClient();const {data,error}=await active.from('progress').select('lesson_id,task_id,completed,score,state,updated_at').order('updated_at');if(error)throw error;return{ok:true,data:data||[]}}catch(error){return{ok:false,data:[],error:normalizeError(error)}}},
    async saveProgress(record){try{const active=await requireClient(),user=await currentUser(active),row={user_id:user.id,lesson_id:String(record.lesson_id),task_id:String(record.task_id||''),completed:Boolean(record.completed),score:Number.isFinite(record.score)?record.score:null,state:record.state&&typeof record.state==='object'?record.state:{}};const {data,error}=await active.from('progress').upsert(row,{onConflict:'user_id,lesson_id,task_id'}).select().single();if(error)throw error;return{ok:true,data}}catch(error){return{ok:false,data:null,error:normalizeError(error)}}},
    mergeProgress(localRows,remoteRows){const merged=new Map();[...(remoteRows||[]),...(localRows||[])].forEach(row=>{const key=String(row.lesson_id)+'::'+String(row.task_id||''),old=merged.get(key);if(!old){merged.set(key,{...row});return}merged.set(key,{...old,...row,completed:Boolean(old.completed||row.completed),score:Math.max(Number(old.score)||0,Number(row.score)||0),updated_at:new Date(Math.max(Date.parse(old.updated_at)||0,Date.parse(row.updated_at)||0)).toISOString()})});return[...merged.values()]}
  };

  backend.vocabulary = {
    async getVocabulary(){try{const active=await requireClient();const {data,error}=await active.from('user_vocabulary').select('id,word_key,word,word_type,forms,translation,learning_state,created_at,updated_at').order('created_at');if(error)throw error;return{ok:true,data:data||[]}}catch(error){return{ok:false,data:[],error:normalizeError(error)}}},
    async saveWord(record){try{const active=await requireClient(),user=await currentUser(active),word=String(record.word||record.german||record.base||'').trim(),row={user_id:user.id,word_key:String(record.word_key||word).trim().toLocaleLowerCase('de-DE'),word,word_type:String(record.word_type||record.kind||'').trim()||null,forms:record.forms&&typeof record.forms==='object'?record.forms:{display:String(record.forms||'')},translation:String(record.translation||''),learning_state:record.learning_state&&typeof record.learning_state==='object'?record.learning_state:{}};const {data,error}=await active.from('user_vocabulary').upsert(row,{onConflict:'user_id,word_key'}).select().single();if(error)throw error;return{ok:true,data}}catch(error){return{ok:false,data:null,error:normalizeError(error)}}},
    async updateWord(id,values){try{const active=await requireClient();const allowed={translation:String(values?.translation||''),learning_state:values?.learning_state&&typeof values.learning_state==='object'?values.learning_state:{}};const {data,error}=await active.from('user_vocabulary').update(allowed).eq('id',id).select().single();if(error)throw error;return{ok:true,data}}catch(error){return{ok:false,data:null,error:normalizeError(error)}}},
    async removeWord(id){try{const active=await requireClient();const {error}=await active.from('user_vocabulary').delete().eq('id',id);if(error)throw error;return{ok:true}}catch(error){return{ok:false,error:normalizeError(error)}}}
  };

  backend.content = {
    async getPublished(){try{const active=await requireClient();const {data,error}=await active.from('content_items').select('id,level,section,topic,content_type,payload,version,updated_at').eq('publication_status','published').order('updated_at');if(error)throw error;return{ok:true,data:data||[]}}catch(error){return{ok:false,data:[],error:normalizeError(error)}}},
    async save(item){try{const active=await requireClient(),user=await currentUser(active),row={id:String(item.id),level:item.level||null,section:String(item.section),topic:String(item.topic),content_type:String(item.content_type||item.type),payload:item.payload&&typeof item.payload==='object'?item.payload:{},publication_status:item.publication_status||'draft',version:Number(item.version)||1,created_by:user.id};const {data,error}=await active.from('content_items').upsert(row).select().single();if(error)throw error;return{ok:true,data}}catch(error){return{ok:false,data:null,error:normalizeError(error,'Inhalt konnte nicht gespeichert werden.')}}},
    async remove(id){try{const active=await requireClient();const {error}=await active.from('content_items').delete().eq('id',String(id));if(error)throw error;return{ok:true}}catch(error){return{ok:false,error:normalizeError(error,'Inhalt konnte nicht gelöscht werden.')}}}
  };

  if (!configured && window.console?.warn) console.warn('[Deutschraum] Supabase is not configured; legacy local mode is active and is NOT FOR PRODUCTION.');
})(window.Deutschraum, window.DEUTSCHRAUM_CONFIG);
