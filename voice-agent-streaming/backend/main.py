from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from websocket_manager import manager
from audio_stream_handler import AudioStreamHandler
import json

app = FastAPI(title="Voice Agent Streaming API", description="Low-latency bidirectional audio streaming")

@app.get("/")
async def root():
    return {"message": "Voice Agent Streaming API is running."}

@app.websocket("/ws/audio")
async def websocket_ep(websocket: WebSocket):
    await manager.connect(websocket)
    print("New WebSocket connection established.")
    
    stream_handler = AudioStreamHandler(websocket)
    await stream_handler.start()
    
    try:
        while True:
            # Receive data as text (JSON)
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                msg_type = message.get("type")
                
                if msg_type == "audio_chunk":
                    # Process the incoming audio chunk
                    await stream_handler.handle_incoming_chunk(message)
                elif msg_type == "ping":
                    # Handle heartbeat to keep connection alive
                    await manager.send_json({"type": "pong"}, websocket)
                else:
                    print(f"Unknown message type: {msg_type}")
                    
            except json.JSONDecodeError:
                print("Received non-JSON message, ignoring.")
                
    except WebSocketDisconnect:
        print("WebSocket disconnected normally.")
        manager.disconnect(websocket)
        await stream_handler.stop()
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
        await stream_handler.stop()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
