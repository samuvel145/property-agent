# Product Requirements Document
## JLL Property Assistant — Voice Bot Upgrade

**Version:** 2.0  
**Date:** April 13, 2026  
**Status:** Draft  
**Based on:** Existing chatbot at [github.com/samuvel145/property-agent](https://github.com/samuvel145/property-agent)  
**Voice Pipeline Reference:** [github.com/samuvel145/AI-Voice-agent](https://github.com/samuvel145/AI-Voice-agent)

---

## 1. Executive Summary

This document defines the upgrade of the existing JLL Property Assistant chatbot (v1.0) into a **hybrid chat + voice bot (v2.0)**. The existing text-based chatbot remains fully functional. A **voice bot button** is added to the top corner of the page — clicking it opens a full-screen voice interaction overlay where users can speak naturally to search for properties. The voice pipeline follows the same architecture from the AI-Voice-agent reference project: **Deepgram (STT) → Groq LLM → Cartesia (TTS)**, orchestrated via a **Python FastAPI WebSocket backend** with **MCP** for JLL API tool-calling.

---

## 2. Reference Projects

### Primary Project (to upgrade)
- **Repo:** https://github.com/samuvel145/property-agent
- **Live:** https://property-agent-azure.vercel.app
- **Stack:** Next.js 16, TypeScript, Groq SDK, Tailwind CSS 4, JLL API
- **What exists:** Text chatbot with Groq AI + JLL API property search + property cards + quick replies

### Voice Pipeline Reference
- **Repo:** https://github.com/samuvel145/AI-Voice-agent
- **Stack:** Python 3.11, FastAPI, WebSocket, Deepgram (nova-2), Groq (llama-3.3-70b-versatile), Cartesia (sonic-2), WebRTC VAD
- **Architecture:** `Microphone → WebSocket → VAD → STT → LLM → TTS → WebSocket → Speaker`
- **Key insight:** Full-duplex WebSocket pipeline with ≤700ms end-to-end latency. VAD detects speech end, triggers STT, feeds transcript to LLM, streams TTS audio back to client.

---

## 3. What Changes in v2.0

| Feature | v1.0 (existing) | v2.0 (this PRD) |
|---------|----------------|-----------------|
| Text chatbot | ✅ Keep as-is | ✅ Unchanged |
| Voice bot button | ❌ | ✅ Top-right corner of page |
| Voice overlay UI | ❌ | ✅ Full-screen modal with orb animation |
| STT | ❌ | ✅ Deepgram nova-2 |
| TTS | ❌ | ✅ Cartesia sonic-2 |
| LLM model | llama-3.3-70b-versatile (8K ctx) | ✅ llama3-70b-8192 (larger context) |
| MCP | ❌ | ✅ JLL API exposed as MCP tool |
| Voice backend | ❌ | ✅ Python FastAPI WebSocket server |
| VAD | ❌ | ✅ WebRTC VAD (aggressiveness 2) |

---

## 4. Voice Pipeline — How It Works (from Reference)

Based on the AI-Voice-agent reference repo, the pipeline works as follows:

### 4.1 Reference Architecture (AI-Voice-agent)

```
Browser Mic
    │
    ▼ (raw PCM audio chunks via WebSocket)
FastAPI WebSocket Server
    │
    ├── VAD (webrtcvad)
    │     Detects speech vs silence
    │     Buffers speech frames
    │     Triggers pipeline when silence detected (800ms threshold)
    │
    ├── STT — Deepgram nova-2
    │     Receives buffered audio frames
    │     Returns transcript string
    │
    ├── LLM — Groq llama-3.3-70b-versatile
    │     Receives transcript + conversation history
    │     Streams text response tokens
    │
    └── TTS — Cartesia sonic-2
          Receives streamed LLM text
          Returns audio chunks
          Sent back to browser via WebSocket
    │
    ▼ (audio chunks via WebSocket)
Browser Speaker (plays audio)
```

### 4.2 Key Config from Reference (config.py)

```python
SAMPLE_RATE: int = 16000          # 16kHz audio
FRAME_DURATION_MS: int = 20       # 20ms frames
CHANNELS: int = 1                 # Mono
FRAME_SIZE: int = 640             # bytes per frame (16000 × 2 × 0.02)
VAD_AGGRESSIVENESS: int = 2       # 0-3, 2 = balanced
SILENCE_THRESHOLD_MS: int = 800   # ms of silence before end-of-speech
LLM_MODEL: str = "llama-3.3-70b-versatile"
MAX_HISTORY_TURNS: int = 5
LLM_MAX_TOKENS: int = 300
```

### 4.3 Dependencies from Reference (requirements.txt)

```
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
```

### 4.4 Adapted Pipeline for JLL Voice Bot

Same pipeline, with one addition — **MCP tool-calling** between LLM and JLL API:

```
Browser Mic
    │
    ▼ (PCM audio via WebSocket)
FastAPI WebSocket Server (voice_backend/)
    │
    ├── VAD → detects end of speech
    │
    ├── STT → Deepgram nova-2 → transcript
    │
    ├── LLM → Groq llama3-70b-8192
    │         with JLL system prompt
    │         + MCP tool: search_properties
    │         + conversation history (10 turns)
    │         ↓
    │     IF action = search_properties
    │         → MCP calls JLL API
    │         → results injected into LLM context
    │         → LLM formats spoken response
    │
    └── TTS → Cartesia sonic-2 → audio chunks
    │
    ▼ (audio + transcript + property data via WebSocket)
Browser
    ├── Plays audio (Speaker)
    ├── Shows transcript in voice overlay
    └── Renders property cards if results found
```

---

## 5. Full Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend framework | Next.js 16, TypeScript | Existing — no change |
| Styling | Tailwind CSS 4 | Existing — no change |
| Text chatbot | Groq SDK + JLL API | Existing — no change |
| Voice UI | React component (VoiceBot.tsx) | New — button + overlay |
| Voice transport | WebSocket | Browser ↔ FastAPI |
| Voice backend | Python 3.11 + FastAPI | New — separate service |
| VAD | webrtcvad (aggressiveness 2) | Same as reference |
| STT | Deepgram SDK — nova-2 model | Same as reference |
| LLM (voice) | Groq — llama3-70b-8192 | Larger context than reference |
| TTS | Cartesia SDK — sonic-2 | Same as reference |
| MCP | Custom MCP server (Python) | New — exposes JLL API |
| Property data | JLL API (jll-backend.ibism.com) | Existing — no change |
| Deployment | Vercel (frontend) + Railway/Render (backend) | Backend needs Python host |

---

## 6. Environment Variables

### Frontend (.env.local — Next.js)
```env
NEXT_PUBLIC_JLL_API_BASE_URL=https://jll-backend.ibism.com/api
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:8000/ws/voice
```

### Backend (.env — Python FastAPI)
```env
DEEPGRAM_API_KEY=your_deepgram_api_key
GROQ_API_KEY=your_groq_api_key
CARTESIA_API_KEY=your_cartesia_api_key
CARTESIA_VOICE_ID=your_cartesia_voice_id
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

## 7. Project Structure

```
property-agent/                         ← Existing Next.js project
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts           ← Existing text chat (unchanged)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                    ← Add VoiceBot button here
│   └── components/
│       ├── Chatbot.tsx                 ← Existing (unchanged)
│       ├── MessageBubble.tsx           ← Existing (unchanged)
│       ├── PropertyCard.tsx            ← Existing (reused in voice overlay)
│       ├── QuickReplies.tsx            ← Existing (unchanged)
│       ├── TypingIndicator.tsx         ← Existing (unchanged)
│       └── VoiceBot/                   ← NEW
│           ├── VoiceBotButton.tsx      ← Top-right corner button
│           ├── VoiceBotOverlay.tsx     ← Full-screen voice UI
│           ├── VoiceOrb.tsx            ← Animated listening orb
│           ├── VoiceTranscript.tsx     ← Shows live transcript
│           └── useVoiceBot.ts          ← WebSocket + audio hook
├── .env.local
├── .env.example
└── package.json

voice_backend/                          ← NEW Python FastAPI backend
├── app/
│   ├── main.py                         ← FastAPI app, health check, CORS
│   └── websocket_handler.py            ← Pipeline orchestration (VAD→STT→LLM→TTS)
├── services/
│   ├── stt_deepgram.py                 ← Deepgram nova-2 (same pattern as reference)
│   ├── llm_groq.py                     ← Groq llama3-70b-8192 + MCP tool calling
│   └── tts_cartesia.py                 ← Cartesia sonic-2 (same pattern as reference)
├── mcp/
│   ├── mcp_server.py                   ← MCP server exposing JLL tools
│   └── jll_tools.py                    ← search_properties, get_cities, get_locations
├── audio/
│   ├── vad.py                          ← WebRTC VAD (same as reference)
│   └── audio_buffer.py                 ← Frame buffering (same as reference)
├── session/
│   └── session_manager.py              ← Conversation history per WebSocket session
├── config.py                           ← Pydantic settings (same pattern as reference)
├── run.py                              ← Uvicorn entry point
├── requirements.txt
└── .env
```

---

## 8. UI/UX Specification

### 8.1 Voice Bot Button (top-right corner)

- Fixed position: `top-4 right-4` or `top-6 right-6`
- Design: circular button, 48×48px
- Icon: microphone SVG
- Label: "Voice" text below or tooltip on hover
- Color: blue background (#185FA5), white icon
- Pulse animation when voice session is active
- On click: opens VoiceBotOverlay

### 8.2 Voice Bot Overlay (full-screen)

- Full-screen modal overlay with semi-transparent dark background
- Close button top-right (X icon)
- Center: animated orb (VoiceOrb component)
  - Idle: static blue orb, "Tap to speak" label
  - Listening: orb pulses/expands with green glow
  - Processing: orb spins/rotates
  - Speaking: orb waves/oscillates with Cartesia audio
- Bottom section: live transcript (what user said + what bot replied)
- If property results: show scrollable PropertyCard row below transcript
- Mic permission prompt if browser hasn't granted access

### 8.3 Voice States

| State | Orb Visual | Label |
|-------|-----------|-------|
| Idle | Static blue circle | "Tap to speak" |
| Listening | Pulsing green ring | "Listening..." |
| Processing | Spinning gradient | "Thinking..." |
| Speaking | Wave animation | "Speaking..." |
| Error | Red flash | "Try again" |

---

## 9. MCP Tool Definitions

The Python MCP server exposes these tools to the Groq LLM during voice sessions:

### Tool 1: search_properties
```python
{
    "type": "function",
    "function": {
        "name": "search_properties",
        "description": "Search JLL property listings by city, location, and property type. Call when user wants to find properties.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name e.g. Chennai, Bangalore"},
                "location": {"type": "string", "description": "Area e.g. Anna Nagar, Adyar"},
                "property_type": {
                    "type": "string",
                    "enum": ["Apartments", "Villas", "Villaments", "Commercial"]
                }
            },
            "required": []
        }
    }
}
```

### Tool 2: get_cities
```python
{
    "type": "function",
    "function": {
        "name": "get_cities",
        "description": "Get available cities in JLL database.",
        "parameters": {"type": "object", "properties": {}, "required": []}
    }
}
```

### Tool 3: get_locations
```python
{
    "type": "function",
    "function": {
        "name": "get_locations",
        "description": "Get available areas/localities within a city.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string"}
            },
            "required": ["city"]
        }
    }
}
```

---

## 10. System Prompt for Voice LLM

```
You are JLL Property Assistant, a friendly AI real estate voice agent for JLL India.

