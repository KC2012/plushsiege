import {test} from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import {Simulation} from '../src/game/physics';
import type {Level,BlockDef} from '../src/game/types';
const {Body,Composite,Sleeping}=Matter;
const base=():Level=>({version:1,id:'compression-regression',name:'Compression regression',subtitle:'Physical load contacts',world:'countryside',bounds:{width:1800,height:1035,ground:900},sling:{x:220,y:755},projectiles:['sheep','bear'],blocks:[],monsters:[{id:'target',x:1000,y:882,radius:18}],hazards:[],thresholds:[5000,8000,11000]});
const block=(id:string,y:number,w:number,h:number,material:BlockDef['material']='wood'):BlockDef=>({id,x:1000,y,w,h,material});
const tick=(s:Simulation,n:number)=>{for(let f=0;f<n;f++)s.step();};
const target=(s:Simulation)=>[...s.entities.values()].find(e=>e.id==='target');
const damp=(s:Simulation)=>{for(const e of s.entities.values())if(e.type==='block')e.body.frictionAir=.5;};
const pressure=(s:Simulation)=>s.damageHistory.filter(e=>e.source==='crush'&&e.pressureRatio!==undefined);

test('a slowly settling heavy stone still crushes a pinned monster after impact energy is gone',()=>{
 const l=base();l.blocks=[block('stone',770,160,60,'stone')];const s=new Simulation(l);damp(s);tick(s,700);
 assert.equal(s.remainingMonsters,0);assert.ok(pressure(s).length);assert.ok(pressure(s).some(e=>(e.supportedMass||0)>30&&(e.compressionMs||0)>=300));s.dispose();
});
test('several light wooden beams transmit their combined supported weight through the bottom beam',()=>{
 const l=base();l.blocks=[0,1,2,3].map(i=>block(`beam${i}`,790-i*18,160,18));const s=new Simulation(l);damp(s);tick(s,900);
 assert.equal(s.remainingMonsters,0);assert.ok(pressure(s).some(e=>(e.supportedMass||0)>15));s.dispose();
});
test('a substantial rubble pile can finish crushing even after all its bodies fall asleep',()=>{
 const l=base();l.blocks=[0,1,2].map(i=>block(`masonry${i}`,785-i*24,125,24,'stone'));const s=new Simulation(l);damp(s);
 for(let f=0;f<800&&!s.compression.readings.get(target(s)?.body.id||-1)?.active;f++)s.step();
 assert.ok(target(s));assert.ok(s.compression.pending);
 for(const e of s.entities.values())Sleeping.set(e.body,true);
 tick(s,240);assert.equal(s.remainingMonsters,0);assert.ok(pressure(s).length);s.dispose();
});
test('a lightweight roof resting on a monster never produces overload damage',()=>{
 const l=base();l.blocks=[block('light-roof',855,150,18)];const s=new Simulation(l);tick(s,1200);
 assert.equal(target(s)?.health,target(s)?.maxHealth);assert.equal(pressure(s).length,0);s.dispose();
});
test('authored heavy stable contact remains safe without a collapse or new compressive load',()=>{
 const l=base();l.blocks=[block('resting-stone',834,120,60,'stone')];const s=new Simulation(l);tick(s,1200);
 assert.equal(target(s)?.health,target(s)?.maxHealth);assert.equal(pressure(s).length,0);assert.equal(s.compression.pending,false);s.dispose();
});
test('a monster under a roof supported by actual piers does not inherit the entire roof mass',()=>{
 const l=base();l.blocks=[{id:'left',x:885,y:832,w:30,h:136,material:'stone'},{id:'right',x:1115,y:832,w:30,h:136,material:'stone'},block('roof',750,290,28,'stone')];const s=new Simulation(l);tick(s,1200);
 assert.equal(target(s)?.health,target(s)?.maxHealth);assert.equal(pressure(s).length,0);s.dispose();
});
test('being freed during the compression grace period prevents residual damage',()=>{
 const l=base();l.blocks=[block('load',770,160,60,'stone')];const s=new Simulation(l);damp(s);
 for(let f=0;f<800&&!s.compression.pending;f++)s.step();assert.ok(s.compression.pending);tick(s,5);
 const load=[...s.entities.values()].find(e=>e.id==='load')!;Composite.remove(s.engine.world,load.body);s.entities.delete(load.body.id);tick(s,300);
 assert.equal(target(s)?.health,target(s)?.maxHealth);assert.equal(pressure(s).length,0);assert.equal(s.compression.pending,false);s.dispose();
});
test('a falling raft has no opposing ground reaction and does not crush its passenger in free fall',()=>{
 const l=base();l.environment={ground:false};l.bounds.height=5000;l.monsters[0].y=500;l.blocks=[block('upper',452,120,60,'stone'),block('lower',533,140,30,'stone')];const s=new Simulation(l);tick(s,90);
 assert.ok(target(s));assert.equal(pressure(s).length,0);s.dispose();
});
test('substantial impacts and falls still use impact damage rather than waiting for a pressure timer',()=>{
 const l=base();l.blocks=[block('falling-stone',620,120,60,'stone')];let s=new Simulation(l);tick(s,180);assert.equal(s.remainingMonsters,0);assert.ok(s.damageHistory.some(e=>e.source==='structure'));s.dispose();
 l.blocks=[];l.monsters[0].y=500;s=new Simulation(l);tick(s,180);assert.equal(s.remainingMonsters,0);assert.ok(s.damageHistory.some(e=>e.source==='fall'));s.dispose();
});
test('sustained compression keeps a final missed shot resolving until the physical load is finished',()=>{
 const l=base();l.projectiles=['sheep'];l.blocks=[block('load',770,160,60,'stone')];const s=new Simulation(l);damp(s);s.launch({x:102,y:0});
 tick(s,150);assert.equal(s.phase,'flying');assert.ok(s.compression.pending);tick(s,700);assert.equal(s.phase,'won');s.dispose();
});

test('a new sustained actuator force can crush through a light platen without a high-speed impact',()=>{
 const l=base();l.blocks=[block('platen',859,160,10)];const s=new Simulation(l);tick(s,180);assert.equal(target(s)?.health,3.5);
 const platen=[...s.entities.values()].find(e=>e.id==='platen')!;
 for(let f=0;f<240&&target(s);f++){Body.applyForce(platen.body,platen.body.position,{x:0,y:platen.body.mass*.004});s.step();}
 assert.equal(s.remainingMonsters,0);assert.ok(pressure(s).length);s.dispose();
});
