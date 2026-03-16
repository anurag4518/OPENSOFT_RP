import React, { useState, useRef, useEffect } from 'react';

const VoiceStreamer = ({ wsClient }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingError, setRecordingError] = useState('');
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const processorNodeRef = useRef(null);

    const arrayBufferToBase64 = (buffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 0x8000;

        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
        }

        return btoa(binary);
    };

    const convertFloat32ToInt16 = (float32Array) => {
        const int16Array = new Int16Array(float32Array.length);

        for (let i = 0; i < float32Array.length; i++) {
            const sample = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        return int16Array;
    };

    const cleanupAudioNodes = async () => {
        if (processorNodeRef.current) {
            processorNodeRef.current.disconnect();
            processorNodeRef.current.onaudioprocess = null;
            processorNodeRef.current = null;
        }

        if (sourceNodeRef.current) {
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current) {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                setRecordingError('Microphone access is not supported in this browser.');
                return;
            }

            setRecordingError('');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });
            audioContextRef.current = audioContext;

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const source = audioContext.createMediaStreamSource(stream);
            sourceNodeRef.current = source;

            const processor = audioContext.createScriptProcessor(1024, 1, 1);
            processorNodeRef.current = processor;

            processor.onaudioprocess = (event) => {
                if (!wsClient) return;

                const inputData = event.inputBuffer.getChannelData(0);
                const pcm16 = convertFloat32ToInt16(inputData);
                const base64Data = arrayBufferToBase64(pcm16.buffer);

                wsClient.sendAudioChunk(base64Data, Date.now(), {
                    format: 'pcm16',
                    sampleRate: audioContext.sampleRate,
                    channels: 1
                });
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            setRecordingError('Unable to start recording. Please allow mic permission and try again.');
            await cleanupAudioNodes();
        }
    };

    const stopRecording = async () => {
        if (isRecording) {
            await cleanupAudioNodes();
            setIsRecording(false);
        }
    };

    useEffect(() => {
        return () => {
            cleanupAudioNodes();
        };
    }, []);

    return (
        <div className="voice-streamer stream-card">
            <div className="stream-head">
                <div>
                    <p className="stream-kicker">Mic Channel</p>
                    <h2 className="stream-title">Input Stream</h2>
                </div>
                <span className="stream-pill">Live Capture</span>
            </div>

            <div className="stream-controls">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`stream-btn ${isRecording
                            ? 'stream-btn-recording'
                            : 'stream-btn-idle'
                        }`}
                >
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                {isRecording && (
                    <div className="stream-live-wrap">
                        <span className="stream-live-dot-wrap">
                            <span className="stream-live-dot-ping"></span>
                            <span className="stream-live-dot"></span>
                        </span>
                        <span className="stream-live-label">Live</span>
                    </div>
                )}
            </div>

            {recordingError && <p className="stream-error">{recordingError}</p>}
        </div>
    );
};

export default VoiceStreamer;
