/* RallyRank V1.37 — public presentation names only. Persistent IDs and court-local team numbers are unchanged. */
(function(root){
  'use strict';
  // Fixed slot-to-name mapping keeps every device and score confirmation consistent.
  const FUNNY_NAMES=Object.freeze([
    'Block Party',
    'Sets on the Beach',
    'Dig Happens',
    'Ace Ventura',
    'Net Ninjas',
    'The Volley Llamas'
  ]);
  function mode(value){return value==='funny'?'funny':'numbers';}
  function slotNumber(court,localNumber){
    const c=Number(court),n=Number(localNumber);
    if(![1,2].includes(c)||![1,2,3].includes(n))return null;
    // Court 2 ALWAYS starts at 4, even if Court 1 only has two teams.
    return (c===2?3:0)+n;
  }
  function slotLabel(court,localNumber,namingMode='numbers'){
    const slot=slotNumber(court,localNumber);
    if(slot===null)return 'TBD';
    return mode(namingMode)==='funny'?FUNNY_NAMES[slot-1]:`Team ${slot}`;
  }
  function label(team,namingMode='numbers'){
    return team?slotLabel(team.court,team.number,namingMode):'TBD';
  }
  const api=Object.freeze({FUNNY_NAMES,mode,slotNumber,slotLabel,label});
  root.RallyTeamNames=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
