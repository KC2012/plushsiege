# Pass 5 evidence

Release verification for the 85-stage 0.5.0 campaign. The `core-*` and `monster-browser.txt` files preserve the earlier compression milestone; `release-*` files and the other reports describe the final campaign.

Run from the repository root with Node.js 24 and `npm ci`:

```sh
npm test
npm run validate
npm run build
npm run audit:siege
npm run measure:physics
```

The campaign audit is read-only unless explicitly given `-- --promote`. `campaign-audit.json` contains the accepted geometry hashes, idle/miss outcomes, input witnesses and design diagnostics for all 85 levels. No injected damage or object removal is used. Its chronological damage-link metric is a conservative observation, not proof of a causal route or entertainment value. The five content mechanism tests compare the real routes against disabled mechanics.

For development browser scripts, start `npm run dev -- --port 5190` and set `GAME_URL=http://127.0.0.1:5190`. For the production presentation/offline scripts, use `npm run preview -- --port 4175` and `GAME_URL=http://127.0.0.1:4175`. All archived browser runs used `CANVAS_CI=1`, selecting software Canvas in headless system Chromium. The ordinary game keeps its automatic renderer selection.

The screenshot pairs show initial geometry and physical activity at 1024×768. They come from the actual game scene, without the HTML HUD. `home-1180.png`, `map-1180.png` and `hud-1180.png` show the production UI separately. The five showcase routes and observed peak entity counts are in `siege-browser.json`. Ice and orbital browser routes need an additional available shot beyond the Node witness; both still clear within their queues.

`physics-performance.json` measures individual fixed simulation steps on the cloud CPU. `render-performance.json` measures the real animation loop for eight seconds per showcase at each viewport, using the first witness shot with audio disabled. This scene-only measurement includes graphics and camera work but excludes the HTML HUD. Neither establishes physical iPad frame rate, Safari behavior, touch feel, thermals, battery life or subjective game quality.

Reproduce the animation measurement with the dev server running:

```sh
GAME_URL=http://127.0.0.1:5190 CANVAS_CI=1 npm run measure:render
```

`package-integrity.json` records ZIP integrity, all 19 file hashes, exact production-build contents and the build-source commit. `package-offline.txt` reruns the 18-check production offline suite against a separately extracted archive served by its included `serve.mjs`, rather than Vite preview. The Windows launcher has CRLF formatting but was not executed on Windows.
