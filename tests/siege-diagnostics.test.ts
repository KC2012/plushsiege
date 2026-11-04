import {test} from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import {Simulation} from '../src/game/physics';
import {validateLevel} from '../src/content/validate';
import type {Level} from '../src/game/types';
const base=():Level=>({version:1,id:'diagnostic',name:'Diagnostic',subtitle:'Real engine diagnostic fixture',world:'countryside',bounds:{width:2000,height:1035,ground:900},sling:{x:235,y:755},projectiles:['duck'],blocks:[],monsters:[{id:'target',x:1100,y:882,radius:18}],hazards:[{id:'bomb',kind:'tnt',x:1000,y:880}],thresholds:[5000,5500,6000]});
test('damage diagnostics preserve a removed explosive source ID and chronological timestamps',()=>{
 const s=new Simulation(base());s.launch({x:-102,y:0});Matter.Body.setPosition(s.current!.body,{x:900,y:875});
 for(let i=0;i<100;i++)s.step();const blast=s.damageHistory.find(e=>e.entityId==='target'&&e.source==='explosion');
 assert.ok(blast);assert.equal(blast.sourceId,'bomb');assert.ok(blast.time!>0);assert.ok(![...s.entities.values()].some(e=>e.id==='bomb'));s.dispose();
});
test('ground-free space lets a backward miss leave the playfield',()=>{
 const l=base();l.world='orbital';l.environment={ground:false,gravity:{x:0,y:0}};l.hazards=[];
 const s=new Simulation(l);s.launch({x:102,y:0});for(let i=0;i<400&&s.phase==='flying';i++)s.step();
 assert.equal(s.phase,'lost');assert.equal(s.remainingMonsters,1);assert.equal(s.score,0);assert.ok(![...s.entities.values()].some(e=>e.type==='projectile'));s.dispose();
});
test('after every target is physically defeated, harmless moving rubble cannot withhold victory indefinitely',()=>{
 const l=base();l.blocks=[{id:'moving-rubble',x:1700,y:400,w:100,h:20,material:'wood'}];
 const s=new Simulation(l);s.launch({x:-102,y:0});Matter.Body.setPosition(s.current!.body,{x:900,y:875});
 const rubble=[...s.entities.values()].find(e=>e.id==='moving-rubble')!;
 for(let f=0;f<450&&s.phase==='flying';f++){Matter.Body.setPosition(rubble.body,{x:1700,y:400});Matter.Body.setVelocity(rubble.body,{x:1,y:0});Matter.Sleeping.set(rubble.body,false);s.step();}
 assert.equal(s.remainingMonsters,0);assert.equal(s.phase,'won');assert.ok(s.time<7000);assert.ok(s.entities.has(rubble.body.id));s.dispose();
});
test('design notes reject dangling physical references and fictional causal route endpoints',()=>{
 const l=base();l.metadata={category:'puzzle',idea:'Inspect a weak point',mechanics:['blast'],design:{archetype:'powder experiment',role:'experiment',weakPoints:['bomb'],sections:[{id:'courtyard',members:['bomb','target']}],intendedRoute:[{from:'bomb',to:'target',via:'impact'}],worldUse:'classic'}};
 assert.deepEqual(validateLevel(l),[]);l.metadata.design!.sections[0].members.push('imaginary-wall');l.metadata.design!.intendedRoute[0].from='scripted-victory';
 const issues=validateLevel(l);assert.ok(issues.some(e=>e.path.includes('sections')));assert.ok(issues.some(e=>e.path.includes('intendedRoute')));
});
test('sleeping debris that supports a monster in sideways gravity survives age-based cleanup',()=>{
 const l=base();l.world='orbital';l.environment={gravity:{x:1,y:0},ground:false};l.hazards=[];
 l.blocks=[{id:'support-fragment',x:1360,y:650,w:50,h:22,material:'wood'}];l.terrain=[{id:'wall',x:1400,y:650,w:30,h:400,material:'stone'}];l.monsters=[{id:'target',x:1317,y:650,radius:18}];
 const s=new Simulation(l),piece=[...s.entities.values()].find(e=>e.id==='support-fragment')!;
 piece.type='fragment';piece.born=0;
 for(let frame=0;frame<3200;frame++)s.step();
 assert.ok(s.entities.has(piece.body.id));assert.equal(s.remainingMonsters,1);assert.ok(Math.abs([...s.entities.values()].find(e=>e.id==='target')!.body.position.x-1317)<3);s.dispose();
});
test('a final shot waits for a stationary heat-sensitive fastener to burn through and release its target',()=>{
 const l=base();l.projectiles=['sheep'];l.hazards=[];l.monsters=[{id:'target',x:1000,y:573,radius:18}];
 l.blocks=[{id:'fastener',x:1000,y:350,w:100,h:20,material:'wood'},{id:'deck',x:1000,y:600,w:160,h:18,material:'wood'}];
 l.joints=[{id:'fastener-seat',kind:'hinge',pointA:{x:1000,y:350},bodyB:'fastener',pointB:{x:0,y:0},length:0,stiffness:.75,damping:.15},...[-1,1].map(side=>({id:`stay-${side}`,kind:'rope' as const,bodyA:'fastener',pointA:{x:side*55,y:0},bodyB:'deck',pointB:{x:side*55,y:0},length:250,stiffness:.75,damping:.15}))];
 l.zones=[{id:'furnace',kind:'heat',x:1000,y:350,w:140,h:80,rate:8}];
 const s=new Simulation(l);s.launch({x:-10,y:0});for(let f=0;f<240;f++)s.step();
 assert.equal(s.phase,'flying');assert.equal(s.remainingMonsters,1);assert.ok(s.worldPhysics.pendingDestruction);
 for(let f=0;f<900&&s.phase==='flying';f++)s.step();assert.equal(s.phase,'won');assert.ok(s.damageHistory.some(e=>e.source==='heat'));s.dispose();
});
