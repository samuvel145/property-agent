# JLL Property Chatbot — Step-by-Step Build Prompts

**Use these prompts in order with any AI coding assistant (Cursor, Claude, ChatGPT, etc.)**  
**Stack: Next.js + Tailwind + Groq + MCP + JLL API**

---

## PHASE 1 — Project Setup & Base UI

---

### Step 1 — Create Next.js Project

```
Create a new Next.js 14 project with the following setup:
- Use App Router (not Pages Router)
- Install Tailwind CSS
- Install these packages: groq-sdk, @modelcontextprotocol/sdk, axios
- Set up the folder structure:
  /app
    /api
      /chat/route.js
      /properties/route.js
    /page.js
    /layout.js
  /components
    /Chatbot.jsx
    /MessageBubble.jsx
    /QuickReplies.jsx
    /PropertyCard.jsx
    /TypingIndicator.jsx
  /lib
    /jllApi.js
    /groqClient.js
    /mcpTools.js
  /mcp-server
    /index.js
  .env.local
```

---

### Step 2 — Setup Environment Variables

```
Create a .env.local file with the following variables:

NEXT_PUBLIC_JLL_API_BASE_URL=https://jll-backend.ibism.com/api
GROQ_API_KEY=your_groq_api_key_here
MCP_SERVER_PORT=3001

Also create a .env.example file with the same keys but empty values,
so other developers know what variables are needed.

Add .env.local to .gitignore so it never gets committed to git.
```

---

### Step 3 — Build the JLL API Integration

```
Create /lib/jllApi.js with the following:

1. A function called searchProperties({ city, location, property_type }) that:
   - Reads base URL from process.env.NEXT_PUBLIC_JLL_API_BASE_URL
   - Builds query params dynamically (skip empty values)
   - Calls GET /user/search/projects with those params
   - Returns the data array from the response

2. A function called getCities() that:
   - Calls the same endpoint without filters
   - Extracts unique city names from the results
   - Returns a sorted array of city strings

3. A function called getLocations(city) that:
   - Calls the endpoint with city filter
   - Extracts unique Location values
   - Returns a sorted array of location strings

Handle errors gracefully — return empty array on failure, log error to console.

Example API response structure:
{
  error: false,
  message: "Projects fetched successfully",
  data: [
    {
      Project_Name_Original: "Redbrick Boulevard",
      Location: "Anna Nagar",
      City: "Chennai",
      Project_Type: "Apartments",
      State_Of_Construction: "Under Construction",
      configs: [{ Config_Type: "3 BHK", Super_Built_Up_Area: "1573.00", FinalPrice: 0 }],
      files: [{ Project_File_Path: "https://...", Project_File_Type: "EXT" }],
      developer: [{ Connection_Name: "Redbrick Constructions Pvt Ltd" }],
      amenities: [{ Attribute_Value: "Power Backup" }],
      PosessionDate: "2026-12-30T00:00:00.000Z"
    }
  ],
  total: 33,
  page: 1,
  limit: 20
}
```

---

### Step 4 — Build the Chat UI Layout

```
Create /components/Chatbot.jsx — the main chat container with:

1. A fixed-height chat window (600px) with flex column layout
2. A header section containing:
   - Circular bot avatar with initials "JLL"
   - Bot name: "JLL Property Assistant"
   - Online status indicator (green dot + "Online")
   - A "Groq AI" badge on the right side
   - A restart button (circular arrow icon) to reset conversation
3. A scrollable messages area (flex-1, overflow-y auto)
   - Auto-scroll to bottom when new messages arrive (useEffect + useRef)
4. A bottom input bar with:
   - Text input placeholder: "Type a message or ask anything..."
   - Send button (arrow icon)
   - Disable send when input is empty or bot is typing
5. State management using useState:
   - messages: array of { id, role: 'bot'|'user', text, cards? }
   - inputValue: string
   - isTyping: boolean
   - conversationState: object tracking { step, city, location, propertyType, config }

On mount, immediately show the bot's welcome message (do not wait for user input).
```

---

### Step 5 — Build Message Bubbles

```
Create /components/MessageBubble.jsx that renders a single message:

Props: { role, text, cards }

Rules:
- role === 'bot': align left, white background, light border, bot avatar on left
- role === 'user': align right, blue background (#185FA5), white text, no avatar

Styling:
- Border radius 16px, with bottom-left flat for bot, bottom-right flat for user
- Max width 75% of container
- Font size 14px, line height 1.5
- Padding 10px 14px

If cards prop is provided (array of property objects), render a horizontally 
scrollable row of PropertyCard components below the text.

Animate in with a fade + slight translateY on mount using CSS keyframes.
```

---

### Step 6 — Build Quick Reply Buttons

