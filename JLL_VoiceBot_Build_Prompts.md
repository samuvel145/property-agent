# JLL Property Assistant — Voice Bot Upgrade
## Step-by-Step Build Prompts

**Use these prompts in order with Cursor / Claude Code / ChatGPT**
**Base project:** https://github.com/samuvel145/property-agent
**Voice pipeline reference:** https://github.com/samuvel145/AI-Voice-agent
**Stack:** Next.js 16 + TypeScript (frontend) · Python 3.11 + FastAPI (voice backend)

---

## PART A — PYTHON VOICE BACKEND

> Create a new folder called `voice_backend/` at the root of the property-agent project.
> All steps in Part A go inside this folder.
> Follow the same folder structure and patterns from the AI-Voice-agent reference repo.

---

### Step 1 — Project scaffold & dependencies

```
Inside voice_backend/, create the following folder structure:

voice_backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   └── websocket_handler.py
├── services/
│   ├── __init__.py
│   ├── stt_deepgram.py
│   ├── llm_groq.py
│   └── tts_cartesia.py
├── mcp/
│   ├── __init__.py
│   ├── mcp_server.py
│   └── jll_tools.py
├── audio/
│   ├── __init__.py
│   ├── vad.py
│   └── audio_buffer.py
├── session/
│   ├── __init__.py
│   └── session_manager.py
├── config.py
├── run.py
├── requirements.txt
└── .env

Create requirements.txt with these exact packages:
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
websockets>=12.0
deepgram-sdk>=3.0.0
groq>=0.9.0
cartesia>=1.0.0
webrtcvad>=2.0.10
python-dotenv>=1.0.0
httpx>=0.27.0
pydantic>=2.0.0
pydantic-settings>=2.0.0

Create .env with these keys (leave values empty for now):
DEEPGRAM_API_KEY=
GROQ_API_KEY=
CARTESIA_API_KEY=
CARTESIA_VOICE_ID=
JLL_API_BASE_URL=https://jll-backend.ibism.com/api
HOST=0.0.0.0
PORT=8000
VAD_AGGRESSIVENESS=2
SILENCE_THRESHOLD_MS=800
MAX_HISTORY_TURNS=10
LLM_MODEL=llama3-70b-8192
LLM_MAX_TOKENS=500
SAMPLE_RATE=16000
FRAME_DURATION_MS=20
```

---

### Step 2 — Config (Pydantic settings)

```
Create voice_backend/config.py using pydantic-settings BaseSettings.
Follow the exact pattern from https://github.com/samuvel145/AI-Voice-agent/blob/master/config.py

The Settings class must load all variables from .env:
- DEEPGRAM_API_KEY: str
- GROQ_API_KEY: str
- CARTESIA_API_KEY: str
- CARTESIA_VOICE_ID: str = "default"
- JLL_API_BASE_URL: str
- SAMPLE_RATE: int = 16000
- FRAME_DURATION_MS: int = 20
- CHANNELS: int = 1
- FRAME_SIZE property: returns SAMPLE_RATE * 2 * FRAME_DURATION_MS // 1000  (= 640 bytes)
- VAD_AGGRESSIVENESS: int = 2
- SILENCE_THRESHOLD_MS: int = 800
- LLM_MODEL: str = "llama3-70b-8192"
- MAX_HISTORY_TURNS: int = 10
- LLM_MAX_TOKENS: int = 500
- HOST: str = "0.0.0.0"
- PORT: int = 8000

Use model_config = SettingsConfigDict(env_file=".env")
Export a singleton: settings = Settings()
```

---

### Step 3 — Audio buffer

```
Create voice_backend/audio/audio_buffer.py.
Follow the same pattern from the AI-Voice-agent reference repo audio/audio_buffer.py.

Implement an AudioBuffer class with:
- Internal list to accumulate raw PCM byte frames
- append(frame: bytes) method to add a frame
- get_audio() method that returns all buffered bytes joined as a single bytes object
- reset() method to clear the buffer
- has_data() method that returns True if buffer has any frames
- duration_ms() method that calculates buffered audio duration:
  total_bytes / (SAMPLE_RATE * 2) * 1000
  Use settings.SAMPLE_RATE from config.py
```

