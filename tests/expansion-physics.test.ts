import {test} from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import {Simulation} from '../src/game/physics';
import {PHYSICS} from '../src/game/config';
import type {Level,BlockDef,MaterialKind} from '../src/game/types';
const {Body,Sleeping,Composite}=Matter;
const base=():Level=>({version:1,id:'expansion-fixture',name:'Expansion fixture',subtitle:'Physical mechanisms',world:'countryside',bounds:{width:2400,height:1000,ground:850},sling:{x:235,y:600},projectiles:['sheep','duck'],blocks:[],monsters:[{id:'target',x:2100,y:832}],hazards:[],thresholds:[5000,8000,10000]});
const block=(id:string,x:number,y:number,w:number,h:number,material:MaterialKind='wood',staticBody=false):BlockDef=>({id,x,y,w,h,material,static:staticBody});
const tick=(s:Simulation,n:number)=>{for(let i=0;i<n;i++)s.step();};
const find=(s:Simulation,id:string)=>[...s.entities.values()].find(e=>e.id===id)!;

test('real terrain ramps roll a dynamic stone boulder under gravity',()=>{
  const l=base();l.terrain=[{id:'ramp',x:1000,y:650,w:600,h:30,angle:.2}];l.props=[{id:'boulder',kind:'boulder',x:800,y:554,radius:35}];
  const s=new Simulation(l),b=find(s,'boulder');tick(s,180);
  assert.equal(find(s,'ramp').type,'terrain');assert.equal(find(s,'ramp').body.isStatic,true);assert.equal(b.body.isStatic,false);assert.ok(b.body.position.x>840);assert.ok(Math.abs(b.body.angle)>.2);s.dispose();
});
test('planetoid is a physical static circular collider and can carry local gravity',()=>{
  const l=base();l.environment={ground:false,gravity:{x:0,y:0}};l.props=[{id:'planet',kind:'planetoid',x:1100,y:600,radius:110}];l.zones=[{id:'field',kind:'gravity',x:1100,y:600,w:1000,h:1000,center:{x:1100,y:600},radius:500,strength:1}];l.monsters=[{id:'target',x:1100,y:400}];
  const s=new Simulation(l),planet=find(s,'planet'),m=find(s,'target');assert.equal(planet.body.isStatic,true);assert.equal(planet.body.circleRadius,110);tick(s,20);assert.ok(m.body.position.y>410);assert.ok(s.accelerationAt({x:1300,y:600}).x<0);s.dispose();
});
test('hinged and rope-suspended bodies obey real Matter constraints',()=>{
  const l=base();l.blocks=[block('hinged',1000,400,200,20),block('bob',1500,450,60,60,'stone')];l.joints=[{id:'hinge',kind:'hinge',bodyB:'hinged',pointA:{x:900,y:400},pointB:{x:-100,y:0}},{id:'rope',kind:'rope',bodyB:'bob',pointA:{x:1450,y:200},pointB:{x:0,y:0},length:255}];
  const s=new Simulation(l);tick(s,90);const h=find(s,'hinged').body,b=find(s,'bob').body;
  assert.ok(Math.abs(h.angle)>.2,'a pivoted plank swings under its own weight');assert.ok(Math.hypot(b.position.x-1450,b.position.y-200)<260);assert.equal(s.constraints.size,2);assert.equal(Composite.allConstraints(s.engine.world).length,2);s.dispose();
});
test('spring constraints stretch elastically and rope joints are slack rather than pushing',()=>{
  const l=base();l.environment={gravity:{x:0,y:0}};l.blocks=[block('springbody',1000,400,50,50),block('slack',1500,350,40,40)];l.joints=[{id:'spring',kind:'spring',bodyB:'springbody',pointA:{x:800,y:400},pointB:{x:0,y:0},length:150,stiffness:.025,damping:.05},{id:'slack-rope',kind:'rope',bodyB:'slack',pointA:{x:1500,y:200},pointB:{x:0,y:0},length:250}];
  const s=new Simulation(l),start=find(s,'slack').body.position.y;tick(s,60);assert.ok(find(s,'springbody').body.position.x<990);assert.ok(Math.abs(find(s,'slack').body.position.y-start)<1);s.dispose();
});
test('breakable rope releases from measured constraint load and attached bodies continue falling',()=>{
  const l=base();l.blocks=[block('load',1000,450,70,70,'stone')];l.joints=[{id:'weak-rope',kind:'rope',bodyB:'load',pointA:{x:1000,y:200},pointB:{x:0,y:0},length:250,breakForce:.0001}];
  const s=new Simulation(l);tick(s,40);assert.equal(s.constraints.has('weak-rope'),false);assert.ok(find(s,'load').body.position.y>480);assert.ok(s.drainEvents().some(e=>e.type==='joint-break'));s.dispose();
});
test('body fracture removes its actual joints instead of leaving ghost constraints',()=>{
  const l=base();l.blocks=[block('panel',900,450,100,18,'glass')];l.joints=[{id:'rope',kind:'rope',bodyB:'panel',pointA:{x:900,y:200},pointB:{x:0,y:0},length:250}];
  const s=new Simulation(l),panel=find(s,'panel');panel.health=0;panel.fractureAt=0;s.step();assert.equal(s.constraints.size,0);assert.equal(Composite.allConstraints(s.engine.world).length,0);s.dispose();
});
test('physical glass destruction activates a triggered platform without scripting any target death',()=>{
  const l=base();l.blocks=[block('switch',600,805,40,90,'glass'),block('platform',1100,650,200,24,'wood',true)];l.mechanisms=[{id:'shuttle',kind:'platform',body:'platform',axis:'x',speed:.2,range:100,trigger:'switch'}];
  const s=new Simulation(l);tick(s,90);assert.equal(s.mechanisms.get('shuttle')!.active,false);s.launch({x:-80,y:0});Body.setPosition(s.current!.body,{x:550,y:795});Body.setVelocity(s.current!.body,{x:16,y:0});tick(s,90);
  assert.equal(s.mechanisms.get('shuttle')!.active,true);assert.ok(Math.abs(find(s,'platform').body.position.x-1100)>10);assert.equal(s.remainingMonsters,1);s.dispose();
});
test('moving platforms transfer contact motion and periodic actuators do not block a failed shot forever',()=>{
  const l=base();l.projectiles=['sheep'];l.blocks=[block('platform',1100,650,250,20,'wood',true),block('cargo',1100,610,60,60)];l.monsters=[{id:'target',x:1150,y:622}];l.mechanisms=[{id:'shuttle',kind:'platform',body:'platform',axis:'x',speed:.15,range:80}];
  const s=new Simulation(l);tick(s,60);assert.ok(Math.abs(find(s,'cargo').body.position.x-1100)>5,'contact carries real cargo');s.launch({x:-10,y:0});tick(s,1200);assert.equal(s.phase,'lost');s.dispose();
});
test('motor turns an anchored physical body and interacts through its actual angular velocity',()=>{
  const l=base();l.blocks=[block('rotor',1200,500,240,20,'metal')];l.mechanisms=[{id:'motor',kind:'motor',body:'rotor',speed:.7}];
  const s=new Simulation(l),b=find(s,'rotor').body;tick(s,90);assert.ok(Math.abs(b.angle)>.7);assert.ok(Math.hypot(b.position.x-1200,b.position.y-500)<3);assert.ok(s.constraints.has('motor:pivot'));s.dispose();
});
test('a pressure vent launches a boulder using force and is dormant before launch',()=>{
  const l=base();l.props=[{id:'boulder',kind:'boulder',x:1000,y:820,radius:30}];l.mechanisms=[{id:'vent',kind:'vent',x:1000,y:790,w:120,h:160,force:.003}];
  const s=new Simulation(l);tick(s,120);const b=find(s,'boulder').body;assert.ok(b.position.y>810);s.launch({x:-10,y:0});tick(s,30);assert.ok(b.position.y<780);assert.ok(b.velocity.y<0);s.dispose();
});
test('ice zones preserve sliding momentum and restore ordinary friction outside the frozen region',()=>{
  const distances=[];
  for(const frozen of [false,true]){
    const l=base();l.blocks=[block('sled',800,830,70,40)];if(frozen)l.zones=[{id:'ice',kind:'ice',x:1100,y:800,w:1000,h:200}];const s=new Simulation(l);tick(s,90);const b=find(s,'sled').body;Body.setVelocity(b,{x:8,y:0});Sleeping.set(b,false);tick(s,60);distances.push(b.position.x-800);if(frozen){Body.setPosition(b,{x:1800,y:830});s.step();assert.ok(b.friction>.5);}s.dispose();
  }
  assert.ok(distances[1]>distances[0]*1.5,`${distances}`);
});
test('heat weakens susceptible supports only after play starts; lava is a real lethal contact region',()=>{
  const l=base();l.blocks=[block('warm-wood',900,800,20,100)];l.zones=[{id:'heat',kind:'heat',x:900,y:800,w:100,h:160,rate:12},{id:'lava',kind:'lava',x:2100,y:830,w:100,h:80,rate:50}];
  const s=new Simulation(l),wood=find(s,'warm-wood');tick(s,90);assert.equal(wood.health,wood.maxHealth);assert.equal(s.remainingMonsters,0);s.launch({x:-10,y:0});tick(s,60);assert.ok(wood.health<wood.maxHealth);assert.ok(s.damageHistory.some(e=>e.source==='lava'));assert.ok(s.damageHistory.some(e=>e.source==='heat'));s.dispose();
});
test('zero gravity exactly cancels global acceleration; vector and radial fields curve real trajectories',()=>{
  const l=base();l.environment={ground:false};l.blocks=[block('float',1000,400,30,30)];l.zones=[{id:'zero',kind:'zero-gravity',x:1000,y:400,w:200,h:200}];let s=new Simulation(l),b=find(s,'float').body;tick(s,120);assert.ok(Math.abs(b.position.y-400)<.01);assert.deepEqual(s.accelerationAt({x:1000,y:400}),{x:0,y:0});assert.ok(s.accelerationAt({x:1400,y:400}).y>.27);s.dispose();
  l.zones=[{id:'side',kind:'gravity',x:1000,y:400,w:500,h:500,gravity:{x:.8,y:0}}];s=new Simulation(l);b=find(s,'float').body;tick(s,30);assert.ok(b.position.x>1050);assert.ok(Math.abs(b.position.y-400)<.01);s.dispose();
});
test('a heavy downward stone impact uses opposed support work and a large monster fall is lethal',()=>{
  const l=base();l.blocks=[block('stone',1100,650,110,50,'stone')];l.monsters=[{id:'target',x:1100,y:832}];const s=new Simulation(l);tick(s,240);assert.equal(s.remainingMonsters,0);assert.ok(s.damageHistory.some(e=>e.source==='structure'&&e.material==='stone'));s.dispose();
});

