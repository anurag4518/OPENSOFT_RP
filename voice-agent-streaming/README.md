# Voice Agent Streaming Pipeline

A low-latency, real-time bidirectional audio streaming pipeline built for AI Voice Customer Support Agents.

## Architecture
- **Frontend**: React + Vite + TailwindCSS. Uses Native `MediaRecorder` API to capture microphone input, encodes chunks as Opus/WebM, and streams via WebSockets. Uses `AudioContext` to play back streaming audio.
- **Backend**: FastAPI + Uvicorn + WebSockets. Uses `asyncio.Queue` to buffer incoming frames, simulating a non-blocking asynchronous processing pipeline (where STT/NLU/TTS will eventually plug in).

## Prerequisites
- Node.js (v18+ recommended)
- Python (3.11+ recommended)
- Docker & Docker Compose (optional, for containerized running)

## Setup & Local Run Instructions

### 1. Backend Setup
Navigate to the backend directory, create a virtual environment, install dependencies, and run the server.

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The server will start at `ws://localhost:8000/ws/audio`.

### 2. Frontend Setup
Navigate to the frontend directory, install dependencies, and start the development server.

```bash
cd frontend
npm install
npm run dev
```
Open the provided local URL (usually `http://localhost:5173`) in your web browser.

## Docker Support

You can also run the application using Docker.

**Build Backend:**
```bash
docker build -t voice-streaming-backend -f docker/Dockerfile.backend backend/
docker run -p 8000:8000 voice-streaming-backend
```

**Build Frontend:**
```bash
docker build -t voice-streaming-frontend -f docker/Dockerfile.frontend .
docker run -p 8080:80 voice-streaming-frontend
```

## Testing Instructions
1. Run both the backend and frontend locally.
2. Open the frontend URL in your browser.
3. Allow the browser to access your microphone.
4. Click **Start Recording**. The frontend will capture your microphone, split it into ~20ms chunks, and stream it to the backend.
5. Watch the Terminal/Console logs:
   - Backend terminal should show "New WebSocket connection established." and logging if you added print statements.
   - You should seamlessly hear your voice echoed back through the browser, proving the full bidirectional stream loop (Mic -> WS -> FastAPI Queue -> WS -> Speakers) works.
6. Check the "Pipeline Details" and "Backend Status" UI elements on the React page which should display `Connected` and pulse while recording.
