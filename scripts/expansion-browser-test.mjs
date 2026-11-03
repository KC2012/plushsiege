import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const url=process.env.GAME_URL||'http://127.0.0.1:4173';
const levels=JSON.parse(readFileSync('src/content/expansion/accepted.json','utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
let checks=0;const reports=[];
const check=(name,value)=>{assert.ok(value,name);console.log('PASS',name);checks++;};
await mkdir('artifacts',{recursive:true});
try{
 for(const [width,height] of [[1440,900],[1180,820],[844,390],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('plush-siege-v1',JSON.stringify({version:1,scores:{'meadow-01':{score:25000,stars:3}},sound:false,trajectory:true,reducedMotion:false})));
  await page.goto(url);await page.locator('.title-menu').waitFor();
  await page.locator('[data-action="worlds"]').click();
  check(`${width}: five world portals`,await page.locator('[data-world]').count()===5);
  const visible=await page.locator('[data-world]').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth+1}));
  check(`${width}: touch-friendly portals fit horizontally`,visible);
  await page.screenshot({path:`artifacts/pass4-worlds-${width}.png`,fullPage:true});
  for(const world of ['countryside','frozen','molten','haunted','orbital']){
   const total=levels.filter(l=>l.world===world).length+(world==='countryside'?24:0);
   await page.locator(`[data-world="${world}"]`).click();
   check(`${width} ${world}: local map numbering and total stars`,await page.locator('.map-node-number').first().innerText()==='1'&&(await page.locator('.map-star-badge').getAttribute('aria-label')).includes(`of ${total*3} stars`));
   check(`${width} ${world}: map theme`,await page.locator('.campaign-menu').getAttribute('data-world-theme')===world);
   await page.locator('[data-level]').first().click();await page.locator('#level-chapter').waitFor();
   check(`${width} ${world}: playable world stage opens with local chapter`,(await page.locator('#level-chapter').innerText()).includes(`01 / ${total}`)&&await page.locator('.queue-item.used').count()===0);
   await page.locator('[data-action="overview"]').click();await page.locator('[data-action="zoom-in"]').click();await page.locator('[data-action="zoom-out"]').click();await page.locator('[data-action="sling"]').click();
   check(`${width} ${world}: camera controls consume no shot`,await page.locator('.queue-item.used').count()===0);
   check(`${width} ${world}: 44px camera controls fit the viewport`,await page.locator('.camera-tools button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=-1&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1})));
   if(width===1180)await page.screenshot({path:`artifacts/pass4-play-${world}.png`});
   await page.locator('[data-action="levels"]').click();
   check(`${width} ${world}: Levels returns to same world`,await page.locator('.campaign-menu').getAttribute('data-world-theme')===world);
   await page.locator('.map-home').click();
  }
  check(`${width}: old progress retained`,(await page.locator('[data-world="countryside"] small').innerText()).includes('1 /'));
  await page.locator('[data-action="settings"]').click();
  for(const [channel,value] of [['music','35'],['effects','65']]){
   await page.locator(`[data-volume="${channel}"]`).fill(value);await page.locator(`[data-volume="${channel}"]`).dispatchEvent('input');
  }
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('plush-siege-v1')));
  check(`${width}: independent volumes persist with old scores`,save.musicVolume===.35&&save.effectsVolume===.65&&save.scores['meadow-01'].stars===3);
  check(`${width}: no uncaught errors`,errors.length===0);reports.push({width,height,errors});await context.close();
 }
 await writeFile('artifacts/expansion-browser.json',JSON.stringify({checks,reports},null,2));
 console.log(`World integration: ${checks} checks passed.`);
}finally{await browser.close();}