---

### Step 4 — VAD (Voice Activity Detection)

```
Create voice_backend/audio/vad.py.
Follow the same pattern from AI-Voice-agent reference repo audio/vad.py.

Use the webrtcvad library. Implement a VADProcessor class:

Constructor:
- Initialize webrtcvad.Vad with aggressiveness from settings.VAD_AGGRESSIVENESS
- Initialize an AudioBuffer instance
- Track consecutive silence frames counter
- Calculate silence_frames_threshold:
  settings.SILENCE_THRESHOLD_MS // settings.FRAME_DURATION_MS

process(frame: bytes) -> tuple[bool, bool]:
- Returns (is_speech: bool, speech_ended: bool)
- Call vad.is_speech(frame, settings.SAMPLE_RATE) to check if frame contains voice
- If is_speech: append frame to buffer, reset silence counter, return (True, False)
- If not is_speech and buffer has data:
  - Increment silence counter
  - If silence counter >= threshold: return (False, True)  ← speech ended!
  - Else: append frame to buffer, return (False, False)
- If not is_speech and no buffer: return (False, False)

get_audio_buffer() -> bytes:
- Return buffer.get_audio()

has_buffered_audio() -> bool:
- Return buffer.has_data()

reset():
- Call buffer.reset()
- Reset silence counter to 0
```

---

### Step 5 — Session manager

```
Create voice_backend/session/session_manager.py.
Follow the same pattern from AI-Voice-agent reference repo session/session_manager.py.

Implement a Session class:
- session_id: str
- history: list of dicts [{"role": "user"/"assistant", "content": "..."}]
- created_at: datetime
- last_active: datetime

Methods:
- add_turn(user_text: str, assistant_text: str):
  Append user message then assistant message to history.
  Keep only last MAX_HISTORY_TURNS * 2 messages (trim oldest pairs first).
  Update last_active.
- get_history() -> list: return history
- clear(): empty history

Implement a SessionManager class:
- Internal dict: sessions = {}
- get_or_create(session_id: str) -> Session
- delete(session_id: str)
- cleanup_old_sessions(): remove sessions inactive > 30 minutes

Export singleton: session_manager = SessionManager()
```

---

### Step 6 — STT service (Deepgram)

```
Create voice_backend/services/stt_deepgram.py.
Follow the same approach as AI-Voice-agent reference repo services/stt_deepgram.py.

Use deepgram-sdk v3+. Implement a DeepgramSTT class:

Constructor:
- Initialize DeepgramClient with settings.DEEPGRAM_API_KEY
- Set model = "nova-2"
- Set language = "en-IN"  (Indian English — important for JLL use case)
- Set encoding = "linear16"
- Set sample_rate = settings.SAMPLE_RATE

async transcribe(audio_bytes: bytes) -> str:
- Use PrerecordedOptions with:
  model="nova-2", language="en-IN", smart_format=True, punctuate=True
- Call asyncio client to transcribe the raw PCM bytes
- Extract transcript from response:
  response.results.channels[0].alternatives[0].transcript
- Return transcript string, or empty string if no speech detected
- Handle exceptions: log and return ""

Export singleton: stt_service = DeepgramSTT()
```

---

### Step 7 — MCP tools (JLL API)

