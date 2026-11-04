import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaign} from '../src/content/campaign';
import fixtures from './fixtures/expansion-solutions.json';
import {traceSiege} from '../scripts/siege-trace';
import {measureSiege} from '../scripts/siege-metrics';
import type {Witness} from '../scripts/audit-expansion';
const level=(id:string)=>structuredClone(campaign.find(l=>l.id===id)!);
const witness=(id:string)=>fixtures.levels.find(w=>w.id===id)! as Witness;
test('the kingdom collapse reaches multiple real architectural sections',()=>{
 const l=level('meadow-33'),w=witness(l.id),r=measureSiege(l,w);
 assert.ok(r.won);assert.ok(r.secondaryImpacts>5);assert.ok(r.affectedSections.length>=3);assert.ok(r.peakBodies<=240);
});
test('the exposed ice winch releases a sled into the lower fortress; friction changes the same shot’s outcome',()=>{
 const l=level('frozen-13'),w=witness(l.id),r=traceSiege(l,w.shots);
 assert.ok(r.won);assert.ok(r.released.filter(id=>id.startsWith('winch-stay')).length===2);assert.ok(r.horizontalTravel['citadel-sled-right-rake']>600);
 assert.ok(r.damage.filter(e=>e.sourceId?.startsWith('citadel-sled')&&e.entityId?.startsWith('lower-citadel')).reduce((n,e)=>n+(e.amount||0),0)>5);
 const control=level(l.id);control.zones=control.zones!.filter(z=>z.kind!=='ice');control.environment={groundFriction:.9};control.terrain!.forEach(t=>t.friction=.9);
 assert.ok(traceSiege(control,w.shots).remaining>0);
});
test('both foundries use the actual valve, pressure stones, heat-sensitive fasteners and lava landings',()=>{
 const l=level('molten-13'),w=witness(l.id),r=traceSiege(l,w.shots);
 assert.ok(r.won);for(const prefix of['','east-']){
  assert.ok(r.activated.includes(prefix+'foundry-pressure'));assert.ok(r.activity[prefix+'foundry-pressure'].impulse>0);
  assert.ok(r.damage.some(e=>e.sourceId===prefix+'foundry-breaching-stone'&&e.entityId===prefix+'wooden-fastener'));
  assert.ok(r.activity[prefix+'fastener-furnace'].damage>0);assert.ok(r.activity[prefix+'foundry-lava'].damage>0);
 }
 const control=level(l.id);control.zones=control.zones!.filter(z=>z.kind!=='heat');assert.ok(traceSiege(control,w.shots).remaining>0);
});
test('the bell engine transfers motion through two real pendulums into the hanging house',()=>{
 const l=level('haunted-13'),w=witness(l.id),r=traceSiege(l,w.shots);
 assert.ok(r.won);assert.ok(r.activated.includes('bell-motor'));
 for(const[from,to]of[['bell-engine','first-bell'],['first-bell','second-bell']])assert.ok(r.damage.some(e=>e.sourceId===from&&e.entityId===to));
 assert.ok(r.damage.some(e=>e.sourceId==='second-bell'&&e.entityId?.startsWith('music-')));
 const control=level(l.id);control.mechanisms=[];assert.ok(traceSiege(control,w.shots).remaining>0);
});
test('radial gravity and released cargo contribute to the twin-moon clear',()=>{
 const l=level('orbital-13'),w=witness(l.id),r=traceSiege(l,w.shots);
 assert.ok(r.won);assert.equal(l.environment?.ground,false);assert.ok(r.travel['moon-0-asteroid']>100);
 assert.ok(r.damage.some(e=>e.sourceId==='moon-0-asteroid'));assert.ok(r.activity['foundry-moon-0-well'].impulse>0);
 const control=level(l.id);control.zones=control.zones!.filter(z=>z.kind!=='gravity');assert.ok(traceSiege(control,w.shots).remaining>0);
});
