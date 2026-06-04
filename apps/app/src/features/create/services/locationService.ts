export interface LocationSuggestion {
  name: string;
  address: string;         // display address line 2
  fullAddress: string;     // full formatted address
  latitude: number;
  longitude: number;
  placeId: string;
}

/**
 * Fetches location suggestions from the Geoapify Places Autocomplete API.
 * 
 * Supports up to 8 suggestions.
 * Optionally biases search results towards a set of coordinates (user's location).
 */
export async function fetchLocationSuggestions(
  query: string,
  lat?: number,
  lon?: number
): Promise<LocationSuggestion[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  // Read API Key from Vite env variables
  const apiKey = ((import.meta as any).env?.VITE_GEOAPIFY_API_KEY as string) || "";
  if (!apiKey) {
    console.warn("Geoapify Autocomplete: VITE_GEOAPIFY_API_KEY is not defined.");
    return [];
  }

  try {
    let url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&limit=8&apiKey=${apiKey}`;
    
    // Proximity bias support
    if (lat !== undefined && lon !== undefined) {
      url += `&bias=proximity:${lon},${lat}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geoapify HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.features)) {
      return [];
    }

    return data.features.map((feature: any) => {
      const prop = feature.properties || {};
      
      // Map display name and subtitle address line
      const name = prop.name || prop.address_line1 || "Unknown Place";
      const address = prop.address_line2 || prop.formatted || "";
      const fullAddress = prop.formatted || "";
      const latitude = prop.lat;
      const longitude = prop.lon;
      const placeId = prop.place_id || "";

      return {
        name,
        address,
        fullAddress,
        latitude,
        longitude,
        placeId,
      };
    });
  } catch (error) {
    console.error("Error fetching locations from Geoapify:", error);
    return [];
  }
}
