import type { ValidationIssue } from '../game/types';

type Shape = {
  path: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  angle?: number;
  r?: number;
};
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const tolerance = 0.65; // Accept flush construction joints and the solver's contact slop.
const vertices = (s: Shape) => {
  const c = Math.cos(s.angle || 0),
    t = Math.sin(s.angle || 0);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => ({
    x: s.x + ((a * s.w!) / 2) * c - ((b * s.h!) / 2) * t,
    y: s.y + ((a * s.w!) / 2) * t + ((b * s.h!) / 2) * c,
  }));
};
function overlap(a: Shape, b: Shape): boolean {
  if (a.r && b.r) return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r - tolerance;
  if (a.r || b.r) {
    const circle = a.r ? a : b,
      rect = a.r ? b : a;
    const c = Math.cos(-(rect.angle || 0)),
      s = Math.sin(-(rect.angle || 0));
    const dx = circle.x - rect.x,
      dy = circle.y - rect.y;
    const x = dx * c - dy * s,
      y = dx * s + dy * c;
    const nearestX = Math.max(-rect.w! / 2, Math.min(rect.w! / 2, x));
    const nearestY = Math.max(-rect.h! / 2, Math.min(rect.h! / 2, y));
    return Math.hypot(x - nearestX, y - nearestY) < circle.r! - tolerance;
  }
  const av = vertices(a),
    bv = vertices(b);
  for (const v of [av, bv])
    for (let i = 0; i < 2; i++) {
      const p = v[i],
        q = v[i + 1],
        len = Math.hypot(q.x - p.x, q.y - p.y);
      const axis = { x: -(q.y - p.y) / len, y: (q.x - p.x) / len };
      const aa = av.map((p) => p.x * axis.x + p.y * axis.y),
        bb = bv.map((p) => p.x * axis.x + p.y * axis.y);
      if (
        Math.min(Math.max(...aa), Math.max(...bb)) - Math.max(Math.min(...aa), Math.min(...bb)) <=
        tolerance
      )
        return false;
    }
  return true;
}

export const WORLD_IDS = ['countryside', 'frozen', 'molten', 'haunted', 'orbital'] as const;
export const MATERIAL_IDS = ['wood', 'glass', 'stone', 'ice', 'metal'] as const;

