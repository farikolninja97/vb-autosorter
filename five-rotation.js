/* RallyRank V1.53 — five-team two-court continuous rotation.
   A set consists of one completed score on each court. The first transfer is
   winner/loser-driven; subsequent transfers use consecutive-court tenure.
   Pure module, also exercised by Node regression tests. */
(function(root){
  'use strict';
  function assertFive(ids){
    if(!Array.isArray(ids)||ids.length!==5||ids.some(x=>!x)||new Set(ids).size!==5)
      throw Error('Five different teams are required.');
  }
  function initial(ids){
    assertFive(ids);
    return {enabled:true,active:true,wave:1,team_ids:[...ids],blue_ids:[ids[0],ids[1]],red_ids:[ids[2],ids[3]],bench_team_id:ids[4],blue_repeat_id:null,red_repeat_id:null};
  }
  function winnerLoser(pair,match){
    if(!match||!match.winner_team_id||!pair.includes(match.winner_team_id))throw Error('Both current court results must be complete.');
    if(!pair.includes(match.team_a_id)||!pair.includes(match.team_b_id)||match.team_a_id===match.team_b_id)
      throw Error('The match no longer matches the active court lineup.');
    return [match.winner_team_id,pair.find(x=>x!==match.winner_team_id)];
  }
  function advance(current,blueMatch,redMatch){
    if(!current?.active)throw Error('No live five-team rotation.');
    assertFive(current.team_ids);
    const blue=current.blue_ids,red=current.red_ids;
    if(blue.length!==2||red.length!==2||new Set([...blue,...red,current.bench_team_id]).size!==5)throw Error('Invalid five-team rotation state.');
    const [blueWinner,blueLoser]=winnerLoser(blue,blueMatch);
    const [redWinner,redLoser]=winnerLoser(red,redMatch);
    let blueStay,redStay,blueToRed,redToBench;
    if(Number(current.wave)===1){
      blueStay=blueLoser;blueToRed=blueWinner;redStay=redWinner;redToBench=redLoser;
    }else{
      blueToRed=current.blue_repeat_id;
      redToBench=current.red_repeat_id;
      if(!blue.includes(blueToRed)||!red.includes(redToBench))throw Error('A repeat-team marker is missing.');
      blueStay=blue.find(id=>id!==blueToRed);
      redStay=red.find(id=>id!==redToBench);
    }
    const result={...current,wave:Number(current.wave)+1,blue_ids:[blueStay,current.bench_team_id],red_ids:[redStay,blueToRed],bench_team_id:redToBench,blue_repeat_id:blueStay,red_repeat_id:redStay};
    if(new Set([...result.blue_ids,...result.red_ids,result.bench_team_id]).size!==5)throw Error('A team would appear twice.');
    return result;
  }
  function slot(state,teamId){const i=(state?.team_ids||[]).indexOf(teamId);return i<0?null:i+1;}
  function label(state,teamId,mode='numbers'){
    const n=slot(state,teamId);
    if(!n)return 'TBD';
    const funny=['Block Party','Sets on the Beach','Dig Happens','Ace Ventura','Net Ninjas'];
    return mode==='funny'?funny[n-1]:`Team ${n}`;
  }
  // Prioritize all empty slots on the opening bench before publishing. A single
  // bench registrant is retained until the atomic server-side publish; this
  // keeps V1.52's existing five-team publish validation intact with 24 players.
  function prioritizeBenchSubs(groups,assignPositions){
    if(!Array.isArray(groups)||groups.length!==5)return groups;
    const result=groups.map(team=>team.map(p=>({...p})));
    const bench=result[4];
    while(bench.filter(p=>!p.is_placeholder).length>1){
      const holes=[];
      for(let i=0;i<4;i++)for(let j=0;j<result[i].length;j++){
        if(result[i][j].is_placeholder)holes.push({i,j});
      }
      if(!holes.length)break;
      const hole=holes[0];
      const donorIndex=bench.findIndex(p=>!p.is_placeholder);
      [result[hole.i][hole.j],bench[donorIndex]]=[bench[donorIndex],result[hole.i][hole.j]];
    }
    return typeof assignPositions==='function'?result.map(assignPositions):result;
  }
  function roleFit(p,role){
    const primary=p.position||p.primary_position,secondary=p.secondary_position;
    if(!role)return 0;
    if(role==='Middle Blocker'&&p.gender==='Woman'&&primary!=='Middle Blocker'&&secondary!=='Middle Blocker')return -Infinity;
    if(primary===role)return 100;
    if(secondary===role)return 85;
    if(primary==='Flex')return 70;
    if(secondary==='Flex')return 50;
    if(role==='Middle Blocker'&&primary==='Outside Hitter')return 35;
    return 5;
  }
  // Roster transfers are permanent for the current five-team rotation.
  // The former bench team receives a real placeholder for each departed member.
  // Uses no temporary loans and never duplicates a player ID.
  function fillFromRestingTeam(teams,rotation,profiles=[]){
    const next=teams.map(t=>({...t,players:t.players.map(p=>({...p}))}));
    const byId=new Map(next.map(t=>[t.id,t]));
    const bench=byId.get(rotation.bench_team_id);
    if(!bench)throw Error('Resting roster missing.');
    const active=[...rotation.blue_ids,...rotation.red_ids].map(id=>byId.get(id));
    if(active.some(t=>!t))throw Error('Active roster missing.');
    const holes=active.flatMap(t=>t.players.map((p,index)=>({t,p,index})).filter(x=>x.p.is_placeholder));
    holes.sort((a,b)=>({ 'Middle Blocker':0,'Setter':1}[a.p.assigned_position]??2)-({'Middle Blocker':0,'Setter':1}[b.p.assigned_position]??2));
    const moves=[];
    for(const hole of holes){
      const donors=bench.players.map((p,index)=>({p,index})).filter(x=>!x.p.is_placeholder);
      if(!donors.length)break;
      const choices=donors.map(d=>{
        const profile=profiles.find(p=>p.id===d.p.id)||d.p;
        return {...d,fit:roleFit({...profile,position:profile.position||profile.primary_position},hole.p.assigned_position)};
      }).sort((a,b)=>b.fit-a.fit);
      const donor=choices[0];
      const original=bench.players[donor.index];
      const assigned=Number.isFinite(donor.fit)?(hole.p.assigned_position||null):null;
      hole.t.players[hole.index]={...original,assigned_position:assigned};
      bench.players[donor.index]={id:`sub:transfer:${rotation.wave}:${original.id}`,name:'Sub needed',is_placeholder:true,assigned_position:original.assigned_position||null,slot_index:donor.index+1};
      moves.push({player_id:original.id,from:bench.id,to:hole.t.id,role:assigned});
    }
    const roster=next.flatMap(t=>t.players.filter(p=>!p.is_placeholder).map(p=>p.id));
    if(new Set(roster).size!==roster.length)throw Error('Transfer duplicated a player.');
    return {teams:next,moves};
  }
  const api=Object.freeze({initial,advance,slot,label,prioritizeBenchSubs,roleFit,fillFromRestingTeam});
  root.RallyFiveRotation=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
