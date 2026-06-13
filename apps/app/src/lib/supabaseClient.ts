import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yuuzenyjxxuqahosflob.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
