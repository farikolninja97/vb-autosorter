/* RallyRank V1.52 — five-team two-court continuous rotation.
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
  const api=Object.freeze({initial,advance,slot,label});
  root.RallyFiveRotation=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
