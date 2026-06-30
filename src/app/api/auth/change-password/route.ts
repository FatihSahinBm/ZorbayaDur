import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { validatePasswordComplexity } from "@/lib/auth/passwordValidation";

const sb = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { oldPassword, newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json({ error: "Yeni şifre gereklidir." }, { status: 400 });
    }

    // 1. Password Complexity Rules
    const validation = validatePasswordComplexity(newPassword);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 2. Prevent reuse of previous password
    if (oldPassword && newPassword === oldPassword) {
      return NextResponse.json({ error: "Yeni şifreniz son kullandığınız şifreyle aynı olamaz." }, { status: 400 });
    }

    // 3. Try real Supabase Auth
    const authHeader = request.headers.get("Authorization");
    let user: any = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser } } = await sb.auth.getUser(token);
      user = authUser;
    }

    const response = NextResponse.json({ success: true, message: "Şifre başarıyla güncellendi." });

    if (user) {
      // Update Supabase Auth user password
      const { error: updateAuthErr } = await sb.auth.updateUser({ password: newPassword });
      if (updateAuthErr) throw updateAuthErr;

      // Update public.profiles (trigger handles updating changed_at, but we can write explicitly)
      const { error: updateProfileErr } = await sb
        .from("profiles")
        .upsert({
          id: user.id,
          password_changed_at: new Date().toISOString()
        });
      
      if (updateProfileErr) throw updateProfileErr;
    } else {
      // 4. Mock mode: Set the mock change date to now in cookies
      response.cookies.set("mock-password-changed-at", new Date().toISOString(), {
        path: "/",
        maxAge: 60 * 60 * 24 * 365 // 1 year
      });
    }

    return response;
  } catch (error: any) {
    console.error("[change-password] Hata:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