```
Create voice_backend/mcp/jll_tools.py.

This file defines the JLL API tool functions AND the tool schemas for Groq.

1. Implement these async functions using httpx:

async def search_properties(city: str = "", location: str = "", property_type: str = "") -> dict:
  - Build query params dict, skip empty values
  - GET {settings.JLL_API_BASE_URL}/user/search/projects with params
  - Return {"data": response["data"], "total": response["total"]}
  - On error: return {"data": [], "total": 0}

async def get_cities() -> list[str]:
  - GET {settings.JLL_API_BASE_URL}/user/search/projects (no params)
  - Extract unique City values from data array
  - Return sorted list of city strings
  - On error: return ["Chennai", "Bangalore", "Mumbai", "Hyderabad"]

async def get_locations(city: str) -> list[str]:
  - GET {settings.JLL_API_BASE_URL}/user/search/projects?city={city}
  - Extract unique Location values
  - Return sorted list
  - On error: return []

2. Define JLL_TOOLS list (Groq tool format):
[
  {
    "type": "function",
    "function": {
      "name": "search_properties",
      "description": "Search JLL property listings. Call when user wants to find properties.",
      "parameters": {
        "type": "object",
        "properties": {
          "city": {"type": "string", "description": "City e.g. Chennai, Bangalore"},
          "location": {"type": "string", "description": "Area e.g. Anna Nagar, Adyar"},
          "property_type": {
            "type": "string",
            "enum": ["Apartments", "Villas", "Villaments", "Commercial"]
          }
        },
        "required": []
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_cities",
      "description": "Get available cities in JLL database.",
      "parameters": {"type": "object", "properties": {}, "required": []}
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_locations",
      "description": "Get available areas/localities within a city.",
      "parameters": {
        "type": "object",
        "properties": {"city": {"type": "string"}},
        "required": ["city"]
      }
    }
  }
]

3. Implement async execute_tool(tool_name: str, tool_args: dict) -> dict:
  - Route to the correct function based on tool_name
  - Return the result
```

---

### Step 8 — LLM service (Groq + MCP)

```
Create voice_backend/services/llm_groq.py.
Follow the same approach as AI-Voice-agent reference services/llm_groq.py,
but add MCP tool-calling for JLL property search.

Define VOICE_SYSTEM_PROMPT as a constant string:

"You are JLL Property Assistant, a friendly AI real estate voice agent for JLL India.

You speak to users via voice — keep ALL responses SHORT and CONVERSATIONAL.
Maximum 2-3 sentences per response. No markdown. No bullet points. No lists.
Speak naturally as if talking face-to-face.

Your job:
- Help users find properties across India through natural voice conversation.
- Extract: city, location, property type (Apartments/Villas/Villaments/Commercial), config (2BHK/3BHK/4BHK), budget.
- Call search_properties tool when you know at least city or property type.
- Summarize results conversationally e.g. 'I found 15 apartments in Anna Nagar. The top one is Redbrick Boulevard, a 3BHK at 1573 sqft, currently under construction.'
- Ask ONE clarifying question at a time if details are missing.
- Never invent listings — always use the search_properties tool.
- Redirect off-topic questions politely: 'I am here to help you find properties. Which city are you looking in?'

Available cities: Chennai, Bangalore, Mumbai, Hyderabad.
Property types: Apartments, Villas, Villaments, Commercial."

Implement a GroqLLM class:

Constructor:
- Initialize Groq client with settings.GROQ_API_KEY
- Set model = settings.LLM_MODEL

async generate(transcript: str, history: list, tools: list) -> tuple[str, dict | None]:
- Build messages list:
  [{"role": "system", "content": VOICE_SYSTEM_PROMPT}] + history + [{"role": "user", "content": transcript}]
- Call groq.chat.completions.create(model, messages, tools, tool_choice="auto", max_tokens=LLM_MAX_TOKENS)
- Check response.choices[0].message.tool_calls:
  If tool_calls present:
    - Extract tool_name and tool_args from first tool call
    - Call execute_tool(tool_name, tool_args) from jll_tools.py
    - Append tool result to messages
    - Call Groq again without tools to get natural language response
    - Return (final_text, tool_result_dict)
  Else:
    - Return (response.choices[0].message.content, None)
- Handle exceptions: return ("I am sorry, I had trouble processing that. Please try again.", None)

Export singleton: llm_service = GroqLLM()
```

---

### Step 9 — TTS service (Cartesia)

```
Create voice_backend/services/tts_cartesia.py.
Follow the same approach as AI-Voice-agent reference services/tts_cartesia.py.

Use cartesia SDK v1+. Implement a CartesiaTTS class:

Constructor:
- Initialize Cartesia client with settings.CARTESIA_API_KEY
- Set voice_id = settings.CARTESIA_VOICE_ID
- Set model = "sonic-2"
- Set output_format: PCM 16kHz mono
  {"container": "raw", "encoding": "pcm_s16le", "sample_rate": 16000}

async synthesize(text: str) -> AsyncGenerator[bytes, None]:
- Use cartesia client to stream TTS audio
- Yield each audio chunk as bytes
- Handle empty text: yield nothing
- Handle exceptions: log error, yield nothing

Export singleton: tts_service = CartesiaTTS()
```

