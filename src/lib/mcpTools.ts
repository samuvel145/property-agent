export const JLL_TOOLS = [
  {
    type: "function" as const,
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
  },
  {
    type: "function" as const,
    function: {
      name: "get_cities",
      description: "Get the list of cities available in JLL database. Call this when user asks what cities are available.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function" as const,
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
];
