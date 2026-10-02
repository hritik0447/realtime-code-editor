const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
const JUDGE0_URL = process.env.JUDGE0_URL || 'https://ce.judge0.com';
const LANGUAGE_IDS = { javascript: 63, python: 71, cpp: 54, java: 62 };
const runningRooms = new Set();

async function runOnJudge0({ code, language, stdin }) {
    const languageId = LANGUAGE_IDS[language];
    if (!languageId) throw new Error('Unsupported language');

    // 1. Code submit karo, token milega
    const createRes = await fetch(
        `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source_code: code,
                language_id: languageId,
                stdin: stdin || '',
            }),
        }
    );
    if (!createRes.ok) {
        throw new Error(`Judge0 error (HTTP ${createRes.status})`);
    }
    const { token } = await createRes.json();

    // 2. Result aane tak poll karo (status id 1,2 = queue/processing)
    for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const res = await fetch(
            `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`
        );
        const data = await res.json();
        if (data.status && data.status.id > 2) return data;
    }
    throw new Error('Timed out waiting for the result');
}
const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });
        socket.on(ACTIONS.TYPING, ({ roomId }) => {
        socket.in(roomId).emit(ACTIONS.TYPING, {
            socketId: socket.id,
            username: userSocketMap[socket.id],
        });
    });

    socket.on(ACTIONS.STOP_TYPING, ({ roomId }) => {
        socket.in(roomId).emit(ACTIONS.STOP_TYPING, { socketId: socket.id });
    });

    socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
        socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
    });

    socket.on(ACTIONS.SYNC_LANGUAGE, ({ socketId, language }) => {
        io.to(socketId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
    });
    socket.on(ACTIONS.RUN_CODE, async ({ roomId, code, language, stdin }) => {
        if (!socket.rooms.has(roomId)) return; // sirf room ke member run kar sakte hain
        if (runningRooms.has(roomId)) return; // ek room me ek time par ek hi run

        const username = userSocketMap[socket.id];

        if (typeof code !== 'string' || code.length > 20000) {
            io.to(roomId).emit(ACTIONS.RUN_RESULT, {
                username,
                status: 'Error',
                isError: true,
                output: 'Code is empty or too large (max 20000 characters).',
                time: null,
                memory: null,
            });
            return;
        }

        runningRooms.add(roomId);
        io.to(roomId).emit(ACTIONS.RUN_STARTED, { username });

        try {
            const r = await runOnJudge0({ code, language, stdin });
            const output = [r.stdout, r.stderr, r.compile_output, r.message]
                .filter(Boolean)
                .join('\n');
            io.to(roomId).emit(ACTIONS.RUN_RESULT, {
                username,
                status: r.status.description,
                isError: r.status.id !== 3,
                output: output || '(no output)',
                time: r.time,
                memory: r.memory,
            });
        } catch (err) {
            io.to(roomId).emit(ACTIONS.RUN_RESULT, {
                username,
                status: 'Error',
                isError: true,
                output: err.message,
                time: null,
                memory: null,
            });
        } finally {
            runningRooms.delete(roomId);
        }
    });
    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
