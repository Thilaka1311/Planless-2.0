export interface DiscoverySection {
  id: string;
  category: "for_you" | "movies" | "sports" | "dining";
  section_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  items?: DiscoveryItem[];
}

export interface DiscoveryItem {
  id: string;
  section_id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  badge: string | null;
  location: string | null;
  price: string | null;
  content_type: "movie" | "sport" | "dining" | "experience" | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}