You are speaking to users via voice — keep responses SHORT and CONVERSATIONAL.
Maximum 2-3 sentences per response. No markdown, no bullet points, no lists.
Speak naturally as if talking to a person face-to-face.

Your job:
- Help users find properties across India through natural voice conversation.
- Extract intent: city, location, property type (Apartments/Villas/Villaments/Commercial), config (2BHK/3BHK/4BHK), budget.
- Call search_properties tool when you have enough context (at least city or property type).
- Summarize results conversationally: "I found 15 apartments in Anna Nagar. 
  The top one is Redbrick Boulevard, a 3BHK at 1573 sqft, under construction."
- If details are missing, ask ONE question at a time.
- Never invent property listings — always use the search_properties tool.
- For off-topic questions, politely redirect: "I'm here to help you find properties. 
  What city are you looking in?"

Available cities: Chennai, Bangalore, Mumbai, Hyderabad.
Property types: Apartments, Villas, Villaments, Commercial.
```

---

## 11. WebSocket Message Protocol

Messages exchanged between browser and FastAPI backend:

### Browser → Backend
```json
// Audio chunk (binary ArrayBuffer — PCM 16kHz mono)
{ "type": "audio", "data": "<base64 PCM chunk>" }

// Session start
{ "type": "start", "session_id": "uuid" }

