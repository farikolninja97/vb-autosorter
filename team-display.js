/* RallyRank V1.50 - Consistent role display and Flex-aware preference fit.
   This module changes display classification only; it never changes match assignments. */
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
    if(!ORDER.includes(role)||player?.is_placeholder||!profile)return null;
    // Preserve the matchday safety rule: women cannot cover Middle just by
    // choosing Flex. They must explicitly list Middle as primary or secondary.
    const restrictedMiddle=role==='Middle Blocker'&&profile.gender==='Woman'
      &&primary!=='Middle Blocker'&&secondary!=='Middle Blocker';
    const primaryFit=role===primary||(primary==='Flex'&&!restrictedMiddle);
    const secondaryFit=role===secondary||(secondary==='Flex'&&!restrictedMiddle);
    // Primary Flex makes *any eligible assigned role* a primary fit (green).
    // Secondary Flex covers any eligible role when primary does not (yellow).
    // Exact role matches retain their usual primary/secondary color.
    const kind=primaryFit?'primary':secondaryFit?'secondary':'autofilled';
    const past=Array.isArray(history?.[player.id])?history[player.id]:[];
    const previous=past.length?past[past.length-1]:null;
    const previousWasPreferred=previous&&(previous===primary||previous===secondary
      ||primary==='Flex'||secondary==='Flex');
    const returned=Boolean(kind!=='autofilled'&&previous&&!previousWasPreferred);
    return {kind,returned};
  }
  const api={ORDER,ICONS,rank,sort,icon,label,preference};
  root.RallyTeamDisplay=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