/** Validate portable v1 levels, including optional production mechanisms. Sensors are not solids. */
export function validateLevel(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const issue = (path: string, message: string) => issues.push({path, message});
  if (!object(input)) return [{path:'$',message:'Expected a level object.'}];
  const l = input;
  if(l.version!==1)issue('version','Only level format version 1 is supported.');
  for(const key of ['id','name','world','subtitle'])if(typeof l[key]!=='string'||!(l[key] as string).trim())issue(key,'Expected a non-empty string.');
  if(typeof l.id==='string'&&!/^[a-zA-Z0-9_-]{1,80}$/.test(l.id))issue('id','Use 1–80 letters, numbers, hyphens or underscores.');
  if(typeof l.world==='string'&&!(WORLD_IDS as readonly string[]).includes(l.world))issue('world','Choose countryside, frozen, molten, haunted or orbital.');
  let width=1440,height=810,ground=675;
  if(!object(l.bounds))issue('bounds','Expected width, height and ground.');
  else {
    for(const key of ['width','height','ground'])if(!finite(l.bounds[key])||l.bounds[key]<=0)issue(`bounds.${key}`,'Expected a positive finite number.');
    if(finite(l.bounds.width))width=l.bounds.width;if(finite(l.bounds.height))height=l.bounds.height;if(finite(l.bounds.ground))ground=l.bounds.ground;
    if(width<400||width>10000||height<300||height>5000||ground>height)issue('bounds','Bounds must fit a supported playfield, with ground inside its height.');
  }
  const point = (value:unknown,path:string) => {if(!object(value)||!finite(value.x)||!finite(value.y)||Math.abs(value.x)>50000||Math.abs(value.y)>50000){issue(path,'Expected finite x and y coordinates within supported limits.');return false;}return true;};
  const number = (value:unknown,path:string,min:number,max:number,optional=true) => {if(value===undefined&&optional)return true;if(!finite(value)||value<min||value>max){issue(path,`Expected a finite number from ${min} to ${max}.`);return false;}return true;};
  const bool = (value:unknown,path:string) => {if(value!==undefined&&typeof value!=='boolean')issue(path,'Expected a boolean.');};
  const material = (value:unknown,path:string,optional=false) => {if(value===undefined&&optional)return;if(!(MATERIAL_IDS as readonly unknown[]).includes(value))issue(path,'Unknown structural material.');};
  let groundEnabled=true;
  if(l.environment!==undefined){
    if(!object(l.environment))issue('environment','Expected environment settings.');
    else {bool(l.environment.ground,'environment.ground');groundEnabled=l.environment.ground!==false;if(l.environment.gravity!==undefined)point(l.environment.gravity,'environment.gravity');number(l.environment.groundFriction,'environment.groundFriction',0,2);}
  }
  if(point(l.sling,'sling')&&object(l.sling)&&finite(l.sling.x)&&finite(l.sling.y)){
    if(l.sling.x<30||l.sling.x>width-30||l.sling.y<30||l.sling.y>(groundEnabled?ground:height)-30)issue('sling','Slingshot must be safely inside the playfield and above the ground.');
  }
  if(!Array.isArray(l.projectiles)||!l.projectiles.length||l.projectiles.length>12)issue('projectiles','Provide between 1 and 12 stuffies.');
  else l.projectiles.forEach((kind,i)=>{if(!['sheep','duck','bear','rabbit'].includes(kind))issue(`projectiles[${i}]`,'Unknown stuffie type.');});
  if(!Array.isArray(l.thresholds)||l.thresholds.length!==3||!l.thresholds.every((v,i,a)=>finite(v)&&v>=0&&(!i||v>a[i-1])))issue('thresholds','Provide three ascending finite non-negative score thresholds.');
  if(l.par!==undefined&&(!finite(l.par)||!Number.isInteger(l.par)||l.par<1||l.par>12))issue('par','Par must be an integer between 1 and 12.');
  if(l.tutorial!==undefined&&typeof l.tutorial!=='string')issue('tutorial','Tutorial text must be a string.');
  if(l.camera!==undefined){if(!object(l.camera))issue('camera','Expected camera settings.');else{if(l.camera.start!==undefined&&!['overview','sling'].includes(l.camera.start as string))issue('camera.start','Choose overview or sling.');number(l.camera.zoom,'camera.zoom',.1,3);}}
  if(l.metadata!==undefined){
    if(!object(l.metadata))issue('metadata','Expected level metadata.');
    else {
      if(!['puzzle','siege','spectacle'].includes(l.metadata.category as string))issue('metadata.category','Choose puzzle, siege or spectacle.');
      if(typeof l.metadata.idea!=='string'||!l.metadata.idea.trim())issue('metadata.idea','Describe the level’s central idea.');
      if(!Array.isArray(l.metadata.mechanics)||l.metadata.mechanics.length>40||!l.metadata.mechanics.every(m=>typeof m==='string'&&m.length>0&&m.length<=120))issue('metadata.mechanics','Provide up to 40 short mechanic names.');
      if(l.metadata.author!==undefined&&typeof l.metadata.author!=='string')issue('metadata.author','Author must be a string.');
    }
  }
  const ids=new Set<string>(),physical=new Map<string,{static:boolean;shape:Shape}>();
  const solids:(Shape&{static:boolean})[]=[];
  const id=(value:unknown,path:string)=>{if(typeof value!=='string'||!value.trim()||value.length>120){issue(`${path}.id`,'Every object needs a non-empty ID of at most 120 characters.');return false;}if(ids.has(value)){issue(`${path}.id`,'Object IDs must be unique across the level.');return false;}ids.add(value);return true;};
  const entries=(key:string,required=false,max=400):Record<string,unknown>[]=>{
    const values=l[key];if(values===undefined&&!required)return[];
    if(!Array.isArray(values)){issue(key,'Expected an array.');return[];}
    if(values.length>max){issue(key,`Too many objects (maximum ${max} per collection).`);return[];}
    return values as Record<string,unknown>[];
  };
  for(const collection of ['blocks','monsters','hazards','terrain','props']){
    const values=entries(collection,['blocks','monsters','hazards'].includes(collection));
    if(collection==='monsters'&&Array.isArray(l.monsters)&&!l.monsters.length)issue('monsters','At least one monster is required.');
    values.forEach((d,i)=>{
      const path=`${collection}[${i}]`;if(!object(d)){issue(path,'Expected an object.');return;}
      const validId=id(d.id,path);if(!point(d,path))return;
      const x=d.x as number,y=d.y as number;
      let shape:Shape={path,x,y};let isStatic=collection==='terrain';
      if(collection==='blocks'||collection==='terrain'){
        if(!number(d.w,`${path}.w`,4,width,false)||!number(d.h,`${path}.h`,4,height,false))return;
        material(d.material,`${path}.material`,collection==='terrain');if(d.angle!==undefined&&!number(d.angle,`${path}.angle`,-Math.PI*100,Math.PI*100))return;
        bool(d.static,`${path}.static`);isStatic=collection==='terrain'||d.static===true;
        if(collection==='terrain')number(d.friction,`${path}.friction`,0,2);
        shape={...shape,w:d.w as number,h:d.h as number,angle:d.angle as number||0};
      }else if(collection==='monsters'){
        const radius=d.radius===undefined?18:d.radius;if(!number(radius,`${path}.radius`,6,60,false))return;
        if(d.kind!==undefined&&!['horn','blob','bat'].includes(d.kind as string))issue(`${path}.kind`,'Unknown monster appearance.');
        shape={...shape,r:radius as number};
      }else if(collection==='props'){
        if(!['boulder','planetoid'].includes(d.kind as string))issue(`${path}.kind`,'Unknown physical prop.');
        if(!number(d.radius,`${path}.radius`,8,Math.min(width,height)/2,false))return;
        material(d.material,`${path}.material`,true);bool(d.static,`${path}.static`);isStatic=d.static===true||d.kind==='planetoid'&&d.static!==false;
        shape={...shape,r:d.radius as number};
      }else{if(d.kind!=='tnt')issue(`${path}.kind`,'Unknown hazard type.');shape={...shape,w:40,h:40};}
      const points=shape.r?[{x:x-shape.r,y:y-shape.r},{x:x+shape.r,y:y+shape.r}]:vertices(shape);
      const bottom=isStatic||!groundEnabled?height:ground;
      if(points.some(p=>p.x<0||p.x>width||p.y<0||p.y>bottom+tolerance))issue(path,'Object extends beyond the level bounds or below ground.');
      solids.push({...shape,static:isStatic});if(validId)physical.set(d.id as string,{static:isStatic,shape});
    });
  }
  if(solids.length>400)issue('$','Maximum 400 physics objects per level.');
  else for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++)if(!(solids[i].static&&solids[j].static)&&overlap(solids[i],solids[j]))issue(solids[i].path,`Overlaps ${solids[j].path}. Flush touching joints are allowed.`);
  if(object(l.sling)&&finite(l.sling.x)&&finite(l.sling.y)){
    const radius=Array.isArray(l.projectiles)&&l.projectiles.includes('bear')?29:23;
    const spawn:Shape={path:'sling',x:l.sling.x,y:l.sling.y,r:radius};
    if(solids.some(solid=>overlap(spawn,solid)))issue('sling','Projectile spawn intersects a solid object.');
  }
  const reference=(value:unknown,path:string,required=false)=>{if(value===undefined&&!required)return;if(typeof value!=='string'||!physical.has(value))issue(path,'Reference must name an existing physical object ID.');};
  entries('joints',false,200).forEach((joint,i)=>{
    const path=`joints[${i}]`;if(!object(joint)){issue(path,'Expected a joint object.');return;}id(joint.id,path);
    if(!['rope','hinge','spring'].includes(joint.kind as string))issue(`${path}.kind`,'Unknown joint type.');
    reference(joint.bodyA,`${path}.bodyA`);reference(joint.bodyB,`${path}.bodyB`);
    if(joint.bodyA===undefined&&joint.bodyB===undefined)issue(path,'A joint must attach to at least one physical body.');
    if(joint.bodyA!==undefined&&joint.bodyA===joint.bodyB)issue(path,'A joint must connect different bodies or a world anchor.');
    point(joint.pointA,`${path}.pointA`);point(joint.pointB,`${path}.pointB`);
    number(joint.length,`${path}.length`,0,20000);number(joint.stiffness,`${path}.stiffness`,0,1);number(joint.damping,`${path}.damping`,0,1);number(joint.breakForce,`${path}.breakForce`,.000001,1e6);
  });
  entries('mechanisms',false,100).forEach((mechanism,i)=>{
    const path=`mechanisms[${i}]`;if(!object(mechanism)){issue(path,'Expected a mechanism object.');return;}id(mechanism.id,path);
    if(!['motor','platform','vent'].includes(mechanism.kind as string))issue(`${path}.kind`,'Unknown mechanism type.');
    reference(mechanism.body,`${path}.body`,mechanism.kind!=='vent');reference(mechanism.trigger,`${path}.trigger`);
    if(mechanism.trigger!==undefined&&physical.get(mechanism.trigger as string)?.static)issue(`${path}.trigger`,'A trigger must reference a destructible dynamic object.');
    if(mechanism.body!==undefined&&mechanism.body===mechanism.trigger)issue(path,'An actuator cannot be triggered by removal of its own body.');
    if(mechanism.axis!==undefined&&!['x','y'].includes(mechanism.axis as string))issue(`${path}.axis`,'Axis must be x or y.');
    number(mechanism.speed,`${path}.speed`,-100,100);number(mechanism.range,`${path}.range`,0,10000);number(mechanism.force,`${path}.force`,0,10);
    if(mechanism.kind==='vent'){
      if(point(mechanism,path)&&number(mechanism.w,`${path}.w`,4,width,false)&&number(mechanism.h,`${path}.h`,4,height,false)){
        if((mechanism.x as number)-(mechanism.w as number)/2<0||(mechanism.x as number)+(mechanism.w as number)/2>width||(mechanism.y as number)-(mechanism.h as number)/2<0||(mechanism.y as number)+(mechanism.h as number)/2>height)issue(path,'Vent extends beyond the level bounds.');
      }
    }else{for(const key of ['x','y','w','h'])if(mechanism[key]!==undefined)number(mechanism[key],`${path}.${key}`,-50000,50000);}
  });
  entries('zones',false,100).forEach((zone,i)=>{
    const path=`zones[${i}]`;if(!object(zone)){issue(path,'Expected an environmental zone.');return;}id(zone.id,path);
    if(!['ice','lava','heat','gravity','zero-gravity'].includes(zone.kind as string))issue(`${path}.kind`,'Unknown environmental zone.');
    if(point(zone,path)&&number(zone.w,`${path}.w`,4,width,false)&&number(zone.h,`${path}.h`,4,height,false)){
      if((zone.x as number)-(zone.w as number)/2<0||(zone.x as number)+(zone.w as number)/2>width||(zone.y as number)-(zone.h as number)/2<0||(zone.y as number)+(zone.h as number)/2>height)issue(path,'Zone extends beyond the level bounds.');
    }
    if(zone.gravity!==undefined)point(zone.gravity,`${path}.gravity`);if(zone.center!==undefined)point(zone.center,`${path}.center`);
    number(zone.strength,`${path}.strength`,0,10);number(zone.radius,`${path}.radius`,1,20000);number(zone.rate,`${path}.rate`,0,100);
  });
  return issues;
}
