import React, { useState, useEffect } from 'react';
import { WebSocketClient } from './websocket';
import VoiceStreamer from './VoiceStreamer';
import AudioPlayer from './AudioPlayer';
import './App.css';

function App() {
  const [wsClient, setWsClient] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    // Configure WebSocket URL to point to backend
    // For local dev, assuming FastAPI is running on port 8000
    const wsUrl = `ws://${window.location.hostname}:8000/ws/audio`;
    const client = new WebSocketClient(wsUrl);

    client.onStatusChange = (status) => {
      setConnectionStatus(status);
    };

    client.connect();
    setWsClient(client);

    return () => {
      client.disconnect();
    };
  }, []);

  return (
    <div className="app-page">
      <div className="app-shell">
        <header className="app-header agora-shell">
          <div>
            <p className="app-kicker">Voice Session</p>
            <h1 className="app-title">
              AI Voice Agent Pipeline
            </h1>
            <p className="app-subtitle">Low-latency bidirectional audio streaming</p>
          </div>

          <div className="agora-status app-status-wrap">
            <span
              className={`status-dot ${connectionStatus === 'connected'
                ? 'status-dot-connected'
                : connectionStatus === 'error'
                  ? 'status-dot-error'
                  : 'status-dot-connecting'
                }`}
            ></span>
            <span className="app-status-label">Backend</span>
            <span
              className={`app-status-value ${connectionStatus === 'connected'
                ? 'app-status-connected'
                : connectionStatus === 'error'
                  ? 'app-status-error'
                  : 'app-status-connecting'
                }`}
            >
              {connectionStatus}
            </span>
          </div>
        </header>

        <div className="stream-grid">
          <VoiceStreamer wsClient={wsClient} />
          <AudioPlayer wsClient={wsClient} />
        </div>

        <div className="agora-shell diagnostics-card">
          <h3 className="diagnostics-title">
            <svg className="diagnostics-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Session Diagnostics
          </h3>
          <ul className="diagnostics-list">
            <li>Captures 16kHz PCM audio from microphone in ~20ms chunks</li>
            <li>Streams encoded blobs to FastAPI backend via WebSockets</li>
            <li>Async buffering simulates STT/NLU/TTS processing latency</li>
            <li>Decodes and schedules playback using Web Audio API buffer</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
