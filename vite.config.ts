import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
/** Generate a content-addressed offline shell from the actual build manifest. */
export default defineConfig({
  build: {
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'], physics: ['matter-js'] } } },
    chunkSizeWarningLimit: 1600,
  },
  plugins: [
    {
      name: 'plush-offline',
      generateBundle(_options, bundle) {
        const files = [
          ...new Set([
            '/',
            '/index.html',
            '/manifest.webmanifest',
            '/icon.svg',
            '/icon-192.png',
            '/icon-512.png',
            '/apple-touch-icon.png',
            '/third-party-notices.txt',
            ...Object.keys(bundle)
              .filter((f) => !f.endsWith('.map'))
              .map((f) => '/' + f),
          ]),
        ];
        const hash = createHash('sha256');
        for(const [name, output] of Object.entries(bundle)) {
          hash.update(name);
          hash.update(output.type === 'chunk' ? output.code : output.source);
        }
        for(const file of files.filter(path => !path.startsWith('/assets/') && path !== '/' && path !== '/index.html')) {
          hash.update(readFileSync(new URL('public'+file, import.meta.url)));
        }
        const version = hash.digest('hex').slice(0, 16);
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `const CACHE='plush-siege-${version}';const FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('plush-siege-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request,{ignoreVary:true}).then(hit=>hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('/index.html'):Response.error())));});`,
        });
      },
    },
  ],
});
