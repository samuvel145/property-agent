import { searchProperties, getCities, getLocations } from '@/lib/jllApi';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'getCities') {
      const cities = await getCities();
      return Response.json({ data: cities });
    }
    
    if (action === 'getLocations') {
      const city = searchParams.get('city') || '';
      const locations = await getLocations(city);
      return Response.json({ data: locations });
    }
    
    // Default to search properties
    const city = searchParams.get('city') || undefined;
    const location = searchParams.get('location') || undefined;
    const property_type = searchParams.get('property_type') || undefined;
    
    const results = await searchProperties({ city, location, property_type });
    return Response.json({ data: results });
    
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