// Session end  
{ "type": "stop" }
```

### Backend → Browser
```json
// Transcript update (what user said)
{ "type": "transcript", "text": "Show me 3BHK in Anna Nagar" }

// LLM text response (for display)
{ "type": "llm_text", "text": "I found 33 apartments in Anna Nagar..." }

// TTS audio chunk (binary — PCM audio)
{ "type": "audio", "data": "<base64 audio chunk>" }

// Property results (to render cards)
{ "type": "properties", "data": [...], "total": 33 }

// Pipeline state update
{ "type": "state", "state": "listening" | "processing" | "speaking" | "idle" }

// Error
{ "type": "error", "message": "Microphone permission denied" }
```

---

## 12. Voice Backend — Pipeline Code Pattern

Based directly on AI-Voice-agent reference:

```python
# voice_backend/app/websocket_handler.py

async def handle_voice_pipeline(websocket: WebSocket, session_id: str):
    session = session_manager.get_or_create(session_id)
    vad = VADProcessor()
    
    async for message in websocket.iter_bytes():
        # 1. Feed audio frame to VAD
        is_speech, speech_ended = vad.process(message)
        
        if speech_ended and vad.has_buffered_audio():
            # 2. Send state: processing
            await websocket.send_json({"type": "state", "state": "processing"})
            
            # 3. STT — Deepgram
            transcript = await stt_deepgram.transcribe(vad.get_audio_buffer())
            await websocket.send_json({"type": "transcript", "text": transcript})
            
            # 4. LLM — Groq with MCP tools
            llm_response, tool_results = await llm_groq.generate(
                transcript=transcript,
                history=session.history,
                tools=JLL_MCP_TOOLS
            )
            
            # 5. If MCP tool called, fetch JLL data
            if tool_results:
                await websocket.send_json({
                    "type": "properties",
                    "data": tool_results["data"],
                    "total": tool_results["total"]
                })
            
            await websocket.send_json({"type": "llm_text", "text": llm_response})
            
            # 6. TTS — Cartesia
            await websocket.send_json({"type": "state", "state": "speaking"})
            async for audio_chunk in tts_cartesia.synthesize(llm_response):
                await websocket.send_bytes(audio_chunk)
            
            # 7. Update session history
            session.add_turn(user=transcript, assistant=llm_response)
            
            # 8. Back to idle
            await websocket.send_json({"type": "state", "state": "idle"})
            vad.reset()
