import { Router } from "express";
import { getSupabaseClient } from "../server";

const router = Router();

router.get("/sections", async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not configured." });
      return;
    }

    const { data, error } = await client
      .from("discovery_sections")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch discovery sections." });
  }
});

router.get("/items", async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not configured." });
      return;
    }

    const { data, error } = await client
      .from("discovery_items")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch discovery items." });
  }
});

router.get("/by-category/:category", async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not configured." });
      return;
    }

    const category = req.params.category;

    // Fetch active sections matching this category
    const { data: sections, error: secErr } = await client
      .from("discovery_sections")
      .select("*")
      .eq("category", category)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (secErr) throw secErr;

    if (!sections || sections.length === 0) {
      res.json([]);
      return;
    }

    const sectionIds = sections.map((s: any) => s.id);

    // Fetch active items in these sections
    const { data: items, error: itemErr } = await client
      .from("discovery_items")
      .select("*")
      .in("section_id", sectionIds)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (itemErr) throw itemErr;

    // Nest items under their respective sections
    const mapped = sections.map((sec: any) => ({
      ...sec,
      items: (items || []).filter((item: any) => item.section_id === sec.id)
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch discovery category data." });
  }
});

export default router;
