import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import authRouter from "./routes/auth";
import dbRouter from "./routes/db";
import aiRouter from "./routes/ai";
import paymentsRouter from "./routes/payments";
import discoveryRouter from "./routes/discovery";

dotenv.config();

const PORT = 3000;

// Lazy initialization of Gemini client helper
let aiClient: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
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
export function getSupabaseClient() {
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

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function normalizePhone(phone: string) {
  return String(phone).replace(/[^0-9+]/g, "");
}

export async function findUserByPhone(client: any, phone: string) {
  const normalizedPhone = normalizePhone(phone).replace(/[^0-9]/g, "");
  const { data, error } = await client.from("users").select("*");
  if (error) {
    throw error;
  }
  if (!Array.isArray(data)) {
    return null;
  }
  return data.find((row: any) => {
    if (!row.phone_number) {
      return false;
    }
    const rowPhone = String(row.phone_number).replace(/[^0-9]/g, "");
    return rowPhone === normalizedPhone;
  }) || null;
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

  app.use("/api/auth", authRouter);
  app.use("/api/db", dbRouter);
  app.use("/api", aiRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/discovery", discoveryRouter);

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

  // Seeding default canonical users into Supabase on startup if they don't exist
  async function seedDefaultUsers() {
    const client = getSupabaseClient();
    if (!client) {
      console.log("[Supabase Seed] Supabase client not configured yet.");
      return;
    }

    const defaultUsers = [
      { name: "Thilaka", phone: "9901598018" },
      { name: "Maanas", phone: "7892436109" },
      { name: "Bhaavya", phone: "7892186131" },
      { name: "Renjith", phone: "8073466546" },
    ];

    console.log("[Supabase Seed] Checking and seeding default users...");
    for (const item of defaultUsers) {
      try {
        const existing = await findUserByPhone(client, item.phone);
        if (!existing) {
          const userId = crypto.randomUUID();
          const username = item.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "").slice(0, 15) || `user${Math.floor(Math.random() * 9000 + 1000)}`;
          const cleanPhone = normalizePhone(item.phone);

          const newUser = {
            user_id: userId,
            username,
            full_name: item.name,
            phone_number: cleanPhone,
            profile_photo: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.name)}`,
            bio: "Always spontaneous, never planless.",
            college_or_work: "SRM Chennai",
            created_at: new Date().toISOString(),
            wallet_balance: 0,
            active_status: true,
          };

          const { error } = await client.from("users").insert([newUser]);
          if (error) {
            console.error(`[Supabase Seed] Failed to seed ${item.name}:`, error.message);
          } else {
            console.log(`[Supabase Seed] Seeded user ${item.name} successfully!`);
          }
        } else {
          console.log(`[Supabase Seed] User ${item.name} already exists. Skipping.`);
        }
      } catch (e: any) {
        console.error(`[Supabase Seed] Exception seeding ${item.name}:`, e.message || e);
      }
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Planless Fullstack App server booted on http://localhost:${PORT}`);
    // seedDefaultUsers();
  });
}

startServer();

