import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

const sb = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 1. Try to get the real Supabase Auth user
    const authHeader = request.headers.get("Authorization");
    let user: any = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser } } = await sb.auth.getUser(token);
      user = authUser;
    }

    let passwordChangedAtStr: string;

    if (user) {
      // Fetch password changed date from profiles
      const { data: profile, error } = await sb
        .from("profiles")
        .select("password_changed_at")
        .eq("id", user.id)
        .single();

      if (error || !profile || !profile.password_changed_at) {
        // Default to creation date or today
        passwordChangedAtStr = user.created_at || new Date().toISOString();
      } else {
        passwordChangedAtStr = profile.password_changed_at;
      }
    } else {
      // 2. Mock mode: Read from cookies
      const mockCookie = request.cookies.get("mock-password-changed-at")?.value;
      if (mockCookie) {
        passwordChangedAtStr = mockCookie;
      } else {
        // If not set, default to today
        passwordChangedAtStr = new Date().toISOString();
      }
    }

    const passwordChangedAt = new Date(passwordChangedAtStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - passwordChangedAt.getTime());
    const daysSinceChange = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Expiry policies: 180 days limit
    const isExpired = daysSinceChange >= 180;
    // Warning policy: 14 days before 180 (so >= 166 days)
    const needsWarning = !isExpired && daysSinceChange >= 166;

    return NextResponse.json({
      passwordChangedAt: passwordChangedAtStr,
      daysSinceChange,
      daysRemaining: Math.max(0, 180 - daysSinceChange),
      isExpired,
      needsWarning
    });
  } catch (error: any) {
    console.error("[check-password-status] Hata:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