---

### Step 10 — WebSocket pipeline handler

```
Create voice_backend/app/websocket_handler.py.
This is the core pipeline — follow the orchestration pattern from
AI-Voice-agent reference app/websocket_handler.py,
adapted for JLL property search with MCP.

Implement async handle_voice_session(websocket: WebSocket, session_id: str):

1. Get or create session from session_manager
2. Initialize VADProcessor
3. Send initial state: {"type": "state", "state": "idle"}

4. Start async loop receiving messages from websocket:
   - If binary message: process as audio frame
     a. Pass frame to vad.process(frame)
     b. If speech_ended and vad.has_buffered_audio():
        i.   Send state: "processing"
        ii.  Get audio bytes from vad.get_audio_buffer()
        iii. Call stt_service.transcribe(audio_bytes) → transcript
        iv.  If transcript is empty: reset VAD, send state: "idle", continue
        v.   Send: {"type": "transcript", "text": transcript}
        vi.  Call llm_service.generate(transcript, session.get_history(), JLL_TOOLS)
             → (llm_text, tool_result)
        vii. If tool_result has data:
             Send: {"type": "properties", "data": tool_result["data"], "total": tool_result["total"]}
        viii.Send: {"type": "llm_text", "text": llm_text}
        ix.  Send state: "speaking"
        x.   Stream TTS: async for chunk in tts_service.synthesize(llm_text): await websocket.send_bytes(chunk)
        xi.  session.add_turn(transcript, llm_text)
        xii. vad.reset()
        xiii.Send state: "idle"

   - If text message: parse JSON
     - type "start": log session start
     - type "stop": break loop, cleanup

5. On WebSocket disconnect: session_manager.delete(session_id), log
6. Wrap in try/except WebSocketDisconnect

Also implement a helper format_properties_for_speech(properties: list, total: int) -> str:
- Takes first 3 properties
- Returns a short spoken summary e.g.:
  "I found 33 properties. Here are the top results: Redbrick Boulevard, 3BHK, 1573 sqft, under construction. Pushkar Shanti Nivas, 3BHK, 1600 sqft, ready to move."
- Used when LLM needs property context injected
```

---

### Step 11 — FastAPI main app

```
Create voice_backend/app/main.py.
Follow the same pattern as AI-Voice-agent reference app/main.py.

1. Create FastAPI app with title "JLL Voice Agent"

2. Add CORS middleware:
   allow_origins=["*"]  (restrict to your Vercel domain in production)
   allow_methods=["*"]
   allow_headers=["*"]

3. Health check endpoint:
   GET /health → returns {"status": "ok", "service": "jll-voice-agent"}

4. WebSocket endpoint:
   WS /ws/voice/{session_id}
   - Accept connection
   - Call handle_voice_session(websocket, session_id) from websocket_handler.py

5. Root endpoint:
   GET / → returns {"message": "JLL Voice Agent running", "ws": "/ws/voice/{session_id}"}
```

---

### Step 12 — Server entry point

```
Create voice_backend/run.py:

import uvicorn
from config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info"
    )

Test the backend locally:
  cd voice_backend
  pip install -r requirements.txt
  python run.py

Verify:
  GET http://localhost:8000/health → {"status": "ok"}
  WS ws://localhost:8000/ws/voice/test-session → accepts connection
```

---

## PART B — FRONTEND VOICE UI

> All steps in Part B are inside the existing Next.js project (property-agent).
> The text chatbot (Chatbot.tsx, /api/chat/route.ts) must NOT be changed.

---

### Step 13 — Add env variable

```
Add to .env.local in the Next.js project root:

NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:8000/ws/voice

In production this will be:
NEXT_PUBLIC_VOICE_WS_URL=wss://your-railway-app.railway.app/ws/voice

Also add to .env.example:
NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:8000/ws/voice
```

---

### Step 14 — TypeScript types for voice

