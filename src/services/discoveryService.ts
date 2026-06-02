import { DiscoverySection, DiscoveryItem } from "../core/types/discovery";

export async function getDiscoverySections(): Promise<DiscoverySection[]> {
  const url = "/api/discovery/sections";
  console.log(`[DiscoveryService] Fetching: URL=${url}`);
  try {
    const res = await fetch(url);
    const contentType = res.headers.get("content-type") || "";
    
    // Log details
    console.log(`[DiscoveryService] URL=${url} | Status=${res.status} | Content-Type=${contentType}`);
    const text = await res.text();
    console.log(`[DiscoveryService] Body Preview: ${text.substring(0, 200)}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch discovery sections: HTTP ${res.status}`);
    }

    if (!contentType.includes("application/json")) {
      throw new Error(`Expected JSON but received Content-Type: ${contentType}`);
    }

    const data = JSON.parse(text);
    console.log(`[DiscoveryService] Loaded sections count: ${data.length}`);
    return data;
  } catch (err: any) {
    console.error(`[DiscoveryService] Error fetching sections:`, err);
    throw err;
  }
}

export async function getDiscoveryItems(): Promise<DiscoveryItem[]> {
  const url = "/api/discovery/items";
  console.log(`[DiscoveryService] Fetching: URL=${url}`);
  try {
    const res = await fetch(url);
    const contentType = res.headers.get("content-type") || "";

    // Log details
    console.log(`[DiscoveryService] URL=${url} | Status=${res.status} | Content-Type=${contentType}`);
    const text = await res.text();
    console.log(`[DiscoveryService] Body Preview: ${text.substring(0, 200)}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch discovery items: HTTP ${res.status}`);
    }

    if (!contentType.includes("application/json")) {
      throw new Error(`Expected JSON but received Content-Type: ${contentType}`);
    }

    const data = JSON.parse(text);
    console.log(`[DiscoveryService] Loaded items count: ${data.length}`);
    return data;
  } catch (err: any) {
    console.error(`[DiscoveryService] Error fetching items:`, err);
    throw err;
  }
}

export async function getSectionsByCategory(category: string): Promise<DiscoverySection[]> {
  const url = `/api/discovery/by-category/${category}`;
  console.log(`[DiscoveryService] Fetching: URL=${url}`);
  try {
    const res = await fetch(url);
    const contentType = res.headers.get("content-type") || "";

    // Log details
    console.log(`[DiscoveryService] URL=${url} | Status=${res.status} | Content-Type=${contentType}`);
    const text = await res.text();
    console.log(`[DiscoveryService] Body Preview: ${text.substring(0, 200)}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch discovery category data: HTTP ${res.status}`);
    }

    if (!contentType.includes("application/json")) {
      throw new Error(`Expected JSON but received Content-Type: ${contentType}`);
    }

    const data = JSON.parse(text);
    console.log(`[DiscoveryService] Loaded sections count: ${data.length}`);
    return data;
  } catch (err: any) {
    console.error(`[DiscoveryService] Error fetching sections for category ${category}:`, err);
    throw err;
  }
}