test('body-local constraint anchors respect a nonzero authored rotation',()=>{
  const l=base();l.environment={gravity:{x:0,y:0}};l.blocks=[{...block('rotated',1000,400,180,20),angle:Math.PI/2}];l.joints=[{id:'hinge',kind:'hinge',bodyB:'rotated',pointA:{x:1000,y:310},pointB:{x:-90,y:0}}];
  const s=new Simulation(l),body=find(s,'rotated').body;
  tick(s,30);assert.ok(Math.hypot(body.position.x-1000,body.position.y-400)<1,'a rotated local anchor must not pull the initial assembly out of place');
  const constraint=s.constraints.get('hinge')!;assert.ok(Math.abs(constraint.pointB.x)<1);assert.ok(Math.abs(constraint.pointB.y+90)<1);s.dispose();
});

test('horizontal gravity support removal wakes a monster resting against a wall',()=>{
  const l=base();l.environment={ground:false,gravity:{x:1,y:0}};l.terrain=[{id:'wall',x:1100,y:500,w:40,h:300}];l.monsters=[{id:'target',x:1062,y:500}];
  const s=new Simulation(l);tick(s,180);const m=find(s,'target');assert.equal(m.body.isSleeping,true);const wall=find(s,'wall');Composite.remove(s.engine.world,wall.body);s.entities.delete(wall.body.id);assert.equal(m.body.isSleeping,false);tick(s,20);assert.ok(m.body.position.x>1100);s.dispose();
});

