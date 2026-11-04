import {Simulation,type GameEvent} from '../src/game/physics';
import type {Level} from '../src/game/types';
import type {Shot} from './audit-expansion';
/** Observe real input-driven physics. No object removal, forces or damage are injected. */
export function traceSiege(level:Level,shots:Shot[]){
 const s=new Simulation(level),origins=new Map([...s.entities.values()].map(e=>[e.id,{...e.body.position}]));
 const travel:Record<string,number>={},horizontalTravel:Record<string,number>={},damage:GameEvent[]=[],released=new Set<string>(),activated=new Set<string>();
 let peak=s.entities.size,steps=0;
 for(const shot of shots){
  if(s.phase==='won')break;if(!s.launch(shot))break;
  for(let frame=0;frame<2200&&s.phase==='flying';frame++){
   if(frame===shot.abilityAt)s.activate();s.step();steps++;peak=Math.max(peak,s.entities.size);
   for(const e of s.entities.values()){const id=e.parentId||e.id,p=origins.get(id);if(p){travel[id]=Math.max(travel[id]||0,Math.hypot(e.body.position.x-p.x,e.body.position.y-p.y));horizontalTravel[id]=Math.max(horizontalTravel[id]||0,Math.abs(e.body.position.x-p.x));}}
   for(const e of s.drainEvents()){
    if(e.type==='damage')damage.push(e);
    if(e.type==='joint-break'&&e.jointId)released.add(e.jointId);
    if(e.type==='mechanism'&&e.mechanismId)activated.add(e.mechanismId);
   }
  }
 }
 const result={id:level.id,won:s.phase==='won',phase:s.phase,score:s.score,remaining:s.remainingMonsters,steps,peak,travel,horizontalTravel,damage,released:[...released],activated:[...activated],activity:Object.fromEntries([...s.worldPhysics.activity].map(([id,a])=>[id,{ticks:a.ticks,bodyTicks:a.bodyTicks,impulse:a.impulse,damage:a.damage}]))};
 s.dispose();return result;
}
