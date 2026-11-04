import type {Level,MaterialKind,Point} from '../game/types';
import type {Assembly} from './templates';
export interface Rig extends Assembly {weakPoints:string[];}
interface Edge {a:string;b:string;material:MaterialKind;name:string;}
/** Pin-connected structural members. Triangles are rigid until a real member
 * fails. Ends stop short of a joint; visible mechanical connectors span the gap. */
function frame(prefix:string,nodes:Record<string,Point>,edges:Edge[],anchors:Record<string,{body:string;point:Point}>={}):Rig {
 const out:Rig={blocks:[],monsters:[],joints:[],weakPoints:[]};
 const incidence=new Map<string,{body:string;point:Point}[]>();
 for(const edge of edges){
  const a=nodes[edge.a],b=nodes[edge.b],length=Math.hypot(b.x-a.x,b.y-a.y),id=`${prefix}-${edge.name}`,trim=Math.min(20,length*.18);
  out.blocks.push({id,x:(a.x+b.x)/2,y:(a.y+b.y)/2,w:length-trim*2,h:12,angle:Math.atan2(b.y-a.y,b.x-a.x),material:edge.material});
  if(edge.material==='glass'||edge.material==='ice')out.weakPoints.push(id);
  for(const [node,point] of [[edge.a,{x:-length/2,y:0}],[edge.b,{x:length/2,y:0}]] as const){const list=incidence.get(node)||[];list.push({body:id,point});incidence.set(node,list);}
 }
 for(const [node,list] of incidence){
  const root=anchors[node]||list[0];
  for(const item of list){if(item===root)continue;out.joints!.push({id:`${prefix}-pin-${node}-${item.body}`,kind:'hinge',bodyA:root.body,pointA:root.point,bodyB:item.body,pointB:item.point,length:0,stiffness:.85,damping:.1});}
 }
 return out;
}
export function triangularCabin(prefix:string,x:number,base:number,width=230,rise=160,roof:MaterialKind='wood',tie:MaterialKind='glass'):Rig {
 const nodes={left:{x:x-width/2,y:base},peak:{x,y:base-rise},right:{x:x+width/2,y:base}};
 const rig=frame(prefix,nodes,[{a:'left',b:'peak',material:roof,name:'left-rake'},{a:'peak',b:'right',material:roof,name:'right-rake'},{a:'left',b:'right',material:tie,name:'floor-tie'}]);
 rig.monsters.push({id:`${prefix}-resident`,x,y:base-24,radius:18,kind:'horn'});return rig;
}
/** A thirteen-member bowstring truss: eight nodes and thirteen members form
 * triangulated bays, with an actual fragile member in the central load path. */
export function bowstringBridge(prefix:string,x:number,base:number,span=650,rise=200,material:MaterialKind='wood'):Rig {
 const nodes:Record<string,Point>={};
 for(let i=0;i<5;i++)nodes[`b${i}`]={x:x-span/2+i*span/4,y:base};
 for(let i=1;i<4;i++)nodes[`t${i}`]={x:x-span/2+i*span/4,y:base-rise*(i===2?1:.75)};
 const edges:Edge[]=[];
 for(let i=0;i<4;i++)edges.push({a:`b${i}`,b:`b${i+1}`,material:i===1?'glass':material,name:`deck-${i}`});
 for(const [a,b,name] of [['b0','t1','arch-0'],['t1','t2','arch-1'],['t2','t3','arch-2'],['t3','b4','arch-3']] as const)edges.push({a,b,material,name});
 for(let i=1;i<4;i++)edges.push({a:`b${i}`,b:`t${i}`,material:i===2?'glass':material,name:`hanger-${i}`});
 edges.push({a:'t1',b:'b2',material,name:'brace-left'},{a:'b2',b:'t3',material,name:'brace-right'});
 const height=180,terrain=[{id:`${prefix}-bank-left`,x:x-span/2,y:base+6+height/2,w:90,h:height,material:'stone' as const},{id:`${prefix}-bank-right`,x:x+span/2,y:base+6+height/2,w:90,h:height,material:'stone' as const}];
 const rig=frame(prefix,nodes,edges,{b0:{body:terrain[0].id,point:{x:0,y:-height/2-6}},b4:{body:terrain[1].id,point:{x:0,y:-height/2-6}}});rig.terrain=terrain;
 rig.blocks.push({id:`${prefix}-crown`,x,y:base-rise-10,w:100,h:20,material});
 for(const [i,offset] of [-span*.375,-span*.125,span*.375].entries())rig.monsters.push({id:`${prefix}-traveller-${i}`,x:x+offset,y:base-24,radius:18,kind:i===1?'blob':'bat'});
 return rig;
}
/** Visible pylons and destructible couplers carry a linked suspended deck.
 * Breaking a coupler releases its cables; no targets are scripted to fall. */
export function cableViaduct(prefix:string,x:number,base:number,ground:number,span=660,segments=4,deck:MaterialKind='wood'):Rig {
 const rig:Rig={blocks:[],monsters:[],terrain:[],joints:[],weakPoints:[]};
 const couplers=[x-span/2-65,x+span/2+65].map((xx,i)=>{
  const y=base-245,id=`${prefix}-coupler-${i}`,mast=`${prefix}-pylon-${i}`,height=ground-y-12;
  rig.terrain!.push({id:mast,x:xx,y:y+12+height/2,w:32,h:height,material:'stone'});
  rig.blocks.push({id,x:xx,y,w:52,h:24,material:'glass'});rig.weakPoints.push(id);
  rig.joints!.push({id:`${id}-seat`,kind:'hinge',bodyA:mast,pointA:{x:0,y:-height/2-12},bodyB:id,pointB:{x:0,y:0},length:0,stiffness:.75,damping:.15});return {id,x:xx,y};
 });
 const size=span/segments;
 for(let i=0;i<segments;i++){
  const id=`${prefix}-deck-${i}`,xx=x-span/2+(i+.5)*size,w=size-8;
  rig.blocks.push({id,x:xx,y:base,w,h:18,material:deck});rig.monsters.push({id:`${prefix}-guest-${i}`,x:xx,y:base-27,radius:18,kind:i%2?'horn':'blob'});
  for(const [side,c] of couplers.entries()){
   const point={x:(side?1:-1)*(w/2-8),y:0},end={x:xx+point.x,y:base};
   rig.joints!.push({id:`${id}-stay-${side}`,kind:'rope',bodyA:c.id,pointA:{x:0,y:0},bodyB:id,pointB:point,length:Math.hypot(end.x-c.x,end.y-c.y),stiffness:.75,damping:.15,breakForce:.3});
  }
  if(i)rig.joints!.push({id:`${id}-link`,kind:'rope',bodyA:`${prefix}-deck-${i-1}`,pointA:{x:w/2,y:0},bodyB:id,pointB:{x:-w/2,y:0},length:8,stiffness:.75,damping:.15,breakForce:.12});
 }
 return rig;
}
export function rollingRelease(prefix:string,x:number,y:number,radius=38):Rig {
 const rig:Rig={blocks:[{id:`${prefix}-gate`,x:x+55,y:y+radius-24,w:22,h:48,material:'glass'}],monsters:[],terrain:[{id:`${prefix}-shelf`,x,y:y+radius+12,w:150,h:24,material:'stone'},{id:`${prefix}-chute`,x:x+240,y:y+radius+65,w:360,h:22,angle:.28,material:'stone',friction:.025}],props:[{id:`${prefix}-stone`,kind:'boulder',x:x-10,y,radius,material:'stone'}],weakPoints:[`${prefix}-gate`]};return rig;
}
