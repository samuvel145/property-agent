# Product Requirements Document
## JLL Property Chatbot — Hybrid AI Assistant

**Version:** 1.0  
**Date:** April 12, 2026  
**Status:** Draft  
**Author:** AI-Generated from Conversation Analysis

---

## 1. Executive Summary

The JLL Property Chatbot is a hybrid conversational assistant that combines a **rule-based guided flow** (Phase 1) with a **Groq LLM + MCP-powered natural language brain** (Phase 2). It helps users discover residential and commercial properties listed on the JLL India platform through a seamless chat interface — starting from a friendly greeting all the way to showing filtered property results.

---

## 2. Problem Statement

Users searching for properties on the JLL platform currently have to manually apply filters (city, location, property type, config) on a traditional UI. There is no conversational entry point that:

- Greets users naturally and understands intent
- Guides inexperienced users step-by-step
- Handles natural language queries like *"Show me 3BHK flats under 50 lakhs in Adyar"*
- Falls back gracefully when user input is vague or unknown

---

## 3. Goals & Objectives

| Goal | Description |
|------|-------------|
| Conversational UX | Guide users from greeting → intent → filters → results |
| Hybrid intelligence | Rule-based for structured flow, Groq LLM for natural/unknown inputs |
| Real-time data | Fetch live property listings from JLL API |
| MCP integration | Use Model Context Protocol to connect Groq LLM to JLL API as a tool |
| Graceful fallback | When user input is unclear, ask structured clarifying questions |

---

## 4. Scope

### In Scope
- Conversational chatbot UI (web-based)
- Rule-based guided flow (city → location → property type → results)
- Groq LLM for natural language understanding
- MCP server exposing JLL API as a tool
- Property listing cards with image, price, config, status
- Filters: city, location, property type, config (2BHK/3BHK/4BHK), status
- Basic greeting, follow-up, and restart conversation flow

### Out of Scope (v1.0)
- User authentication / saved searches
- Property booking or scheduling visits
- Payment or lead capture forms
- Mobile native app (iOS/Android)
- Multi-language support

---

## 5. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js / Next.js |
| LLM | Groq API (e.g., `llama3-70b-8192` or `mixtral-8x7b`) |
| AI Protocol | MCP (Model Context Protocol) |
| Property Data | JLL Backend API (`https://jll-backend.ibism.com/api`) |
| Environment Config | `.env` file (never hardcoded) |
| Styling | Tailwind CSS |
| State Management | React `useState` / `useReducer` |

---

## 6. Environment Configuration

All API URLs and keys must be stored in `.env` files — never hardcoded in source code.

```env
# .env.local
NEXT_PUBLIC_JLL_API_BASE_URL=https://jll-backend.ibism.com/api
GROQ_API_KEY=your_groq_api_key_here
MCP_SERVER_PORT=3001
```

**`.gitignore` must include:**
```
.env
.env.local
.env.production
```

---

## 7. JLL API Reference

**Base URL:** `https://jll-backend.ibism.com/api`

### Search Projects Endpoint

```
GET /user/search/projects
```

**Query Parameters:**

| Parameter | Type | Example | Required |
|-----------|------|---------|----------|
| city | string | Chennai | No |
| location | string | Anna%20Nagar | No |
| property_type | string | Apartments | No |

**Example Requests:**
```
/user/search/projects?city=Chennai&location=Anna%20Nagar&property_type=Apartments
/user/search/projects?city=Chennai&property_type=Villas
/user/search/projects (returns all 41,807 listings)
```

**Response Fields per Project:**
- `Project_Name_Original` — display name
- `Location`, `City`, `Micro_Market` — location info
- `Project_Type` — Apartments / Villas / Villaments / Commercial
- `State_Of_Construction` — Ready to Move / Under Construction / Pre-Launch / Launched
- `configs[].Config_Type` — 2 BHK / 3 BHK / 4 BHK
- `configs[].Super_Built_Up_Area` — area in sqft
- `configs[].FinalPrice` — price in INR (0 = price on request)
- `files[].Project_File_Path` — image URL
- `developer[].Connection_Name` — developer name
- `amenities[].Attribute_Value` — list of amenities
- `PosessionDate` — expected possession
- `RERA_No` — RERA registration number

---

## 8. MCP Architecture

MCP (Model Context Protocol) acts as the bridge between the Groq LLM and the JLL API.

### MCP Server Tools

