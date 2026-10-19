(() => {
  'use strict';
  const cfg=window.VB_CONFIG||{};
  const configured=Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  // The sandbox is explicitly selectable even when real Supabase credentials are present.
  let demo=!configured || new URLSearchParams(window.location.search).get('demo')==='1';
  const db=configured&&window.supabase?.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey) || null;
  const $=s=>document.querySelector(s);
  const safe=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const id=()=>globalThis.crypto?.randomUUID?.()||`demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const localDate=()=>{const d=new Date(),z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;};
  const niceDate=v=>{if(!v)return '';const [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});};
  const plural=(n,s)=>`${n} ${s}${n===1?'':'s'}`;
  const POSITIONS=['Unspecified','Setter','Outside Hitter','Opposite','Middle Blocker','Libero','Defensive Specialist','Utility'];
  const PRESETS={beginner:1000,intermediate:1200,advanced:1500};
  const positionOptions=(selected='Unspecified',includeAll=false)=>`${includeAll?'<option value="All">All positions</option>':''}${POSITIONS.map(position=>`<option value="${safe(position)}" ${selected===position?'selected':''}>${safe(position)}</option>`).join('')}`;

  const priorityRoster=()=>[...(pub?.roster||[])].sort((a,b)=>(a.rounds_played||0)-(b.rounds_played||0)||String(a.checked_at).localeCompare(String(b.checked_at)));

  function applyTheme(theme){
    const dark=theme==='dark';
    if(document.documentElement?.dataset)document.documentElement.dataset.theme=dark?'dark':'light';
    const toggle=$('#theme-toggle');
    if(toggle){toggle.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');toggle.setAttribute('aria-pressed',String(dark));toggle.querySelector('.theme-symbol').textContent=dark?'☀':'☾';toggle.querySelector('.theme-label').textContent=dark?'Light':'Dark';}
    const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content=dark?'#0b1323':'#071d49';
  }
  $('#theme-toggle')?.addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    try{localStorage.setItem('rallyrank-theme',next);}catch(e){}
    applyTheme(next);
  });
  if(document.documentElement?.dataset)applyTheme(document.documentElement.dataset.theme);
  let tab='signup',pub=null,admin=null,user=null,adminGranted=false,loading=false,mutating=false;
  let lastError='',searchText='',lastFlashTimer=null,leaderboardPosition='All';
  let attendanceSearch='',attendanceDropdownOpen=false,attendanceActive=0;
  let demoData=null, modeEpoch=0;
  const SAMPLE=[['Alex R.',1460],['Sam D.',1190],['Taylor P.',1030],['Jordan C.',1260],['Morgan B.',910],['Casey G.',1080],['Avery K.',1350],['Riley F.',980],['Jamie L.',820],['Drew T.',1240],['Parker M.',1110],['Cameron S.',1020],['Quinn V.',950],['Reese H.',1380],['Hayden W.',1160],['Blake E.',860],['Rowan A.',1300],['Dakota N.',1000],['Skyler J.',1140],['Kendall O.',930],['Finley Z.',1490],['Marley U.',940],['Emerson Q.',1050],['Robin I.',1220],['Nico J.',1100],['Sydney Y.',940],['Alexis N.',1310],['Ari V.',1180],['Mia P.',1010],['Noah B.',975],['Lena V.',1030],['Mateo L.',1005],['Sofia C.',950],['Eli T.',1065],['Nina G.',990],['Leo H.',1125],['Isla M.',1045],['Owen R.',1000],['Zoe A.',970],['Max P.',1230],['Jules K.',1510],['Kai W.',980],['Ivy S.',1030],['Chris U.',940]];
  function seedDemo(){return {event:{id:id(),title:'Open Volleyball',date:localDate(),team_size:6,court_mode:'mixed',round_number:1,duration_minutes:180,status:'open'},archives:[],players:SAMPLE.map(([name,mmr],i)=>({id:id(),name,mmr,position:POSITIONS[1+i%6],wins:0,losses:0})),signups:[],teams:[],matches:[],history:[]};}
  function readDemo(){try{const s=localStorage.getItem('rallyrank-demo-v107');if(s){demoData=JSON.parse(s);demoData.archives||=[];demoData.players.forEach(p=>p.position||='Unspecified');if(demoData.event){demoData.event.round_number||=1;demoData.event.duration_minutes=180;demoData.event.court_mode||='mixed';}return;}}catch(e){}demoData=seedDemo();demoData.signups=demoData.players.slice(0,36).map((p,i)=>({player_id:p.id,checked_at:new Date(Date.now()+i*1000).toISOString()}));storeDemo();}
  function storeDemo(){try{localStorage.setItem('rallyrank-demo-v107',JSON.stringify(demoData));}catch(e){}}
  function demoState(){const x=demoData;return {event:x.event?{...x.event,player_count:x.signups.length,capacity:x.event.team_size*6,completed_rounds:x.archives.length}:null,
    roster:x.signups.map(s=>{const p=x.players.find(p=>p.id===s.player_id);return {id:p.id,name:p.name,checked_at:s.checked_at,team_id:x.teams.find(t=>t.players.some(y=>y.id===p.id))?.id||null,rounds_played:x.archives.filter(a=>a.teams.some(t=>t.players.some(y=>y.id===p.id))).length};}),
    teams:x.teams,matches:x.matches.map(({mmr_changes,...match})=>match),leaderboard:demoLeaderboard()};}
  function demoLeaderboard(){return [...demoData.players].sort((a,b)=>b.mmr-a.mmr||b.wins-a.wins||a.name.localeCompare(b.name)).map(p=>({id:p.id,name:p.name,position:p.position||'Unspecified',wins:p.wins,losses:p.losses}));}
  function average(team){const registered=team.players.filter(p=>!p.is_placeholder).map(p=>demoData.players.find(x=>x.id===p.id));if(!registered.length)throw Error('Each team needs a registered player.');return registered.reduce((n,p)=>n+p.mmr,0)/registered.length;}
  function demoAction(fn){fn();storeDemo();return Promise.resolve(null);}
  const api={
    async getPublic(){if(demo)return demoState();const [state,ranks]=await Promise.all([db.rpc('vmm_get_state'),db.rpc('vmm_get_leaderboard')]);if(state.error)throw state.error;if(ranks.error)throw ranks.error;return {...state.data,leaderboard:ranks.data||[]};},
    async getAdmin(){if(demo)return {...demoState(),players:demoData.players,match_changes:demoData.matches.flatMap(m=>(m.mmr_changes||[]).map(c=>({...c,match_id:m.id}))),previous_teams:demoData.archives.at(-1)?.teams.map(t=>t.players.map(p=>p.id))||[]};
      const {data,error}=await db.rpc('vmm_get_admin_state');if(error)throw error;
      const {data:changes,error:changesError}=await db.rpc('vmm_get_admin_match_changes');if(changesError)throw changesError;
      return {...data,match_changes:changes||[]};},
    async join(name){if(demo)return demoAction(()=>{if(!demoData.event||demoData.event.status!=='open')throw Error('Signups are closed.');const key=name.trim().replace(/\s+/g,' ').toLocaleLowerCase();if(key.length<2||key.length>45)throw Error('Enter a name between 2 and 45 characters.');const p=demoData.players.find(x=>x.name.toLocaleLowerCase()===key);if(!p)throw Error('Player not registered. Please ask an admin to create your profile first.');if(demoData.signups.some(x=>x.player_id===p.id))throw Error('That name is already checked in.');if(demoData.signups.length>=96)throw Error('Session has reached its signup limit.');demoData.signups.push({player_id:p.id,checked_at:new Date().toISOString()});});const {data,error}=await db.rpc('vmm_join_event',{p_name:name});if(error)throw error;if(data==='already_joined')throw Error('That name is already checked in.');},
    async addPlayer(name,tier,position,checkIn){if(demo)return demoAction(()=>{
      const clean=name.trim().replace(/\s+/g,' ');
      if(clean.length<2||clean.length>45||!/[a-z0-9]/i.test(clean))throw Error('Enter a valid name between 2 and 45 characters.');
      if(!Object.hasOwn(PRESETS,tier)||!POSITIONS.includes(position))throw Error('Choose a skill level and preferred position.');
      if(demoData.players.some(p=>p.name.toLocaleLowerCase()===clean.toLocaleLowerCase()))throw Error('Player already exists. Use their profile below.');
      if(checkIn&&demoData.event?.status!=='open')throw Error('Open a session before checking players in.');
      if(checkIn&&demoData.signups.length>=96)throw Error('Signup limit reached.');
      const p={id:id(),name:clean,mmr:PRESETS[tier],position,wins:0,losses:0};demoData.players.push(p);
      if(checkIn)demoData.signups.push({player_id:p.id,checked_at:new Date().toISOString()});
    });const {error}=await db.rpc('vmm_admin_add_player',{p_name:name,p_tier:tier,p_position:position,p_check_in:checkIn});if(error)throw error;},
    async checkIn(pid){if(demo)return demoAction(()=>{
      if(demoData.event?.status!=='open')throw Error('Signups are not open.');
      if(!demoData.players.some(p=>p.id===pid))throw Error('Player not found.');
      if(demoData.signups.some(s=>s.player_id===pid))throw Error('Player already checked in.');
      if(demoData.signups.length>=96)throw Error('Signup limit reached.');
      demoData.signups.push({player_id:pid,checked_at:new Date().toISOString()});
    });const {error}=await db.rpc('vmm_admin_check_in_player',{p_player_id:pid});if(error)throw error;},
    async updatePlayer(pid,mmr,position){if(demo)return demoAction(()=>{
      const p=demoData.players.find(p=>p.id===pid);if(!p)throw Error('Player not found.');
      if(!POSITIONS.includes(position)||!Number.isInteger(mmr)||mmr<500||mmr>2500)throw Error('Invalid rating or preferred position.');
      if(p.mmr!==mmr&&demoData.event?.status==='locked'&&demoData.teams.some(t=>t.players.some(tp=>tp.id===pid)))throw Error('Cannot modify MMR during an active round. Position changes are allowed.');
      p.mmr=mmr;p.position=position;
    });const {error}=await db.rpc('vmm_update_player',{p_player_id:pid,p_mmr:mmr,p_position:position});if(error)throw error;},
    async createEvent(title,date,size){if(demo)return demoAction(()=>{if(demoData.event)throw Error('Finish the existing event first.');demoData.event={id:id(),title,date,team_size:size,court_mode:'mixed',round_number:1,duration_minutes:180,status:'open'};demoData.signups=[];demoData.teams=[];demoData.matches=[];demoData.history=[];demoData.archives=[];});const {error}=await db.rpc('vmm_create_event',{p_title:title,p_date:date,p_team_size:size});if(error)throw error;},
    async setCourtMode(eventId,mode){
      if(!['mixed','split'].includes(mode))throw Error('Invalid court setup.');
      if(demo)return demoAction(()=>{
        if(demoData.event?.id!==eventId||demoData.event.status!=='open')throw Error('Court setup can only change before teams are published.');
        demoData.event.court_mode=mode;
      });
      const {error}=await db.rpc('vmm_set_court_mode',{p_event_id:eventId,p_mode:mode});if(error)throw error;
    },
    async setMmr(pid,mmr){if(demo)return demoAction(()=>{if(demoData.event?.status==='locked'&&demoData.teams.some(t=>t.players.some(p=>p.id===pid)))throw Error('Cannot modify a player in an active round.');const p=demoData.players.find(x=>x.id===pid);if(!p)throw Error('Player not found.');p.mmr=mmr;});const {error}=await db.rpc('vmm_set_mmr',{p_player_id:pid,p_mmr:mmr});if(error)throw error;},
    async removeSignup(eventId,pid){if(demo)return demoAction(()=>{if(demoData.event?.status!=='open')throw Error('Teams are already published.');demoData.signups=demoData.signups.filter(s=>s.player_id!==pid);});const {error}=await db.rpc('vmm_remove_signup',{p_event_id:eventId,p_player_id:pid});if(error)throw error;},
    async publish(eventId,groups){if(demo)return demoAction(()=>{if(demoData.event?.status!=='open')throw Error('Signups are closed.');if(groups.length!==6)throw Error('Six teams required.');demoData.teams=groups.map((people,i)=>({id:id(),court:Math.floor(i/3)+1,number:i%3+1,players:people.map(p=>({id:p.id,name:p.name,is_placeholder:Boolean(p.is_placeholder)}))}));demoData.matches=[];for(let court=1;court<=2;court++){const [a,b,c]=demoData.teams.filter(t=>t.court===court);demoData.matches.push({id:id(),court,order:1,team_a_id:a.id,team_b_id:b.id,winner_team_id:null,score_a:null,score_b:null,completed_seq:null},{id:id(),court,order:2,team_a_id:null,team_b_id:c.id,winner_team_id:null,score_a:null,score_b:null,completed_seq:null},{id:id(),court,order:3,team_a_id:null,team_b_id:c.id,winner_team_id:null,score_a:null,score_b:null,completed_seq:null});}demoData.event.status='locked';});const {error}=await db.rpc('vmm_publish_teams',{p_event_id:eventId,p_teams:groups.map(g=>g.map(p=>p.id))});if(error)throw error;},
    async report(mid,winner,scoreA,scoreB){if(demo)return demoAction(()=>{const m=demoData.matches.find(m=>m.id===mid);if(!m||m.winner_team_id||!m.team_a_id||!m.team_b_id)throw Error('Match is not ready.');if(demoData.matches.some(x=>x.court===m.court&&x.order<m.order&&!x.winner_team_id))throw Error('Previous court match is unfinished.');const winning=demoData.teams.find(t=>t.id===winner),losing=demoData.teams.find(t=>t.id===(winner===m.team_a_id?m.team_b_id:m.team_a_id));if(!winning||!losing)throw Error('Invalid winner.');const delta=window.RallyMath.matchSwing(average(winning),average(losing),scoreA,scoreB);const changes=[],ratingChanges=[];for(const [team,win] of [[winning,true],[losing,false]])for(const tp of team.players.filter(p=>!p.is_placeholder)){const p=demoData.players.find(x=>x.id===tp.id);changes.push({id:p.id,mmr:p.mmr,wins:p.wins,losses:p.losses});p.mmr=Math.max(500,Math.min(2500,p.mmr+(win?delta:-delta)));if(win)p.wins++;else p.losses++;ratingChanges.push({player_id:p.id,player_name:p.name,team_id:team.id,delta:p.mmr-changes.at(-1).mmr});}m.mmr_changes=ratingChanges;m.winner_team_id=winner;m.score_a=scoreA;m.score_b=scoreB;m.completed_seq=demoData.history.length+1;demoData.history.push({mid,changes});if(m.order===1){demoData.matches.find(x=>x.court===m.court&&x.order===2).team_a_id=winner;demoData.matches.find(x=>x.court===m.court&&x.order===3).team_a_id=losing.id;}});const {error}=await db.rpc('vmm_report_result',{p_match_id:mid,p_winner_team_id:winner,p_score_a:scoreA,p_score_b:scoreB});if(error)throw error;},
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
  async function refresh(force=false){
    if(loading&&!force)return;
    loading=true;
    const epoch=modeEpoch;
    try{
      const next=await api.getPublic();
      if(epoch!==modeEpoch)return;
      pub=next;
      if(demo){admin=await api.getAdmin();if(epoch!==modeEpoch)return;adminGranted=true;}
      else if(user){try{admin=await api.getAdmin();if(epoch!==modeEpoch)return;adminGranted=true;}catch(e){if(epoch!==modeEpoch)return;adminGranted=false;admin=null;if(tab==='admin'&&lastError!=='admin-denied'){flash('Signed in, but this account is not listed as an admin.',true);lastError='admin-denied';}}}
      else{admin=null;adminGranted=false;}
      if(adminGranted||!user)lastError='';
      render();
      $('#connection-status').textContent=demo?'LOCAL SANDBOX':'Synced';
    }catch(e){if(epoch!==modeEpoch)return;if(lastError!==errText(e)){flash(`Connection error: ${errText(e)}`,true);lastError=errText(e);}$('#connection-status').textContent='Connection failed';}
    finally{if(epoch===modeEpoch)loading=false;}
  }
  async function setDemoMode(enable){
    if(!enable&&!configured){flash('The live site needs a configured Supabase connection. This installation can still use demo mode.',true);return;}
    if(demo===enable)return;
    modeEpoch++;demo=enable;
    pub=null;admin=null;adminGranted=false;lastError='';searchText='';attendanceSearch='';attendanceDropdownOpen=false;
    const url=new URL(window.location.href);
    if(enable){url.searchParams.set('demo','1');readDemo();}
    else{url.searchParams.delete('demo');if(db){const {data,error}=await db.auth.getSession();if(error)flash('Could not check sign-in status: '+errText(error),true);user=data?.session?.user||null;}}
    // File previews and about:blank browser tests cannot safely rewrite history.
    if(url.protocol==='http:'||url.protocol==='https:'){try{window.history.replaceState(null,'',url.pathname+url.search+url.hash);}catch(e){/* Nonfatal in previews */}}
    await refresh(true);
    flash(enable?'Demo Mode started. Your real players and match results are safe.':'Back to live Supabase data. Demo changes have not been uploaded.');
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
    const groups=window.RallyMath.makeTeams(players,pub.event.team_size,admin.previous_teams||[],pub.event.court_mode==='split'?'split':'mixed');
    const worked=await act(()=>api.publish(pub.event.id,groups),'Six practice teams built. Record scores here or tap Simulate next match.');
    if(worked)switchTab('courts');
  }
  async function demoScoreNext(){
    if(!demo||!pub?.event)return;
    if(pub.event.status!=='locked'){flash('Build your practice teams first.',true);return;}
    const m=pub.matches.find(m=>!m.winner_team_id&&m.team_a_id&&m.team_b_id&&pub.matches.every(prev=>prev.court!==m.court||prev.order>=m.order||prev.winner_team_id));
    if(!m){flash('All six matches are complete! Use Admin to start another round.');return;}
    const scoreA=25,scoreB=m.order===2?23:m.order===3?19:21;
    const worked=await act(()=>api.report(m.id,m.team_a_id,scoreA,scoreB),`Practice score: Court ${m.court}, Match ${m.order} — ${scoreA}–${scoreB}. Sample player ratings updated only on this device.`);
    if(worked)switchTab('courts');
  }
  function switchTab(next){tab=next;document.querySelectorAll('.nav-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${tab}`));render();window.location.hash=tab;}
  function teamName(t){return t?`Team ${t.number}`:'TBD';}
  function teamById(teamId){return pub?.teams?.find(t=>t.id===teamId)||null;}
  function statusPill(text,cls=''){return `<span class="pill ${cls}">${safe(text)}</span>`;}
  function render(){if(!pub)return;const e=pub.event;$('#event-status').textContent=e?`${e.status==='open'?'SIGNUPS OPEN':'MATCHES IN PROGRESS'} · ${niceDate(e.date).toUpperCase()} · ROUND ${e.round_number||1}`:'VOLLEYBALL MATCHMAKER';$('#hero-title').innerHTML=e?`${safe(e.title)}<br/><em>${e.status==='open'?'Find your squad.':'Game on.'}</em>`:'Everybody plays.<br/><em>Every point counts.</em>';$('#hero-description').textContent=e?`Two courts. Three teams per court. ${e.team_size} spots per team, with fill-in substitutes when needed. Every team gets two games.`:'Build volleyball teams, follow live scores, and explore player leaderboards.';$('#mode-indicator').textContent=demo?'DEMO MODE':'LIVE SYNC';$('#demo-banner').hidden=!demo;const toggle=$('#demo-toggle');toggle.textContent=demo?'✓ Demo active':'▶ Try demo';toggle.classList.toggle('demo-is-active',demo);toggle.setAttribute('aria-label',demo?'Demo mode active; return to live site':'Start demo mode');toggle.setAttribute('aria-pressed',String(demo));const exitDemo=document.querySelector('[data-action=exit-demo]');if(exitDemo)exitDemo.hidden=!configured;const demoHint=$('#demo-hint');if(demo&&demoHint)demoHint.textContent=pub?.event?.status==='locked'?`${pub.matches.filter(m=>m.winner_team_id).length} of 6 practice matches complete. Simulate another result or go to Admin to undo. Please note: demo changes never affect the live database.`:`${pub?.roster?.length||0} of ${pub?.event?.capacity||36} sample spots filled. Choose the court mode in Admin, then build teams.`;
$('#signup-body').innerHTML=renderSignup();$('#courts-body').innerHTML=renderCourts();$('#leaderboard-body').innerHTML=renderLeaderboard();$('#admin-body').innerHTML=renderAdmin();}
  function renderSignup(){const e=pub.event;if(!e)return `<div class="empty"><span class="empty-icon">🏐</span><strong>No open session</strong><p>An admin needs to create a new volleyball session before players can check in.</p></div>`;
    const count=pub.roster.length,cap=e.capacity,slots=Math.max(0,cap-count);const inNext=new Set(priorityRoster().slice(0,cap).map(p=>p.id));const checked=count>=cap;const status=e.status==='open'?'Open for check-in':'Teams are already locked';
    const stats=`<div class="stat-row"><div class="stat"><span class="value">${count}</span><span class="label">Checked in</span></div><div class="stat highlight"><span class="value">${e.status==='locked'?'✓':slots}</span><span class="label">${e.status==='locked'?'Teams built':'Spots to fill'}</span></div><div class="stat"><span class="value">${e.round_number||1}</span><span class="label">Current round</span></div></div>`;
    const roster=pub.roster.map((p,i)=>{const t=teamById(p.team_id);const status=t?statusPill(`C${t.court} · T${t.number}`):(e.status==='locked'||!inNext.has(p.id))?statusPill('Waitlist','wait'):statusPill('Checked in','muted');return `<div class="roster-item"><span class="roster-num">${i+1}</span><span class="roster-name">${safe(p.name)}</span>${status}</div>`;}).join('');
    return `${stats}<div class="split"><section class="panel"><div class="panel-head"><h3 id="signup-title">Player check-in</h3>${statusPill(status,e.status==='open'?'':'muted')}</div><p class="subtle">Enter the name your admin registered. Check in with your registered name. Your team assignment will appear here when it is ready.</p><form id="join-form" class="form-stack"><div><label class="label-input" for="player-name">Your name</label><input id="player-name" class="field" name="name" type="text" placeholder="First name + last initial" minlength="2" maxlength="45" autocomplete="name" required ${e.status==='locked'?'disabled':''}/></div><button type="submit" class="btn btn-primary btn-full" ${e.status==='locked'?'disabled':''}>${e.status==='locked'?'Check-in closed':'Check in →'}</button></form><div class="divider"></div><div class="small-caps">Session progress</div><div class="progress-wrap"><span style="width:${Math.min(100,Math.round(count/cap*100))}%"></span></div><div class="subtle">${e.status==='locked'?'Matchups are published. Follow the Live Courts tab.':checked?'Six full teams can be made. Extra players rotate in on later rounds.':count>=6?`Teams can be made now with ${plural(slots,'substitute spot')}.`: `${plural(6-count,'more registered player')} needed to build six teams.`}</div><div class="hint" style="margin-top:17px">An admin must create your player profile before your first check-in. Returning players can use their existing profile.</div></section><section class="panel"><div class="panel-head"><h3>Checked-in players</h3><span class="small-caps">${count} total</span></div>${roster?`<div class="roster-list">${roster}</div>`:'<div class="empty"><strong>No players yet</strong><p>Be the first to check in.</p></div>'}</section></div>`;
  }
  function renderLeaderboard(){
    const ranked=pub.leaderboard||[];
    const filtered=ranked.filter(p=>leaderboardPosition==='All'||(p.position||'Unspecified')===leaderboardPosition);
    const positionCounts=POSITIONS.map(p=>({name:p,count:ranked.filter(r=>(r.position||'Unspecified')===p).length}));
    const sumWins=ranked.reduce((sum,p)=>sum+(p.wins||0),0);
    const list=filtered.map((p,i)=>{
      return `<div class="ranking-row"><div class="ranking-number ${i<3?'top-rank':''}">${i+1}</div><div class="ranking-person"><strong>${safe(p.name)}</strong><span>${safe(p.position||'Unspecified')}</span></div><div class="ranking-record">${p.wins||0}W <span>·</span> ${p.losses||0}L</div></div>`;
    }).join('');
    return `<div class="section-top"><div><h2 id="leaderboard-title" class="section-title">Player leaderboards</h2><p class="section-sub">Browse player standings and filter by preferred volleyball position.</p></div></div>
      <section class="panel leaderboard-panel">
        <div class="leaderboard-summary"><div><span class="mini-label">Registered players</span><strong>${ranked.length}</strong></div><div><span class="mini-label">Matches recorded</span><strong>${Math.round(sumWins)}</strong></div><div><span class="mini-label">Selected position</span><strong>${leaderboardPosition==='All'?'All':filtered.length}</strong></div></div>
        <div class="leaderboard-toolbar"><label class="label-input" for="leaderboard-filter">Preferred position</label><select id="leaderboard-filter" class="field">${positionOptions(leaderboardPosition,true)}</select></div>
        <div class="position-summary">${positionCounts.filter(x=>x.count).map(x=>`<span>${safe(x.name)} <b>${x.count}</b></span>`).join('')}</div>
        <div class="ranking-list">${list||'<div class="empty"><strong>No players in this position yet</strong><p>Admins can assign a preferred position when creating or editing a player.</p></div>'}</div>
        <p class="subtle leaderboard-note">Positions are for organizing leaderboards. Team assignments are made separately.</p>
      </section>`;
  }
  const signedChange=value=>`${value>0?'+':''}${value}`;
  function matchRatingDetails(m,ta,tb){
    const changes=adminGranted?(admin?.match_changes||[]).filter(c=>c.match_id===m.id):[];
    if(!m.winner_team_id)return '';
    if(!changes.length)return '<div class="rating-summary"><span>MMR changes unavailable for this result</span></div>';
    const byTeam=t=>changes.filter(c=>c.team_id===t?.id);
    const side=t=>{const members=byTeam(t);return `<div class="rating-team"><div class="rating-team-name">${safe(teamName(t))} ${t.id===m.winner_team_id?'<span class="rating-result-win">WIN</span>':'<span class="rating-result-loss">LOSS</span>'}</div>${members.map(c=>`<div class="rating-person"><span>${safe(c.player_name||t?.players.find(p=>p.id===c.player_id)?.name||'Player')}</span><strong class="${Number(c.delta)>=0?'mmr-plus':'mmr-minus'}">${signedChange(Number(c.delta))} MMR</strong></div>`).join('')||'<div class="rating-no-players">No rated players</div>'}</div>`;};
    const bonus=window.RallyMath.marginBonus(m.score_a,m.score_b);
    return `<div class="rating-summary"><div class="rating-summary-head"><strong>MMR earned / lost</strong><span>${bonus?`Score margin bonus: +${bonus} to swing`:'Score margin bonus: +0'}</span></div><div class="rating-columns">${side(ta)}${side(tb)}</div><p class="rating-footnote">Actual player changes shown. Temporary subs never receive MMR.</p></div>`;
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
  function renderCourts(){
    const e=pub.event;const canScore=Boolean(adminGranted&&e?.status==='locked');
    const title=`<div class="section-top"><div><h2 id="courts-title" class="section-title">Live court rotations</h2><p class="section-sub">Three matches per court · Each team plays twice · ${canScore?'Enter the final scores to record results.':'Live match scores and schedules.'}</p></div><button class="btn btn-small btn-secondary" data-action="refresh">↻ Refresh</button></div>`;
    if(!e)return `${title}<div class="empty"><strong>No active session</strong><p>Once check-in opens, the court schedule will show here.</p></div>`;
    if(!pub.teams.length)return `${title}<div class="empty"><span class="empty-icon">🏐</span><strong>Waiting for team assignments</strong><p>Once at least six players have checked in, an admin can create six teams and fill missing spots with substitute slots.</p></div>`;
    const cards=[1,2].map(court=>{
      const teams=pub.teams.filter(t=>t.court===court).sort((a,b)=>a.number-b.number);
      const matches=pub.matches.filter(m=>m.court===court).sort((a,b)=>a.order-b.order);
      const gamesDone=matches.filter(m=>m.winner_team_id).length;
      return `<section class="court"><div class="court-header"><div><h3>${e.court_mode==='split'?(court===1?'Court 01 · Competitive':'Court 02 · Beginner-friendly'):`Court 0${court}`}</h3><p>${gamesDone}/3 matches completed</p></div>${statusPill(gamesDone===3?'DONE':gamesDone>0?'PLAYING':'UP NEXT',gamesDone===3?'win':'muted')}</div>
        <div class="teams-grid">${teams.map(t=>{return `<div class="team"><div class="team-title">${safe(teamName(t))}</div><ul class="team-members">${t.players.map(p=>p.is_placeholder?'<li class="sub-member"><span>✳ Sub needed</span><small>Temporary substitute</small></li>':`<li>${safe(p.name)}</li>`).join('')}</ul></div>`;}).join('')}</div>
        <div class="match-list">${matches.map(m=>renderMatch(m,canScore)).join('')}</div></section>`;
    });
    return `${title}${canScore?'<div class="courts-admin-notice">🔒 Admin scoring enabled · Enter the final points and save the result.</div>':''}
      <div class="courts-layout">${cards.join('')}</div><div class="hint" style="margin-top:15px">Each court has three matches. Every team plays twice. Temporary substitute spots can be filled by available players.</div>`;
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
        <div><label class="label-input" for="add-position">Preferred position</label><select class="field" name="position" id="add-position">${positionOptions('Unspecified')}</select></div></div>
        ${active?'<label class="check-inline"><input type="checkbox" name="checkin" checked /> Check into the current session now</label>':''}
        <button class="btn btn-primary btn-full" type="submit">＋ Create player profile</button>
      </form></section>`;}
  function renderAdmin(){if(!demo&&!user)return `<section class="panel" style="max-width:500px;margin:0 auto"><div class="panel-head"><h3 id="admin-title">Admin sign-in</h3>${statusPill('Private','muted')}</div><p class="subtle">Only approved staff can manage player profiles, attendance, team assignments, and match results.</p><form id="login-form" class="form-stack"><div><label for="admin-email" class="label-input">Email</label><input id="admin-email" class="field" type="email" name="email" placeholder="you@example.com" autocomplete="username" required /></div><div><label for="admin-password" class="label-input">Password</label><input id="admin-password" class="field" type="password" name="password" autocomplete="current-password" required /></div><button type="submit" class="btn btn-primary btn-full">Sign in securely</button></form><p class="subtle">Admins are approved in Supabase, not through a hardcoded website password.</p></section>`;
    if(!adminGranted)return `<section class="panel"><div class="panel-head"><h3 id="admin-title">Admin permission required</h3></div><p>Your Supabase account is signed in but is not authorized in <code>vmm_admins</code>. Ask the database owner to add this account.</p><button data-action="logout" class="btn btn-secondary">Sign out</button></section>`;
    const e=pub.event;const header=`<div class="section-top"><div><h2 id="admin-title" class="section-title">Admin control center</h2><p class="section-sub">${demo?'Demo controls: no account needed':`Signed in as ${safe(user?.email||'admin')}`}</p></div>${!demo?'<button class="btn btn-small btn-secondary" data-action="logout">Sign out</button>':''}</div>`;
    if(!e)return `${header}<div class="admin-grid"><section class="panel"><div class="panel-head"><h3>Create a volleyball session</h3>${statusPill('No active session','muted')}</div>${renderCreateForm()}</section>${renderAddPlayerForm()}</div><section class="panel admin-panel"><div class="panel-head"><h3>Player profiles</h3><span class="small-caps">${admin?.players?.length||0} total</span></div>${renderPlayerRatings(false)}</section>`;
    const slots=Math.max(0,e.capacity-pub.roster.length);const canGenerate=pub.roster.length>=6;const results=pub.matches.filter(m=>m.winner_team_id).length;const roundComplete=results===6;
    const courtMode=e.court_mode==='split'?'split':'mixed';
    const modeSelector=`<div class="court-mode-panel"><div class="court-mode-head"><strong>How should courts be organized?</strong><span class="small-caps">ADMIN SETTING</span></div>
      <div class="court-mode-options" role="group" aria-label="Court organization">
        <button type="button" class="court-mode-option ${courtMode==='mixed'?'is-selected':''}" data-action="court-mode" data-mode="mixed" aria-pressed="${courtMode==='mixed'}" ${e.status!=='open'?'disabled':''}><span class="court-mode-symbol">🏐</span><span><strong>Balanced mixed courts</strong><small>Default · Spread advanced players across both courts</small></span></button>
        <button type="button" class="court-mode-option ${courtMode==='split'?'is-selected':''}" data-action="court-mode" data-mode="split" aria-pressed="${courtMode==='split'}" ${e.status!=='open'?'disabled':''}><span class="court-mode-symbol">🏆</span><span><strong>Competitive / beginner courts</strong><small>Court 1: stronger players · Court 2: beginner-friendly</small></span></button>
      </div><p class="subtle court-mode-footnote">${e.status==='open'?'You can switch before publishing teams. Teams are then balanced within the chosen court setup.':'Court mode is locked while teams are playing. Finish or reset the round to change it.'}</p></div>`;
    const controls=`<section class="panel admin-section"><div class="panel-head"><h3>Session management</h3>${statusPill(e.status==='open'?'Accepting players':'Matches live',e.status==='open'?'':'muted')}</div><div class="meta-line"><span>${safe(e.title)}</span><span>•</span><span>${safe(niceDate(e.date))}</span><span>•</span><span>${e.team_size}v${e.team_size}</span><span>•</span><span>Round ${e.round_number||1}</span><span>•</span><span>${pub.roster.length}/${e.capacity} checked in</span></div>${modeSelector}${e.status==='open'?`<p class="subtle">${!canGenerate?`Need ${plural(6-pub.roster.length,'more registered player')} before making six teams.`:slots?`${plural(slots,'open spot')} will be filled with unrated Sub Needed placeholders. A random sub can play without gaining or losing MMR.`:'Ready to balance six full teams. Existing ratings carry over from earlier rounds.'}</p><button type="button" class="btn btn-primary" data-action="generate" ${!canGenerate?'disabled':''}>⚡ Balance ${e.round_number>1?'next-round':'first-round'} teams${slots?` · ${slots} sub ${slots===1?'slot':'slots'}`:''}</button>`:`<p class="subtle">${results}/6 matches complete this round. For evenly matched teams, wins change MMR by roughly +12/−12 per player.</p>${roundComplete?`<div class="hint" style="margin:13px 0">All six games finished! Start another balanced round when everyone is ready.</div><button class="btn btn-primary btn-full" data-action="next-round">↻ Start next balanced round →</button>`:''}<div class="button-row"><button type="button" class="btn btn-secondary btn-small" data-action="undo" ${results===0?'disabled':''}>↶ Undo latest result</button><button type="button" class="btn btn-secondary btn-small" data-action="reset" ${results?'disabled':''}>↻ Reshuffle teams</button></div>`}<div class="divider"></div><button type="button" class="btn btn-danger btn-small" data-action="close">Finish this session</button><div class="warning">Finishing this session allows another to be created. Ratings and player profiles carry forward.</div></section>`;
    const ratings=`<section class="panel admin-section"><div class="panel-head"><h3>Edit player profiles</h3><span class="small-caps">${admin?.players?.length||0} registered</span></div><p class="subtle">Manage existing players, update preferred positions, set exact MMR, and check returning players into a session. Changing positions never changes MMR.</p>${renderPlayerRatings(false)}</section>`;
    return `${header}${renderAttendance()}<div class="admin-grid"><div>${controls}${renderAddPlayerForm()}</div><div>${ratings}</div></div>${renderPrivateMatchRatings()}${e.status==='locked'?'<div class="admin-panel"><button class="btn btn-primary btn-full" type="button" data-tab="courts">🏐 Open Live Courts to record scores →</button></div>':''}`;
  }
  function renderPrivateMatchRatings(){
    if(!adminGranted || !pub?.event || !pub.matches.length)return '';
    const finished=pub.matches.filter(m=>m.winner_team_id).sort((a,b)=>(a.completed_seq||0)-(b.completed_seq||0));
    return `<section class="panel admin-private-results"><div class="panel-head"><h3>🔒 Private match ratings</h3>${statusPill('Admin only','muted')}</div><p class="subtle">Exact MMR changes after each match. These numbers are hidden from Live Courts, player check-in, and public leaderboards.</p>${finished.length?`<div class="private-result-grid">${finished.map(m=>`<article class="private-result"><div class="private-result-head"><strong>Court ${m.court} · Match ${m.order}</strong><span>${safe(teamName(teamById(m.winner_team_id)))} won ${m.score_a}–${m.score_b}</span></div>${matchRatingDetails(m,teamById(m.team_a_id),teamById(m.team_b_id))}</article>`).join('')}</div>`:'<p class="subtle">Record a final score on Live Courts to see individual rating changes here.</p>'}</section>`;
  }
  function renderCreateForm(){return `<form id="create-form" class="form-stack"><div><label class="label-input" for="new-title">Session name</label><input class="field" id="new-title" name="title" value="Open Volleyball" required minlength="3" maxlength="70" /></div><div><label class="label-input" for="new-date">Session date</label><input class="field" id="new-date" name="date" type="date" value="${localDate()}" required /></div><div><label class="label-input" for="new-size">Players per team</label><select class="field" name="size" id="new-size"><option value="2">2v2 · 12 players</option><option value="3">3v3 · 18 players</option><option value="4">4v4 · 24 players</option><option value="5">5v5 · 30 players</option><option value="6" selected>6v6 · 36 players (default)</option></select></div><div class="hint">One session can include multiple balanced rounds. Each round has six teams, three per court, with two matches per team. Games and wait times depend on how long matches take.</div><button type="submit" class="btn btn-primary">Open signups →</button></form>`;}
  function renderPlayerRatings(currentOnly){
    const all=admin?.players||[];const e=pub.event;const activeSet=new Set(pub.roster.map(p=>p.id));
    const arr=(currentOnly?all.filter(p=>activeSet.has(p.id)):all).sort((a,b)=>a.name.localeCompare(b.name));
    if(!arr.length)return '<div class="empty"><strong>No players yet</strong><p>Create your first player profile with the form above.</p></div>';
    const playerCards=arr.map(p=>{
      const locked=e?.status==='locked'&&pub.teams.some(t=>t.players.some(tp=>tp.id===p.id));
      const checked=activeSet.has(p.id);
      return `<div class="player-edit" data-name="${safe(p.name.toLowerCase())}"><div class="player-edit-info"><div class="player-edit-name">${safe(p.name)} ${checked?statusPill('Checked in','win'):''}</div><div class="player-edit-record">${p.wins}W / ${p.losses}L · ${safe(p.position||'Unspecified')}</div></div>
        <div class="profile-controls"><div class="profile-selects"><label>Preferred position<select class="profile-position field" aria-label="Position for ${safe(p.name)}">${positionOptions(p.position||'Unspecified')}</select></label><label>Skill preset<select class="tier-preset field" aria-label="Skill preset for ${safe(p.name)}" ${locked?'disabled':''}><option value="">Keep rating</option><option value="1000">Beginner</option><option value="1200">Intermediate</option><option value="1500">Advanced</option></select></label><label>MMR<input class="profile-mmr field" aria-label="MMR for ${safe(p.name)}" type="number" min="500" max="2500" step="1" value="${p.mmr}" ${locked?'disabled':''}/></label></div>
        <div class="button-row"><button class="btn btn-small btn-secondary save-profile" data-action="save-profile" data-player="${safe(p.id)}">Save profile</button>${e?.status==='open'?(checked?`<button class="btn btn-small btn-danger" data-action="remove-signup" data-player="${safe(p.id)}">Remove check-in</button>`:`<button class="btn btn-small btn-primary" data-action="checkin-player" data-player="${safe(p.id)}">＋ Check in</button>`):''}</div></div></div>`;
    }).join('');return `<div class="form-stack"><label class="label-input" for="player-search">Find player</label><input class="field" id="player-search" type="search" placeholder="Search by name" value="${safe(searchText)}" /></div><div class="admin-roster" style="margin-top:15px">${playerCards}</div>`;
  }
  async function act(job,message){if(mutating)return false;mutating=true;try{await job();flash(message);await refresh();return true;}catch(e){flash(errText(e),true);return false;}finally{mutating=false;}}
  async function handleGenerate(){const e=pub.event;if(!e||!admin)return;const players=priorityRoster().slice(0,e.capacity).map(r=>admin.players.find(p=>p.id===r.id));if(players.some(p=>!p)){flash('Unable to load player ratings. Refresh first.',true);return;}const groups=window.RallyMath.makeTeams(players,e.team_size,admin.previous_teams||[],e.court_mode==='split'?'split':'mixed');const range=window.RallyMath.spread(groups);const missing=groups.flat().filter(p=>p.is_placeholder).length;const selected=groups.flat().filter(p=>!p.is_placeholder).length;if(!confirm(`Publish six balanced teams for round ${e.round_number||1}?\n\n${selected} registered players · ${missing} unrated sub ${missing===1?'slot':'slots'}.\nCourt layout: ${e.court_mode==='split'?'Court 1 competitive · Court 2 beginner-friendly':'Mixed courts with advanced players distributed'}.\n${e.court_mode==='split'?'Teams are balanced within each court.':'Registered-player average MMR spread: '+range+' points.'}\nRecent teammates are separated when possible.\n\nSub placeholders NEVER gain/lose MMR and do not appear on the leaderboard. The ${selected} selected players have the fewest completed rounds (check-in order breaks ties).`))return;await act(()=>api.publish(e.id,groups),'Balanced teams published to both courts. Unrated sub spots are clearly marked.');}
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
    await act(()=>api.report(match.id,winner.id,a,b),`Court ${match.court} result saved: ${teamName(winner)} wins ${Math.max(a,b)}–${Math.min(a,b)}. See private rating details in Admin.`);
  }
  document.addEventListener('submit',async ev=>{const form=ev.target;if(form.classList.contains('live-score-form')){ev.preventDefault();await handleScore(form);return;}if(!['join-form','login-form','create-form','add-player-form'].includes(form.id))return;ev.preventDefault();const values=new FormData(form);if(form.id==='join-form'){const name=String(values.get('name')||'').trim();await act(()=>api.join(name),`${name} checked in successfully!`);}else if(form.id==='add-player-form'){const name=String(values.get('name')||'').trim(),tier=String(values.get('tier')||''),position=String(values.get('position')||''),checkIn=values.get('checkin')==='on';await act(()=>api.addPlayer(name,tier,position,checkIn),`${name} added${checkIn?' and checked in':''}.`);}else if(form.id==='create-form'){const title=String(values.get('title')||'').trim(),date=String(values.get('date')||''),size=Number(values.get('size'));await act(()=>api.createEvent(title,date,size),'Session created. Check-in is open.');}else{if(!db){flash('Add your Supabase configuration first.',true);return;}try{const {data,error}=await db.auth.signInWithPassword({email:String(values.get('email')),password:String(values.get('password'))});if(error)throw error;user=data.user;await refresh();if(adminGranted)flash('Admin signed in.');}catch(e){flash(errText(e),true);}}});
  $('#demo-toggle')?.addEventListener('click',async ()=>{if(demo){if(configured)await setDemoMode(false);else flash('This copy of the site has no live Supabase connection; demo mode is available.');}else await setDemoMode(true);});
  document.addEventListener('click',async ev=>{const nav=ev.target.closest('[data-tab]');if(nav){switchTab(nav.dataset.tab);return;}const btn=ev.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action;switch(action){
    case 'exit-demo':await setDemoMode(false);break;
    case 'demo-full':if(demo){if(demoData.history.length||demoData.teams.length){if(!confirm('Start a new practice with 36 sample attendees? Existing demo results will be reset; live data stays safe.'))break;}loadDemoScenario(36);await refresh();flash('36 sample players are checked in. Six full teams are ready to generate.');switchTab('admin');}break;
    case 'demo-subs':if(demo){if(demoData.history.length||demoData.teams.length){if(!confirm('Start a new practice with 28 players and 8 fill-in slots? Demo results will be reset.'))break;}loadDemoScenario(28);await refresh();flash('28 sample players checked in. Team generation will add 8 unrated substitute placeholders.');switchTab('admin');}break;
    case 'demo-generate':if(demo)await demoBuildTeams();break;
    case 'demo-score':if(demo)await demoScoreNext();break;
    case 'refresh':await refresh();break;
    case 'generate':await handleGenerate();break;
    case 'court-mode':{if(!adminGranted||pub?.event?.status!=='open')break;const mode=btn.dataset.mode;if(!['mixed','split'].includes(mode))break;await act(()=>api.setCourtMode(pub.event.id,mode),mode==='mixed'?'Balanced mixed courts selected.':'Competitive / beginner courts selected.');break;}
    case 'save-profile':{const pid=btn.dataset.player;const card=btn.closest('.player-edit');const mmr=Number(card.querySelector('.profile-mmr').value);const position=card.querySelector('.profile-position').value;if(!Number.isInteger(mmr)||mmr<500||mmr>2500||!POSITIONS.includes(position)){flash('Choose a valid position and MMR between 500 and 2500.',true);return;}await act(()=>api.updatePlayer(pid,mmr,position),'Player profile saved.');break;}
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
    case 'logout':if(db)await db.auth.signOut();user=null;admin=null;adminGranted=false;await refresh();flash('Signed out.');break;
  }});
  document.addEventListener('change',ev=>{if(ev.target?.classList?.contains('tier-preset')&&ev.target.value){ev.target.closest('.profile-controls').querySelector('.profile-mmr').value=ev.target.value;}if(ev.target?.id==='leaderboard-filter'){leaderboardPosition=ev.target.value;$('#leaderboard-body').innerHTML=renderLeaderboard();}});
  document.addEventListener('input',ev=>{if(ev.target?.id==='attendance-search'){attendanceSearch=ev.target.value;attendanceDropdownOpen=Boolean(attendanceSearch.trim());attendanceActive=0;updateAttendanceSuggestions();}if(ev.target?.closest('.live-score-form'))updateScorePreview(ev.target.closest('.live-score-form'));if(ev.target?.id==='player-search'){searchText=ev.target.value.toLowerCase().trim();document.querySelectorAll('.player-edit').forEach(el=>el.hidden=!el.dataset.name.includes(searchText));}});
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
  $('#demo-reset').addEventListener('click',()=>{if(!confirm('Reset the demo, sample players, and all round results?'))return;demoData=seedDemo();demoData.signups=demoData.players.slice(0,36).map((p,i)=>({player_id:p.id,checked_at:new Date(Date.now()+i*1000).toISOString()}));storeDemo();searchText='';refresh();flash('Practice session reset with 36 sample players checked in.');});
  document.querySelectorAll('.nav-tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  async function init(){const hash=window.location.hash.substring(1);if(['signup','courts','leaderboard','admin'].includes(hash))switchTab(hash);if(configured&&!db){flash('Supabase library could not load. Check your internet connection.',true);return;}if(demo){readDemo();adminGranted=true;}else{const {data}=await db.auth.getSession();user=data?.session?.user||null;db.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;});}await refresh();setInterval(()=>{if(!mutating&&document.visibilityState==='visible'&&!document.activeElement?.matches('input,select'))refresh();},12000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!mutating)refresh();});}
  init().catch(e=>flash(errText(e),true));
})();
