import Matter from 'matter-js';
import type { Level, MechanismDef, Point, PropDef, ZoneDef, BlockDef } from './types';
import type { Entity, GameEvent } from './physics';
import type { DamageRecord } from './damage';
import { MATERIALS, PHYSICS } from './config';
const {Bodies,Body,Composite,Constraint,Events,Sleeping}=Matter;
export interface MechanismState {def:MechanismDef;active:boolean;body?:Matter.Body;startedAt:number;}
interface JointState {constraint:Matter.Constraint;stiffness:number;damping:number;breakForce?:number;kind:string;}
/** Optional v1 world mechanics. All forces/contacts run in the same Matter world as ordinary blocks. */
export class WorldPhysics {
  pendingDestruction=false;
  /** Diagnostic totals; no per-tick render events or gameplay decisions depend on these. */
  activity=new Map<string,{ticks:number;bodyTicks:number;impulse:number;damage:number}>();
  constraints=new Map<string,Matter.Constraint>();
  mechanisms=new Map<string,MechanismState>();
  private joints=new Map<string,JointState>();
  private removedIds=new Set<string>();
  private initialIds=new Set<string>();
  private baseFriction=new Map<number,{friction:number;staticFriction:number}>();
  private clock=0;
  private zoneShapes=new Map<string,Matter.Body>();
  constructor(private level:Level,private engine:Matter.Engine,private entities:Map<number,Entity>,private add:(e:Entity)=>Entity,private damage:(e:Entity,d:DamageRecord)=>void,private emit:(e:GameEvent)=>void) {
    const gravity=level.environment?.gravity||{x:0,y:1};engine.gravity.x=gravity.x;engine.gravity.y=gravity.y;
    for(const d of level.terrain||[]) {
      const material=d.material||'stone',cfg=MATERIALS[material];
      const body=Bodies.rectangle(d.x,d.y,d.w,d.h,{angle:d.angle||0,isStatic:true,friction:d.friction??cfg.friction,restitution:cfg.restitution,label:`terrain:${d.id}`});
      this.add({id:d.id,type:'terrain',body,terrainDef:d,def:{...d,material,static:true},health:Infinity,maxHealth:Infinity,born:0});
    }
    for(const d of level.props||[]) {
      const material=d.material||'stone',cfg=MATERIALS[material],staticBody=d.static??d.kind==='planetoid';
      const body=Bodies.circle(d.x,d.y,d.radius,{isStatic:staticBody,density:cfg.density,friction:cfg.friction,restitution:.08,sleepThreshold:55,label:d.kind});
      const health=staticBody?Infinity:cfg.health*Math.max(1,d.radius/28);
      this.add({id:d.id,type:'prop',body,propDef:d,def:{id:d.id,x:d.x,y:d.y,w:d.radius*1.4,h:d.radius*1.4,material},health,maxHealth:health,born:0});
    }
    for(const z of level.zones||[])this.zoneShapes.set(z.id,Bodies.rectangle(z.x,z.y,z.w+.1,z.h+.1,{isStatic:true,isSensor:true}));
    for(const e of entities.values())this.initialIds.add(e.id);
    for(const d of level.joints||[]) {
      const a=d.bodyA?this.body(d.bodyA):undefined,b=d.bodyB?this.body(d.bodyB):undefined;
      if((d.bodyA&&!a)||(d.bodyB&&!b)||(!a&&!b))throw new Error(`Joint ${d.id} references a missing physical body`);
      const stiffness=d.stiffness??(d.kind==='spring'?.03:d.kind==='hinge'?1:.85);
      const rotate=(p:Point,body?:Matter.Body)=>body?{x:p.x*Math.cos(body.angle)-p.y*Math.sin(body.angle),y:p.x*Math.sin(body.angle)+p.y*Math.cos(body.angle)}:{...p};
      const constraint=Constraint.create({bodyA:a,bodyB:b,pointA:rotate(d.pointA,a),pointB:rotate(d.pointB,b),length:d.length??(d.kind==='hinge'?0:undefined),stiffness,damping:d.damping??(d.kind==='spring'?.08:.035),label:d.id});
      Composite.add(engine.world,constraint);this.constraints.set(d.id,constraint);this.joints.set(d.id,{constraint,stiffness,damping:constraint.damping,kind:d.kind,breakForce:d.breakForce});
    }
    for(const def of level.mechanisms||[]) {
      const body=def.body?this.body(def.body):undefined;
      if(def.kind!=='vent'&&!body)throw new Error(`Mechanism ${def.id} requires a physical body`);
      if(def.kind==='platform'&&body)Body.setStatic(body,true);
      if(def.kind==='motor'&&body&&!body.isStatic&&!Array.from(this.constraints.values()).some(c=>c.bodyA===body||c.bodyB===body)) {
        const c=Constraint.create({bodyB:body,pointA:{...body.position},pointB:{x:0,y:0},length:0,stiffness:1,damping:.05,label:`${def.id}:pivot`});Composite.add(engine.world,c);this.constraints.set(`${def.id}:pivot`,c);this.joints.set(`${def.id}:pivot`,{constraint:c,stiffness:1,damping:c.damping,kind:'hinge'});
      }
      this.mechanisms.set(def.id,{def,body,active:!def.trigger,startedAt:0});
    }
    Events.on(engine,'beforeSolve',()=>this.updateJoints());
  }
  private body(id:string){return [...this.entities.values()].find(e=>e.id===id)?.body;}
  private inside(p:Point,z:{x:number;y:number;w:number;h:number}) {return Math.abs(p.x-z.x)<=z.w/2&&Math.abs(p.y-z.y)<=z.h/2;}
  private gravityAt(p:Point,observe?:(id:string)=>void):Point {
    let vector={x:this.engine.gravity.x,y:this.engine.gravity.y};
    for(const z of this.level.zones||[]) {
      if(!this.inside(p,z))continue;
      if(z.kind==='zero-gravity'){vector={x:0,y:0};observe?.(z.id);}
      if(z.kind==='gravity') {
        if(z.center) {
          const dx=z.center.x-p.x,dy=z.center.y-p.y,d=Math.hypot(dx,dy),radius=z.radius??Math.max(z.w,z.h)/2;
          if(d>radius)continue;
          const strength=(z.strength??1)*Math.max(0,1-d/radius);vector=d>.5?{x:dx/d*strength,y:dy/d*strength}:{x:0,y:0};observe?.(z.id);
        } else {vector=z.gravity?{...z.gravity}:{x:0,y:z.strength??.25};observe?.(z.id);}
      }
    }
    return vector;
  }
  private record(id:string,impulse=0,damage=0){const a=this.activity.get(id)||{ticks:0,bodyTicks:0,impulse:0,damage:0};if((a as typeof a&{last?:number}).last!==this.clock){a.ticks++;(a as typeof a&{last?:number}).last=this.clock;}a.bodyTicks++;a.impulse+=Math.abs(impulse);a.damage+=damage;this.activity.set(id,a);}
  /** Velocity change per 60Hz step, shared by trajectory preview and simulation. */
  accelerationAt(point:Point):Point {const v=this.gravityAt(point),scale=this.engine.gravity.scale*PHYSICS.step*PHYSICS.step;return{x:v.x*scale,y:v.y*scale};}
  get spaceLike(){return this.level.world==='orbital'||(this.level.environment?.ground===false&&this.engine.gravity.x===0&&this.engine.gravity.y===0);}
  drivenBodyIds():Set<number>{return new Set([...this.mechanisms.values()].filter(m=>m.active&&m.body&&(m.def.kind==='motor'||m.def.kind==='platform')).map(m=>m.body!.id));}
  beforeStep(time:number,launched:boolean) {
    this.clock=time;
    this.pendingDestruction=false;
    for(const state of this.mechanisms.values()) {
      const {def,body}=state;
      if(!state.active&&def.trigger&&this.initialIds.has(def.trigger)&&this.removedIds.has(def.trigger)) {state.active=true;state.startedAt=time;this.emit({type:'mechanism',x:body?.position.x??def.x??0,y:body?.position.y??def.y??0,mechanismId:def.id});}
      if(!state.active)continue;
      const elapsed=(time-state.startedAt)/1000;
      if(def.kind==='platform'&&body&&this.entities.has(body.id)) {
        const entity=this.entities.get(body.id)!,origin=entity.def||entity.terrainDef||entity.propDef!;
        const offset=Math.sin(elapsed*(def.speed??.2)*Math.PI*2)*(def.range??80),axis=def.axis||'x';
        const position={x:origin.x,y:origin.y};position[axis]+=offset;Body.setVelocity(body,{x:position.x-body.position.x,y:position.y-body.position.y});Body.setPosition(body,position);
      }
      if(def.kind==='motor'&&body&&this.entities.has(body.id)) {
        const speed=Math.max(-3,Math.min(3,def.speed??.65))/60;
        if(body.isStatic){Body.setAngularVelocity(body,speed);Body.setAngle(body,body.angle+speed);}else{Sleeping.set(body,false);Body.setAngularVelocity(body,speed);}
      }
      if(def.kind==='vent'&&(launched||!!def.trigger)) {
        const zone={x:def.x??0,y:def.y??0,w:def.w??100,h:def.h??140},axis=def.axis||'y';
        const direction=def.speed===undefined?(axis==='y'?-1:1):Math.sign(def.speed)||1;
        for(const e of this.entities.values())if(!e.body.isStatic&&this.inside(e.body.position,zone)) {
          const force=Math.max(0,Math.min(.012,def.force??.003))*e.body.mass*direction;
          Body.applyForce(e.body,e.body.position,axis==='y'?{x:0,y:force}:{x:force,y:0});
          this.record(def.id,force*PHYSICS.step*PHYSICS.step);
        }
      }
    }
    const gravityScale=this.engine.gravity.scale*PHYSICS.step*PHYSICS.step;
    for(const e of this.entities.values()) {
      const b=e.body;
      if(!this.baseFriction.has(b.id))this.baseFriction.set(b.id,{friction:b.friction,staticFriction:b.frictionStatic});
      const base=this.baseFriction.get(b.id)!;let frozen=false;
      for(const zone of this.level.zones||[]) {
        const shape=this.zoneShapes.get(zone.id);
        if(!shape||!Matter.Bounds.overlaps(b.bounds,shape.bounds)||!Matter.Collision.collides(b,shape))continue;
        if(zone.kind==='ice'&&!b.isStatic){frozen=true;if(!b.isSleeping)this.record(zone.id);}
        if(!b.isStatic&&zone.kind==='lava'){const amount=(zone.rate??50)*PHYSICS.step/1000;if(amount>0&&e.health>0&&e.type!=='fragment'&&e.type!=='projectile')this.pendingDestruction=true;this.damage(e,{amount,source:'lava',sourceId:zone.id});this.record(zone.id,0,amount);}
        if(!b.isStatic&&launched&&zone.kind==='heat'&&(e.type==='block'||e.type==='fragment'||e.type==='prop')) {
          const material=(e.def as BlockDef)?.material;
          if(material==='wood'||material==='ice'){const amount=(zone.rate??(material==='ice'?8:3))*PHYSICS.step/1000;if(amount>0&&e.health>0&&e.type!=='fragment')this.pendingDestruction=true;this.damage(e,{amount,source:'heat',sourceId:zone.id,material});this.record(zone.id,0,amount);}
        }
      }
      b.friction=frozen?.015:base.friction;b.frictionStatic=frozen?.02:base.staticFriction;
      if(!b.isStatic&&!b.isSleeping) {
        let field:string|undefined;const local=this.gravityAt(b.position,id=>field=id),dx=(local.x-this.engine.gravity.x)*gravityScale,dy=(local.y-this.engine.gravity.y)*gravityScale;
        if(field)this.record(field,b.mass*Math.hypot(dx,dy));
        if(dx||dy){const drag=Math.max(.01,1-b.frictionAir);Body.setVelocity(b,{x:b.velocity.x+dx/drag,y:b.velocity.y+dy/drag});}
      }
    }
  }
  private anchor(c:Matter.Constraint,side:'A'|'B'):Point {
    const b=side==='A'?c.bodyA:c.bodyB,p=side==='A'?c.pointA:c.pointB;
    if(!b)return{...p};const angles=c as Matter.Constraint & {angleA:number;angleB:number};const angle=b.angle-(side==='A'?angles.angleA:angles.angleB),cos=Math.cos(angle),sin=Math.sin(angle);
    return{x:b.position.x+p.x*cos-p.y*sin,y:b.position.y+p.x*sin+p.y*cos};
  }
  private updateJoints() {
    for(const [id,state]of this.joints) {
      const c=state.constraint,a=this.anchor(c,'A'),b=this.anchor(c,'B'),distance=Math.hypot(a.x-b.x,a.y-b.y),extension=distance-c.length;
      const slack=state.kind==='rope'&&extension<-.5;
      c.stiffness=slack?0:state.stiffness;c.damping=slack?0:state.damping;
      const inverse=(c.bodyA?.inverseMass||0)+(c.bodyB?.inverseMass||0),mass=inverse>0?1/inverse:0;
      const force=Math.abs(extension)*c.stiffness*mass/(PHYSICS.step*PHYSICS.step);
      if(state.breakForce!==undefined&&force>state.breakForce)this.release(id,'joint-break');
    }
  }
  private release(id:string,type:'joint-break'|'mechanism') {
    const c=this.constraints.get(id);if(!c)return;
    const point=this.anchor(c,'A');for(const body of [c.bodyA,c.bodyB])if(body&&!body.isStatic)Sleeping.set(body,false);
    Composite.remove(this.engine.world,c);this.constraints.delete(id);this.joints.delete(id);this.emit({type,x:point.x,y:point.y,jointId:id});
  }
  bodyRemoved(body:Matter.Body,id?:string) {
    if(id)this.removedIds.add(id);
    for(const [joint,state]of [...this.joints])if(state.constraint.bodyA===body||state.constraint.bodyB===body)this.release(joint,'joint-break');
    this.baseFriction.delete(body.id);
  }
  dispose(){this.constraints.clear();this.joints.clear();this.mechanisms.clear();this.removedIds.clear();this.baseFriction.clear();this.zoneShapes.clear();this.activity.clear();}
}