test('a falling boulder is classified as structural impact and can defeat a grounded monster',()=>{
  const l=base();l.props=[{id:'boulder',kind:'boulder',x:1100,y:650,radius:42}];l.monsters=[{id:'target',x:1100,y:832}];
  const s=new Simulation(l);tick(s,240);assert.equal(s.remainingMonsters,0);assert.ok(s.damageHistory.some(e=>e.source==='structure'&&e.material==='stone'));s.dispose();
});

test('a living periodic-platform rider allows the next shot while its platform keeps moving',()=>{
  const l=base();l.blocks=[block('platform',1100,650,280,20,'wood',true)];l.monsters=[{id:'target',x:1100,y:622}];l.mechanisms=[{id:'shuttle',kind:'platform',body:'platform',axis:'x',speed:.15,range:60}];
  const s=new Simulation(l);tick(s,60);s.launch({x:-10,y:0});for(let i=0;i<1000&&s.phase==='flying';i++)s.step();
  assert.equal(s.phase,'aiming');assert.equal(s.remainingMonsters,1);const x=find(s,'platform').body.position.x;tick(s,30);assert.ok(Math.abs(find(s,'platform').body.position.x-x)>2);s.dispose();
});

test('dislodging a periodic-platform rider at shot settlement still waits for its real fall',()=>{
  const l=base();l.projectiles=['sheep'];l.blocks=[block('platform',1100,650,280,20,'wood',true)];l.monsters=[{id:'target',x:1100,y:622}];l.mechanisms=[{id:'shuttle',kind:'platform',body:'platform',axis:'x',speed:.15,range:60}];
  const control=new Simulation(structuredClone(l));tick(control,60);control.launch({x:-10,y:0});let frame=0;while(control.phase==='flying'&&frame<1000){control.step();frame++;}assert.equal(control.phase,'lost');control.dispose();
  const s=new Simulation(l);tick(s,60);s.launch({x:-10,y:0});tick(s,frame-1);const target=find(s,'target'),platform=find(s,'platform');Composite.remove(s.engine.world,platform.body);s.entities.delete(platform.body.id);s.step();assert.equal(s.phase,'flying');tick(s,10);assert.ok(target.body.position.y>630);tick(s,300);assert.equal(s.remainingMonsters,0);assert.equal(s.phase,'won');s.dispose();
});

