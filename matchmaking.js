/* RallyRank V1.06 — mixed or skill-split courts, score-margin-adjusted MMR. */
(function(root){
  'use strict';
  const TEAM_COUNT=6;
  const K_FACTOR=24;
  const pairKey=(a,b)=>[a,b].sort().join('|');
  const isPlaceholder=p=>p?.is_placeholder===true;
  const realPlayers=team=>team.filter(p=>!isPlaceholder(p));
  function teamAverage(team){
    const real=realPlayers(team);
    if(!real.length)throw Error('Each team needs at least one registered player.');
    return real.reduce((sum,p)=>sum+Number(p.mmr),0)/real.length;
  }
  function swing(winnerAverage,loserAverage){
    const expected=1/(1+Math.pow(10,(loserAverage-winnerAverage)/400));
    return Math.max(4,Math.round(K_FACTOR*(1-expected)));
  }
  // Win margin has deliberately small influence: +0 to +4 MMR per player.
  // e.g. 25-23 = +0, 25-20 = +1, 25-15 = +2, 25-5 = +4.
  function marginBonus(scoreA,scoreB){
    if(scoreA==null || scoreB==null)return 0;
    const a=Number(scoreA),b=Number(scoreB);
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>99||b>99||a===b)throw Error('Enter different scores from 0 to 99.');
    return Math.min(4,Math.floor(Math.abs(a-b)/4));
  }
  function matchSwing(winnerAverage,loserAverage,scoreA,scoreB){
    return swing(winnerAverage,loserAverage)+marginBonus(scoreA,scoreB);
  }
  function spread(teams){
    const avgs=teams.map(teamAverage);
    return Math.round(Math.max(...avgs)-Math.min(...avgs));
  }
  // The first three teams play on Court 1; the last three play on Court 2.
  // In mixed mode, every court receives advanced players where possible.
  // In split mode, the stronger half goes to Court 1, weaker half to Court 2.
  function score(teams,priorPairs,teamSize,mode){
    const avgs=teams.map(teamAverage);
    const blocks=mode==='split'?[[0,1,2],[3,4,5]]:[[0,1,2,3,4,5]];
    let ratingCost=0;
    for(const block of blocks){
      const subset=block.map(i=>avgs[i]);
      const target=subset.reduce((sum,n)=>sum+n,0)/subset.length;
      const range=Math.max(...subset)-Math.min(...subset);
      ratingCost+=(subset.reduce((sum,n)=>sum+(n-target)**2,0)+range*range*.6)*teamSize**2;
    }
    let repeats=0;
    for(const team of teams){
      const actual=realPlayers(team);
      for(let i=0;i<actual.length;i++)for(let j=i+1;j<actual.length;j++){
        if(priorPairs.has(pairKey(actual[i].id,actual[j].id))) repeats++;
      }
    }
    if(mode==='mixed'){
      // 'Advanced' initially starts at 1500. Rating >= 1400 makes distribution
      // resilient as those players' ratings evolve. Only admins see ratings.
      const advanced=teams.map(team=>realPlayers(team).filter(p=>Number(p.mmr)>=1400).length);
      const avgAdvanced=advanced.reduce((a,b)=>a+b,0)/TEAM_COUNT;
      const unevenTeams=advanced.reduce((n,c)=>n+(c-avgAdvanced)**2,0);
      const courtDifference=Math.abs(advanced.slice(0,3).reduce((a,b)=>a+b,0)-advanced.slice(3).reduce((a,b)=>a+b,0));
      ratingCost+=unevenTeams*110000+courtDifference*courtDifference*170000;
    }
    return ratingCost+repeats*1800;
  }
  function makeTeams(players,teamSize,previousTeams=[],mode='mixed'){
    if(!Number.isInteger(teamSize)||teamSize<2||teamSize>6)throw Error('Team size must be 2–6.');
    if(!['mixed','split'].includes(mode))throw Error('Unknown court balancing mode.');
    const capacity=TEAM_COUNT*teamSize;
    if(players.length<TEAM_COUNT)throw Error('At least six real players are needed (one per team).');
    const selected=players.slice(0,capacity);
    if(selected.some(p=>isPlaceholder(p)||!Number.isFinite(Number(p.mmr))))throw Error('Each checked-in player needs a valid MMR.');
    if(new Set(selected.map(p=>p.id)).size!==selected.length)throw Error('Duplicate player on signup list.');
    const missing=capacity-selected.length;
    const priorPairs=new Set();
    for(const prev of previousTeams){
      const ids=prev.map(p=>typeof p==='string'?p:p.id).filter(p=>typeof p==='string'&&!p.startsWith('sub:'));
      for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)priorPairs.add(pairKey(ids[i],ids[j]));
    }
    let best=null,bestScore=Infinity;
    for(let trial=0;trial<140;trial++){
      const sorted=selected.map(p=>({p,sort:Number(p.mmr)+(Math.random()-.5)*(mode==='split'||trial===0?0:110)}))
        .sort((a,b)=>b.sort-a.sort).map(x=>x.p);
      const teams=Array.from({length:TEAM_COUNT},()=>[]);
      // Spread unrated substitute spots across teams, keeping at least one
      // registered participant on every team.
      const shuffled=Array.from({length:TEAM_COUNT},(_,i)=>i);
      for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
      const missingCounts=Array(TEAM_COUNT).fill(Math.floor(missing/TEAM_COUNT));
      for(let i=0;i<missing%TEAM_COUNT;i++)missingCounts[shuffled[i]]++;
      let slot=1;
      missingCounts.forEach((n,ti)=>{for(let k=0;k<n;k++)teams[ti].push({id:`sub:${slot++}`,name:'Sub needed',is_placeholder:true});});
      const capacities=missingCounts.map(n=>teamSize-n);
      const picked=Array(TEAM_COUNT).fill(0);
      function assign(incoming,order){
        const snake=order.concat([...order].reverse());
        let cursor=trial%snake.length;
        for(const player of incoming){
          let assigned=false;
          for(let attempt=0;attempt<snake.length;attempt++){
            const ti=snake[(cursor+attempt)%snake.length];
            if(picked[ti]<capacities[ti]){
              teams[ti].push(player);picked[ti]++;cursor=(cursor+attempt+1)%snake.length;assigned=true;break;
            }
          }
          if(!assigned)throw Error('Could not assign all checked-in players.');
        }
      }
      if(mode==='split'){
        const court1Size=capacities.slice(0,3).reduce((a,b)=>a+b,0);
        // Strongest players to Court 1; balance each half independently.
        assign(sorted.slice(0,court1Size),[0,1,2]);
        assign(sorted.slice(court1Size),[3,4,5]);
      }else{
        // Alternate between courts first to distribute advanced players.
        assign(sorted,[0,3,1,4,2,5]);
      }
      let current=score(teams,priorPairs,teamSize,mode);
      for(let n=0;n<450;n++){
        const a=Math.floor(Math.random()*TEAM_COUNT),b=Math.floor(Math.random()*TEAM_COUNT);
        if(a===b||(mode==='split'&&Math.floor(a/3)!==Math.floor(b/3)))continue;
        const aReal=teams[a].map((p,i)=>!isPlaceholder(p)?i:-1).filter(i=>i>=0);
        const bReal=teams[b].map((p,i)=>!isPlaceholder(p)?i:-1).filter(i=>i>=0);
        const ia=aReal[Math.floor(Math.random()*aReal.length)],ib=bReal[Math.floor(Math.random()*bReal.length)];
        [teams[a][ia],teams[b][ib]]=[teams[b][ib],teams[a][ia]];
        const next=score(teams,priorPairs,teamSize,mode);
        if(next<current){current=next;}
        else [teams[a][ia],teams[b][ib]]=[teams[b][ib],teams[a][ia]];
      }
      if(current<bestScore){bestScore=current;best=teams.map(t=>[...t]);}
    }
    return best;
  }
  const api={makeTeams,swing,marginBonus,matchSwing,spread,teamAverage,isPlaceholder,K_FACTOR};
  root.RallyMath=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
