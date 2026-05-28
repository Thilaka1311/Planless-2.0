import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

// Lazy initialization of Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured in Secrets");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Lazy initialization of Supabase client helper
let supabaseClient: any = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    // Rely on environment variables, falling back to the publishable anon keys provided by user as defaults
    const url = process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
    const key = process.env.SUPABASE_KEY || "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";
    
    if (url && key) {
      supabaseClient = createClient(url, key);
    }
  }
  return supabaseClient;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  // 1. API ROUTES FIRST
  
  // Checks system config status for Supabase integration dashboard
  app.get("/api/config-status", (req, res) => {
    const url = process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
    const key = process.env.SUPABASE_KEY || "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";
    res.json({
      configured: !!(url && key),
      supabase_url: url,
      supabase_has_key: !!key
    });
  });

  // Pulls all data down from Supabase, detecting missing schemas gracefully
  app.get("/api/db/fetch-all", async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) {
        res.json({
          configured: false,
          tables_missing: true,
          missing_tables: ["users", "circles", "circle_members", "plans", "plan_participants", "transactions", "memories"],
          data: null
        });
        return;
      }

      const tables = [
        "users",
        "circles",
        "circle_members",
        "plans",
        "plan_participants",
        "transactions",
        "memories"
      ];

      const results: Record<string, any[]> = {};
      const missingTables: string[] = [];

      await Promise.all(
        tables.map(async (table) => {
          try {
            const { data, error } = await client.from(table).select("*");
            if (error) {
              // Standard missing table code in pg SQL is 42P01, or search for "does not exist"
              if (error.code === "42P01" || error.message?.includes("does not exist") || error.message?.includes("relation")) {
                missingTables.push(table);
              } else {
                throw error;
              }
            } else {
              results[table] = data || [];
            }
          } catch (tableErr: any) {
            console.warn(`[Supabase Fetch Sync] Table ${table} not queryable yet:`, tableErr.message || tableErr);
            missingTables.push(table);
          }
        })
      );

      res.json({
        configured: true,
        tables_missing: missingTables.length > 0,
        missing_tables: missingTables,
        data: results
      });
    } catch (err: any) {
      console.error("[Supabase Fetch Error]:", err);
      res.status(500).json({ error: err.message || "Failed to sync tables from Supabase." });
    }
  });

  // Proxy route to instantly UPSERT one or multiple rows to any table seamlessly
  app.post("/api/db/upsert", async (req, res) => {
    try {
      const { table, records } = req.body;
      if (!table || !records || !Array.isArray(records)) {
        res.status(400).json({ error: "Invalid payload parameters. Expected 'table' name and 'records' array." });
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        res.status(503).json({ error: "Supabase client key or endpoint is not initialized." });
        return;
      }

      const { data, error } = await client.from(table).upsert(records);
      if (error) {
        console.error(`[Supabase Upsert Sync] Error writing to ${table}:`, error);
        res.status(500).json({ error: error.message, details: error.details, hint: error.hint });
        return;
      }

      res.json({ success: true, count: records.length });
    } catch (error: any) {
      console.error("[Supabase Sync Proxy Error]:", error);
      res.status(500).json({ error: error.message || "Internal server error syncing row database changes." });
    }
  });

  // Truncate / clear all data in Supabase sandbox for full demo resets
  app.post("/api/db/reset", async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) {
        res.json({ success: true, message: "No Supabase client configured. Local reset only." });
        return;
      }

      // Order satisfies foreign key constraint hierarchy
      const tableDeletes = [
        { name: "plan_participants", pk: "participant_id" },
        { name: "transactions", pk: "transaction_id" },
        { name: "memories", pk: "memory_id" },
        { name: "plans", pk: "plan_id" },
        { name: "circle_members", pk: "circle_member_id" },
        { name: "circles", pk: "circle_id" },
        { name: "users", pk: "user_id" }
      ];

      for (const table of tableDeletes) {
        // Delete all rows safely using standard non-matching or filters
        const { error } = await client.from(table.name).delete().neq(table.pk, "_nonexistent_");
        if (error) {
          console.warn(`[Supabase Reset Warning] Failed to truncate table ${table.name}:`, error);
        }
      }

      res.json({ success: true, message: "Supabase database truncated successfully!" });
    } catch (err: any) {
      console.error("[Supabase Reset Error]:", err);
      res.status(500).json({ error: err.message || "Failed to reset Supabase database." });
    }
  });

  // AI coordinates generation endpoint
  app.post("/api/generate-plan", async (req, res) => {
    try {
      const { vibe, category } = req.body;
      if (!vibe) {
        res.status(400).json({ error: "Please provide a vibe description for the plan!" });
        return;
      }

      const client = getGeminiClient();
      const systemInstruction = 
        `You are the Planless AI Social Coordinator.\n` +
        `Planless is a social productivity and spontaneous coordination app for young friends, campus circles, and cohorts.\n` +
        `The app values lightweight social interactions, Spotify-style calmness, and real-life connections.\n\n` +
        `Generate a highly compelling, specific, and realistic spontaneous social plan matching the user's vibe: "${vibe}" and preferred category: "${category || 'any'}".\n\n` +
        `The output must be a valid raw JSON object matching this TypeScript format exactly, with NO markdown block wrappers (no \`\`\`json or \`\`\` text): \n` +
        `{\n` +
        `  "title": "Compelling Title (under 30 chars, e.g., '🍿 Cinema Crew', '⚽ Rain Turf Football', '🍹 Rooftop Sundowner')",\n` +
        `  "category": "movies" (for cinema, Netflix) | "sports" (for matches, gym) | "restaurants" (for dinner, cafes, drinks) | "custom" (for roadtrips, games, etc.),\n` +
        `  "date": "Today" | "Tomorrow" | "Weekend",\n` +
        `  "time": "e.g., 7:00 PM, 3:30 PM, 9:00 PM",\n` +
        `  "location": "A relatable venue (e.g., 'Skyline Arena Turf', 'Social Cafe', 'Sunset Glassbox Lounge', 'Regal Cinema')",\n` +
        `  "cost": number (estimated split amount in Rupees, e.g. 150, 450, 0),\n` +
        `  "maxSpots": number (sensible spots, e.g., 6, 12, 16),\n` +
        `  "description": "Short social description (under 120 chars) inviting friends and setting the warm positive vibe",\n` +
        `  "notes": "Cozy side-comment or preparation item (under 80 chars, e.g., 'Bring light jackets. We will grab snacks!')"\n` +
        `}`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: vibe,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.8,
        },
      });

      const responseText = response.text ? response.text.trim() : "";
      if (!responseText) {
        throw new Error("Empty response generated by Gemini model.");
      }

      // Parse JSON safely
      const planData = JSON.parse(responseText);
      res.json(planData);
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate social plan." });
    }
  });

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // 2. VITE MIDDLEWARE (DEV) OR STATIC CHASSIS (PROD)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Planless Fullstack App server booted on http://localhost:${PORT}`);
  });
}

startServer();

