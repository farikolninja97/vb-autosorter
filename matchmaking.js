/* RallyRank V1.33 — MMR-first balance, optional gender and primary/secondary position distribution. */
(function(root){
  'use strict';
  const DEFAULT_COURT_COUNTS=[3,3];
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
  // A set ends at the target when leading by >=2, or continues past the
  // target until somebody gains a two-point lead (e.g. 27–25 to 25).
  function validateFinalScore(scoreA,scoreB,target=25){
    const a=Number(scoreA),b=Number(scoreB);
    if(![15,21,25].includes(Number(target)))throw Error('Target score must be 15, 21 or 25.');
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>99||b>99)throw Error('Scores must be whole numbers from 0 to 99.');
    const high=Math.max(a,b),low=Math.min(a,b);
    if(high<target || high-low<2 || (high>target && high-low!==2)){
      throw Error(`Play to ${target}, win by 2. Valid examples: ${target}–${target-2} or ${target+2}–${target}.`);
    }
    return {a,b,winnerSide:a>b?'A':'B'};
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
  // Primary positions count fully, secondary roles partially, allowing a
  // player to cover shortages without being counted as two full specialists.
  // Keep these categories advisory, not strict rotation requirements.
  // Flex is a wildcard whether saved as a primary or secondary preference.
  // A secondary Flex never replaces an exact primary preference: it provides
  // fallback coverage for *every* role if that team is short on specialists.
  function positionCoverage(player, role){
    if(isPlaceholder(player))return 0;
    const primary=player.position||player.primary_position||'Unspecified';
    const secondary=player.secondary_position||'Unspecified';
    function affinity(position){
      if(position==='Flex')return .60;
      if(role==='setter')return position==='Setter'?1:0;
      if(role==='middle')return position==='Middle Blocker'?1:0;
      if(role==='outside')return position==='Outside Hitter'?1:position==='Opposite'?.8:0;
      if(role==='defense')return position==='Libero'?1:0;
      return 0;
    }
    return Math.max(affinity(primary),affinity(secondary)*.62);
  }
  function courtBlocks(counts){
    const first=Array.from({length:counts[0]},(_,i)=>i);
    const second=Array.from({length:counts[1]},(_,i)=>counts[0]+i);
    return [first,second];
  }
  function positionBalanceCost(teams,mode,teamSize,counts=DEFAULT_COURT_COUNTS){
    const all=Array.from({length:teams.length},(_,i)=>i);
    const blocks=mode==='split'?courtBlocks(counts):[all];
    // Squared differences softly reward distributing scarce specialties,
    // while the main MMR variance score stays the dominant objective.
    const weight=9000*(teamSize/6);
    let cost=0;
    for(const block of blocks){
      for(const [role,emphasis] of [['setter',1.5],['middle',1.05],['outside',1.15],['defense',.9]]){
        const amounts=block.map(i=>teams[i].reduce((sum,p)=>sum+positionCoverage(p,role),0));
        const average=amounts.reduce((sum,n)=>sum+n,0)/amounts.length;
        cost+=weight*emphasis*amounts.reduce((sum,n)=>sum+(n-average)**2,0);
      }
    }
    return cost;
  }
  function score(teams,priorPairs,teamSize,mode,balanceWomen=false,balancePositions=false,counts=DEFAULT_COURT_COUNTS){
    const avgs=teams.map(teamAverage);
    const all=Array.from({length:teams.length},(_,i)=>i);
    const blocks=mode==='split'?courtBlocks(counts):[all];
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
        {const n=priorPairs.get(pairKey(actual[i].id,actual[j].id))||0; if(n)repeats+=2600*n+4400*n*n;}
      }
    }
    if(mode==='mixed'){
      // 'Advanced' initially starts at 1500. Rating >= 1400 makes distribution
      // resilient as those players' ratings evolve. Only admins see ratings.
      const advanced=teams.map(team=>realPlayers(team).filter(p=>Number(p.mmr)>=1400).length);
      const avgAdvanced=advanced.reduce((a,b)=>a+b,0)/teams.length;
      const unevenTeams=advanced.reduce((n,c)=>n+(c-avgAdvanced)**2,0);
      const court1Expected=advanced.reduce((a,b)=>a+b,0)*teams.slice(0,counts[0]).reduce((a,t)=>a+t.length,0)/teams.reduce((a,t)=>a+t.length,0);
      const courtDifference=Math.abs(advanced.slice(0,counts[0]).reduce((a,b)=>a+b,0)-court1Expected)*2;
      ratingCost+=unevenTeams*110000+courtDifference*courtDifference*170000;
    }
    if(balanceWomen){
      // Optimize the number of SELF-RECORDED women per team, never guessing
      // missing genders and never including unrated placeholders.
      // With split courts, preserve the stronger/weaker court assignment and
      // distribute women as evenly as possible within each three-team court.
      const genderBlocks=blocks;
      for(const block of genderBlocks){
        const counts=block.map(i=>realPlayers(teams[i]).filter(p=>p.gender==='Woman').length);
        const goal=counts.reduce((sum,n)=>sum+n,0)/block.length;
        ratingCost+=counts.reduce((sum,n)=>sum+(n-goal)**2,0)*160000;
      }
      if(mode==='mixed'){
        const c1=teams.slice(0,counts[0]).flat().filter(p=>!isPlaceholder(p)&&p.gender==='Woman').length;
        const c2=teams.slice(counts[0]).flat().filter(p=>!isPlaceholder(p)&&p.gender==='Woman').length;
        ratingCost+=(c1-c2)**2*24000;
      }
    }
    if(balancePositions)ratingCost+=positionBalanceCost(teams,mode,teamSize,counts);
    return ratingCost+repeats;
  }
  function makeTeams(players,teamSize,previousTeams=[],mode='mixed',options={}){
    const courtSizes=Array.isArray(teamSize)?teamSize:[teamSize,teamSize];
    if(courtSizes.length!==2||courtSizes.some(n=>!Number.isInteger(n)||n<2||n>6))throw Error('Each court must use 2–6 players per team.');
    const courtCounts=options?.courtTeamCounts||DEFAULT_COURT_COUNTS;
    if(!Array.isArray(courtCounts)||courtCounts.length!==2||courtCounts.some(n=>!Number.isInteger(n)||![2,3].includes(n)))throw Error('Each court must have 2 or 3 teams.');
    const teamSizes=courtCounts.flatMap((n,c)=>Array(n).fill(courtSizes[c]));
    const teamCount=teamSizes.length;
    const averageSize=teamSizes.reduce((sum,n)=>sum+n,0)/teamCount;
    if(!['mixed','split'].includes(mode))throw Error('Unknown court balancing mode.');
    const balanceWomen=options?.balanceWomen===true;
    const balancePositions=options?.balancePositions===true;
    const capacity=teamSizes.reduce((sum,n)=>sum+n,0);
    if(players.length<teamCount)throw Error(`At least ${teamCount} real players are needed (one per team).`);
    const selected=players.slice(0,capacity);
    if(selected.some(p=>isPlaceholder(p)||!Number.isFinite(Number(p.mmr))))throw Error('Each checked-in player needs a valid MMR.');
    if(new Set(selected.map(p=>p.id)).size!==selected.length)throw Error('Duplicate player on signup list.');
    const missing=capacity-selected.length;
    const priorPairs=new Map();
    for(const prev of previousTeams){
      const ids=prev.map(p=>typeof p==='string'?p:p.id).filter(p=>typeof p==='string'&&!p.startsWith('sub:'));
      for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const key=pairKey(ids[i],ids[j]);priorPairs.set(key,(priorPairs.get(key)||0)+1);}
    }
    let best=null,bestScore=Infinity;
    for(let trial=0;trial<140;trial++){
      const sorted=selected.map(p=>({p,sort:Number(p.mmr)+(Math.random()-.5)*(mode==='split'||trial===0?0:110)}))
        .sort((a,b)=>b.sort-a.sort).map(x=>x.p);
      const teams=Array.from({length:teamCount},()=>[]);
      // Spread unrated substitute spots across teams, keeping at least one
      // registered participant on every team.
      const shuffled=Array.from({length:teamCount},(_,i)=>i);
      for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
      // Give every team one rated player, then distribute remaining spots in
      // proportion to each court's selected team size. Never create an all-sub team.
      const realCounts=Array(teamCount).fill(1);
      for(let n=teamCount;n<selected.length;n++){ 
        const available=shuffled.filter(i=>realCounts[i]<teamSizes[i]);
        const minRatio=Math.min(...available.map(i=>realCounts[i]/teamSizes[i]));
        const chosen=available.find(i=>realCounts[i]/teamSizes[i]===minRatio);
        realCounts[chosen]++;
      }
      const missingCounts=teamSizes.map((n,i)=>n-realCounts[i]);
      let slot=1;
      missingCounts.forEach((n,ti)=>{for(let k=0;k<n;k++)teams[ti].push({id:`sub:${slot++}`,name:'Sub needed',is_placeholder:true});});
      const capacities=missingCounts.map((n,i)=>teamSizes[i]-n);
      const picked=Array(teamCount).fill(0);
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
        const court1Size=capacities.slice(0,courtCounts[0]).reduce((a,b)=>a+b,0);
        // Strongest players to Court 1; balance each half independently.
        assign(sorted.slice(0,court1Size),courtBlocks(courtCounts)[0]);
       assign(sorted.slice(court1Size),courtBlocks(courtCounts)[1]);
      }else{
        // Alternate between courts first to distribute advanced players.
        const [first,second]=courtBlocks(courtCounts);
       const order=first.flatMap((index,i)=>[index,second[i]] .filter(v=>v!==undefined)).concat(second.slice(first.length));
       assign(sorted,order);
      }
      let current=score(teams,priorPairs,averageSize,mode,balanceWomen,balancePositions,courtCounts);
      for(let n=0;n<450;n++){
        const a=Math.floor(Math.random()*teamCount),b=Math.floor(Math.random()*teamCount);
        if(a===b||(mode==='split'&&(a<courtCounts[0])!==(b<courtCounts[0])))continue;
        const aReal=teams[a].map((p,i)=>!isPlaceholder(p)?i:-1).filter(i=>i>=0);
        const bReal=teams[b].map((p,i)=>!isPlaceholder(p)?i:-1).filter(i=>i>=0);
        const ia=aReal[Math.floor(Math.random()*aReal.length)],ib=bReal[Math.floor(Math.random()*bReal.length)];
        [teams[a][ia],teams[b][ib]]=[teams[b][ib],teams[a][ia]];
        const next=score(teams,priorPairs,averageSize,mode,balanceWomen,balancePositions,courtCounts);
        if(next<current){current=next;}
        else [teams[a][ia],teams[b][ib]]=[teams[b][ib],teams[a][ia]];
      }
      if(current<bestScore){bestScore=current;best=teams.map(t=>[...t]);}
    }
    return balancePositions?best.map(assignTeamPositions):best;
  }
  // Assign specific court roles AFTER balancing team ratings. Flex is never
  // displayed as an assignment: it means the player can cover any real role.
  function assignTeamPositions(team){
    if(!Array.isArray(team)||team.length<2||team.length>6)throw Error('A team must have 2–6 spots.');
    const roles=['Setter','Outside Hitter','Outside Hitter','Middle Blocker','Middle Blocker','Opposite'].slice(0,team.length);
    const liberoCandidates=team.filter(p=>!isPlaceholder(p)&&[p.position||p.primary_position,p.secondary_position].includes('Libero'));
    if(liberoCandidates.length&&team.length>=4){
      // Include a Libero only if someone actually prefers it. Flex can cover
      // that slot if necessary, but won't cause a Libero slot by itself.
      const idx=roles.lastIndexOf('Middle Blocker');
      if(idx>=0)roles[idx]='Libero';
    }
    function fit(player,role){
      if(isPlaceholder(player))return 0;
      const primary=player.position||player.primary_position||'Unspecified';
      const secondary=player.secondary_position||'Unspecified';
      function affinity(position){
        if(position===role)return 100;
        if(position==='Flex')return 70; // May play ANY role; below exact primary.
        if((position==='Outside Hitter'&&role==='Opposite')||(position==='Opposite'&&role==='Outside Hitter'))return 48;
        if(position==='Unspecified')return 4;
        return -18;
      }
      // Exact secondary preference is worth 65. Secondary Flex 45.5 for any
      // role, enough to fill shortages but never override exact primary (100).
      return Math.max(affinity(primary),.65*affinity(secondary));
    }
    // 6! <= 720 arrangements; choose the best fit without changing teams.
    const used=Array(roles.length).fill(false);
    let bestScore=-Infinity,bestSlots=[];
    function dfs(i,value,slots){
      if(i===team.length){if(value>bestScore){bestScore=value;bestSlots=[...slots];}return;}
      for(let j=0;j<roles.length;j++){
        if(used[j])continue;
        used[j]=true;slots.push(j);
        dfs(i+1,value+fit(team[i],roles[j]),slots);
        slots.pop();used[j]=false;
      }
    }
    dfs(0,0,[]);
    return team.map((p,i)=>({...p,assigned_position:roles[bestSlots[i]]}));
  }
  const api={makeTeams,swing,marginBonus,matchSwing,validateFinalScore,spread,teamAverage,isPlaceholder,positionCoverage,positionBalanceCost,assignTeamPositions,K_FACTOR};
  root.RallyMath=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