```
Create /components/QuickReplies.jsx that renders a row of tappable option buttons.

Props: { options: string[], onSelect: (option) => void }

Styling:
- Horizontal flex row with gap 8px, flex-wrap wrap
- Each button: border 0.5px solid, border-radius 20px (pill shape)
- Background white, text #185FA5 (blue), font-size 13px, padding 6px 14px
- Hover: background light blue (#E6F1FB)
- Active: scale(0.97)

After user selects one option:
- Visually mark it as selected (filled blue background, white text)
- Disable all other buttons
- Call onSelect with the selected value

Hide the quick replies once user has made a selection.
```

---

### Step 7 — Build Property Card

```
Create /components/PropertyCard.jsx to display a single JLL property listing.

Props: { project }

Display the following fields:
- Image: files[0].Project_File_Path (EXT type preferred), fallback gray placeholder
- Project name: Project_Name_Original
- Developer: developer[0].Connection_Name
- Location: Location + ", " + City
- Config badge: configs[0].Config_Type (e.g. "3 BHK")
- Status badge: State_Of_Construction
  - "Ready to Move" → green badge
  - "Under Construction" → amber badge  
  - "Pre-Launch" → purple badge
  - "Launched" → blue badge
- Area: configs[0].Super_Built_Up_Area + " sqft"
- Price: if FinalPrice > 0 → "₹X.XX Cr", else → "Price on request"
- Possession: format PosessionDate as "MMM YYYY"
- Amenities: show first 3 as small gray pills

Card dimensions: width 240px, fixed. Image height 130px, object-fit cover.
Border radius 12px. Subtle border 0.5px.
Hover: slight border color darkening.
```

---

### Step 8 — Build Typing Indicator

```
Create /components/TypingIndicator.jsx that shows the bot is thinking.

Display three animated dots in a bot-style bubble (same style as bot message bubble).
Animate using CSS keyframes — each dot bounces up with a staggered delay:
- dot 1: delay 0ms
- dot 2: delay 150ms
- dot 3: delay 300ms

Show this component in the messages list when isTyping === true.
Auto-scroll to it so user always sees it.
```

---

## PHASE 2 — Rule-Based Conversation Logic

---

### Step 9 — Implement Guided Conversation Flow

```
In /components/Chatbot.jsx, implement the rule-based conversation state machine.

Conversation steps in order:
1. GREETING → bot sends welcome + asks "What are you looking for?"
   Quick replies: ["Buy a Home", "Rent a Property", "Commercial Space", "Just Exploring"]

2. CITY → bot asks "Which city are you looking in?"
   Quick replies: ["Chennai", "Bangalore", "Mumbai", "Hyderabad", "Other"]

3. LOCATION → bot asks "Which area in [city]?"
   Quick replies: dynamically fetched from getLocations(city) + "Any Area"

4. PROPERTY_TYPE → bot asks "What type of property?"
   Quick replies: ["Apartments", "Villas", "Villaments", "Commercial"]

5. CONFIG → bot asks "Any preference on size?"
   Quick replies: ["2 BHK", "3 BHK", "4 BHK", "Any"]

6. RESULTS → call JLL API with collected filters, render property cards
   Bot message: "Here are {total} properties matching your search in {location}, {city}:"

At each step, store the user's answer in conversationState.
When user types freely instead of tapping quick reply, pass to Groq (Phase 2 logic).

Add a "Search Again" button after results are shown to restart the flow.
```

---

### Step 10 — Handle Empty Results

```
In the RESULTS step of the conversation flow, handle the case where JLL API returns 0 results.

Bot should respond:
"I couldn't find any [property_type] in [location], [city] right now.
Would you like to try a different area or property type?"

Then show quick replies: ["Try Different Area", "Try Different Type", "Search All of [city]"]

- "Try Different Area" → go back to LOCATION step, keep city
- "Try Different Type" → go back to PROPERTY_TYPE step, keep city + location
- "Search All of [city]" → search with only city filter, no location or type
```

---

## PHASE 3 — Groq LLM Integration

---

### Step 11 — Setup Groq Client

```
Create /lib/groqClient.js:

1. Import Groq from 'groq-sdk'
2. Initialize with process.env.GROQ_API_KEY
3. Export a function called chatWithGroq(messages, tools) that:
   - Calls groq.chat.completions.create()
   - Uses model: "llama3-70b-8192"
   - Passes messages array and tools array
   - Sets tool_choice: "auto"
   - Returns the full response object

4. Export a constant SYSTEM_PROMPT:

"You are JLL Property Assistant, a helpful and friendly real estate chatbot for JLL India.

Your responsibilities:
- Greet users warmly and ask what they are looking for.
- Understand property search intent from natural language.
- Extract these details from user messages: city, location, property_type, config (BHK type), budget, status.
- If details are missing, ask ONE clarifying question at a time — never ask multiple questions together.
- When you have enough context (at minimum: city OR property_type), call the search_properties tool.
- Present results in a friendly, concise format.
- If user asks something unrelated to property, politely redirect them.
- Never invent or guess property listings — always use the search_properties tool for real data.

Available cities in JLL database: Chennai, Bangalore, Mumbai, Hyderabad.
Available property types: Apartments, Villas, Villaments, Commercial.
Tone: Friendly, professional, concise."
```