test('space victory resolves after all targets are defeated even while harmless distant debris drifts',()=>{
  const l=base();l.world='orbital';l.bounds.width=10000;l.environment={ground:false,gravity:{x:0,y:0}};l.blocks=[block('distant-drift',6000,400,30,30)];l.monsters=[{id:'target',x:600,y:600}];
  const s=new Simulation(l),drift=find(s,'distant-drift').body;drift.frictionAir=.00001;Body.setVelocity(drift,{x:1,y:0});s.launch({x:-102,y:0});tick(s,600);
  assert.equal(s.remainingMonsters,0);assert.equal(s.phase,'won');assert.ok(drift.speed>.8,'distant non-scoring motion must not block a certain victory');s.dispose();
});

test('an isolated long-lived zero-gravity miss exhausts safely without killing a living target',()=>{
  const l=base();l.world='orbital';l.bounds.width=10000;l.projectiles=['sheep'];l.environment={ground:false,gravity:{x:0,y:0}};l.monsters=[{id:'target',x:2000,y:400}];
  const s=new Simulation(l);s.launch({x:-10,y:0});const shot=s.current!;shot.body.frictionAir=0;Body.setVelocity(shot.body,{x:1,y:0});tick(s,2400);
  assert.equal(s.phase,'lost');assert.equal(s.remainingMonsters,1);assert.equal(s.entities.has(shot.body.id),false);assert.ok(s.time>PHYSICS.spaceProjectileLifetimeMs);s.dispose();
});

test('lava burns a touching monster even when its center stays above the hazard',()=>{
  const l=base();l.monsters=[{id:'target',x:1100,y:832}];l.zones=[{id:'surface-lava',kind:'lava',x:1100,y:880,w:200,h:60,rate:50}];
  const s=new Simulation(l);tick(s,30);assert.equal(s.remainingMonsters,0);assert.ok(s.damageHistory.some(e=>e.source==='lava'));s.dispose();
});

test('a slack rope applies neither compressive force nor hidden damping',()=>{
  const l=base();l.environment={gravity:{x:0,y:0}};l.blocks=[block('free',1000,400,40,40)];l.joints=[{id:'slack',kind:'rope',bodyB:'free',pointA:{x:1000,y:200},pointB:{x:0,y:0},length:400,damping:.3}];
  const s=new Simulation(l),b=find(s,'free').body;Body.setVelocity(b,{x:0,y:2});tick(s,20);
  assert.ok(Math.abs(b.velocity.y-2*Math.pow(.99,20))<.01);assert.equal(s.constraints.get('slack')!.damping,0);s.dispose();
});
