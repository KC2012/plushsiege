/** Strict promotion gate for new production content. Geometry + idle stability + a
 * replayed real-engine winning witness are required; counts never imply fun. */
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {produceCandidates} from '../src/content/generator';
import {validateLevel} from '../src/content/validate';
import {Simulation,starsFor} from '../src/game/physics';
import type {Level,StuffieKind,ValidationIssue,BlockDef} from '../src/game/types';
export interface Shot {x:number;y:number;abilityAt:number|null;}
export interface Witness {id:string;shots:Shot[];score:number;stars:number;peakBodies:number;maxSteps:number;}
export function finishShot(sim:Simulation,shot:Shot,limit=2200){
 if(sim.phase!=='aiming'||!sim.launch(shot))return {resolved:false,steps:0,ability:false,peak:sim.entities.size};
 let ability=false,steps=0,peak=sim.entities.size;
 for(;steps<limit&&String(sim.phase)==='flying';steps++){if(steps===shot.abilityAt)ability=sim.activate();sim.step();peak=Math.max(peak,sim.entities.size);}
 return {resolved:String(sim.phase)!=='flying',steps,ability,peak};
}
export function idleAudit(level:Level,frames=1200){
 const sim=new Simulation(level);let peak=sim.entities.size,maxTargetMotion=0;
 const moving=new Set((level.mechanisms||[]).filter(m=>m.kind==='platform'||m.kind==='motor').map(m=>m.body));
 const start=new Map([...sim.entities.values()].map(e=>[e.id,{...e.body.position,angle:e.body.angle}]));
 let maxStructureMotion=0;
 for(let i=0;i<frames;i++){sim.step();peak=Math.max(peak,sim.entities.size);
  for(const e of sim.entities.values()){const initial=start.get(e.id);if(!initial)continue;const distance=Math.hypot(e.body.position.x-initial.x,e.body.position.y-initial.y);
   if(e.type==='monster')maxTargetMotion=Math.max(maxTargetMotion,distance);
   if(e.type==='block'&&!moving.has(e.id))maxStructureMotion=Math.max(maxStructureMotion,distance);
  }
 }
 const missing=[...start.keys()].filter(id=>![...sim.entities.values()].some(e=>e.id===id));
 const stable=sim.remainingMonsters===level.monsters.length&&sim.score===0&&missing.length===0&&maxStructureMotion<Math.max(12,Math.min(20,(level.bounds.ground-Math.min(...level.blocks.map(b=>b.y)))*.025));
 const result={stable,peak,maxStructureMotion,maxTargetMotion,missing,remaining:sim.remainingMonsters,score:sim.score};sim.dispose();return result;
}
export function missAudit(level:Level){
 const outcomes=[];
 for(const shot of [{x:102,y:0,abilityAt:null},{x:0,y:-102,abilityAt:null}] as Shot[]){const sim=new Simulation(level);sim.launch(shot);for(let i=0;i<1200&&sim.phase!=='won';i++)sim.step();for(let i=1200;i<3600&&sim.phase==='flying';i++)sim.step();outcomes.push({remaining:sim.remainingMonsters,score:sim.score,phase:sim.phase});sim.dispose();}
 return {nontrivial:outcomes.every(o=>o.remaining===level.monsters.length&&o.score===0&&o.phase!=='flying'),outcomes};
}
function candidates(kind:StuffieKind,level:Level):Shot[]{
 const shots:Shot[]=[];
 const long=level.bounds.width>2400;
 const abilities:(number|null)[]=kind==='sheep'?[null,22]:kind==='bear'?(long?[null,50,80,105]:[null,35,50,65]):long?[20,null,50,80]:[20,null,35];
 for(const strength of [1,.8,.9,.6])for(const degrees of [0,14,28,45,58,7,22,38,-4])for(const abilityAt of abilities){const a=degrees*Math.PI/180;shots.push({x:-102*strength*Math.cos(a),y:102*strength*Math.sin(a),abilityAt});}
 // Add targeted ballistic arcs to actual target/support/trigger geometry. No fake hits.
 const gravity=(level.environment?.gravity?.y??1)*.27778;
 const triggers=(level.mechanisms||[]).flatMap(m=>level.blocks.filter(b=>b.id===m.trigger));
 const points=[...level.monsters,...triggers,...level.hazards,...(level.props||[]).filter(p=>!p.static&&p.kind!=='planetoid'),...level.blocks.filter(b=>b.material==='glass'||b.material==='ice')].slice(0,24);
 for(const target of [...points].reverse()){const dx=target.x-level.sling.x,dy=target.y-level.sling.y;if(dx<=20)continue;
  if(Math.abs(gravity)<1e-6){for(const offset of[0,-.06,.06]){const a=Math.atan2(-dy,dx)+offset;if(Math.abs(a)>1.25)continue;for(const abilityAt of abilities)shots.unshift({x:-102*Math.cos(a),y:102*Math.sin(a),abilityAt});}continue;}
  const v=21.93,disc=v**4-gravity*(gravity*dx*dx-2*dy*v*v);if(disc<0)continue;for(const sign of[-1,1]){const tan=(v*v+sign*Math.sqrt(disc))/(gravity*dx),a=Math.atan(tan);if(Math.abs(a)>1.25)continue;for(const abilityAt of abilities)shots.unshift({x:-102*Math.cos(a),y:102*Math.sin(a),abilityAt});}}
 // Interleave direct arcs with coarse boosted/lob shots so targets in gravity
 // regions cannot crowd every alternate route out of the finite search.
 const gridSize=36*abilities.length;
 const aimed=shots.slice(0,Math.max(0,shots.length-gridSize)),grid=shots.slice(-gridSize);
 const mixed:Shot[]=[];for(let i=0;i<Math.max(aimed.length,grid.length);i++){if(aimed[i])mixed.push(aimed[i]);if(grid[i])mixed.push(grid[i]);}
 const unique=new Map(mixed.map(s=>[`${s.x.toFixed(1)}:${s.y.toFixed(1)}:${s.abilityAt}`,s]));return [...unique.values()];
}
export function search(level:Level,known?:Witness,maxAttempts=450):{witness?:Witness;attempts:number;unresolved:number}{
 if(known){const replay=replayWitness(level,known);if(replay)return {witness:replay,attempts:1,unresolved:0};}
 let chosen:Shot[]=[],attempts=0,unresolved=0;
 for(let shotIndex=0;shotIndex<level.projectiles.length&&attempts<maxAttempts;shotIndex++){
  let best:{shot:Shot;value:number}|undefined;
  const inspect=new Simulation(level);for(const prior of chosen)finishShot(inspect,prior);
  const current={...level,blocks:[...inspect.entities.values()].filter(e=>e.type==='block').map(e=>({...e.def! as BlockDef,x:e.body.position.x,y:e.body.position.y})),monsters:[...inspect.entities.values()].filter(e=>e.type==='monster').map(e=>({id:e.id,x:e.body.position.x,y:e.body.position.y})),hazards:[...inspect.entities.values()].filter(e=>e.type==='tnt').map(e=>({id:e.id,x:e.body.position.x,y:e.body.position.y,kind:'tnt' as const}))};inspect.dispose();
  for(const shot of candidates(level.projectiles[shotIndex],current).slice(0,level.metadata?.design?180:level.metadata?.category==='spectacle'?80:110)){
   if(attempts++>=maxAttempts)break;
   const sim=new Simulation(level);let resolved=true,peak=sim.entities.size,steps=0;
   for(const prior of chosen){const r=finishShot(sim,prior);if(!r.resolved){resolved=false;break;}peak=Math.max(peak,r.peak);steps=Math.max(steps,r.steps);}
   if(resolved){const r=finishShot(sim,shot);resolved=r.resolved;peak=Math.max(peak,r.peak);steps=Math.max(steps,r.steps);}
   if(!resolved){unresolved++;sim.dispose();continue;}
   if(sim.phase==='won') {const witness={id:level.id,shots:[...chosen,shot],score:sim.score,stars:starsFor(sim.score,level.thresholds),peakBodies:peak,maxSteps:steps};sim.dispose();const replay=replayWitness(level,witness);if(!replay)throw Error(`Replay mismatch ${level.id}`);return {witness:replay,attempts,unresolved};}
   const injured=[...sim.entities.values()].filter(e=>e.type==='monster').reduce((n,e)=>n+1-Math.max(0,e.health)/e.maxHealth,0);
   const value=(level.monsters.length-sim.remainingMonsters)*1000000+injured*150000+sim.score;
   if(sim.phase==='aiming'&&(!best||value>best.value))best={shot,value};sim.dispose();
  }
  if(!best)break;chosen.push(best.shot);if(level.metadata?.design||level.metadata?.category==='spectacle')console.log(level.id,'shot',shotIndex+1,'best',Math.round(best.value),best.shot);
 }
 return {attempts,unresolved};
}
export function replayWitness(level:Level,witness:Witness):Witness|undefined{
 const sim=new Simulation(level);let peak=sim.entities.size,maxSteps=0;const actualShots:Shot[]=[];
 for(const shot of witness.shots){if(sim.phase==='won')break;const r=finishShot(sim,shot);peak=Math.max(peak,r.peak);maxSteps=Math.max(maxSteps,r.steps);if(!r.resolved){sim.dispose();return undefined;}actualShots.push({...shot,abilityAt:r.ability?shot.abilityAt:null});}
 const valid=sim.phase==='won';const result=valid?{id:level.id,shots:actualShots,score:sim.score,stars:starsFor(sim.score,level.thresholds),peakBodies:peak,maxSteps}:undefined;sim.dispose();return result;
}
export function auditExpansion(selected?:string[]){
 const start=performance.now(),knownFile='tests/fixtures/expansion-solutions.json';
 let known:Witness[]=[];try{known=JSON.parse(fs.readFileSync(knownFile,'utf8')).levels||[];}catch{}
 const levels=produceCandidates().filter(l=>!selected||selected.includes(l.id));const reports:{id:string;accepted:boolean;issues?:ValidationIssue[];idle?:ReturnType<typeof idleAudit>;misses?:ReturnType<typeof missAudit>;witness?:Witness;attempts?:number;unresolved?:number}[]=[];
 for(const level of levels){const issues=validateLevel(level);if(issues.length){reports.push({id:level.id,accepted:false,issues});console.log(level.id,'INVALID',issues[0]);continue;}
  const idle=idleAudit(level);if(!idle.stable){reports.push({id:level.id,accepted:false,idle});console.log(level.id,'UNSTABLE',idle);continue;}
  const misses=missAudit(level);if(!misses.nontrivial){reports.push({id:level.id,accepted:false,idle,misses});console.log(level.id,'TRIVIAL_BASELINE',misses);continue;}
  const result=search(level,known.find(w=>w.id===level.id),Number(process.env.EXPANSION_ATTEMPTS||(level.metadata?.category==='spectacle'?1000:600)));reports.push({id:level.id,accepted:!!result.witness,idle,misses,...result});console.log(level.id,result.witness?`WIN ${result.witness.shots.length} shots ${result.witness.stars} stars ${result.witness.score}`:'UNPROVEN',result.attempts,'attempts');
  fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/expansion-audit-progress.json',JSON.stringify(reports,null,2)+'\n');
 }
 const acceptedFile='src/content/expansion/accepted.json';let accepted:Level[]=[];try{accepted=JSON.parse(fs.readFileSync(acceptedFile,'utf8'));}catch{}
 accepted=[...accepted.filter(level=>!reports.some(r=>r.id===level.id)),...levels.filter(level=>reports.some(r=>r.id===level.id&&r.accepted))];accepted.sort((a,b)=>['countryside','frozen','molten','haunted','orbital'].indexOf(a.world)-['countryside','frozen','molten','haunted','orbital'].indexOf(b.world)||a.id.localeCompare(b.id));
 fs.mkdirSync('src/content/expansion',{recursive:true});fs.writeFileSync(acceptedFile,JSON.stringify(accepted,null,2)+'\n');
 let latest=known;try{latest=JSON.parse(fs.readFileSync(knownFile,'utf8')).levels||known;}catch{}
 const witnesses=[...latest.filter(w=>!reports.some(r=>r.id===w.id)),...reports.flatMap(r=>'witness'in r&&r.witness?[r.witness]:[])];
 fs.mkdirSync('tests/fixtures',{recursive:true});fs.writeFileSync(knownFile,JSON.stringify({version:1,note:'Independently replayed accepted expansion witnesses; unproven candidates are excluded.',levels:witnesses},null,2)+'\n');
 let previous:typeof reports=[];try{previous=JSON.parse(fs.readFileSync('artifacts/expansion-audit.json','utf8')).reports;}catch{}
 const combined=[...previous.filter(r=>!reports.some(n=>n.id===r.id)),...reports];
 fs.writeFileSync('artifacts/expansion-audit.json',JSON.stringify({durationMs:Math.round(performance.now()-start),reports:combined},null,2)+'\n');
 return reports;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))auditExpansion(process.argv.slice(2).length?process.argv.slice(2):undefined);
