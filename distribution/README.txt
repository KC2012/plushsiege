PLUSH SIEGE $VERSION - THE GREAT SIEGE

This is the prebuilt browser game: 85 levels, five worlds, local progress,
original procedural art and synthesized audio. No npm install is needed.
Build source commit: $SOURCE_COMMIT

WINDOWS
1. Extract the entire ZIP into a folder.
2. With Node.js 24 installed, double-click start-windows.cmd.
3. Open http://127.0.0.1:8080 in your browser.
Keep the terminal window open while playing. Ctrl+C stops the local server.

MAC / LINUX
Open a terminal in this folder and run: node serve.mjs
Then open http://127.0.0.1:8080.

IPAD / LOCAL NETWORK
On the computer, run: node serve.mjs 8080 --lan
Open the printed same-network address on the iPad. For iPad offline/PWA
installation, host these files over HTTPS and use Safari's Add to Home Screen.
Desktop localhost is also supported for service-worker offline testing.

Do not open index.html directly with a file:// URL: browser modules need HTTP.
Progress is stored per browser and address; keep the same address and port.

SOURCE DEVELOPMENT
The complete GitHub source includes the editor, tests, research and design
review. In that source checkout run npm ci, then npm run dev.

FURTHER TESTING
Desktop and iPad-sized automated checks are recorded in the source repository.
Physical iPad frame rate, touch feel, thermals and Safari offline installation
still need device playtesting. Automated clears do not establish enjoyment.