```

---

## 13. Frontend Voice Hook Pattern

```typescript
// src/components/VoiceBot/useVoiceBot.ts

export function useVoiceBot() {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [botText, setBotText] = useState('');
  const [properties, setProperties] = useState([]);
  const wsRef = useRef<WebSocket>();
  const mediaRecorderRef = useRef<MediaRecorder>();
  const audioContextRef = useRef<AudioContext>();

  const startSession = async () => {
    // 1. Request mic permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 2. Connect WebSocket to Python backend
    const ws = new WebSocket(process.env.NEXT_PUBLIC_VOICE_WS_URL!);
    wsRef.current = ws;
    
    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state') setState(msg.state);
        if (msg.type === 'transcript') setTranscript(msg.text);
        if (msg.type === 'llm_text') setBotText(msg.text);
        if (msg.type === 'properties') setProperties(msg.data);
      } else {
        // Binary audio from TTS — play it
        playAudioChunk(event.data);
      }
    };
    
    // 3. Start recording and stream PCM to backend
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=pcm'  // or convert to PCM
    });
    mediaRecorder.ondataavailable = (e) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(e.data);
      }
    };
    mediaRecorder.start(20); // 20ms chunks — matches reference FRAME_DURATION_MS
    mediaRecorderRef.current = mediaRecorder;
  };

  const stopSession = () => {
    mediaRecorderRef.current?.stop();
    wsRef.current?.close();
    setState('idle');
  };

  return { state, transcript, botText, properties, startSession, stopSession };
}
```

---

## 14. Deployment Architecture

```
Vercel (frontend — Next.js)
    ├── Text chatbot → /api/chat → Groq SDK (serverless)
    └── Voice bot UI → WebSocket → Railway/Render (Python backend)

Railway or Render (Python backend)
    ├── FastAPI WebSocket server
    ├── VAD → STT (Deepgram) → LLM (Groq) → TTS (Cartesia)
    └── MCP → JLL API
