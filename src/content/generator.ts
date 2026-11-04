import type { Level, MaterialKind, BlockDef } from '../game/types';
import { append, room, corbelArch, suspension, counterweight, trestleBridge, arcade } from './templates';
import {reviseLevel} from './revisions';
import {siegeLessons,siegeShowcases} from './siege-design';
import {annotateDesign} from './design-notes';

type Category='puzzle'|'siege'|'spectacle';
function level(world:string,n:number,name:string,idea:string,category:Category='puzzle',width=1700,ground=675):Level {
 const l:Level={version:1,id:`${world==='countryside'?'meadow':world}-${String(n).padStart(2,'0')}`,world,name,subtitle:idea,bounds:{width,height:ground+135,ground},sling:{x:235,y:ground-145},projectiles:['sheep','duck','bear','rabbit'],blocks:[],monsters:[],hazards:[],terrain:[],props:[],joints:[],mechanisms:[],zones:[],thresholds:[5000,10000,15000],par:2,camera:{start:width>1800?'overview':'sling'},metadata:{category,idea,mechanics:[],author:'Plush Siege production pass 4'}};
 if(world==='frozen'){l.environment={groundFriction:.035};l.zones!.push({id:'frozen-surface',kind:'ice',x:width/2,y:ground-90,w:width,h:200});}
 if(world==='orbital')l.environment={gravity:{x:0,y:.22},groundFriction:.3};
 return l;
}
function addRoom(l:Level,id:string,x:number,stories=1,post:MaterialKind='wood',roof:MaterialKind='wood',base=l.bounds.ground,width=120){const a=room(id,x,base,stories>=4?Math.max(160,width):width,stories,post,roof);if(stories>=4)a.blocks.filter(b=>!b.id.includes('roof')).forEach(b=>b.w=36);append(l,a);}
function tnt(l:Level,id:string,x:number,y=l.bounds.ground-20){l.hazards.push({id,x,y,kind:'tnt'});}
function finish(l:Level,mechanics:string[],ammo?:Level['projectiles']):Level {
 l.metadata!.mechanics=mechanics;if(ammo)l.projectiles=ammo;
 // Powder belongs in clear ground gaps, never embedded inside a support/target.
 const occupied=(x:number)=>[...l.blocks,...(l.terrain||[])].some(b=>Math.abs(b.x-x)<b.w/2+20.7&&Math.abs(b.y-(l.bounds.ground-20))<b.h/2+20.7)||l.monsters.some(m=>Math.abs(m.x-x)<(m.radius||18)+20.7&&Math.abs(m.y-(l.bounds.ground-20))<(m.radius||18)+20.7);
 for(const hazard of l.hazards){if(!occupied(hazard.x))continue;const original=hazard.x;const clear=[-35,35,-65,65,-95,95,-125,125].map(offset=>original+offset).find(x=>!occupied(x)&&!l.hazards.some(h=>h!==hazard&&Math.abs(h.x-x)<41));if(clear!==undefined)hazard.x=clear;}

 const targets=l.monsters.length*5000,bonus=Math.max(0,l.projectiles.length-(l.par||2))*3000;
 l.thresholds=[targets,targets+Math.max(500,bonus/2),targets+Math.max(1000,bonus)];return l;
}
function shelf(l:Level,id:string,x:number,y:number,w:number,h=24,material:MaterialKind='stone'){l.terrain!.push({id,x,y,w,h,material});}
function moving(l:Level,id:string,x:number,y:number,w:number,range=100,speed=.12){l.blocks.push({id,x,y,w,h:22,material:'metal',static:true});l.mechanisms!.push({id:`${id}-drive`,kind:'platform',body:id,range,speed,axis:'x'});l.monsters.push({id:`${id}-rider`,x,y:y-29,radius:18,kind:'bat'});}
function rotor(l:Level,id:string,x:number,y:number,trigger?:string){l.blocks.push({id,x,y,w:330,h:22,angle:-Math.PI/2,material:'metal'});l.joints!.push({id:`${id}-axle`,kind:'hinge',pointA:{x,y},bodyB:id,pointB:{x:0,y:0},length:0,stiffness:1});l.mechanisms!.push({id:`${id}-motor`,kind:'motor',body:id,speed:1.8,trigger});}
function pin(l:Level,id:string,x:number){l.blocks.push({id,x,y:l.bounds.ground-45,w:20,h:90,material:'glass'});}
function planetoid(l:Level,id:string,x:number,y:number,radius:number,strength=.48){l.props!.push({id,x,y,kind:'planetoid',radius,material:'stone',static:true});l.zones!.push({id:`${id}-gravity`,kind:'gravity',x,y,w:radius*5,h:radius*5,center:{x,y},radius:radius*2.5,strength});}
function rollingRamp(l:Level,id:string,x:number,base:number){
 const y=base-250;
 shelf(l,`${id}-ledge`,x,y,160,22);l.props!.push({id:`${id}-ball`,kind:'boulder',x:x-10,y:y-51,radius:40,material:'stone'});
 l.terrain!.push({id:`${id}-ramp`,x:x+235,y:y+45,w:360,h:22,angle:.28,material:'stone',friction:.025});
 l.blocks.push({id:`${id}-stop`,x:x+46,y:y-40,w:22,h:58,material:'glass'});
}
/** Curated production candidates. Each composition has an explicit structural idea;
 * generating a candidate never automatically accepts it into the shipped campaign. */