```
Create src/types/voice.ts with these TypeScript types:

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VoiceMessage {
  type: 'state' | 'transcript' | 'llm_text' | 'properties' | 'error';
  state?: VoiceState;
  text?: string;
  data?: PropertyProject[];
  total?: number;
  message?: string;
}

export interface PropertyProject {
  _id: string;
  Project_Name_Original: string;
  Location: string;
  City: string;
  Project_Type: string;
  State_Of_Construction: string;
  configs: Array<{
    Config_Type: string;
    Super_Built_Up_Area: string;
    FinalPrice: number;
    Carpet_Area: string;
  }>;
  files: Array<{
    Project_File_Path: string;
    Project_File_Type: string;
  }>;
  developer: Array<{ Connection_Name: string }>;
  amenities: Array<{ Attribute_Value: string }>;
  PosessionDate: string;
}

export interface VoiceBotHook {
  state: VoiceState;
  transcript: string;
  botText: string;
  properties: PropertyProject[];
  totalProperties: number;
  isOpen: boolean;
  startSession: () => Promise<void>;
  stopSession: () => void;
  openOverlay: () => void;
  closeOverlay: () => void;
  error: string | null;
}
```

---

### Step 15 — useVoiceBot hook

```
Create src/components/VoiceBot/useVoiceBot.ts.

This hook manages the entire voice session lifecycle:
WebSocket connection, microphone capture, audio streaming, message handling.

State:
- state: VoiceState (idle/listening/processing/speaking/error)
- transcript: string (what user said)
- botText: string (what bot replied)
- properties: PropertyProject[]
- totalProperties: number
- isOpen: boolean (overlay visible)
- error: string | null
- sessionId: string (uuid, generated once)

Refs:
- wsRef: WebSocket ref
- mediaRecorderRef: MediaRecorder ref
- audioContextRef: AudioContext ref
- audioQueueRef: array of ArrayBuffer chunks (for TTS playback queue)
- isPlayingRef: boolean (prevents overlapping playback)

openOverlay(): set isOpen = true, auto-start session

closeOverlay(): stopSession(), set isOpen = false, reset all state

startSession():
1. Request microphone: navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } })
2. On permission denied: set error = "Microphone permission denied", set state = "error"
3. Generate sessionId = crypto.randomUUID()
4. Connect WebSocket: new WebSocket(`${process.env.NEXT_PUBLIC_VOICE_WS_URL}/${sessionId}`)
5. ws.onopen: send JSON { type: "start", session_id: sessionId }, set state = "listening"
6. ws.onmessage:
   - If event.data is string: parse JSON VoiceMessage
     - type "state": set state = msg.state
     - type "transcript": set transcript = msg.text
     - type "llm_text": set botText = msg.text
     - type "properties": set properties = msg.data, totalProperties = msg.total
     - type "error": set error = msg.message, set state = "error"
   - If event.data is Blob or ArrayBuffer: queue audio for playback
     call queueAudioChunk(event.data)
7. ws.onerror: set error = "Connection failed", state = "error"
8. ws.onclose: if state !== "idle" set state = "idle"

9. Set up MediaRecorder to stream PCM to WebSocket:
   - Use AudioContext with sampleRate 16000
   - Create ScriptProcessorNode (or AudioWorklet) with bufferSize 1024
   - On audioprocess: convert float32 to int16 PCM, send as binary via WebSocket
   - Note: MediaRecorder API cannot produce raw PCM directly in all browsers.
     Use AudioContext + ScriptProcessorNode to capture raw PCM samples at 16kHz.

playAudioChunk(data):
- Push to audioQueueRef
- If not already playing, call playNextChunk()

playNextChunk():
- If queue empty: set isPlayingRef = false, return
- Dequeue first chunk
- Decode with AudioContext.decodeAudioData or create buffer from raw PCM
- Play via AudioBufferSourceNode
- On ended: call playNextChunk() recursively

stopSession():
- Send JSON { type: "stop" } to WebSocket if open
- Close WebSocket
- Stop MediaRecorder
- Stop all mic tracks
- Reset state to idle
```

---

### Step 16 — VoiceOrb animated component

