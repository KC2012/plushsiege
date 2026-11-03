import data from './campaign.json';
import { expansionLevels } from './expansion';
import type { Level } from '../game/types';
export interface WorldInfo { id:string; name:string; subtitle:string; description:string; color:string; accent:string; levelIds:string[]; mechanic:string; }
/** Original IDs stay stable: existing progress is preserved as the campaign grows. */
export const introCampaign:Level[]=data as Level[];
export const campaign:Level[]=[...introCampaign,...expansionLevels];
const definitions=[
 {id:'countryside',name:'Meadow Mischief',subtitle:'The countryside gets complicated',description:'Drawbridges, rolling stones and impossibly ambitious tree forts.',color:'#46d0b8',accent:'#d5ed44',mechanic:'Momentum & mechanisms'},
 {id:'frozen',name:'Frozen Folly',subtitle:'A slippery slope to trouble',description:'Ice cathedrals, skidding cargo and brittle frozen bridges.',color:'#68cff1',accent:'#d7b9ff',mechanic:'Sliding & brittle ice'},
 {id:'molten',name:'Molten Mayhem',subtitle:'Pressure makes a spectacular mess',description:'Basalt foundries, rising pressure and supports with a short fuse.',color:'#ff765c',accent:'#ffd44e',mechanic:'Heat, lava & pressure'},
 {id:'haunted',name:'Haunted Hooligans',subtitle:'Something is swinging in the attic',description:'Crooked manors, counterweight clocks and very impolite chandeliers.',color:'#ac80e9',accent:'#b8e94e',mechanic:'Hinges, swings & moving floors'},
 {id:'orbital',name:'Orbital Oddities',subtitle:'A little pull goes a long way',description:'Tiny planets, drifting forts and gravity with a mischievous bend.',color:'#5883d9',accent:'#f2b1db',mechanic:'Local gravity & orbital debris'},
];
export const worlds:WorldInfo[]=definitions.map(w=>({...w,levelIds:campaign.filter(l=>l.world===w.id).map(l=>l.id)}));
export function worldLevels(id:string){return campaign.filter(l=>l.world===id);}
export function worldForLevel(level:Level){return worlds.find(w=>w.id===level.world)||worlds[0];}