export function produceCandidates():Level[]{
 const out:Level[]=[];let l:Level;
 // Meadow additions finish the introductory world with a much larger structural vocabulary.
 l=level('countryside',25,'The Tollbooth','Shoot the glass trestle, then let the bridge carry the trouble.', 'siege',2200,900);append(l,trestleBridge('toll',1050,900,600));addRoom(l,'gate',1530,2,'wood','stone');tnt(l,'toll-powder',1320);out.push(finish(l,['bridge','glass weak point','falling roof'],['duck','bear','sheep','rabbit']));
 l=level('countryside',26,'Swinging Lunch','A cable-linked picnic walkway has three very nervous guests.','puzzle',1900,800);append(l,suspension('picnic',1110,590,3));out.push(finish(l,['ropes','breakable joints','suspended platform'],['sheep','duck','bear','rabbit']));
 l=level('countryside',27,'An Unbalanced Friendship','The heavy end is held up by one small glass foot.','puzzle',1900,850);append(l,counterweight('balance',1040,850));addRoom(l,'neighbor',1420,1,'glass','wood');tnt(l,'balance-blast',1290);out.push(finish(l,['counterweight','hinge','weak support'],['bear','sheep','duck','rabbit']));
 l=level('countryside',28,'Stone Delivery','Give the parked stone a push. The hillside will do the rest.','siege',2500,1050);rollingRamp(l,'delivery',850,1050);addRoom(l,'postal',1400,2,'glass','wood');addRoom(l,'sorting',1710,1,'wood','glass');tnt(l,'delivery-charge',1550);out.push(finish(l,['rolling boulder','ramp','chain reaction'],['duck','bear','duck','rabbit','sheep']));
 l=level('countryside',29,'The Crooked Aqueduct','A corbelled arch protects the courtyard. The upper storey is less confident.','siege',2450,1100);append(l,corbelArch('aqueduct',1080,1100));addRoom(l,'left',790,3,'wood','glass');addRoom(l,'right',1420,3,'glass','wood');shelf(l,'back-wall',1750,1000,80,200);out.push(finish(l,['arch','multi-story','material choice'],['bear','duck','rabbit','bear','sheep']));
 // The connected finale composition is authored in refine(), below.
 out.push(level('countryside',30,'The Meadow Machine','World finale.','spectacle'));
 // Frozen Folly: sliding, brittle load paths, and momentum rather than recolored grass.
 l=level('frozen',1,'Skate Expectations','The ice under this little fort is the real weak point.');addRoom(l,'skate',900,1,'ice','wood');out.push(finish(l,['ice','sliding'],['sheep','duck','bear']));
 l=level('frozen',2,'The Glass Lake','A broad ice roof spreads its weight over three brittle columns.','puzzle',1900,800);append(l,trestleBridge('lake',1090,800,560));l.blocks.forEach(b=>b.material=b.id.includes('deck')?'ice':'wood');out.push(finish(l,['ice bridge','sliding roof'],['bear','duck','sheep','rabbit']));
 l=level('frozen',3,'Curling Club','A stone on a slick runway is a remarkably impolite greeting.');l.props!.push({id:'curling-stone',kind:'boulder',x:800,y:637,radius:38,material:'stone'});addRoom(l,'pins',1170,1,'ice','wood');out.push(finish(l,['rolling boulder','frozen floor'],['duck','bear','duck','sheep']));
 l=level('frozen',4,'Frostbite Ferry','Catch the moving ferry, or drop the dock onto its route.','siege',2200,900);moving(l,'ferry',1040,710,240,110,.1);addRoom(l,'dock',1480,2,'ice','wood');out.push(finish(l,['moving platform','timing','ice'],['duck','rabbit','bear','sheep','duck']));
 l=level('frozen',5,'Icicle Express','Break an ice deck and the hanging walkway becomes an avalanche.','puzzle',1950,850);append(l,suspension('icicle',1120,630,3,'ice'));out.push(finish(l,['breakable cables','ice fracture'],['sheep','bear','duck','rabbit']));
 l=level('frozen',6,'Bank Shot Bay','A sloping bank offers a second route past the steel shield.','siege',2350,950);addRoom(l,'bay',1290,2,'ice','wood');shelf(l,'shield',1040,820,28,260,'metal');l.terrain!.push({id:'bank',x:840,y:895,w:260,h:24,angle:-.25,material:'ice',friction:.01});out.push(finish(l,['ramp','metal protection','lob route'],['duck','bear','rabbit','duck','sheep']));
 l=level('frozen',7,'Cold Storage','A durable lid, slippery feet, and an inconveniently heavy tenant.','siege',2300,1050);addRoom(l,'freezer',1080,3,'ice','metal');addRoom(l,'delivery',1490,2,'wood','ice');out.push(finish(l,['metal roof','ice supports','multi-story'],['bear','bear','duck','rabbit','sheep']));
 l=level('frozen',8,'Avalanche Avenue','The parked boulder is the start of a very long delivery route.','spectacle',3100,1150);rollingRamp(l,'avalanche',860,1150);addRoom(l,'a',1390,3,'ice','wood');addRoom(l,'b',1810,2,'ice','glass');addRoom(l,'c',2210,2,'wood','ice');for(let i=0;i<6;i++)tnt(l,`avalanche-relay${i}`,1250+i*185);l.par=3;out.push(finish(l,['boulder','ramp','ice cascade','explosive relay'],['duck','bear','duck','rabbit','bear','sheep']));
 l=level('frozen',9,'The Long Slide','Two tall storage stacks share one very slippery landing.','siege',2600,1200);addRoom(l,'slider',1120,4,'ice','wood');addRoom(l,'receiver',1670,3,'wood','ice');shelf(l,'raised-lake',1390,1177,1250,46,'ice');l.blocks.forEach(b=>b.y-=46);l.monsters.forEach(m=>m.y-=46);out.push(finish(l,['ice momentum','tall towers','shared terrain'],['bear','duck','rabbit','bear','duck']));
 // The connected finale composition is authored in refine(), below.
 out.push(level('frozen',10,'Glacier Opera','World finale.','spectacle'));
 // Molten Mayhem: safe terrain with readable heat/lava regions and triggered physical vents.
 l=level('molten',1,'Toast of the Town','Knock the wooden roof into the heat band before it reaches the courtyard.');addRoom(l,'toast',980,2,'wood','wood');l.zones!.push({id:'heat-band',kind:'heat',x:1125,y:560,w:90,h:220,rate:5});out.push(finish(l,['heat-sensitive wood'],['sheep','duck','bear','rabbit']));
 l=level('molten',2,'Mind the Gap','The lava is below the ledge. The tenants prefer to stay above it.','puzzle',1900,900);shelf(l,'lava-shelf',1090,750,450,26);addRoom(l,'ledge',1090,1,'glass','wood',737);l.zones!.push({id:'lava-pool',kind:'lava',x:1100,y:872,w:600,h:54,rate:70});out.push(finish(l,['lava','raised terrain','falling targets'],['duck','sheep','bear','rabbit']));
 l=level('molten',3,'Pressure Problems','Break the glass control post to wake the pressure vent.');pin(l,'valve',800);l.props!.push({id:'pressure-ball',kind:'boulder',x:1040,y:635,radius:40,material:'stone'});l.mechanisms!.push({id:'pressure-vent',kind:'vent',x:1040,y:570,w:120,h:210,force:.006,speed:1,axis:'x',trigger:'valve'});addRoom(l,'chimney',1210,2,'wood','glass',663);l.props![0].y-=12;l.terrain!.push({id:'pressure-runway',x:1150,y:675,w:500,h:24,material:'metal',friction:.02});out.push(finish(l,['trigger','vent','boulder'],['duck','bear','rabbit','sheep']));
 l=level('molten',4,'Hot Potato','A suspended powder crate has a warm landing waiting for it.','puzzle',1950,900);append(l,suspension('potato',1090,680,3));l.zones!.push({id:'kiln',kind:'heat',x:1090,y:835,w:440,h:120,rate:14});tnt(l,'potato-charge',1090,651); // moved below after construction: a powder barrel replaces the middle rider's space
 l.hazards=[];tnt(l,'potato-charge',1310,880);out.push(finish(l,['suspended platforms','heat','explosive'],['bear','duck','rabbit','sheep']));
 l=level('molten',5,'Basalt Bathtub','The stone shell is safe. Its wooden floor supports are less fortunate.','siege',2250,1000);append(l,corbelArch('basalt',1120,1000));addRoom(l,'boiler',1120,2,'wood','stone',816,120);l.zones!.push({id:'hot-wall',kind:'heat',x:1390,y:860,w:120,h:260,rate:7});out.push(finish(l,['arch','mixed materials','heat'],['bear','duck','bear','rabbit','sheep']));
 l=level('molten',6,'Chimney Sweep','Updrafts carry a launched stuffie into the upper floors.','siege',2500,1450);addRoom(l,'chimney',1210,4,'wood','stone');l.mechanisms!.push({id:'chimney-draft',kind:'vent',x:820,y:1010,w:180,h:700,force:.0028,speed:-1,axis:'y'});out.push(finish(l,['tall fortress','vent flight','vertical inspection'],['duck','bear','rabbit','duck','bear','sheep']));
 l=level('molten',7,'Double Boiler','One control post releases two pressure columns.','siege',2650,1100);pin(l,'master-valve',780);for(const[x,i]of[[1100,0],[1550,1]] as const){l.props!.push({id:`boiler-ball${i}`,kind:'boulder',x,y:1062,radius:38,material:'stone'});l.mechanisms!.push({id:`boiler-vent${i}`,kind:'vent',x,y:1000,w:130,h:200,force:.006,speed:1,axis:'x',trigger:'master-valve'});addRoom(l,`boiler-fort${i}`,x+170,2,'glass','wood',1088);l.props![l.props!.length-1].y-=12;l.terrain!.push({id:`boiler-runway${i}`,x:x+100,y:1100,w:400,h:24,material:'metal',friction:.02});}out.push(finish(l,['triggered twin vents','boulders'],['duck','bear','rabbit','duck','sheep']));
 l=level('molten',8,'The Red Carpet','A line of powder hugs the lava rim beneath two gatehouses.','spectacle',3100,1200);addRoom(l,'red-gate',1070,3,'wood','stone');addRoom(l,'red-palace',1980,4,'glass','wood');l.zones!.push({id:'lava-rim',kind:'lava',x:1590,y:1185,w:330,h:25,rate:80});for(let i=0;i<7;i++)tnt(l,`red-relay${i}`,1200+i*180);l.hazards=l.hazards.filter(h=>h.x<1400||h.x>1800);l.par=3;out.push(finish(l,['powder relay','lava rim','protected fortresses'],['duck','bear','rabbit','duck','bear','sheep']));
 l=level('molten',9,'Magma Machine','The glass switch starts an iron hammer. Keep clear of the swing.','siege',2650,1100);pin(l,'hammer-switch',800);rotor(l,'hammer',1140,900,'hammer-switch');l.mechanisms![0].speed=3;addRoom(l,'hammer-house',1340,2,'wood','glass');tnt(l,'hammer-powder',1320);out.push(finish(l,['trigger','motor','rotating hammer'],['duck','bear','rabbit','sheep','bear']));
 // The connected finale composition is authored in refine(), below.
 out.push(level('molten',10,'Volcano Orchestra','World finale.','spectacle'));
 // Haunted Hooligans: real cables, hinges and driven physical machinery.
 l=level('haunted',1,'Swing Vote','A chandelier is only as dependable as its cables.','puzzle',1900,800);append(l,suspension('chandelier',1100,580,3));out.push(finish(l,['suspended platforms','ropes'],['sheep','duck','bear','rabbit']));
 l=level('haunted',2,'The Pendulum Room','Strike the hanging stone into the residents of the lower gallery.','puzzle',1900,850);l.props!.push({id:'pendulum',kind:'boulder',x:1050,y:610,radius:42,material:'stone'});l.joints!.push({id:'pendulum-chain',kind:'rope',pointA:{x:1050,y:340},bodyB:'pendulum',pointB:{x:0,y:0},length:270,stiffness:.9,damping:.03,breakForce:.1});addRoom(l,'gallery',1240,1,'glass','wood');out.push(finish(l,['pendulum','chain','secondary impact'],['duck','bear','sheep','rabbit']));
 l=level('haunted',3,'Graveyard Shift','The night watch travels on a very real moving platform.','puzzle',2050,850);moving(l,'night-lift',1120,650,220,130,.1);addRoom(l,'clocktower',1500,2,'wood','glass');out.push(finish(l,['moving platform','timing'],['duck','rabbit','bear','sheep']));
 l=level('haunted',4,'A Creak in the Floor','The trapdoor has one hinge and a surprisingly fragile prop.','siege',2250,1000);append(l,counterweight('trapdoor',1100,1000));addRoom(l,'crypt',1500,1,'glass','stone');out.push(finish(l,['hinge','counterweight','trapdoor'],['bear','duck','rabbit','sheep','bear']));
 l=level('haunted',5,'The Crooked Manor','The tall wing, the low wing, and the glass veranda share their weight.','siege',2450,1150);addRoom(l,'west-wing',940,4,'wood','glass');addRoom(l,'east-wing',1460,2,'glass','stone');append(l,suspension('veranda',1200,880,3,'glass'));out.push(finish(l,['asymmetric manor','suspended veranda','multiple approaches'],['bear','duck','rabbit','bear','sheep']));
 l=level('haunted',6,'Possessed Carousel','Break the switch post and the carousel starts sweeping the hall.','puzzle',2250,950);pin(l,'carousel-switch',780);rotor(l,'carousel',1130,735,'carousel-switch');addRoom(l,'hall',1330,2,'glass','wood');out.push(finish(l,['triggered rotating structure','hinge'],['duck','bear','rabbit','sheep']));
 l=level('haunted',7,'Chain Letter','Three cable-linked balconies pass a collision along the house.','siege',2700,1150);append(l,suspension('letter',1220,860,5));addRoom(l,'mailroom',1750,2,'glass','wood');out.push(finish(l,['chains','linked suspension','multi-stage collapse'],['duck','bear','rabbit','duck','sheep']));
 l=level('haunted',8,'Spooky Action','A pale gravity pocket changes how the falling roof reaches the courtyard.','siege',2500,1050);addRoom(l,'spooky',1120,3,'glass','stone');addRoom(l,'neighbor',1540,1,'wood','glass');l.zones!.push({id:'ghost-pocket',kind:'zero-gravity',x:1350,y:840,w:160,h:320});out.push(finish(l,['zero-gravity pocket','falling masonry'],['duck','bear','rabbit','bear','sheep']));
 l=level('haunted',9,'Midnight Bells','A row of hanging bells stands between two very unlucky towers.','spectacle',3300,1300);for(let i=0;i<4;i++){l.props!.push({id:`bell${i}`,kind:'boulder',x:1020+i*280,y:970,radius:38,material:'metal'});l.joints!.push({id:`bell-chain${i}`,kind:'rope',pointA:{x:1020+i*280,y:700},bodyB:`bell${i}`,pointB:{x:0,y:0},length:270,breakForce:.1,stiffness:.9,damping:.04});}addRoom(l,'bell-west',810,3,'glass','wood');addRoom(l,'bell-east',2270,4,'wood','glass');for(let i=0;i<6;i++)tnt(l,`bell-relay${i}`,1100+i*180);l.par=3;out.push(finish(l,['chains','metal pendulums','powder relay'],['duck','bear','rabbit','duck','bear','sheep']));
 // The connected finale composition is authored in refine(), below.
 out.push(level('haunted',10,'The House That Fell','World finale.','spectacle'));
 // Orbital Oddities: low gravity is taught first, then localized fields and real planetoids.
 l=level('orbital',1,'A Little Less Gravity','A gentler pull of gravity means a much longer flight.','puzzle',2050,800);addRoom(l,'moon-base',1260,2,'glass','wood');out.push(finish(l,['low gravity','long flight'],['sheep','duck','bear','rabbit']));
 l=level('orbital',2,'Moon Bounce','The little moon bends a flight before it reaches the colony.','puzzle',2300,1000);planetoid(l,'moon',1080,650,110,.42);addRoom(l,'colony',1580,2,'glass','wood');out.push(finish(l,['planetoid','localized gravity'],['duck','sheep','rabbit','bear']));
 l=level('orbital',3,'Two Small Worlds','Two gravity wells offer two quite different approaches.','siege',3000,1150);planetoid(l,'near-moon',1000,820,125,.4);planetoid(l,'far-moon',1900,700,145,.5);addRoom(l,'outpost-a',1390,2,'glass','wood');addRoom(l,'outpost-b',2400,2,'wood','glass');out.push(finish(l,['two planetoids','curved trajectories','multi-target'],['duck','rabbit','bear','duck','sheep']));
 l=level('orbital',4,'The Long Way Home','A zero-gravity corridor carries momentum toward a distant fort.','siege',3200,1100);l.zones!.push({id:'silent-corridor',kind:'zero-gravity',x:1340,y:700,w:1260,h:650});addRoom(l,'home',2320,3,'glass','wood');out.push(finish(l,['zero gravity','momentum corridor'],['duck','rabbit','bear','duck','sheep']));
 l=level('orbital',5,'Satellite Dish','The communications deck hangs from a small moon.','puzzle',2400,1100);planetoid(l,'dish-moon',1100,440,100,.4);append(l,suspension('dish',1480,820,3,'metal'));out.push(finish(l,['satellite','cables','localized gravity'],['duck','bear','rabbit','sheep']));
 l=level('orbital',6,'Debris Belt','A loose belt of glass, timber and powder separates two orbital stations.','siege',3100,1200);addRoom(l,'station-a',1100,3,'glass','metal');addRoom(l,'station-b',2190,3,'wood','glass');for(let i=0;i<6;i++)tnt(l,`debris-powder${i}`,1320+i*180);l.zones!.push({id:'belt-float',kind:'gravity',x:1630,y:1000,w:1000,h:350,gravity:{x:0,y:.08}});out.push(finish(l,['low gravity debris','relay','metal station'],['duck','rabbit','bear','duck','sheep']));
 l=level('orbital',7,'Gravity Staircase','A light-gravity shelf and a stronger landing zone reward a careful arc.','siege',2900,1200);shelf(l,'step-one',1040,950,300,30);shelf(l,'step-two',1620,780,300,30);addRoom(l,'step-house',1620,2,'glass','wood',765);addRoom(l,'landing-house',2260,2,'wood','glass');l.zones!.push({id:'light-step',kind:'gravity',x:1120,y:780,w:500,h:600,gravity:{x:0,y:.08}},{id:'heavy-landing',kind:'gravity',x:2270,y:950,w:450,h:500,gravity:{x:0,y:.5}});out.push(finish(l,['terrain steps','gravity regions','high/low targets'],['duck','rabbit','bear','duck','sheep']));
 l=level('orbital',8,'Tidal Trouble','A turning satellite knocks loose what gravity has been keeping nearby.','puzzle',2500,1100);pin(l,'satellite-switch',800);rotor(l,'satellite',1300,930,'satellite-switch');l.mechanisms![0].speed=3;addRoom(l,'tidal-station',1450,3,'glass','wood');l.zones!.push({id:'tidal-field',kind:'gravity',x:1000,y:600,w:250,h:400,gravity:{x:.035,y:.22}});out.push(finish(l,['trigger','rotating satellite','sideways gravity'],['duck','bear','rabbit','sheep']));
 l=level('orbital',9,'The Slingshot Effect','Curve around a little moon to reach the shielded observatory.','siege',3100,1250);planetoid(l,'observatory-moon',1300,870,155,.55);shelf(l,'observatory-shield',1790,1080,30,340,'metal');addRoom(l,'observatory',2110,3,'glass','wood');out.push(finish(l,['radial gravity','protected target','multiple arcs'],['duck','rabbit','bear','duck','sheep']));
 // The connected finale composition is authored in refine(), below.
 out.push(level('orbital',10,'Orbits End','World finale.','spectacle'));
 return JSON.parse(JSON.stringify([...out.map(refine).map(reviseLevel),...siegeLessons(),...siegeShowcases()].map(annotateDesign))) as Level[];
}

