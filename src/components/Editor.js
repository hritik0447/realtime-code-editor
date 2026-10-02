import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';

// Themes
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/theme/material.css';
import 'codemirror/theme/eclipse.css';

// Language modes
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike';

import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';

export const LANGUAGES = {
    javascript: { label: 'JavaScript', mode: 'javascript' },
    python: { label: 'Python', mode: 'python' },
    cpp: { label: 'C++', mode: 'text/x-c++src' },
    java: { label: 'Java', mode: 'text/x-java' },
};

export const THEMES = ['dracula', 'monokai', 'material', 'eclipse'];

const Editor = ({ socketRef, roomId, onCodeChange, language, theme }) => {
    const editorRef = useRef(null);
    const isTypingRef = useRef(false);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        editorRef.current = Codemirror.fromTextArea(
            document.getElementById('realtimeEditor'),
            {
                mode: LANGUAGES[language].mode,
                theme: theme,
                autoCloseTags: true,
                autoCloseBrackets: true,
                lineNumbers: true,
            }
        );

        editorRef.current.on('change', (instance, changes) => {
            const { origin } = changes;
            const code = instance.getValue();
            onCodeChange(code);
            if (origin !== 'setValue') {
                socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                    roomId,
                    code,
                });

                // Typing indicator: pehli keystroke par "typing",
                // 1.5 sec ruk jao to "stop typing"
                if (!isTypingRef.current) {
                    isTypingRef.current = true;
                    socketRef.current.emit(ACTIONS.TYPING, { roomId });
                }
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    isTypingRef.current = false;
                    socketRef.current.emit(ACTIONS.STOP_TYPING, { roomId });
                }, 1500);
            }
        });

        return () => clearTimeout(typingTimeoutRef.current);
    }, []);

    // Language badalne par mode update
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setOption('mode', LANGUAGES[language].mode);
        }
    }, [language]);

    // Theme badalne par theme update
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setOption('theme', theme);
        }
    }, [theme]);

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null) {
                    editorRef.current.setValue(code);
                }
            });
        }

        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE);
        };
    }, [socketRef.current]);

    return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;