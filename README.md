Real-Time Collaborative Code Editor

A browser-based code editor where multiple people join a shared room, write code together, and run it with the output shown to everyone instantly.

Live Demo: your-app.onrender.com (free hosting, the first load can take 30-60 seconds to wake up)

Show Image

Features
Real-time collaboration: code typed by one user appears for everyone in the room instantly (Socket.IO).
Room-based sessions: create a room, share the Room ID, and others can join with just a username. No login needed.
Live presence: see who is connected, with join and leave notifications.
Typing indicator: shows "Ravi is typing..." (debounced, so it does not spam the server).
Multi-language support: JavaScript, Python, C++ and Java with syntax highlighting. Language selection is synced across the room, and late joiners get the current language.
Run code in the browser: code is executed with the Judge0 API, with optional custom input (stdin).
Shared output panel: when anyone clicks Run, every user in the room sees the same output, status and run time.
Themes: Dracula, Monokai, Material and Eclipse (light). The theme is a personal setting and is not synced.
Tech Stack
Layer	Technology
Frontend	React.js, CodeMirror 5, React Router
Backend	Node.js, Express.js
Real-time	Socket.IO (WebSockets)
Code execution	Judge0 CE API
Hosting	Render
How It Works
Browser A ──┐                                   ┌── Browser B
            │   Socket.IO events                │
            ├──────────►  Node.js server  ◄─────┤
            │                  │                │
            │                  ▼                │
            │             Judge0 API            │
            │      (submit code, poll result)   │
            └── output broadcast to the room ───┘
A user joins a room, and the server adds their socket to that room.
Every code change is sent to the server and relayed to the other users in the same room.
When Run is clicked, the browser sends the code to our server, not directly to Judge0. The server submits it to Judge0, polls until the result is ready, and broadcasts the result to the whole room.
Socket events
Event	Direction	Purpose
join / joined	client → server → room	Enter a room, update the user list
code-change	client → server → room	Sync editor content
sync-code	server → new user	Send current code to a late joiner
typing / stop-typing	client → server → room	Typing indicator
language-change	client → server → room	Sync selected language
sync-language	client → server → new user	Send current language to a late joiner
run-code	client → server	Request code execution
run-started / run-result	server → room	Show "running" state and the final output
disconnected	server → room	Remove a user who left
Design decisions
Judge0 is called from the backend, not the browser. This avoids CORS problems and keeps any future API key off the client.
Submit + poll flow: the server submits the code, gets a token, then polls until the status is final.
Per-room execution lock: only one run per room at a time, which prevents duplicate runs and protects the shared public API from being spammed.
Room membership check: the server only accepts run-code from sockets that are actually in that room.
Basic limits: code size is capped before it is sent for execution.
Run Locally

Requirements: Node.js 18 or newer

bash
git clone https://github.com/YOUR_USERNAME/realtime-code-editor.git
cd realtime-code-editor
npm install

Create a .env file in the project root:

REACT_APP_BACKEND_URL=http://localhost:5000

Start the backend and the frontend in two separate terminals:

bash
# Terminal 1: backend (port 5000)
npm run server:dev

# Terminal 2: frontend (port 3000)
npm run start:front

Open http://localhost:3000.

To test collaboration, open a second tab (or an incognito window) and join the same Room ID with a different username.

Production build
bash
npm run build
npm run server:prod

The Express server serves the React build, so frontend and backend run as a single service. Open http://localhost:5000.

Optional configuration
Variable	Default	Description
PORT	5000	Server port
JUDGE0_URL	https://ce.judge0.com	Judge0 instance to use (set this to your own instance if you self-host)
Project Structure
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
Known Limitations
No conflict resolution: text sync is a simple broadcast, so two people typing at the same moment can overwrite each other. A CRDT library such as Yjs would solve this properly.
Nothing is saved: the code lives only in the browser, and it is gone when everyone leaves the room.
Public Judge0 instance: it is shared and rate-limited, so runs can occasionally be slow or fail. For heavier use, self-host Judge0 and set JUDGE0_URL.
Java programs must use public class Main, because of how Judge0 compiles Java.
Possible Improvements
Yjs (CRDT) for conflict-free editing and remote cursors
Save rooms and code in MongoDB
Room chat
Authentication and private rooms
Credits

The base room and sync functionality started from an open-source realtime code editor project. The language selector, themes, typing indicator, Judge0 code execution, shared output panel and the execution safeguards were added on top of it.