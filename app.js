(() => {
  'use strict';
  const cfg=window.VB_CONFIG||{};
  const configured=Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  // Demo access requires a live, verified Supabase admin session. A query flag never grants access.
  const requestedDemo=new URLSearchParams(window.location.search).get('demo')==='1';
  let demo=false;
  const db=configured&&window.supabase?.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey) || null;
  const $=s=>document.querySelector(s);
  const safe=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const id=()=>globalThis.crypto?.randomUUID?.()||`demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const localDate=()=>{const d=new Date(),z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;};
  const niceDate=v=>{if(!v)return '';const [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});};
  const plural=(n,s)=>`${n} ${s}${n===1?'':'s'}`;
  const POSITIONS=['Unspecified','Setter','Outside Hitter','Opposite','Middle Blocker','Libero','Defensive Specialist','Utility'];
  const PRESETS={beginner:1000,intermediate:1200,advanced:1500};
  const GENDERS=['Unspecified','Woman','Man','Nonbinary'];
  const genderOptions=(selected='Unspecified')=>GENDERS.map(g=>`<option value="${g}" ${g===selected?'selected':''}>${g==='Unspecified'?'Not specified':g}</option>`).join('');
  const positionOptions=(selected='Unspecified',includeAll=false)=>`${includeAll?'<option value="All">All positions</option>':''}${POSITIONS.map(position=>`<option value="${safe(position)}" ${selected===position?'selected':''}>${safe(position)}</option>`).join('')}`;

  const priorityRoster=()=>[...(pub?.roster||[])].sort((a,b)=>(a.rounds_played||0)-(b.rounds_played||0)||String(a.checked_at).localeCompare(String(b.checked_at)));

  // Brand style is site-wide, chosen by an approved admin. Light/dark remains device-local.
  let siteBrand='rallyrank', brandError=false, demoBrand=null;
  function applyBrand(style){
    const chosen=style==='cos'?'cos':'rallyrank';
    document.documentElement.dataset.brand=chosen;
    const meta=document.querySelector('meta[name=theme-color]');
    if(meta)meta.content=chosen==='cos'?'#072b44':(document.documentElement.dataset.theme==='dark'?'#0b1323':'#071d49');
  }
  async function loadSiteBrand(){
    if(demo){applyBrand(demoBrand||siteBrand);return;}
    if(!db){applyBrand(siteBrand);return;}
    try{
      const {data,error}=await db.rpc('vmm_get_site_theme');
      if(error)throw error;
      siteBrand=data==='cos'?'cos':'rallyrank';brandError=false;applyBrand(siteBrand);
    }catch(e){brandError=true;applyBrand(siteBrand);}
  }
  function applyTheme(theme){
    const dark=theme==='dark';
    if(document.documentElement?.dataset)document.documentElement.dataset.theme=dark?'dark':'light';
    const toggle=$('#theme-toggle');
    if(toggle){toggle.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');toggle.setAttribute('aria-pressed',String(dark));toggle.querySelector('.theme-symbol').textContent=dark?'☀':'☾';toggle.querySelector('.theme-label').textContent=dark?'Light':'Dark';}
    const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content=document.documentElement.dataset.brand==='cos'?'#072b44':(dark?'#0b1323':'#071d49');
  }
  $('#theme-toggle')?.addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    try{localStorage.setItem('rallyrank-theme',next);}catch(e){}
    applyTheme(next);
  });
  if(document.documentElement?.dataset)applyTheme(document.documentElement.dataset.theme);
  let tab='courts',pub=null,admin=null,user=null,adminGranted=false,loading=false,mutating=false;
  let lastError='',searchText='',lastFlashTimer=null,leaderboardPosition='All',leaderboardTier='All';
  const expandedRankingTiers=new Set();
  const PLACEMENT_GAMES=12,CHALLENGER_GAMES=18,PLACEMENT_MULTIPLIER=2;
  const matchesPlayed=p=>Number(p?.wins||0)+Number(p?.losses||0);
  const placementLeft=p=>Math.max(0,PLACEMENT_GAMES-matchesPlayed(p));
  function placementStatus(p){const played=matchesPlayed(p),remaining=placementLeft(p);return remaining?`Placement ${played}/${PLACEMENT_GAMES} · ${remaining} ${remaining===1?'match':'matches'} remaining`:`Placement complete · ${played} played`;}
  function challengerStatus(p){const played=matchesPlayed(p),remaining=Math.max(0,CHALLENGER_GAMES-played);return remaining?`${remaining} ${remaining===1?'match':'matches'} until Challenger eligibility`:`Challenger eligible (${played} matches)`;}
  let attendanceSearch='',attendanceDropdownOpen=false,attendanceActive=0;
  let publicAttendanceSearch='';
  const APP_VERSION='1.19';
  if(document.body?.dataset)document.body.dataset.rallyrankVersion=APP_VERSION;
  let showAllProfiles=false;
  let demoData=null, modeEpoch=0;
  const SAMPLE=[['Alex R.',1460],['Sam D.',1190],['Taylor P.',1030],['Jordan C.',1260],['Morgan B.',910],['Casey G.',1080],['Avery K.',1350],['Riley F.',980],['Jamie L.',820],['Drew T.',1240],['Parker M.',1110],['Cameron S.',1020],['Quinn V.',950],['Reese H.',1380],['Hayden W.',1160],['Blake E.',860],['Rowan A.',1300],['Dakota N.',1000],['Skyler J.',1140],['Kendall O.',930],['Finley Z.',1490],['Marley U.',940],['Emerson Q.',1050],['Robin I.',1220],['Nico J.',1100],['Sydney Y.',940],['Alexis N.',1310],['Ari V.',1180],['Mia P.',1010],['Noah B.',975],['Lena V.',1030],['Mateo L.',1005],['Sofia C.',950],['Eli T.',1065],['Nina G.',990],['Leo H.',1125],['Isla M.',1045],['Owen R.',1000],['Zoe A.',970],['Max P.',1230],['Jules K.',1510],['Kai W.',980],['Ivy S.',1030],['Chris U.',940]];
  function seedDemo(){return {event:{id:id(),title:'Open Volleyball',date:localDate(),team_size:6,court_mode:'mixed',gender_balance:false,round_number:1,duration_minutes:180,status:'open'},archives:[],players:SAMPLE.map(([name,mmr],i)=>({id:id(),name,mmr,position:POSITIONS[1+i%6],wins:0,losses:0,gender:['Man','Woman','Man','Woman','Man','Nonbinary','Woman','Unspecified'][i%8]})),signups:[],teams:[],matches:[],history:[]};}
  function readDemo(){try{const s=localStorage.getItem('rallyrank-demo-v107');if(s){demoData=JSON.parse(s);demoData.archives||=[];demoData.players.forEach((p,i)=>{p.position||='Unspecified';if(!GENDERS.includes(p.gender))p.gender=['Woman','Man','Man','Woman','Unspecified','Nonbinary'][i%6];});if(demoData.event){demoData.event.round_number||=1;demoData.event.duration_minutes=180;demoData.event.court_mode||='mixed';demoData.event.gender_balance??=false;}return;}}catch(e){}demoData=seedDemo();demoData.signups=demoData.players.slice(0,36).map((p,i)=>({player_id:p.id,checked_at:new Date(Date.now()+i*1000).toISOString()}));storeDemo();}
  function storeDemo(){try{localStorage.setItem('rallyrank-demo-v107',JSON.stringify(demoData));}catch(e){}}
  function demoState(){const x=demoData;return {event:x.event?{...x.event,player_count:x.signups.length,capacity:x.event.team_size*6,completed_rounds:x.archives.length}:null,
    roster:x.signups.map(s=>{const p=x.players.find(p=>p.id===s.player_id);return {id:p.id,name:p.name,checked_at:s.checked_at,team_id:x.teams.find(t=>t.players.some(y=>y.id===p.id))?.id||null,rounds_played:x.archives.filter(a=>a.teams.some(t=>t.players.some(y=>y.id===p.id))).length};}),
    // Demo mirrors the safe, names-only attendance field returned by the public RPC.
    checked_in_names:x.signups.map(s=>x.players.find(p=>p.id===s.player_id)?.name).filter(Boolean).sort((a,b)=>a.localeCompare(b)),
    teams:x.teams,matches:x.matches.map(({mmr_changes,...match})=>match)};}
  function demoLeaderboard(){return [...demoData.players].sort((a,b)=>b.mmr-a.mmr||b.wins-a.wins||a.name.localeCompare(b.name)).map(p=>({id:p.id,name:p.name,position:p.position||'Unspecified',wins:p.wins,losses:p.losses,mmr:p.mmr}));}
  function average(team){const registered=team.players.filter(p=>!p.is_placeholder).map(p=>demoData.players.find(x=>x.id===p.id));if(!registered.length)throw Error('Each team needs a registered player.');return registered.reduce((n,p)=>n+p.mmr,0)/registered.length;}
  function demoAction(fn){fn();storeDemo();return Promise.resolve(null);}
  const api={
    async getPublic(){if(demo)return demoState();if(!db)return {event:null,roster:[],checked_in_names:[],teams:[],matches:[]};const {data,error}=await db.rpc('vmm_get_state');if(error)throw error;return data;},
    async getAdmin(){if(demo)return {...demoState(),players:demoData.players,match_changes:demoData.matches.flatMap(m=>(m.mmr_changes||[]).map(c=>({...c,match_id:m.id}))),previous_teams:demoData.archives.at(-1)?.teams.map(t=>t.players.map(p=>p.id))||[],gender_balance:demoData.event?.gender_balance===true};
      const {data,error}=await db.rpc('vmm_get_admin_state');if(error)throw error;
      const {data:changes,error:changesError}=await db.rpc('vmm_get_admin_match_changes');if(changesError)throw changesError;
      return {...data,match_changes:changes||[]};},
    async addPlayer(name,tier,position,checkIn,gender='Unspecified'){if(demo)return demoAction(()=>{
      const clean=name.trim().replace(/\s+/g,' ');
      if(clean.length<2||clean.length>45||!/[a-z0-9]/i.test(clean))throw Error('Enter a valid name between 2 and 45 characters.');
      if(!Object.hasOwn(PRESETS,tier)||!POSITIONS.includes(position)||!GENDERS.includes(gender))throw Error('Choose a valid skill level, position, and gender.');
      if(demoData.players.some(p=>p.name.toLocaleLowerCase()===clean.toLocaleLowerCase()))throw Error('Player already exists. Use their profile below.');
      if(checkIn&&demoData.event?.status!=='open')throw Error('Open a session before checking players in.');
      if(checkIn&&demoData.signups.length>=96)throw Error('Signup limit reached.');
      const p={id:id(),name:clean,mmr:PRESETS[tier],position,gender,wins:0,losses:0};demoData.players.push(p);
      if(checkIn)demoData.signups.push({player_id:p.id,checked_at:new Date().toISOString()});
    });const {error}=await db.rpc('vmm_admin_add_player',{p_name:name,p_tier:tier,p_position:position,p_check_in:checkIn,p_gender:gender});if(error)throw error;},
    async checkIn(pid){if(demo)return demoAction(()=>{
      if(demoData.event?.status!=='open')throw Error('Signups are not open.');
      if(!demoData.players.some(p=>p.id===pid))throw Error('Player not found.');
      if(demoData.signups.some(s=>s.player_id===pid))throw Error('Player already checked in.');
      if(demoData.signups.length>=96)throw Error('Signup limit reached.');
      demoData.signups.push({player_id:pid,checked_at:new Date().toISOString()});
    });const {error}=await db.rpc('vmm_admin_check_in_player',{p_player_id:pid});if(error)throw error;},
    async updatePlayer(pid,mmr,position,gender='Unspecified'){if(demo)return demoAction(()=>{
      const p=demoData.players.find(p=>p.id===pid);if(!p)throw Error('Player not found.');
      if(!POSITIONS.includes(position)||!GENDERS.includes(gender)||!Number.isInteger(mmr)||mmr<500||mmr>2500)throw Error('Invalid rating or preferred position.');
      if(p.mmr!==mmr&&demoData.event?.status==='locked'&&demoData.teams.some(t=>t.players.some(tp=>tp.id===pid)))throw Error('Cannot modify MMR during an active round. Position changes are allowed.');
      p.mmr=mmr;p.position=position;p.gender=gender;
    });const {error}=await db.rpc('vmm_update_player',{p_player_id:pid,p_mmr:mmr,p_position:position,p_gender:gender});if(error)throw error;},
    async deletePlayer(pid){if(demo)return demoAction(()=>{
      const p=demoData.players.find(p=>p.id===pid);
      if(!p)throw Error('Player not found.');
      if(matchesPlayed(p)>0)throw Error('This player has match history and cannot be deleted. Historical results must remain accurate.');
      if(demoData.event?.status==='locked'&&demoData.teams.some(t=>t.players.some(tp=>!tp.is_placeholder&&tp.id===pid)))throw Error('This player is assigned to an active round. Finish or reset the round first.');
      demoData.signups=demoData.signups.filter(s=>s.player_id!==pid);
      demoData.players=demoData.players.filter(player=>player.id!==pid);
    });
      const {error}=await db.rpc('vmm_admin_delete_player',{p_player_id:pid});if(error)throw error;
    },
    async createEvent(title,date,size){if(demo)return demoAction(()=>{if(demoData.event)throw Error('Finish the existing event first.');demoData.event={id:id(),title,date,team_size:size,court_mode:'mixed',gender_balance:false,round_number:1,duration_minutes:180,status:'open'};demoData.signups=[];demoData.teams=[];demoData.matches=[];demoData.history=[];demoData.archives=[];});const {error}=await db.rpc('vmm_create_event',{p_title:title,p_date:date,p_team_size:size});if(error)throw error;},
    async setCourtMode(eventId,mode){
      if(!['mixed','split'].includes(mode))throw Error('Invalid court setup.');
      if(demo)return demoAction(()=>{
        if(demoData.event?.id!==eventId||demoData.event.status!=='open')throw Error('Court setup can only change before teams are published.');
        demoData.event.court_mode=mode;
      });
      const {error}=await db.rpc('vmm_set_court_mode',{p_event_id:eventId,p_mode:mode});if(error)throw error;
    },
    async setGenderBalance(eventId,enabled){
      if(typeof enabled!=='boolean')throw Error('Invalid balancing setting.');
      if(demo)return demoAction(()=>{
        if(demoData.event?.id!==eventId||demoData.event.status!=='open')throw Error('Gender balancing can only change before teams are published.');
        demoData.event.gender_balance=enabled;
      });
      const {error}=await db.rpc('vmm_set_gender_balance',{p_event_id:eventId,p_enabled:enabled});if(error)throw error;
    },
    async setMmr(pid,mmr){if(demo)return demoAction(()=>{if(demoData.event?.status==='locked'&&demoData.teams.some(t=>t.players.some(p=>p.id===pid)))throw Error('Cannot modify a player in an active round.');const p=demoData.players.find(x=>x.id===pid);if(!p)throw Error('Player not found.');p.mmr=mmr;});const {error}=await db.rpc('vmm_set_mmr',{p_player_id:pid,p_mmr:mmr});if(error)throw error;},
    async removeSignup(eventId,pid){if(demo)return demoAction(()=>{if(demoData.event?.status!=='open')throw Error('Teams are already published.');demoData.signups=demoData.signups.filter(s=>s.player_id!==pid);});const {error}=await db.rpc('vmm_remove_signup',{p_event_id:eventId,p_player_id:pid});if(error)throw error;},
    async publish(eventId,groups){if(demo)return demoAction(()=>{if(demoData.event?.status!=='open')throw Error('Signups are closed.');if(groups.length!==6)throw Error('Six teams required.');demoData.teams=groups.map((people,i)=>({id:id(),court:Math.floor(i/3)+1,number:i%3+1,players:people.map(p=>({id:p.id,name:p.name,is_placeholder:Boolean(p.is_placeholder)}))}));demoData.matches=[];for(let court=1;court<=2;court++){const [a,b,c]=demoData.teams.filter(t=>t.court===court);demoData.matches.push({id:id(),court,order:1,team_a_id:a.id,team_b_id:b.id,winner_team_id:null,score_a:null,score_b:null,completed_seq:null},{id:id(),court,order:2,team_a_id:null,team_b_id:c.id,winner_team_id:null,score_a:null,score_b:null,completed_seq:null},{id:id(),court,order:3,team_a_id:null,team_b_id:c.id,winner_team_id:null,score_a:null,score_b:null,completed_seq:null});}demoData.event.status='locked';});const {error}=await db.rpc('vmm_publish_teams',{p_event_id:eventId,p_teams:groups.map(g=>g.map(p=>p.id))});if(error)throw error;},
    async report(mid,winner,scoreA,scoreB){if(demo)return demoAction(()=>{const m=demoData.matches.find(m=>m.id===mid);if(!m||m.winner_team_id||!m.team_a_id||!m.team_b_id)throw Error('Match is not ready.');if(demoData.matches.some(x=>x.court===m.court&&x.order<m.order&&!x.winner_team_id))throw Error('Previous court match is unfinished.');const winning=demoData.teams.find(t=>t.id===winner),losing=demoData.teams.find(t=>t.id===(winner===m.team_a_id?m.team_b_id:m.team_a_id));if(!winning||!losing)throw Error('Invalid winner.');const delta=window.RallyMath.matchSwing(average(winning),average(losing),scoreA,scoreB);const changes=[],ratingChanges=[];for(const [team,win] of [[winning,true],[losing,false]])for(const tp of team.players.filter(p=>!p.is_placeholder)){const p=demoData.players.find(x=>x.id===tp.id);changes.push({id:p.id,mmr:p.mmr,wins:p.wins,losses:p.losses});const adjusted=delta*(placementLeft(p)>0?PLACEMENT_MULTIPLIER:1);p.mmr=Math.max(500,Math.min(2500,p.mmr+(win?adjusted:-adjusted)));if(win)p.wins++;else p.losses++;ratingChanges.push({player_id:p.id,player_name:p.name,team_id:team.id,before_mmr:changes.at(-1).mmr,after_mmr:p.mmr,delta:p.mmr-changes.at(-1).mmr});}m.mmr_changes=ratingChanges;m.winner_team_id=winner;m.score_a=scoreA;m.score_b=scoreB;m.completed_seq=demoData.history.length+1;demoData.history.push({mid,changes});if(m.order===1){demoData.matches.find(x=>x.court===m.court&&x.order===2).team_a_id=winner;demoData.matches.find(x=>x.court===m.court&&x.order===3).team_a_id=losing.id;}});const {error}=await db.rpc('vmm_report_result',{p_match_id:mid,p_winner_team_id:winner,p_score_a:scoreA,p_score_b:scoreB});if(error)throw error;},
    async undo(eventId){if(demo)return demoAction(()=>{const previous=demoData.history.pop();if(!previous)throw Error('Nothing to undo.');for(const ch of previous.changes){const p=demoData.players.find(x=>x.id===ch.id);Object.assign(p,{mmr:ch.mmr,wins:ch.wins,losses:ch.losses});}const m=demoData.matches.find(x=>x.id===previous.mid);m.winner_team_id=null;m.score_a=null;m.score_b=null;m.completed_seq=null;m.mmr_changes=[];if(m.order===1){demoData.matches.find(x=>x.court===m.court&&x.order===2).team_a_id=null;demoData.matches.find(x=>x.court===m.court&&x.order===3).team_a_id=null;}});const {error}=await db.rpc('vmm_undo_last_result',{p_event_id:eventId});if(error)throw error;},
    async resetRound(eventId){if(demo)return demoAction(()=>{if(demoData.history.length)throw Error('Undo results before reshuffling.');demoData.teams=[];demoData.matches=[];demoData.event.status='open';});const {error}=await db.rpc('vmm_reset_round',{p_event_id:eventId});if(error)throw error;},
    async nextRound(eventId){if(demo)return demoAction(()=>{
      if(!demoData.event||demoData.event.id!==eventId||demoData.event.status!=='locked'||demoData.matches.length!==6||demoData.matches.some(m=>!m.winner_team_id))throw Error('Complete all six matches before starting another round.');
      demoData.archives.push({round:demoData.event.round_number,teams:structuredClone(demoData.teams),matches:structuredClone(demoData.matches),changes:structuredClone(demoData.history)});
      demoData.teams=[];demoData.matches=[];demoData.history=[];demoData.event.round_number++;demoData.event.status='open';
    });const {error}=await db.rpc('vmm_advance_round',{p_event_id:eventId});if(error)throw error;},
    async closeEvent(eventId){if(demo)return demoAction(()=>{demoData.event=null;demoData.signups=[];demoData.teams=[];demoData.matches=[];demoData.history=[];demoData.archives=[];});const {error}=await db.rpc('vmm_close_event',{p_event_id:eventId});if(error)throw error;}
  };
  function flash(message,error=false){const el=$('#flash');el.hidden=false;el.textContent=message;el.className='flash'+(error?' error':'');if(lastFlashTimer)clearTimeout(lastFlashTimer);lastFlashTimer=setTimeout(()=>el.hidden=true,6500);}
  function errText(e){return e?.message||String(e||'Something went wrong.');}
  function isPrivateTab(name){return name==='signup'||name==='leaderboard';}
  function enforceAdminNavigation(){
    document.querySelectorAll('.nav-tab[data-tab="signup"], .nav-tab[data-tab="leaderboard"]').forEach(el=>{el.hidden=!adminGranted;});
    const toggle=$('#demo-toggle');if(toggle)toggle.hidden=!adminGranted || !configured;
    if(!adminGranted && isPrivateTab(tab))switchTab('courts');
  }
  // Server RPC performs vmm_assert_admin. Neither localStorage nor ?demo=1 grants admin status.
  async function verifyAdmin(){
    if(!db)return false;
    const {data:identity,error:identityError}=await db.auth.getUser();
    if(identityError||!identity?.user)return false;
    user=identity.user;
    const {error}=await db.rpc('vmm_get_admin_state');
    return !error;
  }
  async function refresh(force=false){
    if(loading&&!force)return;
    loading=true;
    const epoch=modeEpoch;
    try{
      // Re-check server authorization during demo too, including when an admin is revoked or signs out.
      if(demo && !(await verifyAdmin())){
        if(epoch!==modeEpoch)return;
        demo=false;adminGranted=false;admin=null;modeEpoch++;
        const url=new URL(window.location.href);url.searchParams.delete('demo');
        if(['http:','https:'].includes(url.protocol))window.history.replaceState(null,'',url.pathname+url.search+'#courts');
        flash('Admin access is required for Demo Mode. Please sign in again.',true);
        await refresh(true);return;
      }
      const next=await api.getPublic();
      if(epoch!==modeEpoch)return;
      pub=next;
      if(demo){admin=await api.getAdmin();if(epoch!==modeEpoch)return;adminGranted=true;}
      else if(user){try{admin=await api.getAdmin();if(epoch!==modeEpoch)return;adminGranted=true;}catch(e){if(epoch!==modeEpoch)return;adminGranted=false;admin=null;}}
      else{admin=null;adminGranted=false;}
      await loadSiteBrand();
      if(epoch!==modeEpoch)return;
      enforceAdminNavigation();
      if(adminGranted||!user)lastError='';
      render();
      $('#connection-status').textContent=!configured?'Setup required':demo?'LOCAL SANDBOX':'Synced';
    }catch(e){if(epoch!==modeEpoch)return;if(lastError!==errText(e)){flash(`Connection error: ${errText(e)}`,true);lastError=errText(e);}$('#connection-status').textContent='Connection failed';}
    finally{if(epoch===modeEpoch)loading=false;}
  }
  async function setDemoMode(enable){
    if(enable){
      if(!configured||!db||!user||!await verifyAdmin()){
        adminGranted=false;admin=null;enforceAdminNavigation();
        flash('Demo Mode is for approved admins. Sign in through the Admin tab first.',true);switchTab('admin');
        return false;
      }
      adminGranted=true;
    }
    if(!enable&&!configured){flash('A Supabase connection is required.',true);return false;}
    if(demo===enable)return true;
    modeEpoch++;demo=enable;
    if(enable)demoBrand=siteBrand;else demoBrand=null;
    applyBrand(enable?demoBrand:siteBrand);
    pub=null;admin=null;lastError='';searchText='';attendanceSearch='';attendanceDropdownOpen=false;
    const url=new URL(window.location.href);
    if(enable){url.searchParams.set('demo','1');readDemo();}
    else{url.searchParams.delete('demo');if(db){const {data,error}=await db.auth.getSession();if(error)flash('Could not check sign-in status: '+errText(error),true);user=data?.session?.user||null;}}
    if(url.protocol==='http:'||url.protocol==='https:'){try{window.history.replaceState(null,'',url.pathname+url.search+url.hash);}catch(e){/* no history in local previews */}}
    await refresh(true);
    if(enable?demo:!demo){flash(enable?'Private Demo Mode started. Nothing will be saved to live Supabase.':'Back to live courts. Demo changes were not uploaded.');}
    return true;
  }
  function loadDemoScenario(count){
    if(!demo)throw Error('Practice scenarios only run in Demo Mode.');
    demoData=seedDemo();
    demoData.signups=demoData.players.slice(0,count).map((p,i)=>({player_id:p.id,checked_at:new Date(Date.now()+i*1000).toISOString()}));
    storeDemo();searchText='';attendanceSearch='';attendanceDropdownOpen=false;
  }
  async function demoBuildTeams(){
    if(!demo||!pub?.event)return;
    if(pub.event.status!=='open'){flash('Teams are already published. Start a new practice scenario to build again.');switchTab('courts');return;}
    const players=priorityRoster().slice(0,pub.event.capacity).map(p=>admin.players.find(x=>x.id===p.id));
    if(players.length<6){flash('Check in at least six sample players first.',true);return;}
    const groups=window.RallyMath.makeTeams(players,pub.event.team_size,admin.previous_teams||[],pub.event.court_mode==='split'?'split':'mixed',{balanceWomen:admin.gender_balance===true});
    const worked=await act(()=>api.publish(pub.event.id,groups),'Six practice teams built. Record scores here or tap Simulate next match.');
    if(worked)switchTab('courts');
  }
  async function demoScoreNext(){
    if(!demo||!pub?.event)return;
    if(pub.event.status!=='locked'){flash('Build your practice teams first.',true);return;}
    const m=pub.matches.find(m=>!m.winner_team_id&&m.team_a_id&&m.team_b_id&&pub.matches.every(prev=>prev.court!==m.court||prev.order>=m.order||prev.winner_team_id));
    if(!m){flash('All six matches are complete! Use Live Courts to start another round.');return;}
    const scoreA=25,scoreB=m.order===2?23:m.order===3?19:21;
    const worked=await act(()=>api.report(m.id,m.team_a_id,scoreA,scoreB),`Practice score: Court ${m.court}, Match ${m.order} — ${scoreA}–${scoreB}. Sample player ratings updated only on this device.`);
    if(worked)switchTab('courts');
  }
  function switchTab(next){if(!['signup','courts','who','leaderboard','admin'].includes(next))next='courts';if(isPrivateTab(next)&&!adminGranted)next='courts';tab=next;document.querySelectorAll('.nav-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${tab}`));if(pub)render();window.location.hash=tab;}
  function teamName(t){return t?`Team ${t.number}`:'TBD';}
  function teamById(teamId){return pub?.teams?.find(t=>t.id===teamId)||null;}
  function statusPill(text,cls=''){return `<span class="pill ${cls}">${safe(text)}</span>`;}
  function render(){if(!pub)return;document.body.dataset.activeTab=tab;const e=pub.event;$('#event-status').textContent=e?`${e.status==='open'?'SIGNUPS OPEN':'MATCHES IN PROGRESS'} · ${niceDate(e.date).toUpperCase()} · ROUND ${e.round_number||1}`:'VOLLEYBALL MATCHMAKER';$('#hero-title').innerHTML=e?`${safe(e.title)}<br/><em>${e.status==='open'?'Find your squad.':'Game on.'}</em>`:'Everybody plays.<br/><em>Every point counts.</em>';$('#hero-description').textContent=e?`Two courts. Three teams per court. ${e.team_size} spots per team, with fill-in substitutes when needed. Every team gets two games.`:'Follow live volleyball teams, rotations, and match scores on both courts.';$('#mode-indicator').textContent=demo?'DEMO MODE':'LIVE SYNC';$('#demo-banner').hidden=!(demo&&adminGranted);const toggle=$('#demo-toggle');toggle.hidden=!adminGranted||!configured;toggle.textContent=demo?'✓ Demo active':'▶ Try demo';toggle.classList.toggle('demo-is-active',demo);toggle.setAttribute('aria-label',demo?'Demo mode active; return to live site':'Start demo mode');toggle.setAttribute('aria-pressed',String(demo));const exitDemo=document.querySelector('[data-action=exit-demo]');if(exitDemo)exitDemo.hidden=!configured;const demoHint=$('#demo-hint');if(demo&&demoHint)demoHint.textContent=pub?.event?.status==='locked'?`${pub.matches.filter(m=>m.winner_team_id).length} of 6 practice matches complete. Simulate another result or use Live Courts → Session Management to undo. Please note: demo changes never affect the live database.`:`${pub?.roster?.length||0} of ${pub?.event?.capacity||36} sample spots filled. Choose court mode in Live Courts, then build teams.`;
$('#signup-body').innerHTML=adminGranted?renderSignup():'';$('#courts-body').innerHTML=renderCourts();$('#who-body').innerHTML=renderPublicAttendance();$('#leaderboard-body').innerHTML=adminGranted?renderLeaderboard():'';$('#admin-body').innerHTML=renderAdmin();}
  // Public attendance is a deliberately limited display-name list. It never includes IDs,
  // MMR, wins/losses, gender, timestamps, player profiles, or write access.
  function safeCheckedInNames(){
    if(!pub?.event || !Array.isArray(pub.checked_in_names))return [];
    return pub.checked_in_names.filter(n=>typeof n==='string'&&n.trim()).slice().sort((a,b)=>a.localeCompare(b));
  }
  function renderPublicAttendanceItems(){
    const names=safeCheckedInNames();
    const query=publicAttendanceSearch.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
    const filtered=names.filter(n=>n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().includes(query));
    const status=$('#who-search-status');if(status)status.textContent=query?`${filtered.length} matching ${filtered.length===1?'name':'names'}`:`${names.length} checked in`;
    const list=filtered.map((name,i)=>`<li class="who-person"><span class="who-person-number">${i+1}</span><strong>${safe(name)}</strong><span class="who-person-confirmation" aria-label="Checked in">✓ Here</span></li>`).join('');
    return list||`<li class="who-no-results">${query?'No checked-in names match your search. Try a different spelling.':'No players have been checked in yet.'}</li>`;
  }
  function renderPublicAttendance(){
    const heading='<div class="section-top"><div><h2 id="who-title" class="section-title">Who’s here today?</h2><p class="section-sub">Look up your name to confirm you’re checked in for the current volleyball session.</p></div><span class="who-public-label">PUBLIC VIEW</span></div>';
    if(!pub?.event)return heading+'<div class="empty"><strong>No active session</strong><p>When an admin opens a volleyball session, checked-in names will appear here.</p></div>';
    // An older database may still conceal attendance from anonymous viewers. Do not
    // misleadingly render "0 people" until upgrade-v1.19.sql is installed.
    if(!Array.isArray(pub.checked_in_names))return heading+'<div class="empty"><strong>Attendance list needs updating</strong><p>The website was updated, but Supabase still needs upgrade-v1.19.sql before names can be shown publicly.</p></div>';
    const names=safeCheckedInNames();
    return heading+`<section class="who-panel" aria-label="Current checked-in players"><div class="who-overview"><div><span class="who-eyebrow">CURRENT SESSION</span><h3>${safe(pub.event.title||'Open Volleyball')}</h3><p>${safe(niceDate(pub.event.date))} · Round ${Number(pub.event.round_number)||1} · ${pub.event.status==='open'?'Check-in open':'Games in progress'}</p></div><div class="who-attendance-count"><strong>${names.length}</strong><span>Checked in</span></div></div><div class="who-search-container"><label for="who-search" class="label-input">Find yourself on the list</label><input class="field" id="who-search" type="search" placeholder="Start typing your name..." autocomplete="off" value="${safe(publicAttendanceSearch)}" aria-controls="who-players" /><span id="who-search-status" class="who-search-status" aria-live="polite">${names.length} checked in</span></div><ul id="who-players" class="who-grid" aria-label="Names checked in for this session">${renderPublicAttendanceItems()}</ul><p class="who-help">Can’t find your name? Ask an admin to check you in. Only admins can add or remove players.</p></section>`;
  }
  // Attendance is an admin-only page, not a public name-based signup form.
  function renderSignup(){
    if(!adminGranted)return '';
    const e=pub.event;
    const heading='<div class="section-top"><div><h2 id="signup-title" class="section-title">Admin check-in</h2><p class="section-sub">Search saved player profiles and mark who arrived. These attendance controls are private.</p></div></div>';
    if(!e)return heading+'<div class="empty"><strong>No open session</strong><p>Create a session in Live Courts → Session Management first.</p></div>';
    const stats=`<div class="stat-row"><div class="stat"><span class="value">${pub.roster.length}</span><span class="label">Here today</span></div><div class="stat highlight"><span class="value">${Math.max(0,e.capacity-pub.roster.length)}</span><span class="label">Spots to fill</span></div><div class="stat"><span class="value">${e.round_number||1}</span><span class="label">Current round</span></div></div>`;
    return heading+stats+renderAttendance();
  }
  // Tier names and icons are PRESENTATION ONLY: ratings are still calculated by Supabase.
  // Challenger is awarded to the top 10 players in the OVERALL leaderboard, before position filtering.
  const RANK_TIERS=[
    {id:'challenger',name:'Challenger',minimum:null,range:'Top 10 eligible · 18+ matches',glyph:'crown'},
    {id:'grandmaster',name:'Grandmaster',minimum:1650,range:'1,650+ MMR',glyph:'wings'},
    {id:'master',name:'Master',minimum:1550,range:'1,550–1,649 MMR',glyph:'triple'},
    {id:'diamond',name:'Diamond',minimum:1450,range:'1,450–1,549 MMR',glyph:'diamond'},
    {id:'emerald',name:'Emerald',minimum:1350,range:'1,350–1,449 MMR',glyph:'emerald'},
    {id:'platinum',name:'Platinum',minimum:1250,range:'1,250–1,349 MMR',glyph:'spark'},
    {id:'gold',name:'Gold',minimum:1150,range:'1,150–1,249 MMR',glyph:'star'},
    {id:'silver',name:'Silver',minimum:1050,range:'1,050–1,149 MMR',glyph:'chevrons'},
    {id:'bronze',name:'Bronze',minimum:500,range:'500–1,049 MMR',glyph:'bars'}
  ];
  const RANK_GLYPHS={
    crown:'<path d="M19 42 16 25l11 8 9-13 9 13 11-8-3 17Z"/><path d="M22 47h28"/>',
    wings:'<path d="M35 22 23 16 12 20l10 10-9 5 16 8m8-21 12-6 11 4-10 10 9 5-16 8"/><path d="m36 27 6 10-6 11-6-11Z"/>',
    triple:'<path d="m21 29 15-11 15 11-15 11Z"/><path d="m22 39 14 10 14-10m-25 9 11 8 11-8"/>',
    diamond:'<path d="M23 24h26l9 12-22 20-22-20Z"/><path d="m23 24 13 32 13-32M14 36h44"/>',
    emerald:'<path d="m36 14 18 12v22L36 59 18 48V26Z"/><path d="m18 26 18 11 18-11M36 37v22"/>',
    spark:'<path d="m36 14 6 16 16 6-16 6-6 16-6-16-16-6 16-6Z"/>',
    star:'<path d="m36 14 7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2Z"/>',
    chevrons:'<path d="m18 25 18 14 18-14M18 39l18 14 18-14"/>',
    bars:'<path d="M22 29v21m14-28v28m14-21v21"/>'
  };
  function rankEmblem(tier,small=false){
    return `<span class="rank-emblem rank-tier--${tier.id} ${small?'rank-emblem--small':''}" role="img" aria-label="${tier.name} rank"><svg viewBox="0 0 72 72" aria-hidden="true" focusable="false"><path class="emblem-shadow" d="M36 3 62 17l-3 32L36 68 13 49 10 17Z"/><path class="emblem-shield" d="M36 7 58 20l-3 27-19 17-19-17-3-27Z"/><path class="emblem-core" d="M36 15 50 24l-2 19-12 12-12-12-2-19Z"/><g class="emblem-glyph" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">${RANK_GLYPHS[tier.glyph]}</g></svg></span>`;
  }
  function rankedPlayers(){
    const sorted=[...(admin?.players||[])].sort((a,b)=>Number(b.mmr)-Number(a.mmr)||(b.wins||0)-(a.wins||0)||a.name.localeCompare(b.name));
    const challengers=new Set(sorted.filter(player=>matchesPlayed(player)>=CHALLENGER_GAMES).slice(0,10).map(player=>player.id));
    return sorted.map((player,index)=>({player,overallPlace:index+1,tier:challengers.has(player.id)?RANK_TIERS[0]:RANK_TIERS.slice(1).find(tier=>Number(player.mmr)>=tier.minimum)||RANK_TIERS.at(-1)}));
  }
  function renderLeaderboard(){
    if(!adminGranted||!admin?.players)return '';
    const ranked=rankedPlayers();
    const visible=ranked.filter(item=>leaderboardPosition==='All'||(item.player.position||'Unspecified')===leaderboardPosition);
    const positionCounts=POSITIONS.map(name=>({name,count:ranked.filter(r=>(r.player.position||'Unspecified')===name).length}));
    const sumWins=ranked.reduce((sum,item)=>sum+(item.player.wins||0),0);
    const tierCounts=Object.fromEntries(RANK_TIERS.map(tier=>[tier.id,visible.filter(item=>item.tier.id===tier.id).length]));
    const tierSelect=(leaderboardTier==='All'?RANK_TIERS:RANK_TIERS.filter(tier=>tier.id===leaderboardTier))
      .filter(tier=>leaderboardTier!=='All'||tierCounts[tier.id]>0);
    const rankFilters=`<div class="rank-filter-strip" aria-label="Filter players by rank"><button type="button" class="rank-filter-pill ${leaderboardTier==='All'?'is-active':''}" data-action="rank-filter" data-rank="All" aria-pressed="${leaderboardTier==='All'}"><span>All ranks</span><b>${visible.length}</b></button>${RANK_TIERS.map(tier=>`<button type="button" class="rank-filter-pill rank-tier--${tier.id} ${leaderboardTier===tier.id?'is-active':''}" data-action="rank-filter" data-rank="${tier.id}" aria-pressed="${leaderboardTier===tier.id}">${rankEmblem(tier,true)}<span>${tier.name}</span><b>${tierCounts[tier.id]}</b></button>`).join('')}</div>`;
    const list=tierSelect.map(tier=>{
      const group=visible.filter(item=>item.tier.id===tier.id);
      const expanded=expandedRankingTiers.has(tier.id);
      const displayed=expanded?group:group.slice(0,5);
      const rows=displayed.map(item=>{
        const p=item.player,place=visible.indexOf(item)+1,placement=placementLeft(p),challenge=matchesPlayed(p)<CHALLENGER_GAMES;
        return `<div class="ranking-row ranked-tier-row rank-tier--${tier.id}"><div class="ranking-number ${place<=3?'top-rank':''}">#${place}</div>${rankEmblem(tier,true)}<div class="ranking-person"><strong>${safe(p.name)}</strong><span>${safe(p.position||'Unspecified')}${leaderboardPosition!=='All'?` · Overall #${item.overallPlace}`:''}</span><small class="ranking-placement ${placement?'is-placing':'is-placed'}">${placement?`${placement} placement ${placement===1?'match':'matches'} left`:'Placement complete'}${challenge?` · ${CHALLENGER_GAMES-matchesPlayed(p)} to Challenger eligibility`:''}</small></div><div class="ranking-mmr">${Number(p.mmr).toLocaleString()} MMR</div><div class="ranking-record">${p.wins||0}W <span>·</span> ${p.losses||0}L</div></div>`;
      }).join('');
      return `<section class="rank-division rank-tier--${tier.id}" aria-label="${tier.name} players"><div class="rank-division-head">${rankEmblem(tier)}<div class="rank-division-title"><h3>${tier.name}</h3><span>${tier.range}</span></div><span class="rank-division-count">${group.length} ${group.length===1?'player':'players'}</span></div><div class="rank-division-list" id="rank-roster-${tier.id}">${rows||'<div class="rank-empty">No players in this rank for this position.</div>'}</div>${group.length>5?`<button type="button" class="rank-show-all" data-action="rank-expand" data-rank="${tier.id}" aria-controls="rank-roster-${tier.id}" aria-expanded="${expanded}">${expanded?'↑ Show first 5':`↓ Show all ${group.length} ${tier.name} players`}</button>`:''}</section>`;
    }).join('');
    return `<div class="section-top"><div><h2 id="leaderboard-title" class="section-title">Private player rankings</h2><p class="section-sub">Admin-only leaderboards · Rank emblems and MMR are shown only here.</p></div>${statusPill('Admin only','muted')}</div>
      <section class="panel leaderboard-panel">
        <div class="leaderboard-summary"><div><span class="mini-label">Registered players</span><strong>${ranked.length}</strong></div><div><span class="mini-label">Wins recorded</span><strong>${Math.round(sumWins)}</strong></div><div><span class="mini-label">Selected position</span><strong>${leaderboardPosition==='All'?'All':visible.length}</strong></div></div>
        <div class="leaderboard-toolbar"><label class="label-input" for="leaderboard-filter">Preferred position</label><select id="leaderboard-filter" class="field">${positionOptions(leaderboardPosition,true)}</select></div>
        <div class="position-summary">${positionCounts.filter(x=>x.count).map(x=>`<span>${safe(x.name)} <b>${x.count}</b></span>`).join('')}</div>
        <div class="ranking-heading"><div><h3>Rank divisions</h3><p>Challenger: top 10 players with at least 18 completed matches. Other ranks use current MMR. First 12 matches have double rating changes.</p></div></div>
        ${rankFilters}
        <div class="rank-division-stack">${list||'<div class="empty"><strong>No players in this rank or position</strong><p>Choose another rank or position above to see more profiles.</p></div>'}</div>
        <p class="subtle leaderboard-note">Rank icons are leaderboard-only. Placements finish after 12 games; eligible Challenger players need at least 18 completed matches. Tier labels do not affect matchmaking, court placement, or MMR calculations.</p>
      </section>`;
  }
  const signedChange=value=>`${value>0?'+':''}${value}`;
  function matchRatingDetails(m,ta,tb){
    const changes=adminGranted?(admin?.match_changes||[]).filter(c=>c.match_id===m.id):[];
    if(!m.winner_team_id)return '';
    if(!changes.length)return '<div class="rating-summary"><span>Private rating details unavailable. Apply the V1.08 Supabase upgrade if you have not already.</span></div>';
    const byTeam=t=>changes.filter(c=>c.team_id===t?.id);
    const side=t=>{const members=byTeam(t);return `<div class="rating-team"><div class="rating-team-name">${safe(teamName(t))} ${t.id===m.winner_team_id?'<span class="rating-result-win">WIN</span>':'<span class="rating-result-loss">LOSS</span>'}</div>${members.map(c=>{const after=Number(c.after_mmr),hasFinal=c.after_mmr!==null&&c.after_mmr!==undefined&&Number.isFinite(after);return `<div class="rating-person"><span class="rating-player-identity"><strong>${safe(c.player_name||t?.players.find(p=>p.id===c.player_id)?.name||'Player')}</strong><small class="rating-final">${hasFinal?`<b>Final ${after.toLocaleString()} MMR</b>`:'Final unavailable · run V1.08 SQL'}</small></span><strong class="rating-delta ${Number(c.delta)>=0?'mmr-plus':'mmr-minus'}">${signedChange(Number(c.delta))}</strong></div>`;}).join('')||'<div class="rating-no-players">No rated players</div>'}</div>`;};
    const bonus=window.RallyMath.marginBonus(m.score_a,m.score_b);
    return `<div class="rating-summary"><div class="rating-summary-head"><strong>Match rating changes · final MMR per player</strong><span>${bonus?`Score margin bonus: +${bonus} to swing`:'Score margin bonus: +0'}</span></div><div class="rating-columns">${side(ta)}${side(tb)}</div><p class="rating-footnote">Actual player changes shown. Temporary subs never receive MMR.</p></div>`;
  }
  function projectSwing(m,sa,sb){
    const ta=teamById(m.team_a_id),tb=teamById(m.team_b_id);
    if(!adminGranted||!ta||!tb||!admin?.players)return null;
    const avg=t=>{const players=admin.players.filter(p=>t.players.some(tp=>!tp.is_placeholder&&tp.id===p.id));return players.length?players.reduce((sum,p)=>sum+p.mmr,0)/players.length:null;};
    const a=avg(ta),b=avg(tb);if(a===null||b===null)return null;
    return sa>sb?window.RallyMath.matchSwing(a,b,sa,sb):window.RallyMath.matchSwing(b,a,sa,sb);
  }
  function renderMatch(m,adminControls){
    const ta=teamById(m.team_a_id),tb=teamById(m.team_b_id);
    const done=Boolean(m.winner_team_id);
    const previousDone=pub.matches.every(prev=>prev.court!==m.court||prev.order>=m.order||Boolean(prev.winner_team_id));
    const ready=Boolean(ta&&tb&&!done&&previousDone);
    const stateLabel=done?'FINAL':ready?'ENTER FINAL SCORE':ta&&tb?'WAITING PREVIOUS MATCH':'AWAITING OPENING RESULT';
    const leftLabel=ta?teamName(ta):m.order===2?'Winner of match 1':'Loser of match 1';
    const rightLabel=teamName(tb);
    let controls='';
    if(adminControls&&ready){
      controls=`<form class="match-controls live-score-form" data-mid="${safe(m.id)}" data-match="${safe(m.id)}">
        <div class="score-entry-title"><strong>Record final score</strong><span>Winner detected automatically</span></div>
        <div class="score-fields"><label>${safe(leftLabel)}<input class="field" name="score-a" aria-label="${safe(leftLabel)} points" inputmode="numeric" type="number" min="0" max="99" placeholder="0" required /></label><label>${safe(rightLabel)}<input class="field" name="score-b" aria-label="${safe(rightLabel)} points" inputmode="numeric" type="number" min="0" max="99" placeholder="0" required /></label></div>
        <div class="score-projection" aria-live="polite">Enter both final scores. The winner is detected automatically.</div>
        <button class="btn btn-primary btn-full" type="submit">✓ Save final score</button>
      </form>`;
    }
    return `<article class="match ${done?'match-done':ready?'match-ready':'match-waiting'}"><div class="match-head"><span>Match ${m.order}</span>${statusPill(stateLabel,done?'win':ready?'':'muted')}</div>
      <div class="match-line"><span class="match-side ${done&&m.winner_team_id===m.team_a_id?'winner':''}">${safe(leftLabel)}</span><span class="vs">${done&&m.score_a!==null?`${m.score_a} : ${m.score_b}`:'VS'}</span><span class="match-side right ${done&&m.winner_team_id===m.team_b_id?'winner':''}">${safe(rightLabel)}</span></div>
      ${done?'':controls}</article>`;
  }
  // Team averages are derived ONLY from vmm_get_admin_state's protected player list.
  // Never attach numeric averages to public roster JSON or public DOM nodes.
  function adminTeamAverage(team){
    if(!adminGranted || !admin?.players || !team?.players?.length)return '';
    const byId=new Map(admin.players.map(p=>[p.id,p]));
    const registered=team.players.filter(p=>!p.is_placeholder).map(p=>byId.get(p.id)).filter(p=>p && Number.isFinite(Number(p.mmr)));
    if(!registered.length)return '<div class="team-average-mmr" aria-label="Average rating unavailable"><span class="team-average-label">🔒 TEAM AVG</span><strong>Unavailable</strong></div>';
    const average=Math.round(registered.reduce((sum,p)=>sum+Number(p.mmr),0)/registered.length);
    const tooltip=`Current average of ${registered.length} registered ${registered.length===1?'player':'players'}. Temporary substitutes are excluded. Changes after match results are included.`;
    return `<div class="team-average-mmr" title="${safe(tooltip)}" aria-label="Admin only: current team average ${average.toLocaleString()} MMR from ${registered.length} rated players"><span class="team-average-label">🔒 TEAM AVERAGE</span><strong>${average.toLocaleString()} <span>MMR</span></strong><small>${registered.length} rated · Subs excluded</small></div>`;
  }
  function renderCourts(){
    const e=pub.event;
    const canScore=Boolean(adminGranted&&e?.status==='locked');
    const title=`<div class="section-top"><div><h2 id="courts-title" class="section-title">Live court rotations</h2><p class="section-sub">Both court rosters first, then the match schedule. Every team plays twice.</p></div><div class="live-courts-actions">${adminGranted?'<button class="btn btn-small btn-secondary" type="button" data-action="jump-ratings">🔒 Private results ↓</button>':''}<button class="btn btn-small btn-secondary" data-action="view-attendance">👥 Who’s here</button><button class="btn btn-small btn-secondary" data-action="refresh">↻ Refresh</button></div></div>`;
    // Ratings belong ONLY to Live Courts, never to the Admin tab. Keep this block after scores.
    const privateTools=adminGranted?`<div class="courts-admin-section" id="court-admin-tools">${renderPrivateMatchRatings()}${renderSessionManagement()}</div>`:'';
    if(!e)return `${title}<div class="empty"><strong>No active session</strong><p>Once check-in opens, the court schedule will show here.</p></div>${privateTools}`;
    if(!pub.teams.length)return `${title}<div class="empty"><span class="empty-icon">🏐</span><strong>Waiting for team assignments</strong><p>Once at least six players have checked in, an admin can create six teams and fill missing spots with substitute slots.</p></div>${privateTools}`;
    const groups=[1,2].map(court=>{
      const teams=pub.teams.filter(t=>t.court===court).sort((a,b)=>a.number-b.number);
      const matches=pub.matches.filter(m=>m.court===court).sort((a,b)=>a.order-b.order);
      const gamesDone=matches.filter(m=>m.winner_team_id).length;
      const courtTitle=e.court_mode==='split'?(court===1?'Court 01 · Competitive':'Court 02 · Beginner-friendly'):`Court 0${court}`;
      const header=`<div class="court-header"><div><h3>${courtTitle}</h3><p>${gamesDone}/3 matches completed</p></div>${statusPill(gamesDone===3?'DONE':gamesDone>0?'PLAYING':'UP NEXT',gamesDone===3?'win':'muted')}</div>`;
      const roster=`<section class="court court-roster court-roster-${court}" aria-label="${courtTitle} teams">${header}<div class="teams-grid">${teams.map(t=>`<div class="team"><div class="team-title">${safe(teamName(t))}</div>${adminTeamAverage(t)}<ul class="team-members">${t.players.map(p=>p.is_placeholder?'<li class="sub-member"><span>✳ Sub needed</span><small>Temporary substitute</small></li>':`<li>${safe(p.name)}</li>`).join('')}</ul></div>`).join('')}</div></section>`;
      const schedule=`<section class="court court-schedule court-schedule-${court}" aria-label="${courtTitle} matches"><div class="court-schedule-head"><h3>${courtTitle} · Match schedule</h3><span>${gamesDone} of 3 complete</span></div><div class="match-list">${matches.map(m=>renderMatch(m,canScore)).join('')}</div></section>`;
      return {roster,schedule};
    });
    return `${title}<div class="court-roster-heading"><h3>Team assignments</h3><p>All six teams on both courts, at a glance.</p></div><div class="courts-layout courts-roster-layout">${groups.map(g=>g.roster).join('')}</div>
      <div class="court-matches-heading"><h3>Live matches & results</h3><p>${canScore?'Enter final scores directly below each match.':'Follow the match order and final scores.'}</p></div>
      ${canScore?'<div class="courts-admin-notice">🔒 Admin scoring enabled · Enter final points and save the result.</div>':''}
      <div class="courts-layout courts-matches-layout">${groups.map(g=>g.schedule).join('')}</div>
      <div class="hint" style="margin-top:15px">Every team plays two games. A temporary substitute can fill an open roster spot without receiving a rating.</div>${privateTools}`;
  }
  // Attendance search uses admin-only profile data, never a public player lookup.
  const nameKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
  function attendanceMatches(){
    if(!adminGranted || !admin?.players || !attendanceSearch.trim())return [];
    const key=nameKey(attendanceSearch);
    const checked=new Set((pub?.roster||[]).map(p=>p.id));
    return admin.players.filter(p=>nameKey(p.name).includes(key)).sort((a,b)=>
      Number(checked.has(a.id))-Number(checked.has(b.id))||
      Number(!nameKey(a.name).startsWith(key))-Number(!nameKey(b.name).startsWith(key))||
      a.name.localeCompare(b.name));
  }
  function attendanceSuggestions(){
    if(!attendanceDropdownOpen || !pub?.event || pub.event.status!=='open' || !attendanceSearch.trim())return '';
    const matches=attendanceMatches(),top=matches.slice(0,10);
    if(!top.length)return '<div class="attendance-no-match">No registered players match that name. Create a profile below first.</div>';
    const checked=new Set(pub.roster.map(p=>p.id));
    return `${top.map((p,i)=>{
      const present=checked.has(p.id);
      return `<button id="attendance-option-${i}" class="attendance-option ${i===attendanceActive?'selected':''}" type="button" role="option" aria-selected="${i===attendanceActive}" data-action="attendance-select" data-player="${safe(p.id)}" ${present?'disabled':''}>
        <span class="attendance-option-main"><strong>${safe(p.name)}</strong><small>${safe(p.position||'Unspecified')}</small></span>
        <span class="attendance-option-action ${present?'already-here':''}">${present?'✓ Here':'＋ Check in'}</span>
      </button>`;
    }).join('')}${matches.length>top.length?`<div class="attendance-results-note">Showing 10 of ${matches.length} matches. Keep typing to narrow the list.</div>`:''}`;
  }
  function updateAttendanceSuggestions(){
    const input=$('#attendance-search'),result=$('#attendance-results');
    if(!input || !result)return;
    const visible=attendanceDropdownOpen&&Boolean(attendanceSearch.trim())&&pub?.event?.status==='open';
    result.hidden=!visible;
    result.innerHTML=visible?attendanceSuggestions():'';
    input.setAttribute('aria-expanded',String(visible));
    const option=$(`#attendance-option-${attendanceActive}`);
    if(option && !option.disabled)input.setAttribute('aria-activedescendant',option.id);
    else input.removeAttribute('aria-activedescendant');
  }
  function renderAttendance(){
    const e=pub?.event;
    if(!e)return '';
    const editable=e.status==='open',checked=pub.roster||[],all=admin?.players||[],checkedIds=new Set(checked.map(p=>p.id));
    const here=checked.slice().sort((a,b)=>a.name.localeCompare(b.name));
    const checkedList=here.length?here.map(p=>`<div class="attendance-person"><div class="attendance-person-info"><span class="attendance-person-name">${safe(p.name)}</span><span class="attendance-person-position">${safe(all.find(a=>a.id===p.id)?.position||'Unspecified')}</span></div>${editable?`<button class="attendance-remove" type="button" data-action="attendance-remove" data-player="${safe(p.id)}" aria-label="Remove ${safe(p.name)} from check-in">Remove</button>`:'<span class="attendance-here-mark">✓ Here</span>'}</div>`).join(''):'<div class="attendance-no-checkins">Nobody has checked in yet. Find a registered player above.</div>';
    return `<section class="panel admin-attendance" id="admin-attendance"><div class="panel-head"><h3>✓ Who showed up?</h3>${statusPill(editable?'Taking attendance':'Attendance locked',editable?'win':'muted')}</div>
      <p class="subtle">Check in players from your saved profiles. Only checked-in players are eligible for the next set of balanced teams.</p>
      <div class="attendance-stats"><div><strong>${checked.length}</strong><span>Here today</span></div><div><strong>${Math.max(0,all.length-checked.length)}</strong><span>Not checked in</span></div><div><strong>${Math.max(0,e.capacity-checked.length)}</strong><span>Open team spots</span></div></div>
      ${editable?`<div class="attendance-find"><label class="label-input" for="attendance-search">Find a player to check in</label><div class="attendance-search-wrap"><span class="attendance-search-icon" aria-hidden="true">⌕</span><input id="attendance-search" type="search" class="field" placeholder="Type any part of a name…" value="${safe(attendanceSearch)}" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-controls="attendance-results" aria-expanded="${Boolean(attendanceDropdownOpen&&attendanceSearch.trim())}" role="combobox" aria-label="Find registered player" /><div class="attendance-results" id="attendance-results" role="listbox" aria-label="Matching player profiles" ${attendanceDropdownOpen&&attendanceSearch.trim()?'':'hidden'}>${attendanceSuggestions()}</div></div><p class="attendance-search-hint">Matches appear as you type. Tap <strong>＋ Check in</strong> or use ↓ and Enter.</p></div>`:'<div class="hint">Teams are currently playing. Attendance changes reopen after this round ends.</div>'}
      <div class="attendance-list-head"><div><h4>Checked-in players</h4><span class="small-caps">${here.length} of ${all.length} profiles</span></div>${editable?'<span class="attendance-hint">Tap Remove if someone leaves</span>':''}</div>
      <div class="attendance-checked-list">${checkedList}</div>
    </section>`;
  }
  function renderAddPlayerForm(){const active=pub.event?.status==='open';return `<section class="panel admin-section admin-add-player"><div class="panel-head"><h3>＋ Add a player</h3>${statusPill('Admin only','muted')}</div><p class="subtle">Set the player's initial skill and preferred position once. Position only affects leaderboard categories, never matchmaking.</p>
      <form id="add-player-form" class="form-stack">
        <div><label class="label-input" for="add-name">Player name</label><input class="field" id="add-name" name="name" placeholder="First name + last initial" minlength="2" maxlength="45" autocomplete="off" required /></div>
        <div class="form-two-columns"><div><label class="label-input" for="add-tier">Initial skill level</label><select class="field" name="tier" id="add-tier"><option value="beginner" selected>Beginner · 1000 MMR</option><option value="intermediate">Intermediate · 1200 MMR</option><option value="advanced">Advanced · 1500 MMR</option></select></div>
        <div><label class="label-input" for="add-position">Preferred position</label><select class="field" name="position" id="add-position">${positionOptions('Unspecified')}</select></div></div><div><label class="label-input" for="add-gender">Gender (optional · admin only)</label><select class="field" name="gender" id="add-gender">${genderOptions()}</select></div>
        ${active?'<label class="check-inline"><input type="checkbox" name="checkin" checked /> Check into the current session now</label>':''}
        <button class="btn btn-primary btn-full" type="submit">＋ Create player profile</button>
      </form></section>`;}
  function renderAdmin(){if(!demo&&!user)return `<section class="panel" style="max-width:500px;margin:0 auto"><div class="panel-head"><h3 id="admin-title">Admin sign-in</h3>${statusPill('Private','muted')}</div><p class="subtle">Only approved staff can manage player profiles, attendance, team assignments, and match results.</p><form id="login-form" class="form-stack"><div><label for="admin-email" class="label-input">Email</label><input id="admin-email" class="field" type="email" name="email" placeholder="you@example.com" autocomplete="username" required /></div><div><label for="admin-password" class="label-input">Password</label><input id="admin-password" class="field" type="password" name="password" autocomplete="current-password" required /></div><button type="submit" class="btn btn-primary btn-full">Sign in securely</button></form><p class="subtle">Admins are approved in Supabase, not through a hardcoded website password.</p></section>`;
    if(!adminGranted)return `<section class="panel"><div class="panel-head"><h3 id="admin-title">Admin permission required</h3></div><p>Your Supabase account is signed in but is not authorized in <code>vmm_admins</code>. Ask the database owner to add this account.</p><button data-action="logout" class="btn btn-secondary">Sign out</button></section>`;
    const header=`<div class="section-top"><div><h2 id="admin-title" class="section-title">Player administration</h2><p class="section-sub">${demo?'Private sandbox · approved admin':`Signed in as ${safe(user?.email||'admin')}`}</p></div>${!demo?'<button class="btn btn-small btn-secondary" data-action="logout">Sign out</button>':''}</div>`;
    const activeBrand=demo?(demoBrand||siteBrand):siteBrand;
    const brandPanel=`<section class="panel admin-section site-brand-settings" aria-label="Admin site appearance controls"><div class="panel-head"><h3>🎨 Website theme</h3>${statusPill('Admin only','muted')}</div><p class="subtle">Choose the look everyone sees. The current RallyRank design is preserved. The COS Volleyball theme uses the same event logo and court photo as Colorado Springs Pickup Volleyball, plus navy, teal, and cyan. Visitors can still choose their own light/dark mode.</p><div class="brand-choice-grid"><button type="button" class="brand-choice ${activeBrand==='rallyrank'?'is-selected':''}" data-action="site-brand" data-brand="rallyrank" aria-pressed="${activeBrand==='rallyrank'}"><span class="brand-swatch brand-swatch-original"><i></i><b></b><i></i></span><strong>Original RallyRank</strong><small>Classic navy &amp; red</small><span class="brand-selected">${activeBrand==='rallyrank'?'✓ Currently selected':'Select design →'}</span></button><button type="button" class="brand-choice ${activeBrand==='cos'?'is-selected':''}" data-action="site-brand" data-brand="cos" aria-pressed="${activeBrand==='cos'}"><span class="brand-swatch brand-swatch-cos"><i></i><b></b><i></i></span><strong>COS Volleyball · Event Look</strong><small>Deep navy &amp; teal</small><span class="brand-selected">${activeBrand==='cos'?'✓ Currently selected':'Select design →'}</span></button></div><p class="site-brand-note">${demo?'Practice-only: this theme change stays in Demo Mode and does not update your live website.':brandError?'⚠ Site-wide setting unavailable. Run supabase/upgrade-v1.17.sql before changing the design.':'Changes are saved for all visitors. Only approved admins can change the design.'}</p></section>`;
    const ratings=`<section class="panel admin-section admin-edit-profiles"><div class="panel-head"><h3>Edit player profiles</h3><span class="small-caps">${admin?.players?.length||0} registered</span></div><p class="subtle">By default only the first <strong>5 players</strong> appear below. Use <strong>Show all</strong> to expand or search to find anyone. Ratings stay private to admins.</p>${renderPlayerRatings(false)}</section>`;
    return `${header}${brandPanel}<div class="admin-grid"><div>${renderAddPlayerForm()}</div><div>${ratings}</div></div><div class="admin-panel"><button class="btn btn-secondary btn-full" type="button" data-tab="signup">✓ Open admin check-in →</button><button class="btn btn-secondary btn-full" type="button" data-tab="courts">🏐 Open Live Courts · management & private results →</button></div>`;
  }
  function renderSessionManagement(){
    if(!adminGranted)return '';
    const e=pub?.event;
    if(!e)return `<section class="panel admin-section"><div class="panel-head"><h3>🔒 Session management</h3>${statusPill('Admin only','muted')}</div><p class="subtle">Create a session to start player check-ins and generate teams.</p>${renderCreateForm()}</section>`;
    const slots=Math.max(0,e.capacity-pub.roster.length);const canGenerate=pub.roster.length>=6;const results=pub.matches.filter(m=>m.winner_team_id).length;const roundComplete=results===6;
    const courtMode=e.court_mode==='split'?'split':'mixed';
    const modeSelector=`<div class="court-mode-panel"><div class="court-mode-head"><strong>How should courts be organized?</strong><span class="small-caps">ADMIN SETTING</span></div>
      <div class="court-mode-options" role="group" aria-label="Court organization">
        <button type="button" class="court-mode-option ${courtMode==='mixed'?'is-selected':''}" data-action="court-mode" data-mode="mixed" aria-pressed="${courtMode==='mixed'}" ${e.status!=='open'?'disabled':''}><span class="court-mode-symbol">🏐</span><span><strong>Balanced mixed courts</strong><small>Default · Spread advanced players across both courts</small></span></button>
        <button type="button" class="court-mode-option ${courtMode==='split'?'is-selected':''}" data-action="court-mode" data-mode="split" aria-pressed="${courtMode==='split'}" ${e.status!=='open'?'disabled':''}><span class="court-mode-symbol">🏆</span><span><strong>Competitive / beginner courts</strong><small>Court 1: stronger players · Court 2: beginner-friendly</small></span></button>
      </div><p class="subtle court-mode-footnote">${e.status==='open'?'You can switch before publishing teams. Teams are then balanced within the chosen court setup.':'Court mode is locked while teams are playing. Finish or reset the round to change it.'}</p></div>`;
    const controls=`<section class="panel admin-section"><div class="panel-head"><h3>Session management</h3>${statusPill(e.status==='open'?'Accepting players':'Matches live',e.status==='open'?'':'muted')}</div><div class="meta-line"><span>${safe(e.title)}</span><span>•</span><span>${safe(niceDate(e.date))}</span><span>•</span><span>${e.team_size}v${e.team_size}</span><span>•</span><span>Round ${e.round_number||1}</span><span>•</span><span>${pub.roster.length}/${e.capacity} checked in</span></div>${modeSelector}<div class="gender-balance-panel"><label class="gender-balance-check"><input type="checkbox" id="gender-balance-toggle" ${admin?.gender_balance===true?'checked':''} ${e.status!=='open'?'disabled':''} /><span><strong>Balance women across teams</strong><small>Optional · Distribute registered women across teams while keeping team MMR close. Unknown gender is not assumed.</small></span></label><span class="small-caps">ADMIN ONLY</span></div>${e.status==='open'?`<p class="subtle">${!canGenerate?`Need ${plural(6-pub.roster.length,'more registered player')} before making six teams.`:slots?`${plural(slots,'open spot')} will be filled with unrated Sub Needed placeholders. A random sub can play without gaining or losing MMR.`:'Ready to balance six full teams. Existing ratings carry over from earlier rounds.'}</p><button type="button" class="btn btn-primary" data-action="generate" ${!canGenerate?'disabled':''}>⚡ Balance ${e.round_number>1?'next-round':'first-round'} teams${slots?` · ${slots} sub ${slots===1?'slot':'slots'}`:''}</button>`:`<p class="subtle">${results}/6 matches complete this round. Normally about ±12 MMR per player for even teams; each player's first 12 matches have double adjustments.</p>${roundComplete?`<div class="hint" style="margin:13px 0">All six games finished! Start another balanced round when everyone is ready.</div><button class="btn btn-primary btn-full" data-action="next-round">↻ Start next balanced round →</button>`:''}<div class="button-row"><button type="button" class="btn btn-secondary btn-small" data-action="undo" ${results===0?'disabled':''}>↶ Undo latest result</button><button type="button" class="btn btn-secondary btn-small" data-action="reset" ${results?'disabled':''}>↻ Reshuffle teams</button></div>`}<div class="divider"></div><button type="button" class="btn btn-danger btn-small" data-action="close">Finish this session</button><div class="warning">Finishing this session allows another to be created. Ratings and player profiles carry forward.</div></section>`;
    return controls;
  }
  function renderPrivateMatchRatings(){
    if(!adminGranted || !pub?.event)return '';
    const finished=pub.matches.filter(m=>m.winner_team_id).sort((a,b)=>(a.completed_seq||0)-(b.completed_seq||0));
    return `<section class="panel admin-private-results" id="live-private-results" aria-label="Admin-only match ratings"><div class="panel-head"><h3>🔒 Private match ratings</h3>${statusPill('Admin only','muted')}</div><p class="subtle">Exact MMR changes after each match. These final MMR values are visible only to approved admins on Live Courts. Only approved admins receive these values.</p>${finished.length?`<div class="private-result-grid">${finished.map(m=>`<article class="private-result"><div class="private-result-head"><strong>Court ${m.court} · Match ${m.order}</strong><span>${safe(teamName(teamById(m.winner_team_id)))} won ${m.score_a}–${m.score_b}</span></div>${matchRatingDetails(m,teamById(m.team_a_id),teamById(m.team_b_id))}</article>`).join('')}</div>`:'<p class="subtle">Record a final score above to see each player’s MMR change and final rating for that match.</p>'}</section>`;
  }
  function renderCreateForm(){return `<form id="create-form" class="form-stack"><div><label class="label-input" for="new-title">Session name</label><input class="field" id="new-title" name="title" value="Open Volleyball" required minlength="3" maxlength="70" /></div><div><label class="label-input" for="new-date">Session date</label><input class="field" id="new-date" name="date" type="date" value="${localDate()}" required /></div><div><label class="label-input" for="new-size">Players per team</label><select class="field" name="size" id="new-size"><option value="2">2v2 · 12 players</option><option value="3">3v3 · 18 players</option><option value="4">4v4 · 24 players</option><option value="5">5v5 · 30 players</option><option value="6" selected>6v6 · 36 players (default)</option></select></div><div class="hint">One session can include multiple balanced rounds. Each round has six teams, three per court, with two matches per team. Games and wait times depend on how long matches take.</div><button type="submit" class="btn btn-primary">Open signups →</button></form>`;}
  function renderPlayerRatings(currentOnly){
    const all=admin?.players||[];const e=pub.event;const activeSet=new Set(pub.roster.map(p=>p.id));
    const arr=[...(currentOnly?all.filter(p=>activeSet.has(p.id)):all)].sort((a,b)=>a.name.localeCompare(b.name));
    if(!arr.length)return '<div class="empty"><strong>No players yet</strong><p>Create your first player profile with the form above.</p></div>';
    const matching=arr.filter(p=>nameKey(p.name).includes(nameKey(searchText)));
    const visible=searchText.trim()?matching:(showAllProfiles?matching:matching.slice(0,5));
    const playerCards=visible.map(p=>{
      const locked=e?.status==='locked'&&pub.teams.some(t=>t.players.some(tp=>tp.id===p.id));
      const checked=activeSet.has(p.id);
      const hasHistory=matchesPlayed(p)>0;
      const cannotDelete=hasHistory||locked;
      const deleteTip=hasHistory?'Cannot delete: recorded matches must be preserved.':locked?'Cannot delete while assigned to an active round.':'Permanently remove profile and its saved MMR.';
      return `<div class="player-edit" data-name="${safe(p.name.toLowerCase())}"><div class="player-edit-info"><div class="player-edit-name">${safe(p.name)} ${checked?statusPill('Checked in','win'):''}</div><div class="player-edit-record">${p.wins}W / ${p.losses}L · ${safe(p.position||'Unspecified')}</div><div class="placement-progress"><span class="placement-status ${placementLeft(p)?'is-placing':'is-placed'}">${safe(placementStatus(p))}</span><span class="placement-eligibility">${safe(challengerStatus(p))}</span></div></div>
        <div class="profile-controls"><div class="profile-selects"><label>Preferred position<select class="profile-position field" aria-label="Position for ${safe(p.name)}">${positionOptions(p.position||'Unspecified')}</select></label><label>Skill preset<select class="tier-preset field" aria-label="Skill preset for ${safe(p.name)}" ${locked?'disabled':''}><option value="">Keep rating</option><option value="1000">Beginner</option><option value="1200">Intermediate</option><option value="1500">Advanced</option></select></label><label>Gender (admin only)<select class="profile-gender field" aria-label="Gender for ${safe(p.name)}">${genderOptions(p.gender||'Unspecified')}</select></label><label>Edit MMR<input class="profile-mmr field" aria-label="Edit MMR for ${safe(p.name)}" type="number" min="500" max="2500" step="1" value="${p.mmr}" ${locked?'disabled':''}/></label></div>
        <div class="button-row profile-action-row"><button type="button" class="btn btn-small btn-primary save-profile" data-action="save-profile" data-player="${safe(p.id)}">Save player profile</button>${e?.status==='open'?(checked?`<button type="button" class="btn btn-small btn-secondary" data-action="remove-signup" data-player="${safe(p.id)}">Remove check-in</button>`:`<button type="button" class="btn btn-small btn-secondary" data-action="checkin-player" data-player="${safe(p.id)}">＋ Check in</button>`):''}<button type="button" class="btn btn-small btn-danger profile-delete" data-action="delete-player" data-player="${safe(p.id)}" aria-label="Permanently delete ${safe(p.name)}" title="${safe(deleteTip)}" ${cannotDelete?'disabled':''}>Delete player</button></div>${hasHistory?'<p class="profile-delete-note">Deletion disabled: this player has recorded matches. MMR can still be edited.</p>':locked?'<p class="profile-delete-note">Deletion disabled while assigned to an active round.</p>':'<p class="profile-delete-note">Deleting a player permanently removes their profile and saved MMR. Check-in removal above keeps their MMR.</p>'}</div></div>`;
    }).join('');
    const count=matching.length;
    const showToggle=!searchText.trim()&&arr.length>5?`<button type="button" class="btn ${showAllProfiles?'btn-secondary':'btn-primary'} btn-small profile-show-all" data-action="toggle-profiles" aria-expanded="${showAllProfiles}" aria-controls="profile-results">${showAllProfiles?'↑ Show first 5':`↓ Show all ${arr.length} players`}</button>`:'';
    return `<div class="form-stack"><label class="label-input" for="player-search">Find player</label><input class="field" id="player-search" type="search" placeholder="Search any name" value="${safe(searchText)}" autocomplete="off"/><div class="profile-list-meta"><strong class="profile-count" id="profile-result-count">${searchText.trim()?`${count} matching ${count===1?'player':'players'}`:`Showing ${visible.length} of ${arr.length} players`}</strong>${showToggle}</div></div><div class="admin-roster" id="profile-results" style="margin-top:15px">${playerCards||'<p class="subtle">No matching player profiles.</p>'}</div>`;
  }
  async function act(job,message){if(mutating)return false;mutating=true;try{await job();flash(message);await refresh();return true;}catch(e){flash(errText(e),true);return false;}finally{mutating=false;}}
  async function handleGenerate(){const e=pub.event;if(!e||!admin)return;const players=priorityRoster().slice(0,e.capacity).map(r=>admin.players.find(p=>p.id===r.id));if(players.some(p=>!p)){flash('Unable to load player ratings. Refresh first.',true);return;}const groups=window.RallyMath.makeTeams(players,e.team_size,admin.previous_teams||[],e.court_mode==='split'?'split':'mixed',{balanceWomen:admin.gender_balance===true});const range=window.RallyMath.spread(groups);const missing=groups.flat().filter(p=>p.is_placeholder).length;const selected=groups.flat().filter(p=>!p.is_placeholder).length;const womenCounts=groups.map(g=>g.filter(p=>!p.is_placeholder&&p.gender==='Woman').length);if(!confirm(`Publish six balanced teams for round ${e.round_number||1}?\n\n${selected} registered players · ${missing} unrated sub ${missing===1?'slot':'slots'}.\nCourt layout: ${e.court_mode==='split'?'Court 1 competitive · Court 2 beginner-friendly':'Mixed courts with advanced players distributed'}.\n${e.court_mode==='split'?'Teams are balanced within each court.':'Registered-player average MMR spread: '+range+' points.'}\n${admin.gender_balance?'Balance women: ON · Women per team '+womenCounts.join(' / '):'Balance women: OFF'}. MMR balance remains the priority.\nRecent teammates are separated when possible.\n\nSub placeholders NEVER gain/lose MMR and do not appear on the leaderboard. The ${selected} selected players have the fewest completed rounds (check-in order breaks ties).`))return;await act(()=>api.publish(e.id,groups),'Balanced teams published to both courts. Unrated sub spots are clearly marked.');}
  function scoreValues(form){
    const rawA=form.querySelector('[name=score-a]')?.value?.trim()??'';
    const rawB=form.querySelector('[name=score-b]')?.value?.trim()??'';
    if(!/^\d+$/.test(rawA)||!/^\d+$/.test(rawB))throw Error('Enter both final scores before saving.');
    const a=Number(rawA),b=Number(rawB);
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>99||b>99)throw Error('Scores must be between 0 and 99.');
    if(a===b)throw Error('A match cannot end tied. Enter different scores.');
    return {a,b};
  }
  function updateScorePreview(form){
    const output=form.querySelector('.score-projection');if(!output)return;
    const match=pub?.matches?.find(m=>m.id===form.dataset.match);if(!match)return;
    try{const {a,b}=scoreValues(form),winner=teamById(a>b?match.team_a_id:match.team_b_id);
      output.innerHTML=`<strong>${safe(teamName(winner))} wins</strong> · Confirm both final scores, then save the match.`;
    }catch(e){output.textContent='Enter both final scores to see the winning team.';}
  }
  async function handleScore(form){
    if(!adminGranted){flash('Admin sign-in is required to record results.',true);return;}
    const match=pub?.matches?.find(m=>m.id===form.dataset.match);
    if(!match||match.winner_team_id)return;
    let scores;try{scores=scoreValues(form);}catch(e){flash(errText(e),true);return;}
    const {a,b}=scores;
    const winner=teamById(a>b?match.team_a_id:match.team_b_id);
    if(!winner){flash('One of the teams is not ready.',true);return;}
    if(!confirm(`Record Court ${match.court} · Match ${match.order}\n${teamName(teamById(match.team_a_id))} ${a} – ${b} ${teamName(teamById(match.team_b_id))}\nWinner: ${teamName(winner)}\n\nConfirm final score?`))return;
    await act(()=>api.report(match.id,winner.id,a,b),`Court ${match.court} result saved: ${teamName(winner)} wins ${Math.max(a,b)}–${Math.min(a,b)}. See private rating details farther down Live Courts.`);
  }
  document.addEventListener('submit',async ev=>{const form=ev.target;if(form.classList.contains('live-score-form')){ev.preventDefault();await handleScore(form);return;}if(!['login-form','create-form','add-player-form'].includes(form.id))return;ev.preventDefault();const values=new FormData(form);if(form.id==='add-player-form'){const name=String(values.get('name')||'').trim(),tier=String(values.get('tier')||''),position=String(values.get('position')||''),gender=String(values.get('gender')||'Unspecified'),checkIn=values.get('checkin')==='on';await act(()=>api.addPlayer(name,tier,position,checkIn,gender),`${name} added${checkIn?' and checked in':''}.`);}else if(form.id==='create-form'){const title=String(values.get('title')||'').trim(),date=String(values.get('date')||''),size=Number(values.get('size'));await act(()=>api.createEvent(title,date,size),'Session created. Check-in is open.');}else{if(!db){flash('Add your Supabase configuration first.',true);return;}try{const {data,error}=await db.auth.signInWithPassword({email:String(values.get('email')),password:String(values.get('password'))});if(error)throw error;user=data.user;await refresh();if(adminGranted)flash('Admin signed in.');}catch(e){flash(errText(e),true);}}});
  $('#demo-toggle')?.addEventListener('click',async ()=>{if(!adminGranted)return;if(demo)await setDemoMode(false);else await setDemoMode(true);});
  document.addEventListener('click',async ev=>{const nav=ev.target.closest('[data-tab]');if(nav){switchTab(nav.dataset.tab);return;}const btn=ev.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action;if((action.startsWith('demo-')||action==='exit-demo'||action==='jump-ratings')&&!adminGranted)return;switch(action){
    case 'exit-demo':await setDemoMode(false);break;
    case 'demo-full':if(demo){if(demoData.history.length||demoData.teams.length){if(!confirm('Start a new practice with 36 sample attendees? Existing demo results will be reset; live data stays safe.'))break;}loadDemoScenario(36);await refresh();flash('36 sample players are checked in. Six full teams are ready to generate.');switchTab('admin');}break;
    case 'demo-subs':if(demo){if(demoData.history.length||demoData.teams.length){if(!confirm('Start a new practice with 28 players and 8 fill-in slots? Demo results will be reset.'))break;}loadDemoScenario(28);await refresh();flash('28 sample players checked in. Team generation will add 8 unrated substitute placeholders.');switchTab('admin');}break;
    case 'demo-generate':if(demo)await demoBuildTeams();break;
    case 'demo-score':if(demo)await demoScoreNext();break;
    case 'refresh':await refresh();break;
    case 'view-attendance':switchTab('who');break;
    case 'generate':await handleGenerate();break;
    case 'jump-ratings':{document.querySelector('#view-courts #live-private-results')?.scrollIntoView({behavior:'smooth',block:'start'});break;}
    case 'rank-filter':{if(!adminGranted)break;const id=btn.dataset.rank;if(id!=='All'&&!RANK_TIERS.some(t=>t.id===id))break;leaderboardTier=id;$('#leaderboard-body').innerHTML=renderLeaderboard();break;}
    case 'rank-expand':{if(!adminGranted||!RANK_TIERS.some(t=>t.id===btn.dataset.rank))break;const id=btn.dataset.rank;expandedRankingTiers.has(id)?expandedRankingTiers.delete(id):expandedRankingTiers.add(id);$('#leaderboard-body').innerHTML=renderLeaderboard();break;}
    case 'toggle-profiles':{showAllProfiles=!showAllProfiles;const panel=document.querySelector('#admin-body .admin-roster');if(panel){const input=document.querySelector('#player-search');const focusId=document.activeElement?.id;const pos=input?.selectionStart;$('#admin-body').innerHTML=renderAdmin();if(focusId==='player-search'){const restored=$('#player-search');restored?.focus();if(pos!==null&&pos!==undefined)restored?.setSelectionRange(pos,pos);}}break;}
    case 'site-brand':{
      if(!adminGranted)break;
      const brand=btn.dataset.brand;
      if(!['rallyrank','cos'].includes(brand))break;
      if(demo){demoBrand=brand;applyBrand(brand);render();flash('Demo appearance changed. The live site is unaffected.');break;}
      if(brandError){flash('Install supabase/upgrade-v1.17.sql first to enable site-wide theme changes.',true);break;}
      if(brand===siteBrand)break;
      const ok=await act(async ()=>{
        const {data,error}=await db.rpc('vmm_admin_set_site_theme',{p_theme:brand});
        if(error)throw error;
        siteBrand=data==='cos'?'cos':'rallyrank';applyBrand(siteBrand);
      },'Website theme saved for everyone.');
      if(ok)render();
      break;
    }
    case 'court-mode':{if(!adminGranted||pub?.event?.status!=='open')break;const mode=btn.dataset.mode;if(!['mixed','split'].includes(mode))break;await act(()=>api.setCourtMode(pub.event.id,mode),mode==='mixed'?'Balanced mixed courts selected.':'Competitive / beginner courts selected.');break;}
    case 'save-profile':{const pid=btn.dataset.player;const card=btn.closest('.player-edit');const mmr=Number(card.querySelector('.profile-mmr').value);const position=card.querySelector('.profile-position').value;const gender=card.querySelector('.profile-gender').value;if(!GENDERS.includes(gender)||!Number.isInteger(mmr)||mmr<500||mmr>2500||!POSITIONS.includes(position)){flash('Choose a valid position and MMR between 500 and 2500.',true);return;}await act(()=>api.updatePlayer(pid,mmr,position,gender),'Player profile saved.');break;}
    case 'delete-player':{
      if(!adminGranted||!admin?.players)break;
      const pid=btn.dataset.player,player=admin.players.find(p=>p.id===pid);
      if(!player)break;
      if(matchesPlayed(player)>0){flash('Cannot delete a player with recorded matches. Historical match data must be preserved.',true);break;}
      const isPlaying=pub?.event?.status==='locked'&&pub.teams.some(t=>t.players.some(tp=>tp.id===pid));
      if(isPlaying){flash('Finish or reset the active round before deleting this player.',true);break;}
      const msg=`Are you sure you want to permanently delete ${player.name}?\n\nThis deletes their entire player profile, saved MMR (${player.mmr}), preferred position, and any current check-in.\n\nThis CANNOT be undone.\n\nChoose Cancel to keep their MMR.`;
      if(!confirm(msg))break;
      const success=await act(()=>api.deletePlayer(pid),`${player.name} was permanently deleted, including their MMR.`);
      if(success){searchText='';showAllProfiles=false;$('#admin-body').innerHTML=renderAdmin();}
      break;
    }
    case 'attendance-select':{
      if(btn.disabled||!adminGranted||pub?.event?.status!=='open')break;
      const player=admin.players.find(p=>p.id===btn.dataset.player);if(!player)break;
      if(pub.roster.some(p=>p.id===player.id))break;
      const success=await act(()=>api.checkIn(player.id),`${player.name} checked in.`);
      if(success){attendanceSearch='';attendanceDropdownOpen=false;attendanceActive=0;const input=$('#attendance-search');if(input){input.value='';input.focus();updateAttendanceSuggestions();}}
      break;
    }
    case 'attendance-remove':{
      if(!adminGranted||pub?.event?.status!=='open')break;
      const player=admin.players.find(p=>p.id===btn.dataset.player);
      if(confirm(`Remove ${player?.name||'this player'} from today's attendance? Their profile and rating will stay saved.`)){
        const success=await act(()=>api.removeSignup(pub.event.id,btn.dataset.player),`${player?.name||'Player'} removed from check-in.`);
        if(success&&attendanceSearch.trim()){attendanceDropdownOpen=true;updateAttendanceSuggestions();}
      }
      break;
    }
    case 'checkin-player':{const player=admin.players.find(p=>p.id===btn.dataset.player);await act(()=>api.checkIn(btn.dataset.player),`${player?.name||'Player'} checked in.`);break;}
    case 'remove-signup':{const player=admin.players.find(p=>p.id===btn.dataset.player);if(confirm(`Remove ${player?.name||'this player'} from the current signup? Their MMR will be kept.`))await act(()=>api.removeSignup(pub.event.id,btn.dataset.player),'Player removed from this signup.');break;}
    case 'next-round':if(confirm('Archive all six completed matches and rebuild different balanced teams for another round? Ratings and the night’s results will be preserved.'))await act(()=>api.nextRound(pub.event.id),'Round archived. Check in or remove players, then generate fresh balanced teams.');break;
    case 'undo':if(confirm('Undo the latest recorded result and restore the previous ratings?'))await act(()=>api.undo(pub.event.id),'Latest match result undone.');break;
    case 'reset':if(confirm('Erase team assignments and reopen check-in? No results can be recorded.'))await act(()=>api.resetRound(pub.event.id),'Teams reset. You can rebalance and publish again.');break;
    case 'close':if(confirm('Finish this session? Rankings persist, but the live court display will be cleared.'))await act(()=>api.closeEvent(pub.event.id),'Session finished. You can create another.');break;
    case 'logout':if(db)await db.auth.signOut();user=null;admin=null;adminGranted=false;if(demo)await setDemoMode(false);await refresh(true);flash('Signed out.');break;
  }});
  document.addEventListener('change',async ev=>{if(ev.target?.id==='gender-balance-toggle'){if(!adminGranted||pub?.event?.status!=='open')return;const enabled=ev.target.checked;ev.target.disabled=true;await act(()=>api.setGenderBalance(pub.event.id,enabled),enabled?'Women balancing enabled for the next round.':'Women balancing disabled.');return;}if(ev.target?.classList?.contains('tier-preset')&&ev.target.value){ev.target.closest('.profile-controls').querySelector('.profile-mmr').value=ev.target.value;}if(ev.target?.id==='leaderboard-filter'&&adminGranted){leaderboardPosition=ev.target.value;$('#leaderboard-body').innerHTML=renderLeaderboard();}});
  document.addEventListener('input',ev=>{if(ev.target?.id==='who-search'){publicAttendanceSearch=ev.target.value;const ul=$('#who-players');if(ul)ul.innerHTML=renderPublicAttendanceItems();}if(ev.target?.id==='attendance-search'){attendanceSearch=ev.target.value;attendanceDropdownOpen=Boolean(attendanceSearch.trim());attendanceActive=0;updateAttendanceSuggestions();}if(ev.target?.closest('.live-score-form'))updateScorePreview(ev.target.closest('.live-score-form'));if(ev.target?.id==='player-search'){searchText=ev.target.value;const pos=ev.target.selectionStart;$('#admin-body').innerHTML=renderAdmin();const restored=$('#player-search');restored?.focus();if(pos!==null)restored?.setSelectionRange(pos,pos);}});
  document.addEventListener('keydown',ev=>{
    if(ev.target?.id!=='attendance-search')return;
    if(ev.key==='Escape'){attendanceDropdownOpen=false;updateAttendanceSuggestions();return;}
    if(!attendanceSearch.trim() || !pub?.event || pub.event.status!=='open')return;
    const choices=attendanceMatches().slice(0,10);
    if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){
      ev.preventDefault();attendanceDropdownOpen=true;
      if(choices.length){attendanceActive=(attendanceActive+(ev.key==='ArrowDown'?1:-1)+choices.length)%choices.length;}
      updateAttendanceSuggestions();return;
    }
    if(ev.key==='Enter'){
      ev.preventDefault();const selected=choices[attendanceActive]||choices[0];
      if(selected && !pub.roster.some(p=>p.id===selected.id)){
        const button=document.querySelector(`.attendance-option[data-player="${CSS.escape(selected.id)}"]`);
        button?.click();
      }
    }
  });
  document.addEventListener('click',ev=>{
    if(!ev.target.closest('.attendance-search-wrap')&&attendanceDropdownOpen){attendanceDropdownOpen=false;updateAttendanceSuggestions();}
  });
  document.addEventListener('focusin',ev=>{
    if(ev.target?.id==='attendance-search'&&attendanceSearch.trim()){attendanceDropdownOpen=true;updateAttendanceSuggestions();}
  });
  $('#demo-reset').addEventListener('click',()=>{if(!demo||!adminGranted)return;if(!confirm('Reset the demo, sample players, and all round results?'))return;demoData=seedDemo();demoData.signups=demoData.players.slice(0,36).map((p,i)=>({player_id:p.id,checked_at:new Date(Date.now()+i*1000).toISOString()}));storeDemo();searchText='';refresh();flash('Practice session reset with 36 sample players checked in.');});
  async function init(){
    if(configured&&!db){flash('Supabase library could not load. Check your internet connection.',true);return;}
    if(db){const {data}=await db.auth.getSession();user=data?.session?.user||null;
      db.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;if(!user){adminGranted=false;admin=null;if(demo){setDemoMode(false).catch(()=>{});}else{enforceAdminNavigation();if(pub)render();}}});}
    await refresh();
    const hash=window.location.hash.substring(1);
    if(['signup','courts','who','leaderboard','admin'].includes(hash))switchTab(hash);
    if(requestedDemo)await setDemoMode(true);
    setInterval(()=>{if(!mutating&&document.visibilityState==='visible'&&!document.activeElement?.matches('input,select'))refresh();},12000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!mutating)refresh();});
  }
  init().catch(e=>flash(errText(e),true));
})();