```
Create src/components/VoiceBot/VoiceOrb.tsx.

Props: { state: VoiceState }

Render a circular orb whose visual animation reflects the current voice state.
Use only Tailwind CSS classes and CSS keyframe animations (no external libraries).

Visual states:
- idle:
  Solid blue circle (#185FA5 background). 
  Microphone SVG icon inside (white, 32px).
  No animation. Label below: "Tap microphone to start"

- listening:
  Blue circle with a pulsing green outer ring.
  CSS animation: scale 1 → 1.15 → 1 in 1.2s infinite.
  Mic icon changes to ear/wave icon or stays as mic with green tint.
  Label: "Listening..."

- processing:
  Blue circle with rotating gradient border (conic-gradient or border animation).
  Spinning animation 360deg in 1s infinite linear.
  Label: "Thinking..."

- speaking:
  Blue circle with 3 vertical bars inside (like an audio waveform).
  Bars animate height up/down at different speeds (staggered delays).
  Label: "Speaking..."

- error:
  Red circle (#DC2626).
  X icon or warning icon inside.
  Label: "Something went wrong. Try again."

Orb size: 120px × 120px on desktop, 96px × 96px on mobile.
Center it in the overlay using flex justify-center items-center.
All animations use CSS @keyframes defined in a <style> tag inside the component.
```

---

### Step 17 — VoiceTranscript component

```
Create src/components/VoiceBot/VoiceTranscript.tsx.

Props: { transcript: string, botText: string, state: VoiceState }

Render a conversation display area showing the most recent exchange:

Layout (vertical stack):
1. User message (if transcript not empty):
   - Small label "You said:" in muted color
   - Transcript text in white, font-size 16px
   - Fade-in animation on appearance

2. Bot reply (if botText not empty):
   - Small label "JLL Assistant:" in muted color  
   - Bot text in light blue color, font-size 15px
   - Fade-in animation on appearance

3. If state is "listening": show animated "..." dots to indicate active listening

4. If both are empty and state is "idle":
   - Show hint text: "Ask me anything about properties in India"
   - Examples: "Show 3BHK in Anna Nagar" / "Apartments in Bangalore" / "Ready to move flats in Chennai"
   - Muted color, font-size 14px, italic

Styling:
- Background: transparent
- Max width: 480px, centered
- Text color: white (or near-white for dark overlay)
- Padding: 16px
```

---

### Step 18 — VoiceBotOverlay component

```
Create src/components/VoiceBot/VoiceBotOverlay.tsx.

Props: { isOpen: boolean, onClose: () => void, voiceHook: VoiceBotHook }

This is the full-screen voice interaction modal.

Structure:
- Outer div: fixed inset-0 z-50, semi-transparent dark background (rgba(0,0,0,0.85))
- Only renders when isOpen === true (conditional render, not display:none)
- Animate in: fade + scale from 0.95 to 1 on mount

Inner layout (full height flex column):
┌─────────────────────────────────┐
│  [X close]           JLL Voice  │  ← Header: close button left, title right
├─────────────────────────────────┤
│                                 │
│          VoiceOrb               │  ← Center: animated orb (clickable if idle)
│        [state label]            │
│                                 │
├─────────────────────────────────┤
│        VoiceTranscript          │  ← Transcript area
├─────────────────────────────────┤
│   [PropertyCard row if results] │  ← Horizontal scroll of property cards
│                                 │     (reuse existing PropertyCard.tsx)
└─────────────────────────────────┘

Behaviors:
- Click orb when idle: call voiceHook.startSession()
- Click close button: call onClose()
- Press Escape key: call onClose()
- If properties.length > 0: show horizontal scroll container with PropertyCard components
  Max 5 cards shown, rest accessible by scrolling.
  Each card is slightly smaller than in the text chat (scale 0.9 or fixed width 200px).
- Show error message if voiceHook.error is set, with "Try Again" button
- Show microphone permission prompt if error contains "permission"

Import and reuse the existing PropertyCard component from src/components/PropertyCard.tsx
Pass the property project data directly — do not duplicate the card component.
```

---

### Step 19 — VoiceBotButton component

