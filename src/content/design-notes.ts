import type {Level,DesignNotes} from '../game/types';
const archetypes:Record<string,string>={
 'meadow-09':'triangular tension frame','meadow-10':'counterbalanced picnic lever','meadow-13':'suspended stone-roof chamber','meadow-16':'two-height gabled terraces','meadow-19':'corbelled base carrying an upper house','meadow-22':'three-bay cable viaduct','meadow-24':'bowstring with dependent hanging court',
 'frozen-07':'armored gable and delivery courtyard','frozen-09':'ice-coated rolling counterweight','molten-04':'hanging powder dock over lava','molten-05':'sliding timber floor under a basalt vault','haunted-07':'five-bay coupler suspension','haunted-09':'cathedral with rafter-mounted bells','haunted-10':'hanging ballroom over a crypt','orbital-03':'paired curved moon surfaces','orbital-05':'moon-mounted suspended communications deck','orbital-06':'floating explosive dock between wells','orbital-07':'two colonies with perpendicular gravity','orbital-10':'asteroid-clamp moon foundries',
 'meadow-31':'asymmetric triangular gables','meadow-32':'destructible cable-stay couplers','meadow-33':'load-bearing bastions carrying a bowstring kingdom',
 'frozen-11':'armored sled and spillway','frozen-12':'brittle-deck bowstring','frozen-13':'steel gable sled over an ice citadel',
 'molten-11':'heat-released hanging platform','molten-12':'updraft perch and lower courtyard','molten-13':'parallel pressure and furnace suspension factories',
 'haunted-11':'direct bell relay over a chapel','haunted-12':'heavy hinged drawbridge','haunted-13':'motor-to-bell relay into a two-storey suspended manor',
 'orbital-11':'moon clamp and curved target surface','orbital-12':'sideways gravity colony','orbital-13':'two radial settlements with fragile roofs and released asteroids',
};
export function annotateDesign(l:Level):Level {
 const archetype=archetypes[l.id];if(!archetype||!l.metadata)return l;
 const ids=[...l.blocks,...l.monsters,...(l.props||[]),...(l.terrain||[])].map(b=>b.id);
 let groups:[string,RegExp][]=[['primary-assembly',/.*/]];
 let route:DesignNotes['intendedRoute']=[];
 if(l.id==='meadow-33'){
  groups=[['west-bastion',/bank-left/],['east-bastion',/bank-right/],['bowstring',/^kingdom-(?!bank|crown)/],['crown',/crown/],['lower-court',/court/]];
  route=[{from:'kingdom-bank-left-foot',to:'kingdom-bank-left',via:'support'},{from:'kingdom-bank-left',to:'kingdom-arch-0',via:'support'},{from:'kingdom-deck-1',to:'lower-court',via:'release'},{from:'kingdom-crown',to:'crown-stone',via:'support'}];
 }else if(l.id==='frozen-13'){
  groups=[['brake-winch',/brake-coupler|sled-stop/],['upper-sled',/citadel-sled/],['lower-citadel',/lower-citadel/],['ballast',/ballast/]];
  route=[{from:'brake-coupler',to:'sled-stop',via:'release'},{from:'sled-stop',to:'citadel-sled-floor-tie',via:'release'},{from:'citadel-sled-right-rake',to:'ice-spillway',via:'impact'},{from:'citadel-sled-right-rake',to:'lower-citadel-l1',via:'impact'}];
 }else if(l.id==='molten-13'){
  groups=[['west-machinery',/^(?!east-)(?:foundry-breaching|wooden-fastener|foundry-valve)/],['west-workshop',/^(?!east-)(?:foundry-house|foundry-deck|foundry-worker)/],['east-machinery',/^east-(?:foundry-breaching|wooden-fastener)/],['east-workshop',/^east-(?:foundry-house|foundry-deck|foundry-worker)/]];
  route=[{from:'foundry-valve',to:'foundry-pressure',via:'release'},{from:'foundry-pressure',to:'foundry-breaching-stone',via:'force'},{from:'foundry-breaching-stone',to:'wooden-fastener',via:'impact'},{from:'fastener-furnace',to:'wooden-fastener',via:'hazard'},{from:'wooden-fastener',to:'foundry-deck',via:'release'},{from:'foundry-lava',to:'foundry-house-m0',via:'hazard'},{from:'foundry-valve',to:'east-foundry-pressure',via:'release'}];
 }else if(l.id==='haunted-13'){
  groups=[['engine',/bell-engine|bell-switch/],['pendulums',/first-bell|second-bell/],['suspended-manor',/music-/],['crypt',/crypt-/]];
  route=[{from:'bell-switch',to:'bell-motor',via:'release'},{from:'bell-engine',to:'first-bell',via:'impact'},{from:'first-bell',to:'second-bell',via:'impact'},{from:'second-bell',to:'music-house-l1',via:'impact'},{from:'music-gallery',to:'crypt-chapel-right-rake',via:'impact'}];
 }else if(l.id==='orbital-13'){
  groups=[['near-moon',/^moon-0-/],['far-moon',/^moon-1-/]];
  route=[{from:'moon-0-coupler',to:'moon-0-asteroid',via:'release'},{from:'foundry-moon-0-well',to:'moon-0-asteroid',via:'force'},{from:'moon-0-asteroid',to:'moon-0-habitat-0-left-rake',via:'impact'},{from:'moon-1-coupler',to:'moon-1-asteroid',via:'release'}];
 }
 const weakPoints=l.blocks.filter(b=>b.material==='glass'||b.material==='ice').map(b=>b.id);
 for(const id of ['warm-fastener','wooden-fastener','east-wooden-fastener','bathtub-floor'])if(ids.includes(id))weakPoints.push(id);
 l.metadata.design={archetype,role:l.metadata.category==='spectacle'?'spectacle':l.id.startsWith('meadow-')&&Number(l.id.split('-')[1])<25?'reinforce':'experiment',weakPoints,sections:groups.map(([id,re])=>({id,members:ids.filter(v=>re.test(v))})).filter(s=>s.members.length),intendedRoute:route,worldUse:l.world==='countryside'?'classic':l.world==='orbital'||['molten-11','molten-13','frozen-11','frozen-13'].includes(l.id)?'essential':'helpful'};
 return l;
}
