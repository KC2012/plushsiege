import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

// Uses the real animation loop, not fast-forwarded fixed steps. Host timings are
// diagnostic observations, never a physical iPad performance claim.
const url=process.env.GAME_URL||'http://127.0.0.1:5190';
const levels=JSON.parse(readFileSync('src/content/expansion/accepted.json','utf8'));
const witnesses=JSON.parse(readFileSync('tests/fixtures/expansion-solutions.json','utf8')).levels;
const ids=['meadow-33','frozen-13','molten-13','haunted-13','orbital-13'];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--disable-dev-shm-usage',...(process.env.CANVAS_CI?['--disable-webgl']:[])]});
const reports=[];
try{
 for(const [width,height]of[[1440,810],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width===1024}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/__render-measure',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;overflow:hidden}#game{width:100vw;height:100vh}</style><div id="game"></div>'}));
  await page.goto(url+'/__render-measure');
  const source=await page.request.get(url+'/src/game/scene.ts').then(r=>r.text());
  const phaserPath=source.match(/from ["']([^"']*phaser[^"']*)["']/)[1];
  await page.evaluate(async path=>{
   const[{default:P},{SiegeScene}]=await Promise.all([import(path),import('/src/game/scene.ts')]);
   const scene=new SiegeScene();scene.audio.enabled=false;window.measureScene=scene;
   const game=new P.Game({type:P.AUTO,parent:'game',width:1440,height:810,scale:{mode:P.Scale.FIT,autoCenter:P.Scale.CENTER_BOTH},scene:[scene],audio:{noAudio:true}});
   game.events.once('ready',()=>window.measureReady=true);
  },phaserPath);
  await page.waitForFunction(()=>window.measureReady);
  for(const id of ids){
   const level=levels.find(l=>l.id===id),shot=witnesses.find(w=>w.id===id).shots[0];
   const result=await page.evaluate(async({level,shot})=>{
    const s=window.measureScene;s.paused=true;s.loadLevel(level);s.overview();s.cameraRig.snap();
    await new Promise(resolve=>setTimeout(resolve,150));
    const simStart=s.sim.time;let activated=false,peakBodies=s.sim.entities.size,peakAwake=0,invalid=false;
    if(!s.sim.launch(shot))throw Error('Measurement launch failed');s.paused=false;
    const intervals=[],started=performance.now();let previous=started;
    await new Promise(resolve=>{
     const frame=now=>{
      intervals.push(now-previous);previous=now;
      if(!activated&&shot.abilityAt!==null&&s.sim.time-simStart>=shot.abilityAt*1000/60){s.sim.activate();activated=true;}
      peakBodies=Math.max(peakBodies,s.sim.entities.size);
      peakAwake=Math.max(peakAwake,[...s.sim.entities.values()].filter(e=>!e.body.isStatic&&!e.body.isSleeping).length);
      invalid||=[...s.sim.entities.values()].some(e=>!Number.isFinite(e.body.position.x)||!Number.isFinite(e.body.position.y));
      if(now-started<8000)requestAnimationFrame(frame);else resolve();
     };requestAnimationFrame(frame);
    });
    s.paused=true;const wallMs=previous-started;intervals.sort((a,b)=>a-b);
    return {frames:intervals.length,wallMs,simulationMs:s.sim.time-simStart,meanFps:intervals.length*1000/wallMs,medianFrameMs:intervals[Math.floor(intervals.length*.5)],p95FrameMs:intervals[Math.floor(intervals.length*.95)],framesOver33ms:intervals.filter(n=>n>33.4).length,peakBodies,peakAwake,invalid,phase:s.sim.phase,remaining:s.sim.remainingMonsters};
   },{level,shot});
   assert.ok(!result.invalid&&result.simulationMs>1000&&result.peakBodies<=240,`${id}: finite running simulation within body budget`);
   reports.push({width,height,id,...result});console.log(width,id,JSON.stringify(result));
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 await mkdir('artifacts',{recursive:true});
 await writeFile('artifacts/render-pass-5.json',JSON.stringify({browser:browser.version(),softwareCanvas:!!process.env.CANVAS_CI,durationPerSampleMs:8000,reports,note:'Real requestAnimationFrame and SiegeScene loop on the cloud host, audio disabled, scene canvas without the HTML HUD. First witness shot only; no fast-forward. Diagnostic timings, not physical iPad/WebGL/touch/thermal/battery measurements or full-route win tests.'},null,2)+'\n');
}finally{await browser.close();}