---

### Step 12 — Define MCP Tools for Groq

```
Create /lib/mcpTools.js that defines the tools Groq can call.

Export an array called JLL_TOOLS containing these tool definitions in OpenAI/Groq tool format:

Tool 1 — search_properties:
{
  type: "function",
  function: {
    name: "search_properties",
    description: "Search JLL property listings. Call this when you know at least the city or property type the user wants.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name. e.g. Chennai, Bangalore, Mumbai, Hyderabad" },
        location: { type: "string", description: "Area or locality within the city. e.g. Anna Nagar, Adyar, Whitefield" },
        property_type: { type: "string", enum: ["Apartments", "Villas", "Villaments", "Commercial"], description: "Type of property" }
      },
      required: []
    }
  }
}

Tool 2 — get_cities:
{
  type: "function",
  function: {
    name: "get_cities",
    description: "Get the list of cities available in JLL database. Call this when user asks what cities are available.",
    parameters: { type: "object", properties: {}, required: [] }
  }
}

Tool 3 — get_locations:
{
  type: "function",
  function: {
    name: "get_locations",
    description: "Get list of areas/localities within a city. Call this when user asks about areas in a specific city.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "The city to get locations for" }
      },
      required: ["city"]
    }
  }
}
```

---

### Step 13 — Build the Chat API Route

```
Create /app/api/chat/route.js as a Next.js API route (POST handler).

It should:
1. Accept POST request with body: { messages: [], conversationState: {} }
2. Add the SYSTEM_PROMPT as the first message with role "system"
3. Call chatWithGroq(messages, JLL_TOOLS)
4. Check if Groq responded with a tool_call:
   a. If tool is "search_properties":
      - Extract { city, location, property_type } from tool call arguments
      - Call searchProperties() from jllApi.js
      - Return { type: "properties", data: results, toolArgs: { city, location, property_type } }
   b. If tool is "get_cities":
      - Call getCities()
      - Return { type: "cities", data: cities }
   c. If tool is "get_locations":
      - Call getLocations(city)
      - Return { type: "locations", data: locations }
5. If no tool call, return the text response:
   { type: "text", message: response.choices[0].message.content }
6. Handle errors: return { type: "error", message: "Something went wrong" } with status 500
```

---

### Step 14 — Connect Groq to Chat UI

```
In /components/Chatbot.jsx, update the message send handler to use hybrid logic:

When user sends a message:

1. Check if we are in a known conversation step (CITY, LOCATION, etc.)
   AND the message matches a quick reply option:
   → Handle it as rule-based (no Groq call needed, just advance the step)

2. Otherwise (free text, unknown input, complex query):
   → Set isTyping = true
   → Build messages array from conversation history
   → POST to /api/chat with { messages, conversationState }
   → Handle the response:
     - type === "properties" → render property cards in a bot message
     - type === "cities" → show city options as quick replies
     - type === "locations" → show location options as quick replies
     - type === "text" → show as regular bot text bubble
     - type === "error" → show error message in bot bubble
   → Set isTyping = false

3. Always append both the user message and bot response to the messages array.

This creates the hybrid experience:
- Tapping quick replies → instant, no API call
- Typing anything free → Groq + MCP handles it
```

---

### Step 15 — Handle Groq Tool Call Loop

```
In /app/api/chat/route.js, implement proper tool call loop handling.

When Groq returns a tool_call:
1. Execute the tool (call JLL API)
2. Append the tool result back to messages as role "tool"
3. Call Groq again with the updated messages (so Groq can format the result for the user)
4. Return Groq's final text response along with the raw property data

This ensures Groq's response is always natural language that references real data,
not raw JSON dumped to the user.

Example message flow:
messages = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: "Show me 3BHK in Anna Nagar" },
  { role: "assistant", tool_calls: [{ function: { name: "search_properties", arguments: '{"city":"Chennai","location":"Anna Nagar","property_type":"Apartments"}' }}] },
  { role: "tool", tool_call_id: "...", content: JSON.stringify(results) },
  { role: "assistant", content: "I found 33 apartments in Anna Nagar, Chennai. Here are the top matches:" }
]
```

---

## PHASE 4 — Polish & Edge Cases

---

### Step 16 — Add Conversation Memory

