/** Design diagnostics, never a numerical claim of entertainment or difficulty. */
import {Simulation} from '../src/game/physics';
import type {Level} from '../src/game/types';
import type {Witness} from './audit-expansion';
export function measureSiege(level:Level,witness:Witness){
 const sim=new Simulation(level),moved=new Set<string>(),destroyed=new Set<string>(),sections=new Set<string>();
 const original=new Map([...sim.entities.values()].map(e=>[e.id,{...e.body.position}]));
 const hitTime=new Map<string,number>(),paths=new Map<string,string[]>(),secondaryImpacts=new Set<string>();
 const links=new Set<string>(),activations=new Set<string>();
 let damageEvents=0,secondaryDamageEvents=0,primaryDamageEvents=0,maximumChronologicalChain=0,peakBodies=sim.entities.size,steps=0;
 const sample=()=>{
  steps++;peakBodies=Math.max(peakBodies,sim.entities.size);
  const alive=new Set([...sim.entities.values()].filter(e=>e.type!=='fragment').map(e=>e.id));
  for(const id of original.keys())if(!alive.has(id))destroyed.add(id);
  for(const e of sim.entities.values()){const id=e.parentId||e.id,p=original.get(id);if(p&&Math.hypot(e.body.position.x-p.x,e.body.position.y-p.y)>16)moved.add(id);}
  for(const e of sim.drainEvents()){
   if(e.type==='mechanism'&&e.mechanismId)activations.add(e.mechanismId);
   if(e.type!=='damage'||!e.entityId||(e.amount||0)<.12)continue;
   damageEvents++;const source=e.sourceId,id=e.entityId,time=e.time||sim.time;
   if(e.source==='projectile')primaryDamageEvents++;else if(e.source==='structure'||e.source==='crush'||e.source==='explosion'||e.source==='fall')secondaryDamageEvents++;
   if(source&&source!==id){links.add(`${source} → ${id}`);
    // Only advance from an earlier injured source. Same-tick mutual contacts cannot
    // fabricate a chain. This is a chronological impact proxy, not proof of causation.
    const previous=hitTime.get(source),prior=paths.get(source)||[source];
    const path=previous!==undefined&&previous<time&&time-previous<8000&&!prior.includes(id)?[...prior,id]:[source,id];
    if(path.length>(paths.get(id)?.length||0))paths.set(id,path);maximumChronologicalChain=Math.max(maximumChronologicalChain,path.length-1);
    if(e.source!=='projectile'&&(e.normalSpeed||0)>1.6)secondaryImpacts.add(`${[source,id].sort().join(':')}:${Math.round(time/(1000/60))}`);
   }
   hitTime.set(id,time);
  }
 };
 for(const shot of witness.shots){if(sim.phase==='won')break;if(!sim.launch(shot))break;
  for(let f=0;f<3600&&sim.phase==='flying';f++){if(f===shot.abilityAt)sim.activate();sim.step();sample();}
 }
 for(const section of level.metadata?.design?.sections||[])if(section.members.some(id=>moved.has(id)||destroyed.has(id)))sections.add(section.id);
 const materialCounts=Object.fromEntries([...new Set(level.blocks.map(b=>b.material))].map(kind=>[kind,level.blocks.filter(b=>b.material===kind).length]));
 const xs=level.monsters.map(m=>m.x),ys=level.monsters.map(m=>m.y);
 const result={id:level.id,won:sim.phase==='won',score:sim.score,shots:sim.shots,steps,peakBodies,archetype:level.metadata?.design?.archetype,materialCounts,angledMembers:level.blocks.filter(b=>Math.abs(Math.sin((b.angle||0)*2))>.1).length,joints:level.joints?.length||0,targetSpread:{x:Math.max(...xs)-Math.min(...xs),y:Math.max(...ys)-Math.min(...ys)},movedObjects:moved.size,destroyedOriginals:destroyed.size,primaryDamageEvents,secondaryDamageEvents,secondaryImpacts:secondaryImpacts.size,damageEvents,affectedSections:[...sections],maximumChronologicalChain,observedDamageLinks:[...links],activatedMechanisms:[...activations],environmentActivity:Object.fromEntries([...sim.worldPhysics.activity].map(([id,a])=>[id,{ticks:a.ticks,bodyTicks:a.bodyTicks,impulse:+a.impulse.toFixed(4),damage:+a.damage.toFixed(4)}]))};
 sim.dispose();return result;
}
