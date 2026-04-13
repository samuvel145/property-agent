import { chatWithGroq } from '@/lib/groqClient';
import { JLL_TOOLS } from '@/lib/mcpTools';
import { searchProperties, getCities, getLocations } from '@/lib/jllApi';

export async function POST(request: Request) {
  try {
    const primaryKey = process.env.GROQ_API_KEY;
    const fallbackKey = process.env.GROQ_API_KEY_FALLBACK;
    
    if (!primaryKey && !fallbackKey) {
      return Response.json({
        type: "error",
        message: "SYSTEM ERROR: The GROQ_API_KEY environment variable is missing. You need to add 'GROQ_API_KEY' in your Vercel Project Settings > Environment Variables, and then redeploy."
      });
    }

    const { messages } = await request.json();

    const getCompletion = async (apiKey: string, msgs: any[]) => {
      return await chatWithGroq(msgs, JLL_TOOLS, apiKey);
    };

    let apiKeyToUse = primaryKey || fallbackKey!;
    let completion;

    try {
      completion = await getCompletion(apiKeyToUse, messages);
    } catch (primaryError: any) {
      console.error('Primary Groq key failed:', primaryError.message);
      if (primaryKey && fallbackKey) {
        console.log('Attempting fallback Groq key...');
        apiKeyToUse = fallbackKey;
        completion = await getCompletion(apiKeyToUse, messages);
      } else {
        throw primaryError;
      }
    }

    const responseMessage = completion.choices[0]?.message;

    // Check for tool calls
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || '{}');

      let toolResult;
      let returnType = "";
      
      if (functionName === 'search_properties') {
        const results = await searchProperties(args);
        toolResult = results;
        returnType = "properties";
      } else if (functionName === 'get_cities') {
        const cities = await getCities();
        toolResult = cities;
        returnType = "cities";
      } else if (functionName === 'get_locations') {
        const locations = await getLocations(args.city);
        toolResult = locations;
        returnType = "locations";
      }

      // Step 15: Handle Groq Tool Call Loop
      // We append the tool result to the conversation and call Groq again
      const nextMessages = [
        ...messages,
        responseMessage,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          name: functionName,
          // Condense tool result to prevent token explosion
          content: JSON.stringify({
            summary: Array.isArray(toolResult) ? `Found ${toolResult.length} items.` : "Executed successfully",
            // only pass a small glimpse to the LLM to save tokens
            sample: Array.isArray(toolResult) ? toolResult.slice(0, 2) : toolResult 
          })
        }
      ];

      const secondCompletion = await getCompletion(apiKeyToUse, nextMessages);
      const finalMessage = secondCompletion.choices[0]?.message?.content || "";

      return Response.json({
        type: returnType,
        message: finalMessage,
        data: toolResult,
        toolArgs: args
      });
    }

    // No tool calls, standard text response (Step 13 part 5)
    return Response.json({
      type: "text",
      message: responseMessage?.content || "I am here to help."
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return Response.json({
      type: "error",
      message: `Oops! I had trouble fetching properties (${error.message || 'Unknown error'}). Please try again.`
    }, { status: 500 });
  }
}