```
Create src/components/VoiceBot/VoiceBotButton.tsx.

Props: { onClick: () => void, isActive: boolean }

This is the floating button shown in the top-right corner of the main page.

Render:
- Fixed position: top-5 right-5 (or top-6 right-6)
- z-index: 40 (below overlay's z-50)
- Circular button: 52px × 52px
- Background: #185FA5 (JLL blue)
- Icon: microphone SVG (white, 22px)
- Small label below the button: "Voice" in 11px white text
- Border radius: 50% (full circle)
- Box shadow: subtle shadow for depth

Active state (isActive = true):
- Add a pulsing green ring animation around the button
- Background slightly lighter
- Tooltip: "Voice session active"

Idle state:
- Tooltip on hover: "Talk to JLL Assistant"

Hover effect:
- Background: #0C447C (darker blue)
- Scale: 1.05
- Transition: 150ms

On click: call onClick prop
```

---

### Step 20 — Wire VoiceBot into page.tsx

```
Update src/app/page.tsx to include the voice bot alongside the existing chatbot.

Current state of page.tsx renders <Chatbot /> component.

Changes needed:
1. Import VoiceBotButton from "@/components/VoiceBot/VoiceBotButton"
2. Import VoiceBotOverlay from "@/components/VoiceBot/VoiceBotOverlay"
3. Import useVoiceBot from "@/components/VoiceBot/useVoiceBot"
4. Inside the page component, call: const voiceHook = useVoiceBot()

5. Add VoiceBotButton to JSX:
   <VoiceBotButton
     onClick={voiceHook.openOverlay}
     isActive={voiceHook.isOpen}
   />

6. Add VoiceBotOverlay to JSX:
   <VoiceBotOverlay
     isOpen={voiceHook.isOpen}
     onClose={voiceHook.closeOverlay}
     voiceHook={voiceHook}
   />

7. Keep existing <Chatbot /> completely unchanged.

Final layout of page.tsx:
- <VoiceBotButton /> — fixed position, always visible
- <VoiceBotOverlay /> — full-screen, only visible when isOpen
- <Chatbot /> — existing text chatbot, completely unchanged
- No layout changes to the chatbot section
```

---

## PART C — INTEGRATION TESTING

---

### Step 21 — Local integration test

```
Test the full voice pipeline end-to-end locally.

Backend setup:
  cd voice_backend
  python run.py
  → Confirm: "Application startup complete" in terminal
  → Test: GET http://localhost:8000/health returns {"status": "ok"}

Frontend setup:
  cd property-agent (root)
  npm run dev
  → Open http://localhost:3000

Voice bot test checklist:
[ ] Voice button visible in top-right corner of page
[ ] Clicking voice button opens overlay
[ ] Overlay shows animated orb in idle state
[ ] Clicking orb triggers browser mic permission prompt
[ ] On permission grant: orb changes to "Listening" state
[ ] Speak: "Hello" → transcript appears in overlay
[ ] Bot responds with audio playback (Cartesia TTS)
[ ] Speak: "Show me 3BHK apartments in Anna Nagar Chennai"
    → transcript shown
    → state changes: listening → processing → speaking
    → property cards appear in overlay
    → bot voice describes results
[ ] Speak: "What about ready to move options?"
    → bot remembers previous context (history working)
    → new property cards shown
[ ] Click X to close overlay
    → overlay closes, audio stops
    → text chatbot still works normally (no regression)
[ ] Reopen overlay — works fresh
[ ] Text chatbot sends a message → still works (no regression)
```

---

### Step 22 — Error handling test

```
Test these edge cases:

1. Microphone denied:
   - Block mic in browser settings
   - Click voice button
   - Expected: error state shown in overlay, "Microphone permission denied" message
   - Close overlay — no crash

2. Backend not running:
   - Stop voice_backend server
   - Click voice button
   - Expected: WebSocket connection error shown, state = "error"
   - "Connection failed" message shown

3. Empty speech (silence):
   - Open voice session, don't speak for 5 seconds
   - Expected: stays in "listening" state, no crash

4. Short noise / non-speech:
   - Make a brief noise (tap microphone)
   - Expected: VAD may not trigger, or short empty transcript returned
   - Expected: bot asks a follow-up question, does not crash

5. Off-topic question:
   - Speak: "What is the capital of France?"
   - Expected: bot responds with "I'm here to help you find properties. Which city are you looking in?"
   - No property cards shown

6. Close overlay while speaking:
   - Click X while TTS is playing audio
   - Expected: audio stops immediately, overlay closes cleanly
```

