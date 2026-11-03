import type { BlockDef, Level, MaterialKind, MonsterDef, Point } from '../game/types';
export type Assembly = Pick<Level,'blocks'|'monsters'> & Partial<Pick<Level,'props'|'joints'|'terrain'|'hazards'|'mechanisms'>>;
export function room(prefix:string,x:number,base:number,width=120,stories=1,posts:MaterialKind='wood',roof:MaterialKind='wood',targets=true):Assembly {
 const blocks:BlockDef[]=[],monsters:MonsterDef[]=[];
 for(let floor=0;floor<stories;floor++){
  const bottom=base-floor*114;
  blocks.push({id:`${prefix}-l${floor}`,x:x-width/2,y:bottom-48,w:18,h:96,material:posts},{id:`${prefix}-r${floor}`,x:x+width/2,y:bottom-48,w:18,h:96,material:posts},{id:`${prefix}-roof${floor}`,x,y:bottom-105,w:width+40,h:18,material:roof});
  if(targets)monsters.push({id:`${prefix}-m${floor}`,x,y:bottom-18,radius:18,kind:(['horn','blob','bat'] as const)[floor%3]});
 }
 return {blocks,monsters};
}
/** A continuous arcade: every split floor carries the storey above it. Removing
 * a shared pier drops two bays and transfers the load into the adjoining bays. */
export function arcade(prefix:string,x:number,base:number,bays=3,stories=3,posts:MaterialKind='wood',floors:MaterialKind='wood',heights:number[]=Array(bays).fill(stories)):Assembly {
 const blocks:BlockDef[]=[],monsters:MonsterDef[]=[];
 const span=220,step=126,left=x-bays*span/2;
 for(let row=0;row<stories;row++){
  const bottom=base-row*step;
  for(let col=0;col<=bays;col++)if((heights[col-1]||0)>row||(heights[col]||0)>row)blocks.push({id:`${prefix}-pier-${row}-${col}`,x:left+col*span,y:bottom-51,w:44,h:102,material:row===0&&col%2===1?'glass':posts});
  for(let col=0;col<bays;col++){
   if(heights[col]<=row)continue;
   const xx=left+(col+.5)*span;
   blocks.push({id:`${prefix}-floor-${row}-${col}`,x:xx,y:bottom-114,w:span-1.4,h:24,material:floors});
   monsters.push({id:`${prefix}-tenant-${row}-${col}`,x:xx,y:bottom-18,radius:18,kind:(['horn','blob','bat'] as const)[(row+col)%3]});
  }
 }
 return {blocks,monsters};
}
export function corbelArch(prefix:string,x:number,base:number,material:MaterialKind='stone'):Assembly {
 const blocks:BlockDef[]=[];
 for(const side of [-1,1]){
  blocks.push({id:`${prefix}-pier${side}`,x:x+side*102,y:base-70,w:48,h:140,material});
  blocks.push({id:`${prefix}-shoulder${side}`,x:x+side*90,y:base-152,w:68,h:24,material});
 }
 blocks.push({id:`${prefix}-keystone`,x,y:base-174,w:172,h:20,material});
 return {blocks,monsters:[{id:`${prefix}-keeper`,x,y:base-18,radius:18,kind:'horn'}]};
}
export function suspension(prefix:string,x:number,y:number,segments=3,material:MaterialKind='wood'):Assembly {
 const blocks:BlockDef[]=[],monsters:MonsterDef[]=[],joints:NonNullable<Level['joints']>=[];
 for(let i=0;i<segments;i++){
  const xx=x+(i-(segments-1)/2)*104,id=`${prefix}-deck${i}`;
  blocks.push({id,x:xx,y,w:100,h:18,material});
  monsters.push({id:`${prefix}-rider${i}`,x:xx,y:y-27,radius:18,kind:i%2?'blob':'horn'});
  for(const side of [-1,1])joints.push({id:`${prefix}-cable${i}-${side}`,kind:'rope',pointA:{x:xx+side*35,y:y-150},bodyB:id,pointB:{x:side*35,y:0},length:150,stiffness:.85,damping:.12,breakForce:.065});
  if(i)joints.push({id:`${prefix}-link${i}`,kind:'rope',bodyA:`${prefix}-deck${i-1}`,pointA:{x:50,y:0},bodyB:id,pointB:{x:-50,y:0},length:4,stiffness:.7,damping:.1,breakForce:.09});
 }
 return {blocks,monsters,joints};
}
export function counterweight(prefix:string,x:number,base:number):Assembly {
 const y=base-190,deck=`${prefix}-lever`;
 return {blocks:[{id:deck,x,y,w:350,h:22,material:'wood'},{id:`${prefix}-weak-foot`,x:x-145,y:base-89.5,w:20,h:179,material:'glass'},{id:`${prefix}-right-foot`,x:x+145,y:base-89.5,w:24,h:179,material:'wood'}],monsters:[{id:`${prefix}-rider`,x:x+105,y:y-29,radius:18,kind:'blob'}],props:[{id:`${prefix}-weight`,x:x-105,y:y-43,kind:'boulder',radius:32,material:'stone'}],joints:[{id:`${prefix}-pivot`,kind:'hinge',pointA:{x,y},bodyB:deck,pointB:{x:0,y:0},length:0,stiffness:1,damping:.04}]};
}
export function append(level:Level,assembly:Assembly):void {
 for(const key of ['blocks','monsters','props','joints','terrain','hazards','mechanisms'] as const){const value=assembly[key];if(value)(level[key] as unknown[]|undefined) ? (level[key] as unknown[]).push(...value) : (level as unknown as Record<string,unknown>)[key]=[...value];}
}
/** A physical deck resting on stone abutments. The central glass trestle is a readable weak point. */
export function trestleBridge(prefix:string,x:number,base:number,span=520):Assembly {
 const y=base-180;
 const blocks:BlockDef[]=[{id:`${prefix}-deck-left`,x:x-span/4,y,w:span/2-1.4,h:22,material:'wood'},{id:`${prefix}-deck-right`,x:x+span/4,y,w:span/2-1.4,h:22,material:'wood'},{id:`${prefix}-trestle`,x,y:base-84.5,w:22,h:169,material:'glass'}];
 const terrain=[{id:`${prefix}-left-bank`,x:x-span/2+22,y:base-84.5,w:44,h:169,material:'stone' as const},{id:`${prefix}-right-bank`,x:x+span/2-22,y:base-84.5,w:44,h:169,material:'stone' as const}];
 return {blocks,terrain,monsters:[{id:`${prefix}-left`,x:x-span*.22,y:y-29,radius:18,kind:'horn'},{id:`${prefix}-right`,x:x+span*.22,y:y-29,radius:18,kind:'bat'}]};
}
export const templateCatalog=[
 {id:'room',name:'Stacked gatehouse',description:'Load-bearing posts and a roof; parameterized stories and materials.'},
 {id:'arch',name:'Corbelled arch',description:'Heavy piers, overlapping shoulders and a real load-bearing cap.'},
 {id:'suspension',name:'Cable-linked walkway',description:'Three independent decks, breakable cables and linked bridge joints.'},
 {id:'counterweight',name:'Counterweight seesaw',description:'Hinged beam, stone load, glass prop and opposite rider.'},
 {id:'bridge',name:'Trestle bridge',description:'A broad deck over stone abutments with a glass central trestle.'},
] as const;
