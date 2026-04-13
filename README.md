# 🏠 JLL Property Assistant – AI Real Estate Agent

An AI-powered real estate chatbot built with **Next.js** and **Groq AI (LLaMA 3.3 70B)**. Acts as a natural property consultant — answers real estate questions, provides investment advice, and searches 40,000+ properties across India via the JLL API.

## Features

- **AI-Powered Conversations** – Groq LLM handles all responses naturally, no rigid decision trees
- **Property Search** – Searches the JLL API when users want to find listings (city, area, type, config)
- **Real Estate Knowledge** – Answers questions about RERA, market trends, home loans, investment advice, vastu, etc.
- **Smart Deflection** – Politely redirects off-topic questions back to real estate
- **Property Cards** – Displays search results as visual cards with price, area, status, and developer info
- **Quick Replies** – AI generates contextual quick-reply suggestions after every response

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| AI/LLM | Groq SDK → LLaMA 3.3 70B Versatile |
| Styling | Tailwind CSS 4 |
| Property Data | JLL Backend API |
| Language | TypeScript |

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts    # Groq AI endpoint (system prompt + JSON response)
│   ├── globals.css           # Tailwind + custom animations
│   ├── layout.tsx            # Root layout with metadata
│   └── page.tsx              # Renders the Chatbot component
├── components/
│   ├── Chatbot.tsx           # Main chatbot logic (AI processing + property search)
│   ├── MessageBubble.tsx     # Chat message display with property cards
│   ├── PropertyCard.tsx      # Property listing card UI
│   ├── QuickReplies.tsx      # Quick reply button bar
│   └── TypingIndicator.tsx   # Typing animation dots
```

## Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/samuvel145/property-agent.git
   cd property-agent
   npm install
   ```

2. **Configure Environment**
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_JLL_API_BASE_URL=https://jll-backend.ibism.com/api
   GROQ_API_KEY=your_groq_api_key
   ```

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## How It Works

1. User sends a message (typed or quick-reply)
2. Full conversation history is sent to `/api/chat` → Groq AI
3. AI returns a JSON response with:
   - `message` – Natural language reply
   - `action` – `"none"` (just chat) or `"search_properties"` (trigger search)
   - `search_params` – City, location, property type, config
   - `quick_replies` – Contextual follow-up suggestions
4. If action is `search_properties`, the frontend calls the JLL API and renders property cards
