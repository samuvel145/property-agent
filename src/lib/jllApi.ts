const BASE_URL = process.env.NEXT_PUBLIC_JLL_API_BASE_URL;

export async function searchProperties({ 
  city, 
  location, 
  property_type 
}: {
  city?: string,
  location?: string,
  property_type?: string
}) {
  try {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (location && location !== 'null') params.append('location', location);
    if (property_type && property_type !== 'null') params.append('property_type', property_type);

    const res = await fetch(`${BASE_URL}/user/search/projects?${params}`);
    if (!res.ok) throw new Error('Failed to fetch from JLL API');
    
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Error in searchProperties:", error);
    return [];
  }
}

export async function getCities() {
  try {
    const res = await fetch(`${BASE_URL}/user/search/projects`);
    if (!res.ok) throw new Error('Failed to fetch from JLL API');
    
    const data = await res.json();
    const projects = data.data || [];
    
    const citiesSet = new Set<string>();
    projects.forEach((p: any) => {
      if (p.City) citiesSet.add(p.City);
    });
    
    return Array.from(citiesSet).sort();
  } catch (error) {
    console.error("Error in getCities:", error);
    return [];
  }
}

export async function getLocations(city: string) {
  try {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    
    const res = await fetch(`${BASE_URL}/user/search/projects?${params}`);
    if (!res.ok) throw new Error('Failed to fetch from JLL API');
    
    const data = await res.json();
    const projects = data.data || [];
    
    const locationSet = new Set<string>();
    projects.forEach((p: any) => {
      if (p.Location) locationSet.add(p.Location);
    });
    
    return Array.from(locationSet).sort();
  } catch (error) {
    console.error("Error in getLocations:", error);
    return [];
  }
}