The MCP server exposes the following tools that the Groq LLM can call:

#### Tool 1: `search_properties`
```json
{
  "name": "search_properties",
  "description": "Search JLL property listings by city, location, and property type",
  "parameters": {
    "city": { "type": "string", "description": "City name e.g. Chennai, Bangalore" },
    "location": { "type": "string", "description": "Area/locality e.g. Anna Nagar, Adyar" },
    "property_type": { "type": "string", "enum": ["Apartments", "Villas", "Villaments", "Commercial"] }
  }
}
```

#### Tool 2: `get_cities`
```json
{
  "name": "get_cities",
  "description": "Get list of available cities from JLL database",
  "parameters": {}
}
```

#### Tool 3: `get_locations`
```json
{
  "name": "get_locations",
  "description": "Get list of locations/areas within a city",
  "parameters": {
    "city": { "type": "string" }
  }
}
```

### MCP Flow Diagram

```
User Message
     │
     ▼
Groq LLM (intent detection)
     │
     ├── Structured intent? ──► Rule-based flow (ask city → location → type)
     │
     └── Natural language? ──► Groq decides tool call
                                      │
                                      ▼
                               MCP Server
                                      │
                                      ▼
                               JLL API fetch
                                      │
                                      ▼
                          Groq formats response
                                      │
                                      ▼
                            Chat UI renders cards
```

---

## 9. Conversation Flow Design

### 9.1 Phase 1 — Rule-Based Guided Flow

Used when the user starts fresh or gives minimal input.

```
Bot:  "Hi! Welcome to JLL Properties. I'm here to help you find your dream home. 
       What are you looking for?"

[Quick reply buttons: Buy a Home | Rent a Property | Commercial Space | Just Exploring]

User: "Buy a Home"

Bot:  "Great! Which city are you looking in?"
[Buttons: Chennai | Bangalore | Mumbai | Hyderabad | Other]

User: "Chennai"

Bot:  "Which area in Chennai?"
[Buttons: Anna Nagar | Adyar | T. Nagar | OMR | ECR | Other]

User: "Anna Nagar"

Bot:  "What type of property?"
[Buttons: Apartments | Villas | Villaments]

User: "Apartments"

Bot:  "Any preference on configuration?"
[Buttons: 2 BHK | 3 BHK | 4 BHK | Any]

User: "3 BHK"

Bot:  "Here are the best matches for you in Anna Nagar, Chennai:"
→ [Renders property cards from JLL API]
```

### 9.2 Phase 2 — Natural Language (Groq + MCP)

Used when user types freely or asks unknown/complex queries.

```
User: "Show me 3BHK flats under 50 lakhs in Adyar"

→ Groq detects: city=Chennai, location=Adyar, type=Apartments, config=3BHK, budget=50L
→ MCP calls search_properties tool
→ JLL API returns results
→ Groq filters by price and formats response
→ Bot renders property cards

User: "What about Ready to Move options near good schools?"

→ Groq understands: filter status=Ready to Move, context=family/schools
→ MCP calls search_properties with status filter
→ Bot responds with filtered results + tip about nearby schools
```

### 9.3 Fallback Flow

When input is unclear or unrecognized:

```
User: "something good"

→ Groq cannot extract intent
→ Bot falls back to structured questions:

Bot: "I'd love to help! Let me ask a few quick questions to find the best options for you.
     Which city are you searching in?"
[Buttons: Chennai | Bangalore | Mumbai | Hyderabad]
```

---

## 10. UI/UX Requirements

### Chat Interface Components

| Component | Description |
|-----------|-------------|
| Chat header | Bot avatar, name "JLL Assistant", online status, Groq badge |
| Message bubbles | Bot (left, white bg) / User (right, blue bg) |
| Quick reply buttons | Horizontal scrollable chip buttons for guided flow |
| Property cards | Image, name, developer, config, area, price, status badge, possession |
| Typing indicator | Animated 3-dot loader while Groq/API responds |
| Input bar | Text input + send button, always at bottom |
| Restart button | "Start over" option in header |

### Property Card Fields
- Project image (from Cloudinary CDN)
- Project name
- Developer name
- Config (2/3/4 BHK)
- Super built-up area (sqft)
- Carpet area (sqft)
- Status badge (Ready to Move / Under Construction / Pre-Launch)
- Price (₹X.XX Cr or "Price on request")
- Possession date
- Amenities (Power Backup, Security, Car Parking, etc.)

---

