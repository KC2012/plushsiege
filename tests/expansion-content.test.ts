import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expansionLevels} from '../src/content/expansion';
import {produceCandidates} from '../src/content/generator';
import {idleAudit,missAudit,replayWitness,type Witness} from '../scripts/audit-expansion';
import {validateLevel} from '../src/content/validate';
import fixtures from './fixtures/expansion-solutions.json';
const witnesses=fixtures.levels as Witness[];
test('every shipped expansion level has an independently reproducible real-engine clear',()=>{
 assert.equal(witnesses.length,expansionLevels.length);
 for(const level of expansionLevels){
  assert.deepEqual(validateLevel(level),[],level.id);
  const known=witnesses.find(w=>w.id===level.id);assert.ok(known,level.id);
  const replay=replayWitness(level,known);assert.ok(replay,`${level.id}: winning replay`);
  assert.equal(replay.score,known.score,`${level.id}: deterministic score`);
  assert.ok(replay.peakBodies<=240,`${level.id}: body budget`);
 }
});
test('shipped expansion survives twenty idle seconds and deliberate misses without free destruction',()=>{
 for(const level of expansionLevels){
  assert.ok(idleAudit(level).stable,`${level.id}: unstable`);
  assert.ok(missAudit(level).nontrivial,`${level.id}: automatic destruction`);
 }
});
test('production candidate generation is deterministic and accepted geometry matches its source',()=>{
 const a=produceCandidates(),b=produceCandidates();assert.deepEqual(a,b);
 for(const level of expansionLevels)assert.deepEqual(level,a.find(c=>c.id===level.id),`${level.id}: stale accepted candidate`);
});

test('advertised trigger routes power real boulders and rotors that damage the structure',async()=>{
 const {Simulation}=await import('../src/game/physics');
 const routes=(await import('./fixtures/mechanism-routes.json')).default;
 for(const route of routes){
  const level=expansionLevels.find(l=>l.id===route.id);assert.ok(level,route.id);
  const sim=new Simulation(level),sources=new Set([...sim.entities.values()].filter(e=>e.type==='prop'||level.mechanisms?.some(m=>m.body===e.id)).map(e=>e.body.id));
  let active=false,causal=false;sim.launch(route.shot);
  for(let frame=0;frame<1200&&sim.phase==='flying';frame++){
   if(frame===route.shot.abilityAt)sim.activate();sim.step();
   for(const event of sim.drainEvents()){
    if(event.type==='mechanism')active=true;
    if(active&&event.type==='damage'&&sources.has(event.sourceBodyId!)&&(event.amount||0)>.3)causal=true;
   }
  }
  assert.ok(active,`${route.id}: physical trigger`);assert.ok(causal,`${route.id}: useful secondary impact`);sim.dispose();
 }
});
