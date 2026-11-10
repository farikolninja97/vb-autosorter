/* RallyRank V1.42 - One consistent role order on every view. Presentation only. */
(function(root){
  'use strict';
  const ORDER=['Setter','Outside Hitter','Opposite','Middle Blocker','Libero'];
  const ICONS={'Setter':'👐','Outside Hitter':'⚡','Opposite':'🔥','Middle Blocker':'🧱','Libero':'🛡️'};
  const rank=role=>{const index=ORDER.indexOf(role);return index===-1?99:index;};
  function sort(players,enabled=true){
    if(!enabled)return [...(players||[])];
    return [...(players||[])].sort((a,b)=>rank(a.assigned_position)-rank(b.assigned_position)
      || Number(!!a.is_placeholder)-Number(!!b.is_placeholder)
      || String(a.name||'').localeCompare(String(b.name||'')));
  }
  function icon(role){return ICONS[role]||'🏐';}
  function label(role){if(!role)return '';
    const suffix=role==='Middle Blocker'?' · front row':role==='Libero'?' · back row':'';
    return `${icon(role)} ${role}${suffix}`;
  }
  function preference(player,profile,history){
    const role=player?.assigned_position,primary=profile?.position||profile?.primary_position,
          secondary=profile?.secondary_position;
    if(!role||player?.is_placeholder||!profile)return null;
    const kind=role===primary?'primary':role===secondary?'secondary':null;
    if(!kind)return null;
    const past=Array.isArray(history?.[player.id])?history[player.id]:[];
    const previous=past.length?past[past.length-1]:null;
    const returned=Boolean(previous&&previous!==primary&&previous!==secondary);
    return {kind,returned};
  }
  const api={ORDER,ICONS,rank,sort,icon,label,preference};
  root.RallyTeamDisplay=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
