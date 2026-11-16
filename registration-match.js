/* RallyRank V1.57 - private, client-side registration name matching.
   Never checks anyone in or creates profiles; all actions require admin review. */
(function(root){
  'use strict';
  const clean=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const parts=s=>clean(s).split(' ').filter(Boolean);
  function distance(a,b){
    if(!a)return b.length;if(!b)return a.length;
    const row=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      let prev=row[0];row[0]=i;
      for(let j=1;j<=b.length;j++){
        const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;
      }
    }return row[b.length];
  }
  const similarity=(a,b)=>!a||!b?0:1-distance(a,b)/Math.max(a.length,b.length);
  function scoreName(input,profile){
    const a=parts(input),b=parts(profile);
    if(!a.length||!b.length)return 0;
    if(clean(input)===clean(profile))return 1;
    const firstA=a[0],firstB=b[0],lastA=a.length>1?a[a.length-1]:'',lastB=b.length>1?b[b.length-1]:'';
    const exactFirst=firstA===firstB;
    const firstSim=similarity(firstA,firstB);
    // A single initial as a first name is never a strong automatic match.
    if(firstSim<0.69&&!(firstA.length===1&&firstA===firstB[0])&&!(firstB.length===1&&firstB===firstA[0]))return 0;
    let surname=0;
    if(lastA&&lastB){
      if(lastA===lastB)surname=1;
      else if((lastA.length===1||lastB.length===1)&&lastA[0]===lastB[0])surname=.97;
      else if(lastA.length>=3&&lastB.length>=3&&lastA.startsWith(lastB)||lastB.length>=3&&lastA.length>=3&&lastB.startsWith(lastA))surname=.9;
      else surname=similarity(lastA,lastB);
    }
    if(exactFirst&&surname>=.96)return .975;
    if(exactFirst&&surname>=.75)return .85+(.11*(surname-.75)/.25);
    if(firstSim>=.82&&lastA&&lastB&&surname>=.82)return .73+.14*((firstSim+surname)/2-.82)/.18;
    // A lone first name or a missing surname needs manual review, never auto-check-in.
    if(exactFirst&&(!lastA||!lastB))return .68;
    if(exactFirst&&surname>=.52)return .66+.12*(surname-.52)/.48;
    if(firstSim>=.72&&lastA&&lastB&&surname>=.63)return .62+.1*(firstSim+surname-1.35);
    return 0;
  }
  function parseNames(input){
    let text=String(input??'').replace(/\r/g,'\n');
    const chunks=text.includes('\n')||text.includes(';')?text.split(/[\n;]+/):text.split(/\s*,\s*(?=[A-Za-z])/);
    const seen=new Set(),names=[];let duplicates=0;
    for(let raw of chunks){
      let name=raw.replace(/^[\s\u2713\u2714✔☑●•\-*+\d.):]+/g,'')
        .replace(/\s*[✓✔☑]\s*$/g,'').replace(/\s+/g,' ').trim();
      if(!name || name.length>65)continue;
      if(/^(?:who.?s playing|player roster|registered players|waitlist(?:ed)?|search|all available|registered|players|check.?in|names?|total|\d+ registered|\d+ waitlisted)\b/i.test(name))continue;
      if(/\b(?:registered\s*(?:players)?|waitlisted|players?\s*\d+)\b/i.test(name)&&/\d/.test(name))continue;
      if(!/[a-z]{2}/i.test(name))continue;
      const key=clean(name);if(seen.has(key)){duplicates++;continue;}seen.add(key);
      names.push(name.slice(0,50));
    }
    return {names,duplicates};
  }
  function candidates(input,profiles){
    return (profiles||[]).map(p=>({id:p.id,name:p.name,position:p.position||'Unspecified',score:scoreName(input,p.name)}))
      .filter(x=>x.score>=.48).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
  }
  function match(input,profiles){
    const ranked=candidates(input,profiles),best=ranked[0],runner=ranked[1],gap=best?(best.score-(runner?.score||0)):0;
    if(!best||best.score<.60)return {status:'unmatched',suggestedId:null,candidates:ranked.slice(0,5)};
    if(best.score>=.91&&gap>=.12)return {status:'matched',suggestedId:best.id,candidates:ranked.slice(0,5)};
    return {status:'review',suggestedId:best.id,candidates:ranked.slice(0,5)};
  }
  root.RallyRegistrationMatch=Object.freeze({normalize:clean,scoreName,parseNames,candidates,match});
})(typeof window!=='undefined'?window:globalThis);
