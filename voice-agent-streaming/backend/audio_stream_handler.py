import asyncio
from fastapi import WebSocket
from websocket_manager import manager

class AudioStreamHandler:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.audio_queue = asyncio.Queue()
        self.processing_task = None
        
    async def start(self):
        # Start the background task to process audio chunks
        self.processing_task = asyncio.create_task(self._process_audio())
        
    async def stop(self):
        if self.processing_task:
            self.processing_task.cancel()
            
    async def handle_incoming_chunk(self, chunk_data: dict):
        # Enqueue the incoming chunk for background processing
        await self.audio_queue.put(chunk_data)
        
    async def _process_audio(self):
        """
        Simulates AI processing: STT -> NLU -> TTS.
        Reads from async queue, simulates a short processing delay, 
        and streams the audio chunk back.
        """
        try:
            while True:
                # Get the next chunk from the queue
                chunk_data = await self.audio_queue.get()
                
                # Simulate processing delay (e.g., STT/TTS latency)
                # For low latency, keep this small
                await asyncio.sleep(0.01) # 10ms simulated latency
                
                # In a real system, we would:
                # 1. Decode PCM audio -> Pass to STT
                # 2. Get text -> Pass to LLM/NLU
                # 3. Get response text -> Pass to TTS
                # 4. Get TTS audio -> Send back to client
                
                # For this pipeline test, we just echo the audio chunk back
                # to prove the full bidirectional streaming works
                
                response_chunk = {
                    "type": "audio_chunk",
                    "data": chunk_data.get("data"),
                    "timestamp": chunk_data.get("timestamp"),
                    "format": chunk_data.get("format"),
                    "sampleRate": chunk_data.get("sampleRate"),
                    "channels": chunk_data.get("channels")
                }
                
                # Send the "processed" chunk back to the client
                await manager.send_json(response_chunk, self.websocket)
                
                # Mark task as done
                self.audio_queue.task_done()
                
        except asyncio.CancelledError:
            print("Audio processing task cancelled.")
        except Exception as e:
            print(f"Error in audio processing: {e}")
