/** Read-only by default. Promotion refuses the entire selected batch on any failure. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {produceCandidates} from '../src/content/generator';
import {reviseLevel} from '../src/content/revisions';
import {annotateDesign} from '../src/content/design-notes';
import {validateLevel} from '../src/content/validate';
import type {Level,ValidationIssue} from '../src/game/types';
import {idleAudit,missAudit,replayWitness,search,type Witness} from './audit-expansion';
import {measureSiege} from './siege-metrics';
const args=process.argv.slice(2),promote=args.includes('--promote'),selected=args.filter(s=>!s.startsWith('--'));
const intro=JSON.parse(fs.readFileSync('src/content/campaign.json','utf8')) as Level[];
const candidates=[...intro.map(reviseLevel).map(annotateDesign),...produceCandidates()].filter(l=>!selected.length||selected.includes(l.id));
const known=JSON.parse(fs.readFileSync('tests/fixtures/expansion-solutions.json','utf8')).levels as Witness[];
for(const w of JSON.parse(fs.readFileSync('tests/fixtures/campaign-solutions.json','utf8')).levels)known.push(w);
fs.mkdirSync('artifacts/pass5-candidates',{recursive:true});
interface SiegeReport {id:string;hash:string;accepted:boolean;issues:ValidationIssue[];idle?:ReturnType<typeof idleAudit>;misses?:ReturnType<typeof missAudit>;witness?:Witness;attempts:number;unresolved:number;metrics?:ReturnType<typeof measureSiege>;}
const reports:SiegeReport[]=[];
for(const l of candidates){
 const hash=createHash('sha256').update(JSON.stringify(l)).digest('hex'),path=`artifacts/pass5-candidates/${l.id}.json`;
 let cached:undefined|{hash:string;witness?:Witness};try{cached=JSON.parse(fs.readFileSync(path,'utf8'));}catch{}
 const issues=validateLevel(l),idle=issues.length?undefined:idleAudit(l),misses=issues.length||!idle?.stable?undefined:missAudit(l);
 let witness:Witness|undefined,attempts=0,unresolved=0;
 if(!issues.length&&idle?.stable&&misses?.nontrivial){
  const k=cached?.witness||known.find(w=>w.id===l.id);
  witness=k&&replayWitness(l,k);
  if(!witness){const result=search(l,undefined,Number(process.env.SIEGE_ATTEMPTS||1000));({witness,attempts,unresolved}=result);}
 }
 const isIntro=intro.some(i=>i.id===l.id);
 const accepted=!!witness&&(!isIntro||(witness.stars===3&&witness.shots.length<=(l.par||l.projectiles.length)));
 const report={id:l.id,hash,accepted,issues,idle,misses,witness,attempts,unresolved,metrics:witness?measureSiege(l,witness):undefined};reports.push(report);
 fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');
 console.log(l.id,accepted?'PASS':issues.length?'INVALID':!idle?.stable?'UNSTABLE':!misses?.nontrivial?'MISS FAILURE':'UNPROVEN',witness?`${witness.shots.length} shots / ${witness.stars} stars`:JSON.stringify(issues.length?issues:!idle?.stable?idle:misses));
}
fs.writeFileSync('artifacts/pass5-audit-latest.json',JSON.stringify(reports,null,2)+'\n');
if(promote){
 if(reports.some(r=>!r.accepted))throw Error('Promotion refused: every selected candidate must pass all gates. Existing campaign files have not been changed.');
 const introIds=new Set(intro.map(l=>l.id));
 const accepted=JSON.parse(fs.readFileSync('src/content/expansion/accepted.json','utf8')) as Level[];
 for(const l of candidates){const target=introIds.has(l.id)?intro:accepted,index=target.findIndex(old=>old.id===l.id);if(index<0)target.push(l);else target[index]=l;}
 const order=['countryside','frozen','molten','haunted','orbital'];accepted.sort((a,b)=>order.indexOf(a.world)-order.indexOf(b.world)||a.id.localeCompare(b.id));
 const latest=known.filter(w=>!reports.some(r=>r.id===w.id));latest.push(...reports.flatMap(r=>r.witness?[r.witness]:[]));
 fs.writeFileSync('src/content/campaign.json',JSON.stringify(intro,null,2)+'\n');fs.writeFileSync('src/content/expansion/accepted.json',JSON.stringify(accepted,null,2)+'\n');
 fs.writeFileSync('tests/fixtures/expansion-solutions.json',JSON.stringify({version:1,note:'Accepted geometry independently replayed through real physics; automated solvability is not a fun rating.',levels:latest.filter(w=>!introIds.has(w.id))},null,2)+'\n');
 fs.writeFileSync('tests/fixtures/campaign-solutions.json',JSON.stringify({version:1,note:'Efficient three-star real-engine intro routes. Ability timestamps are fixed 60Hz frames after launch.',levels:intro.map(l=>{const w=latest.find(w=>w.id===l.id)!;return {id:l.id,shots:w.shots,expectedStars:3,maxShots:w.shots.length};})},null,2)+'\n');
 console.log(`Promoted ${reports.length} verified candidates.`);
}
if(reports.some(r=>!r.accepted))process.exitCode=1;
