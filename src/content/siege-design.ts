import type {Level,MaterialKind} from '../game/types';
import {append,room,corbelArch} from './templates';
import {triangularCabin,bowstringBridge,cableViaduct,rollingRelease} from './assemblies';

function stage(world:string,n:number,name:string,idea:string,width=2800,ground=1250):Level {
 return {version:1,id:`${world==='countryside'?'meadow':world}-${String(n).padStart(2,'0')}`,name,subtitle:idea,world,bounds:{width,height:ground+180,ground},sling:{x:235,y:ground-145},projectiles:['duck','bear','rabbit','duck','bear','sheep'],blocks:[],monsters:[],hazards:[],terrain:[],props:[],joints:[],mechanisms:[],zones:[],thresholds:[5000,10000,15000],par:3,camera:{start:'overview'},metadata:{category:'spectacle',idea,mechanics:[],author:'Plush Siege production pass 5'}};
}
function finish(l:Level,mechanics:string[]):Level {
 l.metadata!.mechanics=mechanics;const target=l.monsters.length*5000,bonus=Math.max(1000,(l.projectiles.length-(l.par||3))*3000);l.thresholds=[target,target+bonus/2,target+bonus];return l;
}
function shelf(l:Level,id:string,x:number,y:number,w:number,h=24,material:MaterialKind='stone'){l.terrain!.push({id,x,y,w,h,material});}
function pin(l:Level,id:string,x:number){l.blocks.push({id,x,y:l.bounds.ground-45,w:28,h:90,material:'glass'});}
function bell(l:Level,id:string,x:number,y:number,anchorY:number,radius=38){l.props!.push({id,x,y,kind:'boulder',radius,material:'metal'});l.joints!.push({id:`${id}-chain`,kind:'rope',pointA:{x,y:anchorY},bodyB:id,pointB:{x:0,y:0},length:y-anchorY,stiffness:.75,damping:.15});}
export function mortiseRoom(l:Level,prefix:string,x:number,base:number,width:number,stories:number,foundation:string){
 const a=room(prefix,x,base,width,stories,'wood','wood');append(l,a);
 for(let row=0;row<stories;row++)for(const [side,key]of[[-1,'l'],[1,'r']] as const){const post=`${prefix}-${key}${row}`,floor=row?`${prefix}-roof${row-1}`:foundation,roof=`${prefix}-roof${row}`;
  const f=l.blocks.find(b=>b.id===floor)!;
  l.joints!.push({id:`${post}-foot`,kind:'hinge',bodyA:floor,pointA:{x:x+side*width/2-f.x,y:-f.h/2},bodyB:post,pointB:{x:0,y:48},length:0,stiffness:.5,damping:.15},{id:`${post}-cap`,kind:'hinge',bodyA:post,pointA:{x:0,y:-48},bodyB:roof,pointB:{x:side*width/2,y:9},length:0,stiffness:.5,damping:.15});
 }
}

