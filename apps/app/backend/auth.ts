import { Router } from "express";
import crypto from "crypto";
import { getSupabaseClient, hashPassword, normalizePhone, findUserByPhone } from "../server";

const router = Router();

router.post("/check-user", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: "phone is required" });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not configured." });
      return;
    }

    const user = await findUserByPhone(client, phone);
    res.json({ success: true, exists: Boolean(user), user });
  } catch (err: any) {
    console.error("[Auth Check User Exception]", err);
    res.status(500).json({ error: err.message || "User check failed." });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { phone, full_name, bio, profile_photo, college_or_work, password } = req.body;
    if (!phone || !full_name || !password) {
      res.status(400).json({ error: "phone, full_name, and password are required" });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not configured." });
      return;
    }

    const existingUser = await findUserByPhone(client, phone);
    if (existingUser) {
      res.status(409).json({ error: "A user with this phone number already exists." });
      return;
    }

    const username = full_name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "").slice(0, 15) || `user${Math.floor(Math.random() * 9000 + 1000)}`;
    const newUser = {
      username,
      full_name,
      phone_number: normalizePhone(phone),
      profile_photo: profile_photo || null,
      bio: bio || "Always spontaneous, never planless.",
      college_or_work: college_or_work || "SRM Chennai",
      created_at: new Date().toISOString(),
      wallet_balance: 0,
      active_status: true,
      password_hash: hashPassword(password),
    };

    const { data, error } = await client.from("users").insert([newUser]).select("*");
    if (error) {
      console.error("[Auth Signup Error]", error);
      const message = error.message || "Failed to create user.";
      if (message.includes("password_hash") || error.details?.includes("password_hash")) {
        res.status(500).json({ error: "Supabase users table is missing the password_hash column. Add it and retry." });
      } else {
        res.status(500).json({ error: message });
      }
      return;
    }

    // Initialize user_stats record
    const { error: statsError } = await client
      .from("user_stats")
      .insert([{ user_id: data[0].id }]);
    if (statsError) {
      console.warn("[Auth Signup] Failed to initialize user_stats:", statsError.message);
    }

    // Initialize user_data record
    const defaultData = {
      theme: "dark",
      notifications_enabled: true,
      spontaneous_matching_enabled: true,
      coordinate_ping_snooze: false,
      wallet_alerts: true,
      contacts: [
        "+91 90001 00001",
        "+91 90002 00003",
        "+91 90003 00004",
        "+91 90002 00004",
        "+91 90002 00005",
        "+91 90001 00002",
        "+91 90001 00008",
        "+91 90004 00004",
        "+91 90003 00001",
        "+91 90002 00002",
        "+91 90003 00003",
        "+91 90002 00006",
        "+91 99015 98018",
        "+91 78924 36108",
        "+91 78924 36109",
        newUser.phone_number
      ]
    };
    const { error: dataError } = await client
      .from("user_data")
      .insert([{ user_id: data[0].id, data: JSON.stringify(defaultData) }]);
    if (dataError) {
      console.warn("[Auth Signup] Failed to initialize user_data:", dataError.message);
    }

    res.json({ success: true, user: data[0] });
  } catch (err: any) {
    console.error("[Auth Signup Exception]", err);
    res.status(500).json({ error: err.message || "Signup failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      res.status(400).json({ error: "phone and password are required" });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not configured." });
      return;
    }

    const user = await findUserByPhone(client, phone);
    if (!user) {
      res.status(401).json({ error: "Invalid phone number or password." });
      return;
    }

    if (user.password_hash === undefined) {
      res.status(500).json({ error: "Supabase users table is missing the password_hash column." });
      return;
    }

    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) {
      res.status(401).json({ error: "Invalid phone number or password." });
      return;
    }

    res.json({ success: true, user });
  } catch (err: any) {
    console.error("[Auth Login Exception]", err);
    res.status(500).json({ error: err.message || "Login failed." });
  }
});

router.post("/login-or-signup", async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone) {
      res.status(400).json({ error: "phone is required" });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not configured." });
      return;
    }

    // Check if user exists by phone
    let user = await findUserByPhone(client, phone);
    if (user) {
      // Case B: Same phone, different name -> Update existing user's name in the database and log them in
      if (name && name.trim() && user.full_name !== name.trim()) {
        const updatedName = name.trim();
        const { error: updateError } = await client
          .from("users")
          .update({ full_name: updatedName })
          .eq("user_id", user.user_id);
        if (updateError) {
          console.error("[Auth login-or-signup Update Name Error]", updateError);
        } else {
          user.full_name = updatedName;
        }
      }
      res.json({ success: true, user, isNew: false });
      return;
    }

    // If user does not exist, create new user record (Case A: Different phone number -> separate account)
    if (!name) {
      res.status(400).json({ error: "Name is required to register a new account." });
      return;
    }

    const username = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "").slice(0, 15) || `user${Math.floor(Math.random() * 9000 + 1000)}`;
    const cleanPhone = normalizePhone(phone);
    
    const newUser = {
      username,
      full_name: name.trim(),
      phone_number: cleanPhone,
      profile_photo: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
      bio: "Always spontaneous, never planless.",
      college_or_work: "SRM Chennai",
      created_at: new Date().toISOString(),
      wallet_balance: 0,
      active_status: true,
    };

    const { data, error } = await client.from("users").insert([newUser]).select("*");
    if (error) {
      console.error("[Auth login-or-signup Signup Error]", error);
      res.status(500).json({ error: error.message || "Failed to create user." });
      return;
    }

    // Initialize user_stats record
    const { error: statsError } = await client
      .from("user_stats")
      .insert([{ user_id: data[0].id }]);
    if (statsError) {
      console.warn("[Auth login-or-signup] Failed to initialize user_stats:", statsError.message);
    }

    // Initialize user_data record
    const defaultData = {
      theme: "dark",
      notifications_enabled: true,
      spontaneous_matching_enabled: true,
      coordinate_ping_snooze: false,
      wallet_alerts: true,
      contacts: [
        "+91 90001 00001",
        "+91 90002 00003",
        "+91 90003 00004",
        "+91 90002 00004",
        "+91 90002 00005",
        "+91 90001 00002",
        "+91 90001 00008",
        "+91 90004 00004",
        "+91 90003 00001",
        "+91 90002 00002",
        "+91 90003 00003",
        "+91 90002 00006",
        "+91 99015 98018",
        "+91 78924 36108",
        "+91 78924 36109",
        newUser.phone_number
      ]
    };
    const { error: dataError } = await client
      .from("user_data")
      .insert([{ user_id: data[0].id, data: JSON.stringify(defaultData) }]);
    if (dataError) {
      console.warn("[Auth login-or-signup] Failed to initialize user_data:", dataError.message);
    }

    res.json({ success: true, user: data[0], isNew: true });
  } catch (err: any) {
    console.error("[Auth login-or-signup Exception]", err);
    res.status(500).json({ error: err.message || "Authentication failed." });
  }
});

export default router;
