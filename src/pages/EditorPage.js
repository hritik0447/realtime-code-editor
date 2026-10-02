import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor, { LANGUAGES, THEMES } from '../components/Editor';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const languageRef = useRef('javascript');
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [language, setLanguage] = useState('javascript');
    const [theme, setTheme] = useState('dracula');
    const [typingUsers, setTypingUsers] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [runBy, setRunBy] = useState('');
    const [output, setOutput] = useState(null);
    const [stdin, setStdin] = useState('');

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                        console.log(`${username} joined`);
                    }
                    setClients(clients);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                    // Naye user ko current language bhi bhejo
                    if (socketId !== socketRef.current.id) {
                        socketRef.current.emit(ACTIONS.SYNC_LANGUAGE, {
                            socketId,
                            language: languageRef.current,
                        });
                    }
                }
            );

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                    setTypingUsers((prev) =>
                        prev.filter((u) => u.socketId !== socketId)
                    );
                }
            );

            // Language change (dusre user ne badli)
            socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language }) => {
                if (LANGUAGES[language]) {
                    setLanguage(language);
                    languageRef.current = language;
                }
            });

            // Typing indicator
            socketRef.current.on(ACTIONS.TYPING, ({ socketId, username }) => {
                setTypingUsers((prev) =>
                    prev.some((u) => u.socketId === socketId)
                        ? prev
                        : [...prev, { socketId, username }]
                );
            });

            socketRef.current.on(ACTIONS.STOP_TYPING, ({ socketId }) => {
                setTypingUsers((prev) =>
                    prev.filter((u) => u.socketId !== socketId)
                );
            });

            // Code run: koi bhi run kare, sabko dikhta hai
            socketRef.current.on(ACTIONS.RUN_STARTED, ({ username }) => {
                setIsRunning(true);
                setRunBy(username);
            });

            socketRef.current.on(ACTIONS.RUN_RESULT, (result) => {
                setIsRunning(false);
                setOutput(result);
            });
        };
        init();
        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
            socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
            socketRef.current.off(ACTIONS.TYPING);
            socketRef.current.off(ACTIONS.STOP_TYPING);
            socketRef.current.off(ACTIONS.RUN_STARTED);
            socketRef.current.off(ACTIONS.RUN_RESULT);
        };
    }, []);

    function handleLanguageChange(e) {
        const value = e.target.value;
        setLanguage(value);
        languageRef.current = value;
        socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
            roomId,
            language: value,
        });
    }

    function runCode() {
        if (isRunning) return;
        if (!codeRef.current || !codeRef.current.trim()) {
            toast.error('Write some code first.');
            return;
        }
        socketRef.current.emit(ACTIONS.RUN_CODE, {
            roomId,
            code: codeRef.current,
            language,
            stdin,
        });
    }

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    let typingText = '';
    if (typingUsers.length === 1) {
        typingText = `${typingUsers[0].username} is typing...`;
    } else if (typingUsers.length === 2) {
        typingText = `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`;
    } else if (typingUsers.length > 2) {
        typingText = 'Several people are typing...';
    }

    let metaText = '';
    if (output) {
        metaText = `Run by ${output.username}`;
        if (output.time) metaText += ` • ${output.time}s`;
        if (output.memory) metaText += ` • ${output.memory} KB`;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/code-sync.png"
                            alt="logo"
                        />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>

                    <div className="controls">
                        <label className="controlLabel">Language</label>
                        <select
                            className="selectBox"
                            value={language}
                            onChange={handleLanguageChange}
                        >
                            {Object.entries(LANGUAGES).map(([key, { label }]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>

                        <label className="controlLabel">Theme</label>
                        <select
                            className="selectBox"
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                        >
                            {THEMES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <p className="typingText">{typingText}</p>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    language={language}
                    theme={theme}
                    onCodeChange={(code) => {
                        codeRef.current = code;
                    }}
                />

                <div className="outputPanel">
                    <div className="outputHeader">
                        <span>Output</span>
                        {output && !isRunning && (
                            <span
                                className={`statusBadge ${
                                    output.isError ? 'error' : 'ok'
                                }`}
                            >
                                {output.status}
                            </span>
                        )}
                        <span className="outputMeta">
                            {isRunning ? '' : metaText}
                        </span>
                        <button
                            className="btn runBtn"
                            onClick={runCode}
                            disabled={isRunning}
                        >
                            {isRunning ? 'Running...' : '▶ Run'}
                        </button>
                    </div>
                    <div className="outputBody">
                        <textarea
                            className="stdinBox"
                            placeholder="Input (stdin), optional"
                            value={stdin}
                            onChange={(e) => setStdin(e.target.value)}
                        />
                        <pre
                            className={`outputText ${
                                output && output.isError && !isRunning
                                    ? 'error'
                                    : ''
                            }`}
                        >
                            {isRunning
                                ? `Running... (started by ${runBy})`
                                : output
                                ? output.output
                                : 'Click Run to see the output here.'}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorPage;