import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
import {networkInterfaces} from 'node:os';
const root=fileURLToPath(new URL('.',import.meta.url));
const args=process.argv.slice(2),port=Number(args.find(a=>!a.startsWith('--'))||8080),lan=args.includes('--lan');
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a port from 1024 to 65535.');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain; charset=utf-8'};
createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404).end('Not found');}
}).listen(port,lan?'0.0.0.0':'127.0.0.1',()=>{
 console.log(`Plush Siege: http://127.0.0.1:${port}\nKeep this window open. Press Ctrl+C to stop.`);
 if(lan)for(const entries of Object.values(networkInterfaces()))for(const e of entries||[])if(e.family==='IPv4'&&!e.internal)console.log(`Same-network play: http://${e.address}:${port}`);
}).on('error',error=>{console.error(error.message);process.exitCode=1;});