/** Original designs. These are candidates until the strict promotion gates pass. */
export function siegeShowcases():Level[]{
 const out:Level[]=[];let l:Level;
 l=stage('countryside',33,'The Bowstring Kingdom','A triangulated bridge carries the crown stone and a hanging lower court. The glass deck is in both load paths.',3200);
 const bridge=bowstringBridge('kingdom',1450,850,1100,330);
 for(const b of bridge.terrain!){bridge.blocks.push({id:b.id,x:b.x,y:1023,w:90,h:334,material:'stone'},{id:`${b.id}-foot`,x:b.x,y:1220,w:90,h:60,material:'glass'});}
 bridge.terrain=[];
 bridge.joints!.filter(j=>j.bodyA?.includes('-bank-')).forEach(j=>j.pointA.y=-173);
 append(l,bridge);l.props!.push({id:'crown-stone',x:1450,y:460,kind:'boulder',radius:40,material:'stone'});
 for(const [id,x]of[['kingdom-arch-1',1415],['kingdom-arch-2',1485]] as const){const b=l.blocks.find(b=>b.id===id)!,dx=x-b.x,dy=520-b.y,c=Math.cos(b.angle||0),s=Math.sin(b.angle||0);l.joints!.push({id:`${id}-crown-bolt`,kind:'hinge',bodyA:id,pointA:{x:dx*c+dy*s,y:-dx*s+dy*c},bodyB:'kingdom-crown',pointB:{x:x-1450,y:10},length:0,stiffness:.75,damping:.15});}
 l.joints!.push({id:'crown-stone-seat',kind:'hinge',bodyA:'kingdom-crown',pointA:{x:0,y:-50},bodyB:'crown-stone',pointB:{x:0,y:0},length:0,stiffness:.75,damping:.15});
 l.blocks.push({id:'lower-court',x:1312.5,y:1050,w:220,h:22,material:'wood'});
 for(const side of [-1,1])l.joints!.push({id:`court-chain-${side}`,kind:'rope',bodyA:'kingdom-deck-1',pointA:{x:side*85,y:0},bodyB:'lower-court',pointB:{x:side*85,y:0},length:200,stiffness:.75,damping:.15});
 for(const [i,x]of[1260,1365].entries())l.monsters.push({id:`courtier-${i}`,x,y:1021,radius:18,kind:'blob'});
 l.joints!.forEach(j=>{j.stiffness=.75;j.damping=.15;if(j.kind==='hinge')j.breakForce=.08;});
 out.push(finish(l,['triangulated bowstring','shared load paths','crown ballast','suspended court']));

 l=stage('frozen',13,'The Sliding Citadel','The ice brake holds an armored sled on a frozen incline. Release it to sweep through the lower fortress.',3100);
 l.environment={groundFriction:.025};l.zones!.push({id:'citadel-ice',kind:'ice',x:1550,y:900,w:3000,h:800});
 const slope=.18,c=Math.cos(slope),s=Math.sin(slope),cx=1300-225*c+22*s,cy=800-225*s-22*c;
 l.terrain!.push({id:'ice-spillway',x:1300,y:800,w:800,h:32,angle:slope,material:'ice',friction:.01});
 const sled=triangularCabin('citadel-sled',0,0,300,210,'metal','wood');
 sled.blocks.find(b=>b.id==='citadel-sled-floor-tie')!.material='metal';
 for(const b of sled.blocks){const x=b.x,y=b.y;b.x=cx+x*c-y*s;b.y=cy+x*s+y*c;b.angle=(b.angle||0)+slope;}
 sled.monsters=[];sled.joints!.forEach(j=>{j.stiffness=.25;j.damping=.1;});append(l,sled);
 // A level cargo berth is physically bolted to the inclined chassis. It keeps
 // the passenger still before release while the complete sled remains dynamic.
 l.blocks.push({id:'citadel-sled-berth',x:cx,y:cy-32,w:90,h:16,material:'wood'});
 for(const side of[-1,1])l.joints!.push({id:`sled-berth-bolt-${side}`,kind:'hinge',bodyA:'citadel-sled-floor-tie',pointA:{x:side*32*c-32*s,y:-side*32*s-32*c},bodyB:'citadel-sled-berth',pointB:{x:side*32,y:0},length:0,stiffness:.25,damping:.1});
 l.monsters.push({id:'citadel-sled-resident',x:cx,y:cy-58,radius:18,kind:'horn'});
 const bx=-63,by=-62;l.blocks.push({id:'sled-stop',x:1300+bx*c-by*s,y:800+bx*s+by*c,w:36,h:92,angle:slope,material:'ice'});
 shelf(l,'brake-winch-base',800,1000,160,30,'ice');
 l.blocks.push({id:'brake-coupler',x:800,y:955,w:64,h:60,material:'ice'});
 for(const side of[-1,1]){
  l.joints!.push({id:`winch-bolt-${side}`,kind:'hinge',bodyA:'brake-winch-base',pointA:{x:side*20,y:-45},bodyB:'brake-coupler',pointB:{x:side*20,y:0},length:0,stiffness:.75,damping:.15});
  const gate=l.blocks.find(b=>b.id==='sled-stop')!,gx=gate.x-side*25*s,gy=gate.y+side*25*c;
  l.joints!.push({id:`winch-stay-${side}`,kind:'rope',bodyA:'brake-coupler',pointA:{x:side*20,y:0},bodyB:'sled-stop',pointB:{x:0,y:side*25},length:Math.hypot(gx-(800+side*20),gy-955),stiffness:.75,damping:.15});
 }
 append(l,room('lower-citadel',2080,1250,240,3,'ice','wood'));
 l.props!.push({id:'citadel-ballast',x:2080,y:850,kind:'boulder',radius:34,material:'stone'});
 // Top floor is 1250 - 2*114 - 105 = 917, top 908, ballast bottom 884: correct below.
 l.props![0].y=874;
 out.push(finish(l,['ice terrace','steel sled','sliding momentum','spillway','lower fortress']));

 l=stage('molten',13,'The Furnace Suspension','One valve powers two foundries. Stones swing their fasteners into heat; both hanging workshops fall into lava.',3400,1100);
 pin(l,'foundry-valve',720);shelf(l,'stone-launch-shelf',1040,560,220,24);
 l.props!.push({id:'foundry-breaching-stone',x:1060,y:508,kind:'boulder',radius:40,material:'stone'});
 l.mechanisms!.push({id:'foundry-pressure',kind:'vent',x:1070,y:500,w:180,h:160,force:.0008,speed:1,axis:'x',trigger:'foundry-valve'});
 shelf(l,'foundry-mast',1560,570,36,1060);shelf(l,'foundry-gallows',1375,260,370,28);
 l.blocks.push({id:'wooden-fastener',x:1200,y:500,w:40,h:80,material:'wood'},{id:'foundry-deck',x:1200,y:850,w:400,h:24,material:'wood'});
 l.joints!.push({id:'fastener-chain',kind:'rope',pointA:{x:1200,y:260},bodyB:'wooden-fastener',pointB:{x:0,y:0},length:240,stiffness:.75,damping:.15});
 for(const side of [-1,1])l.joints!.push({id:`foundry-stay-${side}`,kind:'rope',bodyA:'wooden-fastener',pointA:{x:0,y:40},bodyB:'foundry-deck',pointB:{x:side*160,y:0},length:Math.hypot(160,310),stiffness:.75,damping:.15});
 for(const [i,x]of[1030,1370].entries())l.monsters.push({id:`foundry-worker-${i}`,x,y:820,radius:18,kind:'horn'});
 mortiseRoom(l,'foundry-house',1200,838,220,2,'foundry-deck');
 l.zones!.push({id:'fastener-furnace',kind:'heat',x:1310,y:500,w:130,h:150,rate:80},{id:'foundry-lava',kind:'lava',x:1200,y:1075,w:600,h:50,rate:80});
 // The lower east workshop shares the real control valve, but has its own
 // pressure stone, load-bearing fastener and slower furnace. Failure is physical.
 const shift=1000,prefix='east-',copyId=(id:string|undefined)=>id?prefix+id:undefined;
 const eastBlocks=l.blocks.filter(b=>b.id!=='foundry-valve'&&!b.id.match(/foundry-house-(?:l1|r1|roof1)$/)).map(b=>({...b,id:prefix+b.id,x:b.x+shift}));
 const eastIds=new Set(eastBlocks.map(b=>b.id));
 l.joints!.push(...structuredClone(l.joints!).filter(j=>[j.bodyA,j.bodyB].every(id=>!id||eastIds.has(prefix+id))).map(j=>({...j,id:prefix+j.id,bodyA:copyId(j.bodyA),bodyB:copyId(j.bodyB),pointA:{...j.pointA,x:j.pointA.x+(j.bodyA?0:shift)},pointB:{...j.pointB,x:j.pointB.x+(j.bodyB?0:shift)}})));
 l.blocks.push(...eastBlocks);l.monsters.push(...structuredClone(l.monsters).filter(m=>m.id!=='foundry-house-m1').map(m=>({...m,id:prefix+m.id,x:m.x+shift})));
 l.terrain!.push(...structuredClone(l.terrain!).map(b=>({...b,id:prefix+b.id,x:b.x+shift})));l.props!.push(...structuredClone(l.props!).map(b=>({...b,id:prefix+b.id,x:b.x+shift})));
 l.mechanisms!.push(...structuredClone(l.mechanisms!).map(m=>({...m,id:prefix+m.id,x:m.x!+shift,force:.00065})));
 l.zones!.push(...structuredClone(l.zones!).map(z=>({...z,id:prefix+z.id,x:z.x+shift,rate:z.kind==='heat'?35:z.rate})));
 out.push(finish(l,['triggered vent','boulder impulse','swinging fastener','heat failure','suspended deck','lava landing']));

 l=stage('haunted',13,'The Bell Engine','Wake the iron arm. Two swinging bells pass its motion into the suspended music gallery.',3100,1250);
 pin(l,'bell-switch',780);
 l.blocks.push({id:'bell-engine',x:1300,y:650,w:330,h:24,angle:-Math.PI/2,material:'metal'});
 l.joints!.push({id:'engine-axle',kind:'hinge',pointA:{x:1300,y:650},bodyB:'bell-engine',pointB:{x:0,y:0},length:0,stiffness:.75,damping:.15});
 l.mechanisms!.push({id:'bell-motor',kind:'motor',body:'bell-engine',speed:2.4,trigger:'bell-switch'});
 shelf(l,'belfry-mast',2310,775,40,950);shelf(l,'belfry-crossarm',1890,300,880,28);
 bell(l,'first-bell',1470,650,300);bell(l,'second-bell',1710,610,300);
 l.blocks.push({id:'music-gallery',x:1940,y:600,w:260,h:22,material:'glass'});
 for(const side of [-1,1])l.joints!.push({id:`gallery-stay-${side}`,kind:'rope',pointA:{x:1940+side*100,y:300},bodyB:'music-gallery',pointB:{x:side*100,y:0},length:300,stiffness:.75,damping:.15});
 append(l,room('music-house',1940,589,180,2,'wood','glass'));
 append(l,triangularCabin('crypt-chapel',1940,1244,300,190,'wood','glass'));
 out.push(finish(l,['triggered motor','metal pendulums','collision relay','suspended gallery','chapel']));

 l=stage('orbital',13,'Twin Moon Foundry','Two curved surfaces, two gravity wells. Release the asteroid to sweep the near-moon outpost, then curve into the far colony.',3400,1550);
 l.environment={gravity:{x:0,y:0},ground:false};l.sling={x:235,y:650};
 for(const [i,x,y,radius,strength]of[[0,1250,850,160,.9],[1,2500,800,190,1.1]]){
  const id=`foundry-moon-${i}`;l.props!.push({id,x,y,radius,kind:'planetoid',material:'stone',static:true});
  l.zones!.push({id:`${id}-well`,kind:'gravity',x,y,w:1200,h:1200,center:{x,y},radius:600,strength});
  for(const [j,theta]of[-Math.PI/2,-Math.PI/2+.65,-Math.PI/2-.65].entries()){
   const alpha=theta+Math.PI/2,c=Math.cos(alpha),s=Math.sin(alpha),cx=x+Math.cos(theta)*(radius+6),cy=y+Math.sin(theta)*(radius+6),prefix=`moon-${i}-habitat-${j}`;
   const a=triangularCabin(prefix,0,0,100,95,'glass','wood');
   for(const b of a.blocks){const xx=b.x,yy=b.y;b.x=cx+xx*c-yy*s;b.y=cy+xx*s+yy*c;b.angle=(b.angle||0)+alpha;}
   for(const m of a.monsters){const xx=m.x,yy=m.y;m.x=cx+xx*c-yy*s;m.y=cy+xx*s+yy*c;m.id=`moon-${i}-resident-${j}`;}
   if(j===1)a.monsters=[]; // The outer greenhouse is cargo and bracing, not another excavation target.
   a.joints!.forEach(j=>{j.stiffness=.75;j.damping=.15;j.breakForce=.003;});append(l,a);
   // Both foundations are braced by the destructible cargo clamp. The actual
   // moon carries their inward load; losing the stays lets the tall habitats
   // overturn on the curved surface as the released asteroid arrives.
   for(const side of [-1,1]){const ax=x+side*55,ay=y-radius-140,bx=cx+side*20*c,by=cy+side*20*s;l.joints!.push({id:`${prefix}-clamp-stay-${side}`,kind:'hinge',bodyA:`moon-${i}-coupler`,pointA:{x:side*55,y:0},bodyB:`${prefix}-floor-tie`,pointB:{x:side*20,y:0},length:Math.hypot(bx-ax,by-ay),stiffness:.75,damping:.15});}
  }
  const cap=`moon-${i}-coupler`;
  l.blocks.push({id:cap,x,y:y-radius-140,w:130,h:18,material:'glass'});
  l.joints!.push({id:`${cap}-seat`,kind:'hinge',pointA:{x,y:y-radius-140},bodyB:cap,pointB:{x:0,y:0},length:0,stiffness:.75,damping:.15});
  l.joints!.push({id:`${cap}-orientation`,kind:'hinge',pointA:{x:x+45,y:y-radius-140},bodyB:cap,pointB:{x:45,y:0},length:0,stiffness:.75,damping:.15});
  l.props!.push({id:`moon-${i}-asteroid`,x,y:y-radius-200,kind:'boulder',radius:50,material:'stone'});
  l.joints!.push({id:`${cap}-cargo`,kind:'rope',bodyA:cap,pointA:{x:0,y:0},bodyB:`moon-${i}-asteroid`,pointB:{x:0,y:0},length:60,stiffness:.75,damping:.15});
 }
 l.projectiles=['duck','bear','rabbit','duck','bear','rabbit','duck','sheep'];
 out.push(finish(l,['zero-gravity transit','two radial wells','curved target surfaces','breakable asteroid clamps','gravity-assisted debris']));
 return out;
}

