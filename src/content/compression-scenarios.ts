import Matter from 'matter-js';
import type {PhysicsScenario} from './physics-scenarios';
import type {Level,BlockDef} from '../game/types';
import type {Simulation} from '../game/physics';
const level=(id:string):Level=>({version:1,id,name:id,subtitle:'Rubble compression verification',world:'countryside',bounds:{width:1440,height:810,ground:675},sling:{x:235,y:530},projectiles:['sheep'],blocks:[],monsters:[{id:'target',x:900,y:657,radius:18,kind:'horn'}],hazards:[],thresholds:[5000,8000,11000]});
const block=(id:string,y:number,w:number,h:number,material:BlockDef['material']='wood'):BlockDef=>({id,x:900,y,w,h,material});
const target=(s:Simulation)=>[...s.entities.values()].find(e=>e.id==='target');
const damp=(s:Simulation)=>{for(const e of s.entities.values())if(e.type==='block')e.body.frictionAir=.5;};
const crushed=(s:Simulation)=>({passed:s.remainingMonsters===0&&s.damageHistory.some(e=>e.pressureRatio!==undefined),detail:`${s.remainingMonsters} targets; supported-load damage ${s.damageHistory.filter(e=>e.pressureRatio!==undefined).length}`});
const safe=(s:Simulation)=>({passed:!!target(s)&&target(s)!.health===target(s)!.maxHealth,detail:`Target health ${target(s)?.health.toFixed(2)??'defeated'}`});
const stone=level('sustained-stone');stone.blocks=[block('slow-stone',545,160,60,'stone')];
const beams=level('beam-compression');beams.blocks=[0,1,2,3].map(i=>block(`beam-${i}`,565-i*18,160,18));
const rubble=level('sleeping-rubble');rubble.blocks=[0,1,2].map(i=>block(`rubble-${i}`,560-i*24,125,24,'stone'));
const light=level('light-roof');light.blocks=[block('roof',630,150,18)];
const free=level('released-compression');free.blocks=[block('released-load',545,160,60,'stone')];
const impact=level('crush-impact-control');impact.blocks=[block('falling-stone',410,120,60,'stone')];
const fall=level('crush-fall-control');fall.monsters[0].y=430;
export const compressionScenarios:PhysicsScenario[]=[
 {id:stone.id,name:'Stone under a slow press',description:'A heavily damped stone descends too slowly for impact damage. Opposing ground contact and sustained supported weight must defeat the pinned target.',level:stone,scenarioFrames:650,setup:damp,verify:crushed},
 {id:beams.id,name:'Four beams, one trapped monster',description:'Each timber is light; the contact graph must transmit the combined pile weight through the lowest beam.',level:beams,scenarioFrames:800,setup:damp,verify:crushed},
 {id:rubble.id,name:'Sleeping rubble still weighs something',description:'The real pile settles, then the test puts its bodies to sleep. Supported compression must continue without waking or teleporting the monster.',level:rubble,scenarioFrames:800,setup:damp,afterStep(s){if(s.compression.pending)for(const e of s.entities.values())Matter.Sleeping.set(e.body,true);},verify:crushed},
 {id:light.id,name:'A harmless light roof',description:'Ordinary light contact is not a crush. No overlap timer, pressure damage or forced defeat is allowed.',level:light,scenarioFrames:600,setup(){},verify:safe},
 {id:free.id,name:'Freed before the pile bears down',description:'A mechanical rig withdraws the load during the pressure grace period. Damage must stop when the opposing contact is gone.',level:free,scenarioFrames:650,setup:damp,afterStep(s){if(!s.compression.pending)return;const e=[...s.entities.values()].find(e=>e.id==='released-load');if(e){Matter.Composite.remove(s.engine.world,e.body);s.entities.delete(e.body.id);}},verify:safe},
 {id:impact.id,name:'Falling impact control',description:'A substantial falling stone still uses collision energy; it need not wait for a sustained compression timer.',level:impact,scenarioFrames:300,setup(){},verify:s=>({passed:s.remainingMonsters===0&&s.damageHistory.some(e=>e.source==='structure'),detail:`${s.remainingMonsters} targets remain`})},
 {id:fall.id,name:'Substantial fall control',description:'A substantial monster fall onto terrain remains lethal. Standing on that terrain is harmless.',level:fall,scenarioFrames:300,setup(){},verify:s=>({passed:s.remainingMonsters===0&&s.damageHistory.some(e=>e.source==='fall'),detail:`${s.remainingMonsters} targets remain`})},
];
