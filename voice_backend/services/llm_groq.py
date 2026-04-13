import json
from groq import Groq
import os
import sys

# Ensure config is available globally easily
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from mcp.jll_tools import execute_tool

VOICE_SYSTEM_PROMPT = """You are JLL Property Assistant, a friendly AI real estate voice agent for JLL India.

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
Property types: Apartments, Villas, Villaments, Commercial."""

class GroqLLM:
    def __init__(self):
        try:
            self.client = Groq(api_key=settings.GROQ_API_KEY)
            self.model = settings.LLM_MODEL
            self.max_tokens = settings.LLM_MAX_TOKENS
        except Exception as e:
            print(f"Failed to initialize Groq: {e}")
            self.client = None

    async def generate(self, transcript: str, history: list, tools: list) -> tuple[str, dict | None]:
        if not self.client:
            return "I am sorry, my brain is taking a break. Please check my API key.", None

        messages = [{"role": "system", "content": VOICE_SYSTEM_PROMPT}] + history + [{"role": "user", "content": transcript}]

        try:
            # 1. First completion pass with tools
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                max_tokens=self.max_tokens
            )

            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            if tool_calls:
                # 2. Iterate and execute tool calls
                messages.append(response_message)
                
                tool_results_payload = None # to return to client
                
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    print(f"Executing tool: {function_name}({function_args})")
                    
                    # Execute tool
                    tool_result = await execute_tool(function_name, function_args)
                    tool_results_payload = tool_result
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": json.dumps(tool_result),
                    })

                # 3. Second pass to get verbal response
                second_response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    max_tokens=self.max_tokens
                )
                
                final_text = second_response.choices[0].message.content or ""
                return final_text.strip(), tool_results_payload

            else:
                # No tools used
                final_text = response_message.content or ""
                return final_text.strip(), None
                
        except Exception as e:
            print(f"Groq LLM error: {e}")
            return "I am sorry, I had trouble processing that. Please try again.", None

# Singleton
llm_service = GroqLLM()
