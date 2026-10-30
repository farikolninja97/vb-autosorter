(() => {
  'use strict';
  const VERSION='1.34';
  const $=selector=>document.querySelector(selector);
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const config=window.VB_CONFIG||{};
  const db=config.supabaseUrl&&config.supabaseAnonKey&&window.supabase?.createClient(config.supabaseUrl,config.supabaseAnonKey)||null;
  const state={data:null,filter:'all',search:'',loading:false,refreshQueued:false,busy:false,modal:null,readyToScore:false,channel:null,wakeLock:null};
  let toastTimer=null,refreshTimer=null;
  const moneylessTeamName=team=>team?`Team ${team.number}`:'TBD';
  const courtName=c=>`Court ${c}`;
  const allTeams=()=>state.data?.teams||[];
  const allMatches=()=>state.data?.matches||[];
  const teamById=id=>allTeams().find(t=>t.id===id)||null;
  const formatSize=c=>{
    const event=state.data?.event;
    const n=Number(c===2?(event?.court2_team_size||event?.team_size):event?.team_size)||6;
    return `${n}v${n}`;
  };
  function notify(message,error=false){
    const el=$('#notice');el.textContent=message;el.hidden=false;el.className=`kiosk-notice${error?' is-error':''}`;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,7000);
  }
  function status(text,kind='ok'){
    const el=$('#connection');el.className=`connection connection-${kind}`;
    el.innerHTML=`<span class="status-dot"></span>${escapeHtml(text)}`;
  }
  function applicableRedo(court){
    if(!state.readyToScore)return null;
    const r=(state.data?.redo_scores||[]).find(x=>Number(x.court)===court);
    const m=r&&allMatches().find(x=>x.id===r.match_id);
    return m&&!m.winner_team_id&&m.team_a_id&&m.team_b_id?r:null;
  }
  function latestCompleted(court){
    return allMatches().filter(m=>Number(m.court)===court&&m.winner_team_id&&Number(m.completed_seq)>0)
      .sort((a,b)=>Number(b.completed_seq)-Number(a.completed_seq))[0]||null;
  }
  function matchReady(m){
    if(!m||m.winner_team_id||!m.team_a_id||!m.team_b_id)return false;
    return allMatches().every(p=>Number(p.court)!==Number(m.court)||Number(p.order)>=Number(m.order)||Boolean(p.winner_team_id));
  }
  const outcome=(m)=>{
    const a=teamById(m.team_a_id),b=teamById(m.team_b_id);
    const left=a?moneylessTeamName(a):(Number(m.order)===2?'Winner of Match 1':'Loser of Match 1');
    const right=b?moneylessTeamName(b):'TBD';
    return {left,right};
  };
  function renderMatch(m){
    const done=Boolean(m.winner_team_id),ready=state.readyToScore&&matchReady(m);
    const {left,right}=outcome(m);
    const stateText=done?'FINAL':ready?'READY TO SCORE':matchReady(m)?'SCORING UNAVAILABLE':'WAITING';
    return `<article class="kiosk-match ${done?'is-final':ready?'is-ready':'is-waiting'}">
      <div class="kiosk-match-top"><b>Match ${Number(m.order)}</b><span>${stateText}</span></div>
      <div class="kiosk-match-result"><span class="match-team ${done&&m.winner_team_id===m.team_a_id?'match-winner':''}">${escapeHtml(left)}</span><strong>${done?`${Number(m.score_a)}<i>–</i>${Number(m.score_b)}`:'VS'}</strong><span class="match-team ${done&&m.winner_team_id===m.team_b_id?'match-winner':''}">${escapeHtml(right)}</span></div>
      ${ready?`<button type="button" class="score-trigger" data-score-match="${escapeHtml(m.id)}">✎ Enter final score</button>`:''}
    </article>`;
  }
  function renderTeam(team,court){
    return `<section class="kiosk-team" data-team-id="${escapeHtml(team.id)}" aria-label="${courtName(court)} ${moneylessTeamName(team)}">
      <h3>${escapeHtml(moneylessTeamName(team))}</h3>
      <ol class="roster-list">${(team.players||[]).map(player=>`<li class="${player.is_placeholder?'roster-placeholder':''}"><span class="roster-name">${escapeHtml(player.is_placeholder?'Sub needed':player.name)}</span>${player.assigned_position?`<small>${escapeHtml(player.assigned_position)}</small>`:''}</li>`).join('')}</ol>
    </section>`;
  }
  function renderCourt(court){
    const teams=allTeams().filter(t=>Number(t.court)===court).sort((a,b)=>Number(a.number)-Number(b.number));
    const matches=allMatches().filter(m=>Number(m.court)===court).sort((a,b)=>Number(a.order)-Number(b.order));
    const completed=matches.filter(m=>m.winner_team_id).length;
    const undo=latestCompleted(court),redo=applicableRedo(court);
    const scorePossible=state.readyToScore&&state.data?.event?.status==='locked';
    return `<section class="kiosk-court kiosk-court-${court}" id="kiosk-court-${court}" aria-label="${courtName(court)}">
      <header class="kiosk-court-head"><div><span class="court-eyebrow">${court===1?'● BLUE COURT':'● RED COURT'}</span><h2>Court ${court}</h2><p>${formatSize(court)} · ${teams.length} teams · ${completed}/${matches.length||3} matches finished</p></div><span class="court-progress">${completed===3?'COMPLETED':completed?'IN PROGRESS':'UP NEXT'}</span></header>
      <div class="roster-heading"><strong>PLAYER ROSTERS</strong><small>Find your team below</small></div>
      <div class="kiosk-teams">${teams.map(t=>renderTeam(t,court)).join('')}</div>
      <div class="matches-heading"><strong>MATCHES & SCORING</strong><small>Play to ${Number(state.data?.event?.target_score)||25} · Win by 2</small></div>
      <div class="kiosk-matches">${matches.map(renderMatch).join('')}</div>
      ${scorePossible?`<div class="kiosk-corrections"><span>Score mistake?</span><button type="button" data-correction="undo" data-court="${court}" ${undo?'':'disabled'}>↶ Undo</button><button type="button" data-correction="redo" data-court="${court}" ${redo?'':'disabled'}>↷ Redo</button></div>`:''}
    </section>`;
  }
  function render(){
    const e=state.data?.event;
    const count=Number(e?.player_count)||0;
    $('#session-name').textContent=e?(e.title||'Volleyball Night'):'No active volleyball session';
    $('#session-subtitle').textContent=e?`Round ${Number(e.round_number)||1} · ${count} checked in · ${e.status==='locked'?'Teams are live':'Waiting for team assignments'}`:'Ask an organizer to start today’s session';
    const root=$('#kiosk-content');
    document.body.dataset.courtFilter=state.filter;
    document.querySelectorAll('[data-filter]').forEach(b=>{
      const active=b.dataset.filter===state.filter;
      b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));
    });
    if(!e){root.innerHTML='<section class="kiosk-empty"><strong>No active session yet</strong><p>Team assignments will appear here when organizers open a session.</p></section>';renderSearch();return;}
    if(!allTeams().length){root.innerHTML='<section class="kiosk-empty"><strong>Waiting for teams</strong><p>Once organizers publish a round, all six team rosters and court assignments will appear here automatically.</p></section>';renderSearch();return;}
    root.innerHTML=`<div class="kiosk-courts ${state.filter==='all'?'show-both':'show-one'}">${[1,2].filter(c=>state.filter==='all'||state.filter===String(c)).map(renderCourt).join('')}</div>`;
    if(e.status==='locked'&&!state.readyToScore){root.insertAdjacentHTML('afterbegin','<p class="readonly-warning" role="alert">Scores are read-only. Public scoring requires the V1.32 Supabase migration. Ask an organizer for assistance.</p>');}
    renderSearch();
  }
  function renderSearch(){
    const root=$('#search-results');
    const query=state.search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
    if(!query){root.hidden=true;root.innerHTML='';return;}
    const hits=allTeams().flatMap(t=>(t.players||[]).filter(p=>!p.is_placeholder&&String(p.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().includes(query)).map(p=>({name:p.name,court:t.court,team:t.number,id:t.id}))).slice(0,12);
    root.hidden=false;
    root.innerHTML=hits.length?hits.map(h=>`<button type="button" data-find-team="${escapeHtml(h.id)}" data-find-court="${Number(h.court)}"><strong>${escapeHtml(h.name)}</strong><span class="search-court-${Number(h.court)}">${courtName(h.court)} · Team ${Number(h.team)}</span></button>`).join(''):'<span class="no-search-results">No matching player in the published teams.</span>';
  }
  function verifyScore(a,b){
    if(!/^\d+$/.test(a)||!/^\d+$/.test(b))throw Error('Enter both scores.');
    if(!window.RallyMath?.validateFinalScore)throw Error('Score validation unavailable. Refresh the kiosk.');
    return window.RallyMath.validateFinalScore(Number(a),Number(b),Number(state.data?.event?.target_score)||25);
  }
  function updateScoreValidation(){
    if(!state.modal)return;
    const output=$('#score-validation'),submit=$('#save-score');
    try{
      const scores=verifyScore($('#score-a').value.trim(),$('#score-b').value.trim());
      const match=allMatches().find(m=>m.id===state.modal.matchId);
      const winner=teamById(scores.a>scores.b?match?.team_a_id:match?.team_b_id);
      output.textContent=`✓ ${moneylessTeamName(winner)} wins · Ready to save`;
      output.classList.add('valid');submit.disabled=false;
    }catch(error){output.textContent=error.message;output.classList.remove('valid');submit.disabled=true;}
  }
  function closeScore(){
    $('#score-overlay').hidden=true;document.body.classList.remove('modal-open');state.modal=null;
    $('#score-a').value='';$('#score-b').value='';
  }
  function openScore(matchId){
    if(state.busy||!state.readyToScore)return;
    const m=allMatches().find(m=>m.id===matchId);
    if(!matchReady(m)){notify('Match is no longer ready. Refresh and try again.',true);return;}
    const {left,right}=outcome(m);
    state.modal={matchId:m.id,court:Number(m.court),eventId:state.data.event.id,round:state.data.event.round_number,teamA:m.team_a_id,teamB:m.team_b_id};
    $('#score-overlay').dataset.court=m.court;
    $('#modal-context').textContent=`COURT ${m.court} · MATCH ${m.order}`;
    $('#modal-heading').textContent='Enter final score';
    $('#modal-rule').textContent=`Play to ${Number(state.data?.event?.target_score)||25} · Win by 2`;
    $('#score-label-a').textContent=left;$('#score-label-b').textContent=right;
    $('#score-a').value='';$('#score-b').value='';
    $('#score-overlay').hidden=false;document.body.classList.add('modal-open');
    updateScoreValidation();
  }
  async function loadState(){
    const {data,error}=await db.rpc('vmm_get_state');if(error)throw error;
    let redo=[],ready=false;
    if(data?.event?.status==='locked'){
      const reply=await db.rpc('vmm_get_public_court_redo_state');
      if(!reply.error){ready=true;redo=Array.isArray(reply.data)?reply.data:[];}
    }
    return {data:{...data,redo_scores:redo},ready};
  }
  async function refresh(){
    if(state.loading){state.refreshQueued=true;return;}
    if(state.busy)return;
    if(!db){status('Setup required','error');$('#kiosk-content').innerHTML='<div class="kiosk-empty"><strong>Supabase is not connected</strong><p>Use the configured config.js from your existing RallyRank website. Do not replace it.</p></div>';return;}
    state.loading=true;status('Syncing','syncing');
    try{
      const result=await loadState();state.data=result.data;state.readyToScore=result.ready;
      status(navigator.onLine?'Live':'Offline',navigator.onLine?'ok':'error');render();
      if(state.modal){
        const s=state.modal,m=allMatches().find(x=>x.id===s.matchId);
        if(!state.readyToScore||state.data?.event?.id!==s.eventId||state.data.event.round_number!==s.round||!matchReady(m)||m.team_a_id!==s.teamA||m.team_b_id!==s.teamB){closeScore();notify('That match changed on another device. Score entry was closed to prevent a mistake.',true);}
        else updateScoreValidation();
      }
    }catch(e){status('Connection problem','error');if(!state.data)$('#kiosk-content').innerHTML=`<div class="kiosk-empty"><strong>Could not load the courts</strong><p>${escapeHtml(e.message||'Check your internet connection.')}</p><button class="retry-button" type="button" id="retry-load">Try again</button></div>`;notify('Could not sync. Check internet and tap Refresh.',true);}
    finally{state.loading=false;if(state.refreshQueued){state.refreshQueued=false;queueMicrotask(()=>refresh());}}
  }
  function announceChanged(){
    try{state.channel?.send({type:'broadcast',event:'changed',payload:{kind:'state'}})?.catch?.(()=>{});}catch(e){}
  }
  async function performAction(fn,success,options={}){
    if(state.busy)return false;
    state.busy=true;
    try{await fn();if(options.closeScoreOnSuccess)closeScore();notify(success);announceChanged();return true;}
    catch(e){notify(`${e.message||'Action failed.'} Refresh if someone else already entered a result.`,true);return false;}
    finally{state.busy=false;await refresh();}
  }
  async function saveScore(){
    const s=state.modal;if(!s||state.busy)return;
    let scores;try{scores=verifyScore($('#score-a').value.trim(),$('#score-b').value.trim());}catch(e){updateScoreValidation();return;}
    const match=allMatches().find(m=>m.id===s.matchId);
    if(!matchReady(match)){closeScore();notify('This match is no longer available.',true);return;}
    const left=moneylessTeamName(teamById(s.teamA)),right=moneylessTeamName(teamById(s.teamB));
    if(!confirm(`Save final score?\n\nCOURT ${s.court} · MATCH ${match.order}\n${left} ${scores.a} – ${scores.b} ${right}\nWinner: ${scores.a>scores.b?left:right}\n\nDouble-check the court and result. You can undo mistakes later.`))return;
    $('#save-score').disabled=true;
    const saved=await performAction(async()=>{
      // Check the live round again. The server also enforces match readiness.
      const snapshot=await db.rpc('vmm_get_state');if(snapshot.error)throw snapshot.error;
      const e=snapshot.data?.event,m=snapshot.data?.matches?.find(x=>x.id===s.matchId);
      const prior=(snapshot.data?.matches||[]).some(x=>Number(x.court)===s.court&&Number(x.order)<Number(m?.order)&&!x.winner_team_id);
      if(!e||e.id!==s.eventId||e.round_number!==s.round||e.status!=='locked'||!m||m.winner_team_id||m.team_a_id!==s.teamA||m.team_b_id!==s.teamB||prior)throw Error('The live match changed. No score was saved.');
      const result=await db.rpc('vmm_report_result',{p_match_id:s.matchId,p_winner_team_id:scores.a>scores.b?s.teamA:s.teamB,p_score_a:scores.a,p_score_b:scores.b});
      if(result.error)throw result.error;
    },`Court ${s.court} score saved: ${left} ${scores.a}–${scores.b} ${right}`,{closeScoreOnSuccess:true});
    if(!saved)closeScore();
  }
  async function correction(type,court){
    if(state.busy||!state.readyToScore)return;
    const redo=type==='redo'?applicableRedo(court):null;
    const match=type==='undo'?latestCompleted(court):redo&&allMatches().find(m=>m.id===redo.match_id);
    if(!match){notify('No score available to correct on this court.',true);return;}
    const scoreA=type==='redo'?redo.score_a:match.score_a,scoreB=type==='redo'?redo.score_b:match.score_b;
    const sideA=moneylessTeamName(teamById(match.team_a_id)),sideB=moneylessTeamName(teamById(match.team_b_id));
    const msg=`${type==='undo'?'UNDO':'REDO'} COURT ${court} SCORE?\n\nMatch ${match.order}: ${sideA} ${scoreA} – ${scoreB} ${sideB}\n\nThis only changes Court ${court}, including its player MMR. ${type==='undo'?'Redo will restore this result if needed.':'The original result will be restored.'}`;
    if(!confirm(msg))return;
    const rpc=type==='undo'?'vmm_undo_court_result':'vmm_redo_court_result';
    await performAction(async()=>{
      const response=await db.rpc(rpc,{p_event_id:state.data.event.id,p_court_number:court,p_expected_match_id:match.id});
      if(response.error)throw response.error;
    },`Court ${court} · Match ${match.order} ${type==='undo'?'undone':'restored'}.`);
  }
  async function setFullscreen(){
    try{
      if(document.fullscreenElement){await document.exitFullscreen();return;}
      if(!document.documentElement.requestFullscreen)throw Error('Fullscreen unavailable');
      await document.documentElement.requestFullscreen({navigationUI:'hide'});
      try{if(navigator.wakeLock?.request)state.wakeLock=await navigator.wakeLock.request('screen');}catch(e){/* No wake lock on this device */}
    }catch(e){notify('Fullscreen was blocked. In Chrome on Android, use the menu to add this kiosk to your Home screen, or try the Fullscreen button again.',true);}
  }
  function init(){
    $('#fullscreen-button').addEventListener('click',setFullscreen);
    document.addEventListener('fullscreenchange',()=>{
      const isFull=Boolean(document.fullscreenElement);
      $('#fullscreen-button').innerHTML=isFull?'⤢ <span>Exit fullscreen</span>':'⛶ <span>Fullscreen</span>';
      document.body.classList.toggle('fullscreen-active',isFull);
      if(!isFull&&state.wakeLock){try{state.wakeLock.release().catch(()=>{});}catch(e){}state.wakeLock=null;}
    });
    $('#refresh-button').addEventListener('click',()=>refresh());
    $('#player-search').addEventListener('input',e=>{state.search=e.target.value;renderSearch();});
    $('#modal-close').addEventListener('click',closeScore);$('#cancel-score').addEventListener('click',closeScore);
    $('#score-overlay').addEventListener('click',e=>{if(e.target.id==='score-overlay')closeScore();});
    $('#score-a').addEventListener('input',updateScoreValidation);$('#score-b').addEventListener('input',updateScoreValidation);
    $('#kiosk-score-form').addEventListener('submit',e=>{e.preventDefault();saveScore();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.modal)closeScore();});
    document.addEventListener('click',e=>{
      const filter=e.target.closest('[data-filter]');if(filter){state.filter=filter.dataset.filter;render();return;}
      const find=e.target.closest('[data-find-team]');if(find){const name=find.querySelector('strong')?.textContent||'Player',assignment=find.querySelector('span')?.textContent||'';state.filter=find.dataset.findCourt;state.search='';$('#player-search').value='';render();const card=[...document.querySelectorAll('[data-team-id]')].find(x=>x.dataset.teamId===find.dataset.findTeam);if(card){card.classList.add('is-highlighted');card.scrollIntoView({behavior:'smooth',block:'center'});}notify(`${name} · ${assignment}`);return;}
      const score=e.target.closest('[data-score-match]');if(score){openScore(score.dataset.scoreMatch);return;}
      const correctionButton=e.target.closest('[data-correction]');if(correctionButton&&!correctionButton.disabled){correction(correctionButton.dataset.correction,Number(correctionButton.dataset.court));return;}
      const adjust=e.target.closest('[data-adjust]');if(adjust){const [side,delta]=adjust.dataset.adjust.split(':');const input=$(`#score-${side}`);const n=Number(input.value)||0;input.value=String(Math.max(0,Math.min(99,n+Number(delta))));updateScoreValidation();return;}
      if(e.target.id==='retry-load')refresh();
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible'){
        refresh();
        if(document.fullscreenElement&&navigator.wakeLock?.request&&(!state.wakeLock||state.wakeLock.released))navigator.wakeLock.request('screen').then(x=>state.wakeLock=x).catch(()=>{});
      }
    });
    window.addEventListener('online',refresh);
    window.addEventListener('offline',()=>status('Offline','error'));
    if(db&&navigator.onLine){
      try{const channel=db.channel('rallyrank:live-updates',{config:{broadcast:{self:false}}});state.channel=channel;
        channel.on('broadcast',{event:'changed'},()=>refresh()).subscribe();}catch(e){/* Timer fallback */}
    }
    refresh();
    refreshTimer=setInterval(()=>{if(document.visibilityState==='visible'&&!state.busy)refresh();},45000);
    window.addEventListener('pagehide',()=>{clearInterval(refreshTimer);if(db&&state.channel)db.removeChannel(state.channel).catch(()=>{});});
  }
  init();
})();
