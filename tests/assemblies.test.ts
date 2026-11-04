import {test} from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import {triangularCabin,bowstringBridge,cableViaduct} from '../src/content/assemblies';
import {validateLevel} from '../src/content/validate';
import {idleAudit,missAudit} from '../scripts/audit-expansion';
import {Simulation} from '../src/game/physics';
import type {Level} from '../src/game/types';
const {Composite}=Matter;
for(const [name,rig] of [['triangular cabin',triangularCabin('triangle',1150,894)],['bowstring truss',bowstringBridge('arch',1200,714)],['cable viaduct',cableViaduct('cable',1200,650,900)]] as const){
 test(`${name} is a stable real assembly and harmless misses return control`,()=>{
  const l:Level={version:1,id:'assembly',name,subtitle:'Structural prototype',world:'countryside',bounds:{width:2400,height:1035,ground:900},sling:{x:235,y:755},projectiles:['duck','bear','rabbit'],blocks:rig.blocks,monsters:rig.monsters,hazards:[],terrain:rig.terrain,joints:rig.joints,props:rig.props,thresholds:[5000,10000,15000]};
  assert.deepEqual(validateLevel(l),[]);assert.ok(idleAudit(l).stable);assert.ok(missAudit(l).nontrivial);
 });
}
test('losing a rope fastener at the quiet boundary defers failure for the released platform',()=>{
 const l:Level={version:1,id:'rope-release',name:'Rope release',subtitle:'Support loss through a joint',world:'countryside',bounds:{width:1800,height:1035,ground:900},sling:{x:235,y:755},projectiles:['sheep'],blocks:[{id:'fastener',x:1000,y:550,w:120,h:20,material:'glass'},{id:'deck',x:1000,y:740,w:140,h:18,material:'wood'}],monsters:[{id:'target',x:1000,y:713,radius:18}],hazards:[],joints:[{id:'seat',kind:'hinge',bodyB:'fastener',pointA:{x:1000,y:550},pointB:{x:0,y:0},stiffness:.75},{id:'left',kind:'rope',bodyA:'fastener',pointA:{x:-45,y:0},bodyB:'deck',pointB:{x:-45,y:0},length:190,stiffness:.75,damping:.15},{id:'right',kind:'rope',bodyA:'fastener',pointA:{x:45,y:0},bodyB:'deck',pointB:{x:45,y:0},length:190,stiffness:.75,damping:.15}],thresholds:[5000,8000,11000]};
 const control=new Simulation(structuredClone(l));control.launch({x:102,y:0});let frame=0;for(;frame<1800&&control.phase==='flying';frame++)control.step();assert.equal(control.phase,'lost');control.dispose();
 const s=new Simulation(l);s.launch({x:102,y:0});for(let f=0;f<frame-1;f++)s.step();
 const anchor=[...s.entities.values()].find(e=>e.id==='fastener')!;Composite.remove(s.engine.world,anchor.body);s.entities.delete(anchor.body.id);s.step();assert.equal(s.phase,'flying');for(let f=0;f<1200&&s.phase==='flying';f++)s.step();assert.notEqual(s.phase,'flying');const rider=[...s.entities.values()].find(e=>e.type==='monster');if(rider){assert.ok(rider.body.position.y>l.monsters[0].y+100);assert.ok(rider.health<rider.maxHealth);}assert.ok(s.damageHistory.some(e=>e.source==='fall'));s.dispose();
});