/** Two distinct experiments precede each new world benchmark. */
export function siegeLessons():Level[]{
 const out:Level[]=[];let l:Level;
 l=stage('countryside',31,'The Tension Twins','A tall gable and a broad pavilion hold their shape with fragile floor ties.',2000,900);
 append(l,triangularCabin('gable',950,894,200,170));append(l,triangularCabin('pavilion',1330,894,340,110));
 l.joints!.forEach(j=>{j.stiffness=.25;j.damping=.1;});
 l.projectiles=['duck','bear','rabbit','sheep'];out.push(finish(l,['triangular frames','tension members','asymmetric silhouettes']));
 l=stage('countryside',32,'Coupler Crossing','The deck hangs from glass couplers on real pylons. Release a bank or breach the deck.',2400,1100);
 append(l,cableViaduct('crossing',1350,730,1100,700,3));l.joints!.forEach(j=>{j.stiffness=.55;j.damping=.35;});out.push(finish(l,['cable-stayed bridge','destructible couplers','linked decks']));

 l=stage('frozen',11,'Brake Check','A steel sled rests above an ice spillway. Push it through the ice brake into the lower chapel.',2400,1050);
 l.environment={groundFriction:.025};l.zones!.push({id:'brake-ice',kind:'ice',x:1200,y:800,w:2300,h:600});
 shelf(l,'brake-terrace',1000,680,550,30,'ice');l.blocks.push({id:'steel-sled',x:1000,y:654,w:240,h:22,material:'metal'},{id:'ice-brake',x:1140,y:635,w:22,h:60,material:'ice'});l.monsters.push({id:'sled-rider',x:1000,y:625,radius:18,kind:'blob'});
 l.terrain!.push({id:'brake-chute',x:1440,y:850,w:500,h:24,angle:.6,material:'ice',friction:.01});append(l,triangularCabin('brake-chapel',1800,1044,200,150));
 out.push(finish(l,['low friction','steel momentum','ice brake','elevated spillway']));
 l=stage('frozen',12,'Keelhaul Creek','Brittle deck members are woven into a timber bowstring. Break a load path and let the ice skate.',2350,1100);
 const keel=bowstringBridge('keel',1250,914,620,210);keel.blocks.filter(b=>b.id.includes('deck-')||b.id.includes('hanger-2')).forEach(b=>b.material='ice');keel.joints!.forEach(j=>{j.stiffness=.75;j.damping=.15;});append(l,keel);
 l.environment={groundFriction:.025};l.zones!.push({id:'creek-ice',kind:'ice',x:1175,y:950,w:2250,h:400});out.push(finish(l,['brittle ice deck','triangulated timber','sliding fragments']));

 l=stage('molten',11,'The Warm Hinge','Push the hanging wooden fastener into the heat. Its two stays carry a platform above lava.',2300,1100);
 shelf(l,'warm-mast',1450,690,36,820);shelf(l,'warm-crossarm',1250,280,400,28);
 l.blocks.push({id:'warm-fastener',x:1100,y:520,w:40,h:90,material:'wood'},{id:'warm-deck',x:1100,y:850,w:280,h:22,material:'wood'});
 l.joints!.push({id:'warm-chain',kind:'rope',pointA:{x:1100,y:280},bodyB:'warm-fastener',pointB:{x:0,y:0},length:240,stiffness:.75,damping:.15});
 for(const side of [-1,1])l.joints!.push({id:`warm-stay-${side}`,kind:'rope',bodyA:'warm-fastener',pointA:{x:0,y:45},bodyB:'warm-deck',pointB:{x:side*110,y:0},length:Math.hypot(110,285),stiffness:.75,damping:.15});
 for(const [i,x]of[1040,1160].entries())l.monsters.push({id:`warm-guest-${i}`,x,y:821,radius:18,kind:'horn'});
 l.zones!.push({id:'warm-furnace',kind:'heat',x:1210,y:520,w:110,h:180,rate:55},{id:'warm-lava',kind:'lava',x:1100,y:1075,w:450,h:50,rate:80});out.push(finish(l,['swing into heat','wood failure','suspended load','lava']));
 l=stage('molten',12,'Updraft Keep','Ride the updraft to the high timber roof. Falling debris has a second courtyard below.',2500,1250);
 shelf(l,'updraft-perch',1280,700,390,24);append(l,triangularCabin('perch',1280,682,280,180));
 append(l,corbelArch('lower-kiln',1810,1250,'wood'));
 l.mechanisms!.push({id:'updraft-lift',kind:'vent',x:850,y:920,w:200,h:600,force:.0028,speed:-1,axis:'y'});
 l.zones!.push({id:'lower-kiln-heat',kind:'heat',x:1620,y:1110,w:110,h:260,rate:12});out.push(finish(l,['updraft trajectories','elevated terrain','falling timber','warm landing']));

 l=stage('haunted',11,'Return to Sender','Strike the first bell. The second can breach the music balcony, which hangs above the chapel.',2550,1050);
 shelf(l,'sender-mast',1900,675,36,750);shelf(l,'sender-crossarm',1450,300,900,28);
 bell(l,'sender-first',1020,650,300,40);bell(l,'sender-second',1280,610,300,40);
 l.blocks.push({id:'sender-gallery',x:1530,y:600,w:260,h:22,material:'glass'});
 for(const side of [-1,1])l.joints!.push({id:`sender-stay-${side}`,kind:'rope',pointA:{x:1530+side*100,y:300},bodyB:'sender-gallery',pointB:{x:side*100,y:0},length:300,stiffness:.75,damping:.15});
 append(l,room('sender-house',1530,589,180,1,'wood','wood'));append(l,triangularCabin('sender-chapel',1530,1044,260,180));out.push(finish(l,['direct pendulum relay','hanging chamber','chapel below']));
 l=stage('haunted',12,'The Long Trapdoor','A heavy drawbridge is bolted to the left tower. The glass prop keeps its far end above the crypt.',2450,1100);
 shelf(l,'trap-mast',1035,900,30,400);l.blocks.push({id:'trap-deck',x:1290,y:700,w:480,h:24,material:'metal'},{id:'trap-prop',x:1490,y:906,w:32,h:388,material:'glass'});
 l.joints!.push({id:'trap-hinge',kind:'hinge',pointA:{x:1050,y:700},bodyB:'trap-deck',pointB:{x:-240,y:0},length:0,stiffness:.75,damping:.15});
 l.monsters.push({id:'trap-rider',x:1270,y:670,radius:18,kind:'bat'},{id:'trap-keeper',x:1350,y:1082,radius:18,kind:'blob'});out.push(finish(l,['hinged drawbridge','fragile prop','heavy rotating mass','two elevations']));

 l=stage('orbital',11,'Crater Neighbors','The moon pulls loose cargo inward. Break a clamp or skim its curved surface.',2350,1250);
 l.environment={gravity:{x:0,y:0},ground:false};l.sling={x:235,y:600};
 l.props!.push({id:'crater',x:1280,y:760,kind:'planetoid',radius:170,material:'stone',static:true},{id:'crater-cargo',x:1280,y:350,kind:'boulder',radius:42,material:'stone'});
 l.zones!.push({id:'crater-well',kind:'gravity',x:1280,y:760,w:1200,h:1200,center:{x:1280,y:760},radius:600,strength:.9});
 l.blocks.push({id:'crater-clamp',x:1280,y:420,w:130,h:18,material:'glass'});l.joints!.push({id:'crater-seat',kind:'hinge',pointA:{x:1280,y:420},bodyB:'crater-clamp',pointB:{x:0,y:0},length:0,stiffness:.75,damping:.15},{id:'crater-cargo-stay',kind:'rope',bodyA:'crater-clamp',pointA:{x:0,y:0},bodyB:'crater-cargo',pointB:{x:0,y:0},length:70,stiffness:.75,damping:.15});
 for(const [i,a]of[-Math.PI/2,-Math.PI/2-.8,-Math.PI/2+.8].entries())l.monsters.push({id:`crater-resident-${i}`,x:1280+Math.cos(a)*188,y:760+Math.sin(a)*188,radius:18,kind:'blob'});out.push(finish(l,['radial surface','released asteroid','gravity-assisted impact']));
 l=stage('orbital',12,'Sideways Society','Gravity points into the right-hand cliff. Break the outer ribs and let the walls fall sideways.',2500,1250);
 l.environment={gravity:{x:1,y:0},ground:false};l.sling={x:235,y:650};shelf(l,'society-cliff',1670,700,40,1000);
 const a=room('sideways',0,0,200,3,'glass','wood');
 for(const b of a.blocks){const x=b.x,y=b.y;b.x=1650+y;b.y=700-x;b.angle=-Math.PI/2;}
 for(const m of a.monsters){const x=m.x,y=m.y;m.x=1650+y;m.y=700-x;}
 append(l,a);out.push(finish(l,['sideways gravity','rotated load paths','wall-bound colony']));
 return out.map(l=>{l.metadata!.category='siege';return l;});
}