```

**Why a separate Python backend?**
The voice pipeline requires persistent WebSocket connections and binary audio streaming — neither works well in Next.js serverless API routes. The Python FastAPI approach from the reference project is the correct architecture.

---

## 15. Environment Variables Summary

| Variable | Service | Where |
|----------|---------|-------|
| `NEXT_PUBLIC_JLL_API_BASE_URL` | JLL API | `.env.local` |
| `GROQ_API_KEY` | Groq (text chat) | `.env.local` |
| `NEXT_PUBLIC_VOICE_WS_URL` | Python backend URL | `.env.local` |
| `DEEPGRAM_API_KEY` | Deepgram STT | `voice_backend/.env` |
| `GROQ_API_KEY` | Groq (voice LLM) | `voice_backend/.env` |
| `CARTESIA_API_KEY` | Cartesia TTS | `voice_backend/.env` |
| `CARTESIA_VOICE_ID` | Cartesia voice | `voice_backend/.env` |
| `JLL_API_BASE_URL` | JLL API | `voice_backend/.env` |

---

## 16. Phased Delivery Plan

### Phase 1 — Voice Backend (Week 1)
- [ ] Create `voice_backend/` Python project
- [ ] Copy VAD + audio_buffer patterns from AI-Voice-agent reference
- [ ] Implement STT with Deepgram nova-2 (follow stt_deepgram.py pattern)
- [ ] Implement LLM with Groq llama3-70b-8192 + JLL system prompt
- [ ] Implement TTS with Cartesia sonic-2 (follow tts_cartesia.py pattern)
- [ ] Build MCP server with search_properties / get_cities / get_locations
- [ ] Wire pipeline in websocket_handler.py
- [ ] Test full pipeline locally with terminal client

### Phase 2 — Frontend Voice UI (Week 2)
- [ ] Build `VoiceBotButton.tsx` — fixed top-right corner
- [ ] Build `VoiceBotOverlay.tsx` — full-screen modal
- [ ] Build `VoiceOrb.tsx` — animated orb with state transitions
- [ ] Build `VoiceTranscript.tsx` — live transcript display
- [ ] Build `useVoiceBot.ts` — WebSocket + MediaRecorder hook
- [ ] Wire property cards into voice overlay (reuse existing PropertyCard.tsx)
- [ ] Add to `page.tsx` alongside existing chatbot

### Phase 3 — Integration & Polish (Week 3)
- [ ] End-to-end test: speak → transcript → LLM → TTS plays back
- [ ] End-to-end test: "3BHK in Anna Nagar" → MCP → JLL API → cards shown
- [ ] Microphone permission handling
- [ ] Error states (offline, permission denied, API timeout)
- [ ] Mobile responsive voice overlay
- [ ] Performance: confirm ≤1s latency (target from reference: ≤700ms)

### Phase 4 — Deployment (Week 4)
- [ ] Deploy Python backend to Railway or Render
- [ ] Update `NEXT_PUBLIC_VOICE_WS_URL` to production URL
- [ ] Deploy frontend to Vercel
- [ ] Smoke test production voice pipeline
- [ ] Update README with setup instructions for both services

---

## 17. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Voice end-to-end latency | ≤ 1 second (reference achieves ≤700ms) |
| STT accuracy | > 90% for Indian English accents |
| Text chatbot unchanged | 100% — zero regression |
| WebSocket stability | Auto-reconnect on disconnect |
| Mic permission UX | Clear prompt, graceful denial handling |
| Mobile support | iOS Safari + Android Chrome |
| Security | All API keys server-side only, never in browser |

---

## 18. API Keys Required

| Service | Get From | Free Tier |
|---------|----------|-----------|
| Groq | https://console.groq.com | Yes — generous free tier |
| Deepgram | https://deepgram.com | Yes — $200 free credits |
| Cartesia | https://cartesia.ai | Yes — free trial available |
| JLL API | https://jll-backend.ibism.com | Yes — no auth required |

---

## 19. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Browser mic permission denied | Show clear instruction UI, fallback to text chatbot |
| WebRTC VAD not available on some browsers | Detect and disable voice mode gracefully |
| Cartesia latency adds delay | Stream TTS chunks incrementally, start playing first chunk immediately |
| Python backend cold start on free hosting | Use Railway hobby plan or keep alive with health-check ping |
| Indian accents misrecognized by Deepgram | Use nova-2 model which handles Indian English well |
| Groq rate limits | Add retry with exponential backoff in llm_groq.py |
| WebSocket drops on mobile networks | Auto-reconnect logic in useVoiceBot.ts |

---

## 20. Success Metrics

| Metric | Target |
|--------|--------|
| Voice pipeline latency | ≤ 1 second end-to-end |
| Property search accuracy via voice | > 85% correct MCP tool calls |
| Voice session completion rate | > 60% |
| Text chatbot regression | 0 regressions |
| Browser compatibility | Chrome, Firefox, Safari, Edge |

---

*End of PRD v2.0 — JLL Property Assistant Voice Bot Upgrade*
