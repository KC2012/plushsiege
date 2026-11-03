import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const levels=JSON.parse(readFileSync('src/content/expansion/accepted.json','utf8'));
const witnesses=JSON.parse(readFileSync('tests/fixtures/expansion-solutions.json','utf8')).levels;
const url=process.env.GAME_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--disable-webgl']});
let checks=0;const check=(name,value)=>{assert.ok(value,name);console.log('PASS',name);checks++;};
await mkdir('artifacts',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:810}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__showcase',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><style>body{margin:0}canvas{display:block}</style><div id="game"></div>'}));await page.goto(url+'/__showcase');
 const source=await page.request.get(url+'/src/game/scene.ts').then(r=>r.text()),path=source.match(/from ["']([^"']*phaser[^"']*)["']/)[1];
 await page.evaluate(async path=>{
  const [{default:Phaser},{SiegeScene}]=await Promise.all([import(path),import('/src/game/scene.ts')]);const s=new SiegeScene();window.showcase=s;s.audio.enabled=false;
  const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1440,height:810,scene:[s],audio:{noAudio:true}});game.events.once('ready',()=>window.showcaseReady=true);
 },path);await page.waitForFunction(()=>window.showcaseReady);
 for(const id of ['meadow-30','frozen-10','molten-10','haunted-10','orbital-10']){
  const level=levels.find(l=>l.id===id);if(!level)continue;
  await page.evaluate(l=>{window.showcase.loadLevel(l);window.showcase.overview();window.showcase.paused=true;},level);
  await page.waitForTimeout(80);
  check(`${id}: authored bodies render in the actual scene`,await page.evaluate(()=>[...window.showcase.sim.entities.values()].every(e=>Number.isFinite(e.body.position.x)&&Number.isFinite(e.body.position.y))));
  await page.screenshot({path:`artifacts/pass4-showcase-${id}.png`});
 }
 const level=levels.find(l=>l.id==='frozen-10'),witness=witnesses.find(w=>w.id===level.id);
 await page.evaluate(l=>{window.showcase.loadLevel(l);window.showcase.overview();window.showcase.paused=true;},level);
 const shot=witness.shots[0];await page.evaluate(shot=>{window.showcase.sim.launch(shot);window.chainFrame=0;},shot);
 for(const end of [110,180,2200]){
  const state=await page.evaluate(({end,shot})=>{const s=window.showcase;for(;window.chainFrame<end;window.chainFrame++){if(window.chainFrame===shot.abilityAt)s.sim.activate();s.sim.step();}return {phase:s.sim.phase,remaining:s.sim.remainingMonsters,ability:s.sim.abilityUsed,bodies:s.sim.entities.size};},{end,shot});
  await page.waitForTimeout(60);await page.screenshot({path:`artifacts/pass4-ice-chain-${end}.png`});
  if(end===2200)check('large chain remains inside the entity budget',state.bodies<=240);
 }
 const route=await page.evaluate(({level,first})=>{
  const scene=window.showcase,run=shot=>{if(!scene.sim.launch(shot))return;for(let f=0;f<2200&&scene.sim.phase==='flying';f++){if(f===shot.abilityAt)scene.sim.activate();scene.sim.step();}};
  if(scene.sim.phase==='won')return [first];
  for(const degrees of [14,22,28,7,0,38,45,58])for(const abilityAt of [null,35,50]){
   scene.loadLevel(level);scene.overview();scene.paused=true;run(first);
   if(scene.sim.phase==='won')return [first];
   const a=degrees*Math.PI/180,next={x:-102*Math.cos(a),y:102*Math.sin(a),abilityAt};run(next);
   if(scene.sim.phase==='won')return [first,next];
  }
  return null;
 },{level,first:shot});
 check('rendered ice city has an actual winning route within its queue',!!route);
 await page.waitForTimeout(60);await page.screenshot({path:'artifacts/pass4-ice-victory.png'});
 await writeFile('artifacts/showcase-route.json',JSON.stringify({id:level.id,shots:route,note:'Browser real-engine route. Small collision differences from Node may require a follow-up shot.'},null,2));
 check('showcases produce no uncaught browser errors',errors.length===0);
 await writeFile('artifacts/showcase-browser.json',JSON.stringify({checks,errors,note:'Rendered real-engine witnesses advanced by fixed steps; this is not a pointer-input or physical-device performance test.'},null,2));
}finally{await browser.close();}
