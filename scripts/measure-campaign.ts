import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {campaign} from '../src/content/campaign';
import {Simulation} from '../src/game/physics';
import originals from '../tests/fixtures/campaign-solutions.json';
import expansion from '../tests/fixtures/expansion-solutions.json';
const witnesses=[...originals.levels,...expansion.levels];
const reports=[];
for(const level of campaign){
 const witness=witnesses.find(w=>w.id===level.id)!;const sim=new Simulation(level),costs:number[]=[];let peak=sim.entities.size,fragments=0;
 for(const shot of witness.shots){
  if(!sim.launch(shot))throw Error(`${level.id}: launch`);
  for(let frame=0;frame<2200&&sim.phase==='flying';frame++){
   if(frame===shot.abilityAt)sim.activate();const start=performance.now();sim.step();costs.push(performance.now()-start);
   peak=Math.max(peak,sim.entities.size);fragments=Math.max(fragments,[...sim.entities.values()].filter(e=>e.type==='fragment').length);
  }
 }
 if(sim.phase!=='won')throw Error(`${level.id}: replay`);
 costs.sort((a,b)=>a-b);reports.push({id:level.id,steps:costs.length,peakEntities:peak,peakFragments:fragments,p95StepMs:costs[Math.floor(costs.length*.95)]||0});sim.dispose();
}
const summary={levels:reports.length,peakEntities:Math.max(...reports.map(r=>r.peakEntities)),peakFragments:Math.max(...reports.map(r=>r.peakFragments)),maxP95StepMs:Math.max(...reports.map(r=>r.p95StepMs))};
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/performance-pass-4.json',JSON.stringify({summary,levels:reports,note:'Node fixed-step CPU timings on this cloud host, not iPad frame-rate measurements.'},null,2));console.log(summary);