## 11. System Prompt for Groq LLM

```
You are JLL Property Assistant, a helpful and friendly real estate chatbot for JLL India.

Your job:
1. Greet users warmly and ask what they are looking for.
2. Understand property search intent from natural language.
3. Extract: city, location, property_type, config (BHK), budget, status.
4. If information is missing, ask ONE clarifying question at a time.
5. Call the search_properties MCP tool when you have enough context.
6. Present results in a friendly, concise format.
7. If the user asks something unrelated to property, politely redirect.

Tone: Friendly, professional, concise. Never overwhelming.
Language: English (default). Match user's language if they switch.

Available cities: Chennai, Bangalore, Mumbai, Hyderabad (from JLL data).
Available property types: Apartments, Villas, Villaments, Commercial.
```

---

## 12. API Integration Code Pattern

```javascript
// .env
NEXT_PUBLIC_JLL_API_BASE_URL=https://jll-backend.ibism.com/api
GROQ_API_KEY=your_key_here

// lib/jllApi.js
const BASE_URL = process.env.NEXT_PUBLIC_JLL_API_BASE_URL;

export async function searchProperties({ city, location, property_type }) {
  const params = new URLSearchParams();
  if (city) params.append('city', city);
  if (location) params.append('location', location);
  if (property_type) params.append('property_type', property_type);

  const res = await fetch(`${BASE_URL}/user/search/projects?${params}`);
  const data = await res.json();
  return data.data || [];
}

// lib/groqClient.js
import Groq from 'groq-sdk';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function chat(messages, tools) {
  return groq.chat.completions.create({
    model: 'llama3-70b-8192',
    messages,
    tools,
    tool_choice: 'auto',
  });
}
```

---

## 13. MCP Server Setup

```javascript
// mcp-server/index.js
import { MCPServer } from '@modelcontextprotocol/sdk';
import { searchProperties } from '../lib/jllApi.js';

const server = new MCPServer({
  name: 'jll-property-server',
  version: '1.0.0',
});

server.tool('search_properties', async ({ city, location, property_type }) => {
  const results = await searchProperties({ city, location, property_type });
  return { results, total: results.length };
});

server.tool('get_cities', async () => {
  return { cities: ['Chennai', 'Bangalore', 'Mumbai', 'Hyderabad'] };
});

server.start();
```

---

## 14. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Response time (rule-based) | < 300ms |
| Response time (Groq LLM) | < 2 seconds |
| JLL API fetch time | < 1 second |
| Uptime | 99.5% |
| Mobile responsive | Yes |
| Dark mode support | Yes |
| Accessibility | WCAG 2.1 AA |

---

## 15. Phased Delivery Plan

### Phase 1 — Rule-Based Chatbot (Week 1–2)
- [ ] Set up Next.js project with Tailwind
- [ ] Build chat UI (bubbles, input bar, quick reply buttons)
- [ ] Implement guided flow (city → location → type → results)
- [ ] Integrate JLL API with `.env` config
- [ ] Render property cards from API response
- [ ] Deploy to Vercel/Netlify

### Phase 2 — Groq + MCP Integration (Week 3–4)
- [ ] Set up Groq SDK with system prompt
- [ ] Build MCP server exposing JLL API as tools
- [ ] Implement tool-call handler in chat logic
- [ ] Add fallback to rule-based flow when intent unclear
- [ ] Add typing indicator and streaming responses
- [ ] End-to-end testing of hybrid flow

### Phase 3 — Polish & Launch (Week 5)
- [ ] UI/UX refinement
- [ ] Error handling and edge cases
- [ ] Performance optimisation
- [ ] Documentation
- [ ] Production deployment

---

## 16. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| JLL API returns no results | Medium | Show friendly empty state with alternate suggestions |
| Groq API latency | Medium | Show typing indicator; set 5s timeout with fallback |
| User gives unsupported city | Low | MCP `get_cities` tool returns valid options |
| API keys exposed | High | Always use `.env` files; never commit to git |
| Groq hallucination on property details | Medium | Always fetch real data via MCP; never let LLM invent listings |

---

## 17. Success Metrics

| Metric | Target |
|--------|--------|
| Conversation completion rate | > 70% |
| Time to first property result | < 30 seconds |
| User satisfaction (CSAT) | > 4/5 |
| API error rate | < 1% |
| Natural language query success rate | > 85% |

---

*End of PRD v1.0 — JLL Property Chatbot*
