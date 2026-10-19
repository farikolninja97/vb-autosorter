/* RallyRank V1.04 — balanced teams and score-margin-adjusted MMR. */
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
  function score(teams,priorPairs,teamSize){
    const avgs=teams.map(teamAverage);
    const target=avgs.reduce((sum,n)=>sum+n,0)/TEAM_COUNT;
    const range=Math.max(...avgs)-Math.min(...avgs);
    let repeats=0;
    for(const team of teams){
      const actual=realPlayers(team);
      for(let i=0;i<actual.length;i++)for(let j=i+1;j<actual.length;j++){
        if(priorPairs.has(pairKey(actual[i].id,actual[j].id))) repeats++;
      }
    }
    // Equalize the *registered* players' average MMR. Sub slots have no rating.
    // The teamSize multiplier maintains the original scoring scale for full teams.
    return (avgs.reduce((s,v)=>s+(v-target)**2,0)+range*range*.6)*teamSize**2+repeats*1800;
  }
  function makeTeams(players,teamSize,previousTeams=[]){
    if(!Number.isInteger(teamSize)||teamSize<2||teamSize>6)throw Error('Team size must be 2–6.');
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
      const sorted=selected.map(p=>({p,sort:Number(p.mmr)+(Math.random()-.5)*(trial===0?0:110)}))
        .sort((a,b)=>b.sort-a.sort).map(x=>x.p);
      const teams=Array.from({length:TEAM_COUNT},()=>[]);
      if(missing){
        // Balance the number of sub slots across courts before balancing real skill.
        const order=Array.from({length:TEAM_COUNT},(_,i)=>i);
        for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
        const count=Array(TEAM_COUNT).fill(Math.floor(missing/TEAM_COUNT));
        for(let i=0;i<missing%TEAM_COUNT;i++)count[order[i]]++;
        let slot=1;
        count.forEach((n,ti)=>{for(let k=0;k<n;k++)teams[ti].push({id:`sub:${slot++}`,name:'Sub needed',is_placeholder:true});});
        const capacities=count.map(n=>teamSize-n);
        const picked=Array(TEAM_COUNT).fill(0);
        // Snake-draft into the remaining real-player positions; nobody is left on an all-sub team.
        const snake=Array.from({length:TEAM_COUNT},(_,i)=>i).concat(Array.from({length:TEAM_COUNT},(_,i)=>TEAM_COUNT-i-1));
        let cursor=trial%snake.length;
        for(const player of sorted){
          let assigned=false;
          for(let attempt=0;attempt<snake.length;attempt++){
            const ti=snake[(cursor+attempt)%snake.length];
            if(picked[ti]<capacities[ti]){teams[ti].push(player);picked[ti]++;cursor=(cursor+attempt+1)%snake.length;assigned=true;break;}
          }
          if(!assigned)throw Error('Could not assign all checked-in players.');
        }
      }else{
        sorted.forEach((p,i)=>{const wave=i%(TEAM_COUNT*2);teams[wave<TEAM_COUNT?wave:TEAM_COUNT*2-wave-1].push(p);});
      }
      let current=score(teams,priorPairs,teamSize);
      for(let n=0;n<450;n++){
        const a=Math.floor(Math.random()*TEAM_COUNT),b=Math.floor(Math.random()*TEAM_COUNT);
        if(a===b)continue;
        const aReal=teams[a].map((p,i)=>!isPlaceholder(p)?i:-1).filter(i=>i>=0);
        const bReal=teams[b].map((p,i)=>!isPlaceholder(p)?i:-1).filter(i=>i>=0);
        const ia=aReal[Math.floor(Math.random()*aReal.length)],ib=bReal[Math.floor(Math.random()*bReal.length)];
        [teams[a][ia],teams[b][ib]]=[teams[b][ib],teams[a][ia]];
        const next=score(teams,priorPairs,teamSize);
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
