export class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.onAudioChunk = null;
        this.onStatusChange = null;
        this.reconnectAttempts = 0;
        this.pingInterval = null;
    }

    connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            if (this.onStatusChange) this.onStatusChange('connected');

            // Start heartbeat
            this.pingInterval = setInterval(() => {
                this.sendPing();
            }, 5000);
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'audio_chunk' && this.onAudioChunk) {
                    this.onAudioChunk(message);
                } else if (message.type === 'pong') {
                    // Heartbeat response
                }
            } catch (e) {
                console.error('Failed to parse message', e);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.clearPing();
            if (this.onStatusChange) this.onStatusChange('disconnected');

            // Attempt reconnect if not explicitly closed
            if (this.reconnectAttempts < 5) {
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.connect();
                }, 2000 * Math.pow(2, this.reconnectAttempts));
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (this.onStatusChange) this.onStatusChange('error');
        };
    }

    disconnect() {
        this.reconnectAttempts = 5; // Prevent auto-reconnect
        this.clearPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    sendAudioChunk(base64Data, timestamp, metadata = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'audio_chunk',
                data: base64Data,
                timestamp: timestamp,
                ...metadata
            }));
        }
    }

    sendPing() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
        }
    }

    clearPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
}
