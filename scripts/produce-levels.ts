import {mkdirSync,writeFileSync} from 'node:fs';
import {produceCandidates} from '../src/content/generator';
const levels=produceCandidates();mkdirSync('src/content/expansion',{recursive:true});
for(const world of ['countryside','frozen','molten','haunted','orbital']){
 const content=levels.filter(level=>level.world===world);
 writeFileSync(`src/content/expansion/${world}.candidates.json`,JSON.stringify(content,null,2)+'\n');
 console.log(`${world}: ${content.length} deliberately composed candidates; NOT accepted until audited.`);
}