/** Finales are joined buildings with shared load paths. Candidate search is only
 * a solvability gate; these compositions also receive rendered inspection. */
function refine(l:Level):Level {
 if(l.id==='frozen-10'){
  l=level('frozen',10,'Glacier Opera','Three ice arches carry a linked skyway and its three frozen turrets. Break the caps to drop the upper city.','spectacle',2800,1300);
  for(const [i,x] of [950,1330,1710].entries()){
   const a=corbelArch(`opera-arch-${i}`,x,1300);a.blocks.filter(b=>!b.id.includes('pier')).forEach(b=>b.material='ice');append(l,a);
  }
  for(const [i,x] of [1140,1520].entries())l.blocks.push({id:`opera-skyway-${i}`,x,y:1105,w:378.6,h:22,material:'ice'});
  addRoom(l,'opera-west',1140,2,'ice','wood',1094);
  addRoom(l,'opera-spire',1330,3,'ice','wood',1094);
  addRoom(l,'opera-east',1520,2,'ice','wood',1094);
  l.par=3;
  return finish(l,['load-bearing ice arch caps','joined skyway','three turrets','falling city'],['duck','bear','rabbit','duck','bear','rabbit','sheep']);
 }

 const giant=['meadow-30','frozen-10','molten-10','haunted-10','orbital-10'];
 if(giant.includes(l.id)){
  l.blocks=[];l.monsters=[];l.hazards=[];l.terrain=[];l.props=[];l.joints=[];l.mechanisms=[];l.zones=[];
  l.bounds={width:3000,height:1435,ground:1300};l.sling={x:235,y:1155};l.camera={start:'overview'};
  const bays=l.world==='frozen'?4:l.world==='molten'?3:l.world==='haunted'?4:l.world==='orbital'?6:5;
  const heights=l.world==='frozen'?[2,3,3,2]:l.world==='molten'?[4,5,3]:l.world==='haunted'?[4,2,3,5]:l.world==='orbital'?[2,3,2,4,2,3]:[3,4,2,4,3];
  const stories=Math.max(...heights);
  const post=l.world==='frozen'?'ice':l.world==='haunted'?'glass':'wood';
  append(l,arcade('grand',1440,1300,bays,stories,post,l.world==='frozen'?'ice':'wood',heights));
  // Tall stone gatehouses hold the long arcade in a distinct silhouette.
  append(l,room('west-gate',1440-bays*110-110,1300,120,3,l.world==='molten'?'glass':'stone','wood',false));
  append(l,room('east-gate',1440+bays*110+110,1300,120,3,'stone','wood',false));
  // Both galleries bear on the main castle's upper floors, so breaking those
  // floors releases the galleries as well as the rooms directly above them.

  const first=1440-bays*110+110,last=1440+bays*110-110;
  for(const [i,xx] of [first,last].entries()){
   const col=i?bays-1:0,storey=heights[col]-1,anchorY=1300-storey*126-114;
   const deck=`gallery-${i}`;
   l.blocks.push({id:deck,x:xx,y:1120,w:130,h:20,material:l.world==='frozen'?'ice':'glass'});
   l.joints.push({id:`gallery-chain-${i}-a`,kind:'rope',bodyA:`grand-floor-${storey}-${col}`,pointA:{x:-65,y:0},bodyB:deck,pointB:{x:-65,y:0},length:1120-anchorY,stiffness:.85,damping:.12,breakForce:.15});
   l.joints.push({id:`gallery-chain-${i}-b`,kind:'rope',bodyA:`grand-floor-${storey}-${col}`,pointA:{x:65,y:0},bodyB:deck,pointB:{x:65,y:0},length:1120-anchorY,stiffness:.85,damping:.12,breakForce:.15});
  }
  // Powder sits in empty bays, under the shared first floor, rather than in a
  // detached line. Structural debris has to reach it to propagate the blast.
  l.monsters=l.monsters.filter(m=>!['grand-tenant-0-1','grand-tenant-0-3'].includes(m.id));
  tnt(l,'underfloor-west',first);tnt(l,'underfloor-east',last);
  l.monsters=l.monsters.filter(m=>!l.hazards.some(h=>Math.hypot(h.x-m.x,h.y-m.y)<42));
  l.par=4;l.projectiles=['duck','bear','duck','rabbit','bear','sheep','duck','bear'];
  l.metadata!.category='spectacle';l.metadata!.mechanics=['shared piers',`${stories}-storey arcade`,'load-bearing floors','hanging galleries','underfloor powder'];
  l.subtitle=l.metadata!.idea='The galleries hang from the castle roof. Break a shared glass pier to bring the upper halls into the powder vaults.';
  if(l.world==='frozen'){
   // Frozen mortise joints keep the tall asymmetric spire intact until impact.
   for(const b of l.blocks.filter(b=>b.id.startsWith('grand-floor-'))){const [, ,rowText,colText]=b.id.split('-'),row=Number(rowText),col=Number(colText);for(const side of [-1,1])l.joints.push({id:`frost-weld-${row}-${col}-${side}`,kind:'hinge',bodyA:`grand-pier-${row}-${col+(side===1?1:0)}`,pointA:{x:0,y:-51},bodyB:b.id,pointB:{x:side*110,y:12},length:0,stiffness:.8,damping:.1,breakForce:.12});}
   l.environment={groundFriction:.025};l.zones.push({id:'glacier-floor',kind:'ice',x:1500,y:1220,w:3000,h:180});l.metadata!.mechanics.push('ice momentum');}
  if(l.world==='countryside'){
   l.blocks=l.blocks.filter(b=>!b.id.startsWith('gallery-'));
   l.joints=l.joints.filter(j=>!j.id.startsWith('gallery-chain-'));
   l.metadata!.mechanics=l.metadata!.mechanics.filter(m=>m!=='hanging galleries');
   l.subtitle=l.metadata!.idea='The stepped halls share their glass piers. Break a load-bearing foot to bring the upper castle into the powder vaults.';
  }
  if(l.world==='molten'){
   l.blocks=l.blocks.filter(b=>!b.id.startsWith('gallery-'));
   l.joints=l.joints.filter(j=>!j.id.startsWith('gallery-chain-'));
   l.metadata!.mechanics=l.metadata!.mechanics.filter(m=>m!=='hanging galleries');
   l.subtitle=l.metadata!.idea='Break the pressure valve to send the breaching stone into the foundry. Its shared glass piers carry the entire upper factory.';
   l.zones.push({id:'furnace',kind:'heat',x:1440,y:1285,w:170,h:26,rate:8});
   // A separated trigger and physical ball make the alternate breaching route readable.
   pin(l,'furnace-valve',490);l.props.push({id:'furnace-ball',kind:'boulder',x:600,y:1257,radius:43,material:'stone'});
   l.mechanisms.push({id:'furnace-pressure',kind:'vent',x:600,y:1220,w:115,h:155,force:.004,speed:1,axis:'x',trigger:'furnace-valve'});
   l.metadata!.mechanics.push('triggered vent');
  }
  if(l.world==='orbital'){
   l.blocks=l.blocks.filter(b=>!b.id.startsWith('west-gate')&&!b.id.startsWith('east-gate'));
   l.environment={gravity:{x:0,y:.22}};
   // The broad lane comes first; the two radial wells retain precedence.
   l.zones.push({id:'long-orbit',kind:'gravity',x:1450,y:600,w:1800,h:600,gravity:{x:0,y:.08}});
   planetoid(l,'west-moon',680,450,105,.38);planetoid(l,'east-moon',2330,470,130,.44);
   l.zones.push({id:'station-landing-field',kind:'gravity',x:1440,y:1100,w:1500,h:600,gravity:{x:0,y:.75}});
   l.metadata!.mechanics.push('radial wells','low gravity','stronger station field');
  }
  return finish(l,l.metadata!.mechanics);
 }
 if(l.id==='haunted-05'){
  l.blocks=[];l.monsters=[];l.joints=[];
  append(l,arcade('manor',1260,1150,3,3,'wood','glass'));
  l.subtitle=l.metadata!.idea='The veranda and both wings share their floor beams. A broken middle pier drops two rooms at once.';
  l.metadata!.mechanics=['shared floor beams','glass veranda','asymmetric manor'];
  return finish(l,l.metadata!.mechanics);
 }
 if(l.id==='haunted-09'){
  // Bell anchors belong to the building, so a broken roof releases its bell.
  l.blocks=[];l.monsters=[];l.props=[];l.joints=[];l.hazards=[];
  append(l,arcade('bell-house',1480,1300,4,3,'glass','wood'));
  for(let i=0;i<4;i++){
   const xx=1150+i*220;
   l.props!.push({id:`bell${i}`,kind:'boulder',x:xx,y:1235,radius:28,material:'metal'});
   l.joints!.push({id:`bell-chain${i}`,kind:'rope',bodyA:`bell-house-floor-2-${i}`,pointA:{x:0,y:0},bodyB:`bell${i}`,pointB:{x:0,y:0},length:299,stiffness:.9,damping:.04,breakForce:.12});
  }
  l.monsters=l.monsters.filter(m=>!m.id.includes('tenant-0'));
  l.par=3;l.subtitle=l.metadata!.idea='The bells hang from the roof of a three-storey music hall. Falling floors pull the bells through the lower galleries.';
  return finish(l,['building-anchored bells','shared floors','metal pendulums']);
 }
 if(l.id==='orbital-09'){
  l.zones!.unshift({id:'observatory-landing',kind:'gravity',x:1700,y:1100,w:320,h:450,gravity:{x:0,y:.75}});
  const well=l.zones!.find(z=>z.id==='observatory-moon-gravity')!;well.strength=.5;well.radius=310;well.w=620;well.h=620;
  l.blocks.forEach(b=>b.x-=410);l.monsters.forEach(m=>m.x-=410);
  // A shield guards the low entrance while the upper gravity-assisted arc remains readable.
  const shield=l.terrain!.find(t=>t.id==='observatory-shield')!;shield.h=100;shield.y=l.bounds.ground-50;shield.x=1560;
 }
 return l;
}