```
In Chatbot.jsx, maintain a messages array that acts as conversation history.

Format each message for Groq as:
{ role: "user" | "assistant", content: "..." }

Rules:
- Keep last 10 messages maximum to avoid hitting Groq context limits
- When property cards are shown, summarize them in the assistant message as text
  (don't send raw JSON to Groq — just say "Showed 5 properties in Anna Nagar")
- Reset messages array when user clicks "Start Over"

This allows follow-up questions like:
User: "Show me apartments in Anna Nagar"
Bot: [shows results]
User: "What about Ready to Move ones only?" ← Groq remembers the context
```

---

### Step 17 — Add Loading & Error States

```
Add these UI states to Chatbot.jsx:

1. isTyping === true:
   → Show TypingIndicator component in messages list
   → Disable the input field and send button
   → Show a subtle "JLL Assistant is thinking..." text below the input

2. API error:
   → Show bot bubble: "Oops! I had trouble fetching properties. Please try again."
   → Show retry button as quick reply: ["Try Again"]

3. Network offline:
   → Detect with navigator.onLine
   → Show bot bubble: "You seem to be offline. Please check your connection."

4. Groq rate limit (429 error):
   → Show bot bubble: "I'm a little busy right now. Please wait a moment and try again."
   → Auto-retry after 3 seconds

5. Empty search results:
   → Already handled in Step 10
```

---

### Step 18 — Add "Restart Conversation" Feature

```
Add a restart button in the chat header (circular arrow icon).

When clicked:
1. Show a confirmation: "Start a new search?" with Yes / No quick replies
2. If Yes:
   - Clear messages array
   - Reset conversationState to initial values
   - Reset inputValue to ""
   - Show the welcome message again (same as on mount)
3. If No:
   - Remove the confirmation message, continue current conversation
```

---

### Step 19 — Responsive & Mobile Design

```
Make the chatbot fully responsive for mobile screens.

Changes needed:
1. On screens < 640px:
   - Chat container takes full viewport height (100dvh)
   - Remove border radius on outer container
   - Property cards scroll horizontally in a snap-scroll container
   - Quick reply buttons wrap to 2 rows max
   - Font sizes reduce slightly (13px body, 12px secondary)

2. Input bar:
   - Input field takes full width
   - Send button is icon-only (no text) on mobile

3. Property cards:
   - Width: 220px on mobile, 240px on desktop
   - Snap scroll: scroll-snap-type x mandatory on container
   - Each card: scroll-snap-align start

4. Use Tailwind responsive prefixes (sm:, md:) for all sizing.
```

---

### Step 20 — Final Integration Test

```
Write a checklist test to verify the full chatbot flow works end-to-end:

Rule-based flow test:
[ ] Bot greets on load without any user interaction
[ ] "Buy a Home" quick reply advances to city step
[ ] Selecting "Chennai" shows Anna Nagar, Adyar etc. as location options
[ ] Selecting "Anna Nagar" → "Apartments" → "3 BHK" returns real JLL listings
[ ] Property cards show image, name, price, status, config, possession
[ ] "Search Again" restarts the flow cleanly

Groq + MCP flow test:
[ ] Typing "Show me 3BHK in Anna Nagar" returns results (no guided steps)
[ ] Typing "Affordable apartments in Chennai" returns results
[ ] Typing "What cities do you have?" returns city list
[ ] Typing "hello" gets a friendly greeting response
[ ] Typing "what's the weather?" gets a polite redirect to property search
[ ] Follow-up "show only ready to move" after a search filters correctly

Edge case tests:
[ ] Empty result → fallback message shown
[ ] Groq timeout → error message shown
[ ] Restart button resets everything cleanly
[ ] Mobile view scrolls properly
[ ] No hardcoded URLs in source (all from .env)
```

---

## BONUS — Deployment

---

### Step 21 — Deploy to Vercel

```
Deploy the Next.js chatbot to Vercel:

1. Push code to GitHub (make sure .env.local is in .gitignore)

2. Go to vercel.com → New Project → Import your GitHub repo

3. In Vercel project settings, add Environment Variables:
   - NEXT_PUBLIC_JLL_API_BASE_URL = https://jll-backend.ibism.com/api
   - GROQ_API_KEY = your_actual_groq_key

4. Deploy. Vercel auto-detects Next.js and builds it.

5. After deploy, test these URLs:
   - / → chatbot UI loads
   - /api/chat → returns 405 Method Not Allowed (GET not allowed, POST only)
   - /api/properties → returns property list JSON

6. Set up a custom domain if needed in Vercel dashboard.

Note: MCP server runs as part of Next.js API routes in production.
No separate server needed for deployment.
```

---

*End of Build Prompts — JLL Property Chatbot*  
*Use each step as a separate prompt in Cursor / Claude / ChatGPT for best results.*
