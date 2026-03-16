import React, { useEffect, useRef, useState } from 'react';

const AudioPlayer = ({ wsClient }) => {
    const audioContextRef = useRef(null);
    const nextPlayTimeRef = useRef(0);
    const resetPlayingTimeoutRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const base64ToArrayBuffer = (base64Data) => {
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
    };

    const decodePcm16ToAudioBuffer = (arrayBuffer, sampleRate, audioContext) => {
        const int16Array = new Int16Array(arrayBuffer);
        const audioBuffer = audioContext.createBuffer(1, int16Array.length, sampleRate);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < int16Array.length; i++) {
            channelData[i] = int16Array[i] / 32768;
        }

        return audioBuffer;
    };

    useEffect(() => {
        if (!wsClient) return;

        // Handle incoming chunks
        wsClient.onAudioChunk = async (message) => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: 16000
                });
            }

            const audioCtx = audioContextRef.current;
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            try {
                if (message.format !== 'pcm16') {
                    return;
                }

                const sampleRate = Number(message.sampleRate) || 16000;
                const audioBytes = base64ToArrayBuffer(message.data);
                const audioBuffer = decodePcm16ToAudioBuffer(audioBytes, sampleRate, audioCtx);

                playBuffer(audioBuffer);
                if (!isPlaying) setIsPlaying(true);

                if (resetPlayingTimeoutRef.current) {
                    clearTimeout(resetPlayingTimeoutRef.current);
                }

                resetPlayingTimeoutRef.current = setTimeout(() => {
                    setIsPlaying(false);
                }, Math.max(120, audioBuffer.duration * 1000 + 40));

            } catch (e) {
                console.error('Error processing audio chunk', e);
            }
        };

        return () => {
            wsClient.onAudioChunk = null;
            if (resetPlayingTimeoutRef.current) {
                clearTimeout(resetPlayingTimeoutRef.current);
                resetPlayingTimeoutRef.current = null;
            }
        };
    }, [wsClient]);

    const playBuffer = (buffer) => {
        const audioCtx = audioContextRef.current;
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);

        // Schedule playback seamlessly
        const currentTime = audioCtx.currentTime;
        if (nextPlayTimeRef.current < currentTime) {
            nextPlayTimeRef.current = currentTime + 0.05; // 50ms buffer
        }

        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += buffer.duration;
    };

    return (
        <div className="audio-player stream-card">
            <div className="stream-head">
                <div>
                    <p className="stream-kicker">Agent Channel</p>
                    <h2 className="stream-title">Output Stream</h2>
                </div>
                <span className="stream-pill">Audio Return</span>
            </div>

            <div className="player-status-row">
                <div className={`player-indicator ${isPlaying ? 'player-indicator-active' : 'player-indicator-idle'}`}>
                    <svg className={`player-indicator-icon ${isPlaying ? 'player-indicator-icon-active' : 'player-indicator-icon-idle'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18h.01M8 12a4 4 0 118 0 4 4 0 01-8 0z"></path>
                    </svg>
                </div>
                <p className="player-status-text">
                    {isPlaying ? 'Receiving audio...' : 'Waiting for audio...'}
                </p>
            </div>
        </div>
    );
};

export default AudioPlayer;
