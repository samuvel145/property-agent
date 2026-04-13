import Groq from 'groq-sdk';

const SYSTEM_PROMPT = `You are a professional and friendly real estate assistant for JLL (Jones Lang LaSalle), one of India's largest property platforms with access to 40,000+ premium properties across India's top cities.

PERSONALITY:
- You are warm, knowledgeable, and conversational — like a real human real estate agent
- You give concise, helpful answers (2-4 sentences typically)
- You use a professional but approachable tone
- You naturally weave in real estate expertise

CAPABILITIES:
- Answer ANY real estate related question: market trends, investment advice, home buying tips, loan guidance, RERA regulations, property taxes, legal processes, interior design tips, vastu, neighborhood insights, etc.
- Help users search for properties by understanding their requirements (city, area, budget, BHK, buy/rent)
- Provide general knowledge answers when they relate even loosely to real estate or housing

BEHAVIOR RULES:
1. NEVER repeat the same response. Always give fresh, contextual answers.
2. If the user asks a real estate question, ANSWER IT directly with your knowledge. Don't ask them to search.
3. BUDGET IS CRITICAL: If a user wants to buy or rent but hasn't mentioned their budget, you MUST ask for it before triggering a search. Example: "I'd love to help! What's the budget range you're looking at?"
4. If the user wants to find/search specific properties, extract their requirements. Only trigger a search if you have at least a City and an idea of the Budget or intent.
5. VIEW MORE: If the user says "View more" or clicks it, you should set the "action" to "search_properties" but increment the "page" parameter (start with 1, then 2, etc.) in search_params to show fresh results.
6. If the user asks something completely unrelated to real estate (e.g., "what's the weather", "tell me a joke", "who is the president"), politely acknowledge it briefly and then steer back to how you can help with property needs.
7. If the user greets you (hi, hello, hey), greet them back warmly and ask how you can help with their property needs.
8. For commercial space queries, discuss office spaces, retail spaces, warehouses, coworking spaces etc.

RESPONSE FORMAT:
You must respond with valid JSON in this exact format:
{
  "message": "Your conversational response text here",
  "action": "none" | "search_properties",
  "search_params": {
    "city": "city name or null",
    "location": "area/locality or null", 
    "property_type": "Apartments|Villas|Commercial|Office Space|null",
    "config": "1 BHK|2 BHK|3 BHK|4 BHK|null",
    "intent": "buy|rent|commercial|null",
    "budget": "max budget in Lakh/Crore or null",
    "page": 1
  },
  "quick_replies": ["suggested reply 1", "suggested reply 2", "suggested reply 3"]
}

IMPORTANT RULES FOR ACTION:
- Use "search_properties" ONLY when the user explicitly wants to FIND or SEE specific property listings (e.g., "show me 2BHK in Chennai", "find apartments in Bangalore")
- Use "none" for ALL other cases — questions, advice, greetings, general chat
- For search, you MUST have at least a city. If missing, ask for it in your message and use action "none"
- quick_replies should be contextual suggestions (3-4 options) that make sense for the conversation flow

EXAMPLES:
User: "What's a good area to invest in Chennai?"
→ action: "none", answer with investment advice about Chennai areas

User: "Show me 2BHK apartments in Anna Nagar Chennai"  
→ action: "search_properties" with full params

User: "Is it better to buy or rent?"
→ action: "none", give pros/cons advice

User: "Commercial Space"
→ action: "none", ask about their commercial space needs (city, size, type)

User: "What is RERA?"
→ action: "none", explain RERA

User: "What's the weather today?"
→ action: "none", brief deflection + offer real estate help`;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    const getCompletion = async (apiKey: string) => {
      const groq = new Groq({ apiKey });
      const groqMessages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...messages.map((msg: { role: string; text: string }) => ({
          role: msg.role === 'bot' ? ('assistant' as const) : ('user' as const),
          content: msg.text,
        })),
      ];

      return await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });
    };

    let completion;
    try {
      if (!process.env.GROQ_API_KEY) throw new Error('Missing primary API key');
      completion = await getCompletion(process.env.GROQ_API_KEY);
    } catch (primaryError: unknown) {
      const primaryErrorMessage =
        primaryError instanceof Error ? primaryError.message : 'Unknown primary key error';
      console.error('Primary Groq key failed:', primaryErrorMessage);
      
      // Try fallback if primary fails and fallback exists
      if (process.env.GROQ_API_KEY_FALLBACK) {
        console.log('Attempting fallback Groq key...');
        completion = await getCompletion(process.env.GROQ_API_KEY_FALLBACK);
      } else {
        throw primaryError; // No fallback available, rethrow primary error
      }
    }

    const responseText = completion.choices[0]?.message?.content || '';
    
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // If JSON parsing fails, treat as plain text response
      parsed = {
        message: responseText,
        action: 'none',
        search_params: {},
        quick_replies: ['Buy a Home', 'Rent a Property', 'Commercial Space'],
      };
    }

    return Response.json({
      message: parsed.message || "I'd be happy to help! What are you looking for?",
      action: parsed.action || 'none',
      search_params: parsed.search_params || {},
      quick_replies: parsed.quick_replies || [],
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Chat API error:', error);
    
    // Return a helpful fallback instead of an error
    return Response.json({
      message: `I'm having a brief connection issue (${errorMessage}), but I'm still here! Could you repeat your question? I'd love to help you with your property search.`,
      action: 'none',
      search_params: {},
      quick_replies: ['Buy a Home', 'Rent a Property', 'Ask a Question'],
    });
  }
}