---

## PART D — DEPLOYMENT

---

### Step 23 — Deploy Python backend to Railway

```
Deploy voice_backend to Railway (https://railway.app):

1. Create a new Railway project
2. Connect your GitHub repo OR deploy from local:
   railway init
   railway up

3. Railway auto-detects Python. Ensure Procfile or start command:
   Create voice_backend/Procfile:
   web: uvicorn app.main:app --host 0.0.0.0 --port $PORT

4. Add environment variables in Railway dashboard:
   DEEPGRAM_API_KEY = your_key
   GROQ_API_KEY = your_key
   CARTESIA_API_KEY = your_key
   CARTESIA_VOICE_ID = your_voice_id
   JLL_API_BASE_URL = https://jll-backend.ibism.com/api
   MAX_HISTORY_TURNS = 10
   LLM_MODEL = llama3-70b-8192
   LLM_MAX_TOKENS = 500
   SAMPLE_RATE = 16000
   FRAME_DURATION_MS = 20
   VAD_AGGRESSIVENESS = 2
   SILENCE_THRESHOLD_MS = 800

5. After deploy, get your Railway URL:
   Example: https://jll-voice-agent.railway.app

6. Test: GET https://jll-voice-agent.railway.app/health → {"status": "ok"}
```

---

### Step 24 — Update frontend env & deploy to Vercel

```
Update .env.local in Next.js project:
NEXT_PUBLIC_VOICE_WS_URL=wss://jll-voice-agent.railway.app/ws/voice

Note: Use "wss://" (secure WebSocket) for production, "ws://" for localhost.

Deploy frontend:
1. Push all changes to GitHub
2. Vercel auto-deploys on push (already connected from v1.0)
3. In Vercel dashboard → Environment Variables → Add:
   NEXT_PUBLIC_VOICE_WS_URL = wss://jll-voice-agent.railway.app/ws/voice
   (Keep existing GROQ_API_KEY and NEXT_PUBLIC_JLL_API_BASE_URL unchanged)

4. Trigger a redeploy in Vercel

5. Production smoke test:
   [ ] https://property-agent-azure.vercel.app loads
   [ ] Text chatbot works (existing functionality)
   [ ] Voice button visible top-right
   [ ] Click voice → mic prompt → speak → hear response
   [ ] "Show 3BHK in Anna Nagar" → property cards appear in voice overlay
```

---

### Step 25 — Final README update

```
Update the README.md in the property-agent repo to document the voice bot:

Add a new section "Voice Bot Setup" with:

## Voice Bot Setup

The voice bot requires running a separate Python backend service.

### Prerequisites
- Python 3.11+
- API keys for: Deepgram, Groq, Cartesia
- JLL API (free, no key needed)

### Running locally

1. Start the voice backend:
   cd voice_backend
   pip install -r requirements.txt
   cp .env.example .env    # Fill in your API keys
   python run.py
   # Runs on http://localhost:8000

2. Start the Next.js frontend:
   cd ..  # back to project root
   npm run dev
   # Runs on http://localhost:3000

3. Add to .env.local:
   NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:8000/ws/voice

4. Open http://localhost:3000 and click the microphone button (top-right)

### Voice Pipeline
Mic → WebSocket → VAD (webrtcvad) → Deepgram STT (nova-2, en-IN)
→ Groq LLM (llama3-70b-8192) + MCP (JLL API) → Cartesia TTS (sonic-2) → Speaker

### API Keys
| Service   | Get From                    | Free Tier         |
|-----------|-----------------------------|-------------------|
| Deepgram  | https://deepgram.com        | $200 free credits |
| Groq      | https://console.groq.com    | Yes               |
| Cartesia  | https://cartesia.ai         | Free trial        |

### Reference
Voice pipeline architecture based on:
https://github.com/samuvel145/AI-Voice-agent
```

---

*End of Build Prompts — JLL Property Assistant Voice Bot v2.0*
*Use each step as a separate prompt in Cursor / Claude Code for best results.*
*Reference repos: property-agent + AI-Voice-agent (both by samuvel145)*
