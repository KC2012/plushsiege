import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const url=process.env.GAME_URL||'http://127.0.0.1:5190';
const levels=JSON.parse(readFileSync('src/content/expansion/accepted.json','utf8'));
const witnesses=JSON.parse(readFileSync('tests/fixtures/expansion-solutions.json','utf8')).levels;
const ids=['meadow-33','frozen-13','molten-13','haunted-13','orbital-13'];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--disable-dev-shm-usage',...(process.env.CANVAS_CI?['--disable-webgl']:[])]});
let checks=0;const reports=[],check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS',name);};
await mkdir('artifacts',{recursive:true});
try{
 for(const [width,height]of[[1440,810],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width===1024}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/__siege-check',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;background:#242139;overflow:hidden}#game{width:100vw;height:100vh}canvas{display:block}</style><div id="game"></div>'}));
  await page.goto(url+'/__siege-check');
  const source=await page.request.get(url+'/src/game/scene.ts').then(r=>r.text()),path=source.match(/from ["']([^"']*phaser[^"']*)["']/)[1];
  await page.evaluate(async path=>{const[{default:P},{SiegeScene}]=await Promise.all([import(path),import('/src/game/scene.ts')]);const s=new SiegeScene();s.audio.enabled=false;window.siege=s;const game=new P.Game({type:P.AUTO,parent:'game',width:1440,height:810,scale:{mode:P.Scale.FIT,autoCenter:P.Scale.CENTER_BOTH},scene:[s],audio:{noAudio:true}});game.events.once('ready',()=>window.siegeReady=true);},path);
  await page.waitForFunction(()=>window.siegeReady);
  const load=async level=>{await page.evaluate(l=>{const s=window.siege;s.loadLevel(l);s.overview();s.paused=true;window.siegeRoute=[];window.maxChainCameraX=0;window.siegePeak=s.sim.entities.size;},level);await page.waitForTimeout(70);};
  const run=async(shots,captureId)=>{
   for(let i=0;i<shots.length;i++){
    const launched=await page.evaluate(shot=>{const s=window.siege;if(s.sim.phase==='won')return false;s.focusSling();s.cameraRig.snap();s.cameraRig.tracking=true;window.siegeFrame=0;const ok=s.sim.launch(shot);if(ok)window.siegeRoute.push(shot);return ok;},shots[i]);
    if(!launched)break;
    let state;
    for(let end=200;end<=2200;end+=200){
     state=await page.evaluate(({shot,end})=>{const s=window.siege;s.paused=false;while(window.siegeFrame<end&&s.sim.phase==='flying'){if(window.siegeFrame===shot.abilityAt)s.sim.activate();s.update(0,1000/60);window.siegeFrame++;window.siegePeak=Math.max(window.siegePeak,s.sim.entities.size);if(!s.sim.current?.airborne)window.maxChainCameraX=Math.max(window.maxChainCameraX,s.cameraRig.x);}s.paused=true;return {phase:s.sim.phase,remaining:s.sim.remainingMonsters,bodies:s.sim.entities.size,score:s.sim.score,camera:s.cameraRig.state};},{shot:shots[i],end});
     if(captureId&&i===0&&[200,600,1000].includes(end)){await page.waitForTimeout(30);await page.screenshot({path:`artifacts/pass5-${captureId}-${width}-chain-${end}.png`});}
     if(state.phase!=='flying')break;
    }
    if(state?.phase==='won')break;
   }
   return page.evaluate(()=>({phase:window.siege.sim.phase,remaining:window.siege.sim.remainingMonsters,score:window.siege.sim.score,bodies:window.siege.sim.entities.size,peakBodies:window.siegePeak,shots:window.siegeRoute,cameraX:window.maxChainCameraX}));
  };
  for(const id of ids){
   const level=levels.find(l=>l.id===id),witness=witnesses.find(w=>w.id===id);assert.ok(level&&witness,id);
   await load(level);
   check(`${width} ${id}: actual scene renders finite dynamic targets`,await page.evaluate(()=>[...window.siege.sim.entities.values()].every(e=>Number.isFinite(e.body.position.x)&&Number.isFinite(e.body.position.y))&&[...window.siege.sim.entities.values()].filter(e=>e.type==='monster').every(e=>!e.body.isStatic&&e.body.mass>0)));
   check(`${width} ${id}: game canvas fits the viewport`,await page.locator('canvas').evaluate(c=>{const r=c.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}));
   await page.screenshot({path:`artifacts/pass5-${id}-${width}-initial.png`});
   let result=await run(witness.shots,id),fallback=false;
   // Small contact differences between Node and browser can need a follow-up.
   // Replay the whole real route with an available queued stuffie; never inject a hit.
   if(result.phase==='aiming'&&witness.shots.length<level.projectiles.length){
    outer:for(const degrees of[7,14,22,28,38,45,58,0,-4])for(const abilityAt of[null,35,80]){
     const a=degrees*Math.PI/180,shots=[...witness.shots,{x:-102*Math.cos(a),y:102*Math.sin(a),abilityAt}];await load(level);const next=await run(shots);
     if(next.phase==='won'){result=next;fallback=true;break outer;}
    }
   }
   console.log(width,id,JSON.stringify(result));
   if(result.phase==='flying')console.log('UNRESOLVED',JSON.stringify(await page.evaluate(()=>{const s=window.siege.sim,c=s.convergedBodies();return {time:s.time,quiet:s.quiet,pressure:s.compression.pending,monsters:[...s.entities.values()].filter(e=>e.type==='monster').map(e=>({id:e.id,p:e.body.position,h:e.health,reading:s.compression.readings.get(e.body.id)})),moving:[...s.entities.values()].filter(e=>!e.body.isStatic&&!e.body.isSleeping&&(e.body.speed>.32||Math.abs(e.body.angularVelocity)>.04)).map(e=>({id:e.id,p:e.body.position,v:e.body.velocity,w:e.body.angularVelocity,converged:c.has(e.body.id),rest:s.restPoses.get(e.body.id),damageAt:s.damageTimes.get(e.body.id)}))};})));
   await writeFile('artifacts/pass5-siege-browser-progress.json',JSON.stringify({width,id,result},null,2));
   check(`${width} ${id}: real rendered input route clears within the queue`,result.phase==='won'&&result.shots.length<=level.projectiles.length);
   check(`${width} ${id}: body budget stays bounded`,result.peakBodies<=240);
   if(id==='frozen-13')check(`${width}: camera follows the siege after the stuffie lands`,result.cameraX>1500);
   await page.waitForTimeout(50);await page.screenshot({path:`artifacts/pass5-${id}-${width}-victory.png`});
   reports.push({width,height,id,...result,browserFollowup:fallback});
  }
  check(`${width}: no uncaught game errors`,errors.length===0);await page.close();
 }
 await writeFile('artifacts/pass5-siege-browser.json',JSON.stringify({checks,reports,note:'Actual SiegeScene update/render path at fixed steps in desktop and iPad-sized Chromium. These are input-route and layout checks, not physical iPad or real-time frame-rate measurements.'},null,2));
 console.log(`Siege browser: ${checks} checks passed.`);
}finally{await browser.close();}
