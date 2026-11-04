# Browser builds

Current: **[plush-siege-0.5.0-browser.zip](plush-siege-0.5.0-browser.zip)** — 85 verified levels across five worlds, including 19 redesigns and 15 new stages.
It contains the production game, 18-rig physics lab, offline assets/icons, license notices, file hashes and a local server.

Extract the entire ZIP. With Node.js 24 installed, double-click **start-windows.cmd** on Windows, or run **node serve.mjs** on macOS/Linux. Open **http://127.0.0.1:8080**. No npm install is needed. Follow the included `README.txt` for local-network/iPad hosting. Direct file:// opening is unsupported.

SHA-256: `0014f7ede77a403d93dc720398727df87609a69550a8d54e458cdb27480649a8`

The 0.2.0, 0.3.0 and 0.4.0 archives remain available as previous milestones. For source development, download the full repository ZIP, then run `npm ci` and `npm run dev` in the extracted folder containing `package.json`.

See the [Pass 5 report](../docs/pass-5-report.md) for verification and remaining human/device playtesting. The optional 30–50-level expansion target was reduced to 15 distinct, verified additions.
