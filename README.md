🧑‍💻 Real-Time Collaborative Code Editor

Write, run and share code together, live. Join a room, code with others in real time, and see the output on everyone's screen at once.

Live Demo · Features · How it works · Run locally

<sub>Hosted on a free plan, so the first load can take 30-60 seconds to wake up.</sub>

</div> <!-- Screenshot add karne ke baad is block ko uncomment karo: <p align="center"> <img src="docs/demo.png" alt="App screenshot" width="850"> </p> -->

📌 What is this?

A browser-based code editor where multiple people join a shared room and work on the same code at the same time. Anyone can click Run, and the output appears for everyone in the room.

Where it is useful

Online interviews: the interviewer and candidate see the same code and output live.
Doubt solving: fix a friend's code directly in their editor instead of sending screenshots.
Teaching: a teacher writes code and students follow along and run it.
Pair practice: solve DSA problems together.

✨ Features
	Feature	Details
🔄	Real-time sync	Code typed by one user appears for everyone in the room instantly (Socket.IO)
🚪	Room-based sessions	Create a room, share the Room ID, join with just a username. No login
👥	Live presence	See who is connected, with join and leave notifications
✍️	Typing indicator	"Ravi is typing..." (debounced, so it does not spam the server)
🌐	Multi-language	JavaScript, Python, C++, Java with syntax highlighting. Language is synced across the room, and late joiners get the current one
▶️	Run code	Runs on the Judge0 API, with optional custom input (stdin)
📺	Shared output panel	Output, status, run time and memory are shown to every user in the room
🎨	Themes	Dracula, Monokai, Material, Eclipse (light). A personal setting, not synced.


🧰 Tech Stack
Layer	Technology
Frontend	React.js, CodeMirror 5, React Router
Backend	Node.js, Express.js
Real-time	Socket.IO (WebSockets)
Code execution	Judge0 CE API
Hosting	Render

⚙️ How It Works

When someone clicks Run, the browser does not talk to Judge0 directly. The request goes through our server, which then shares the result with the whole room.
<img width="678" height="467" alt="image" src="https://github.com/user-attachments/assets/8f3318da-2173-4778-be20-1fc6d366a5d2" />
Design decisions
Judge0 is called from the backend, not the browser. This avoids CORS problems and keeps any future API key off the client.
Submit + poll: the server submits the code, gets a token, and polls until the status is final.
Per-room execution lock: only one run per room at a time. This prevents duplicate runs and protects the shared public API from being spammed.
Room membership check: the server accepts run-code only from sockets that are actually in that room.
Input limits: code size is capped before it is sent for execution.
Debounced typing events: one event when typing starts, one when it stops, instead of one per keystroke.
🚀 Run Locally

Requirements: Node.js 18 or newer

bash
git clone https://github.com/hritik0447/realtime-code-editor.git
cd realtime-code-editor
npm install

Create a .env file in the project root:

env
REACT_APP_BACKEND_URL=http://localhost:5000

Start the backend and the frontend in two separate terminals:

bash
# Terminal 1: backend (port 5000)
npm run server:dev

# Terminal 2: frontend (port 3000)
npm run start:front

Open http://localhost:3000. To test collaboration, open a second tab (or an incognito window) and join the same Room ID with a different username.

Production build
bash
npm run build
npm run server:prod

The Express server serves the React build, so the frontend and backend run as a single service. Open http://localhost:5000.

Configuration
Variable	Default	Description
PORT	5000	Server port
JUDGE0_URL	https://ce.judge0.com	Judge0 instance to use (set your own if you self-host)
REACT_APP_BACKEND_URL	same origin	Backend URL for the frontend (needed only in local development)
☁️ Deployment (Render)

The app deploys as a single Web Service, because the Express server also serves the React build.

Setting	Value
Build Command	npm install && CI=false npm run build
Start Command	npm run server:prod

Vercel is not suitable for the backend, because it runs serverless functions and cannot keep persistent WebSocket connections.

📁 Project Structure
├── server.js                 # Express + Socket.IO server, Judge0 integration
├── src/
│   ├── Actions.js            # Socket event names (shared by client and server)
│   ├── socket.js             # Socket client setup
│   ├── pages/
│   │   ├── Home.js           # Create / join a room
│   │   └── EditorPage.js     # Editor page, controls, output panel
│   └── components/
│       ├── Editor.js         # CodeMirror editor, languages, themes
│       └── Client.js         # User avatar in the sidebar
└── public/
⚠️ Known Limitations
No conflict resolution: text sync is a simple broadcast, so two people typing at the exact same moment can overwrite each other. A CRDT library such as Yjs would solve this properly.
Nothing is saved: the code lives only in the browser and is gone when everyone leaves the room.
Public Judge0 instance: it is shared and rate-limited, so runs can occasionally be slow or fail. For heavier use, self-host Judge0 and set JUDGE0_URL.
Java programs must use public class Main, because of how Judge0 compiles Java.
🔮 Possible Improvements
 Yjs (CRDT) for conflict-free editing and remote cursors
 Save rooms and code in MongoDB
 Room chat
 Authentication and private rooms
📚 What I Learned
Designing a real-time system with WebSocket rooms and targeted broadcasts
Keeping late joiners in sync (current code and current language)
Debouncing frequent events to reduce server load
Integrating a third-party execution API through a backend proxy with the submit-and-poll pattern
Protecting shared resources with authorization checks and locks
🙏 Credits

The base room and sync functionality started from an open-source realtime code editor project. The language selector, themes, typing indicator, Judge0 code execution, shared output panel and the execution safeguards were added on top of it.

👤 Author

Hritik Vishnoi · GitHub


