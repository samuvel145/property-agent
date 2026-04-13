import httpx
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

# 1. MCP Tools Schema for Groq
JLL_TOOLS = [
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
                "properties": {
                    "city": {"type": "string"}
                },
                "required": ["city"]
            }
        }
    }
]

# 2. Tool Implementation Setup
async def search_properties(city: str = "", location: str = "", property_type: str = "") -> dict:
    params = {}
    if city: params["city"] = city
    if location: params["location"] = location
    if property_type: params["property_type"] = property_type

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.JLL_API_BASE_URL}/user/search/projects", params=params)
            response.raise_for_status()
            data = response.json()
            return {"data": data.get("data", []), "total": data.get("total", 0)}
    except Exception as e:
        print(f"JLL API search error: {e}")
        return {"data": [], "total": 0}

async def get_cities() -> list[str]:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.JLL_API_BASE_URL}/user/search/projects")
            response.raise_for_status()
            data = response.json().get("data", [])
            cities = list(set([proj.get("City") for proj in data if proj.get("City")]))
            return sorted(cities)
    except Exception as e:
        print(f"JLL API get_cities error: {e}")
        return ["Chennai", "Bangalore", "Mumbai", "Hyderabad"]

async def get_locations(city: str) -> list[str]:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.JLL_API_BASE_URL}/user/search/projects", params={"city": city})
            response.raise_for_status()
            data = response.json().get("data", [])
            locations = list(set([proj.get("Location") for proj in data if proj.get("Location")]))
            return sorted(locations)
    except Exception as e:
        print(f"JLL API get_locations error: {e}")
        return []

# 3. Execution Router
async def execute_tool(tool_name: str, tool_args: dict) -> dict:
    if tool_name == "search_properties":
        return await search_properties(
            city=tool_args.get("city", ""),
            location=tool_args.get("location", ""),
            property_type=tool_args.get("property_type", "")
        )
    elif tool_name == "get_cities":
        cities = await get_cities()
        return {"data": cities, "total": len(cities)}
    elif tool_name == "get_locations":
        locations = await get_locations(city=tool_args.get("city", ""))
        return {"data": locations, "total": len(locations)}
    
    return {"data": [], "total": 0}
