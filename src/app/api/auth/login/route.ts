import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { verifyPassword } from "@/lib/auth/hash";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getServerSupabase() {
  if (supabaseUrl && supabaseUrl.startsWith("http") && supabaseKey) {
    return createClient<Database>(supabaseUrl, supabaseKey);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userCode = (body.userCode || "").trim();
    const password = (body.password || "").trim();
    const requestedRole = (body.role || "student").trim(); // 'student', 'teacher', 'pdr', 'meb'

    if (!userCode || !password) {
      return NextResponse.json(
        { success: false, error: "Kullanıcı kodu ve şifre zorunludur." },
        { status: 400 }
      );
    }

    // 1. Super Admin Hardcoded Bypass
    if (requestedRole === "meb" && userCode === "superadmin" && password === "super123") {
      const response = NextResponse.json({
        success: true,
        user: { role: "superadmin", user_code: "superadmin" },
        redirectUrl: "/admin/dashboard"
      });

      response.cookies.set("koza_role", "superadmin", { path: "/", httpOnly: false });
      return response;
    }

    // 2. Demo Mock Fallbacks (Useful for offline / test environments)
    if (requestedRole === "student" && userCode === "1234" && password === "1234") {
      const response = NextResponse.json({
        success: true,
        user: { role: "student", user_code: "1234" },
        redirectUrl: "/dashboard/student"
      });
      response.cookies.set("koza_role", "student", { path: "/", httpOnly: false });
      return response;
    }

    if (requestedRole === "teacher" && userCode === "ogretmen@okul.k12.tr" && password === "123") {
      const response = NextResponse.json({
        success: true,
        user: { role: "teacher", user_code: "ogretmen@okul.k12.tr" },
        redirectUrl: "/dashboard/teacher"
      });
      response.cookies.set("koza_role", "teacher", { path: "/", httpOnly: false });
      return response;
    }

    if (requestedRole === "pdr" && userCode === "pdr@okul.k12.tr" && password === "123") {
      const response = NextResponse.json({
        success: true,
        user: { role: "pdr", user_code: "pdr@okul.k12.tr" },
        redirectUrl: "/dashboard/pdr"
      });
      response.cookies.set("koza_role", "pdr", { path: "/", httpOnly: false });
      return response;
    }

    if (requestedRole === "meb" && userCode === "admin@meb.gov.tr" && password === "123") {
      const response = NextResponse.json({
        success: true,
        user: { role: "meb", user_code: "admin@meb.gov.tr" },
        redirectUrl: "/yonetici/ozet-panel"
      });
      response.cookies.set("koza_role", "meb", { path: "/", httpOnly: false });
      return response;
    }

    // 3. Server-side Database Authentication
    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json(
        { success: false, error: "Hatalı kullanıcı adı veya şifre!" },
        { status: 401 }
      );
    }

    // Query school_accounts on server (Hashes NEVER exposed to client)
    const { data: account, error: accErr } = await sb
      .from("school_accounts")
      .select("id, school_id, user_code, password_hash, role")
      .eq("user_code", userCode.toUpperCase())
      .maybeSingle();

    if (accErr) {
      console.error("Auth DB Error:", accErr);
      return NextResponse.json(
        { success: false, error: "Giriş işlemi sırasında sunucu hatası oluştu." },
        { status: 500 }
      );
    }

    if (account) {
      // Validate role with active tab
      let isRoleValid = false;
      let redirectUrl = "/";

      if (requestedRole === "student" && (account.role === "ogrenci" || account.role === "student")) {
        isRoleValid = true;
        redirectUrl = "/dashboard/student";
      } else if (requestedRole === "pdr" && account.role === "pdr") {
        isRoleValid = true;
        redirectUrl = "/dashboard/pdr";
      } else if (requestedRole === "teacher" && (account.role === "ogretmen" || account.role === "teacher")) {
        isRoleValid = true;
        redirectUrl = "/dashboard/teacher";
      } else if (requestedRole === "meb" && (account.role === "mudur" || account.role === "principal" || account.role === "meb")) {
        isRoleValid = true;
        redirectUrl = "/yonetici/ozet-panel";
      }

      if (!isRoleValid) {
        return NextResponse.json(
          { success: false, error: "Bu kullanıcı kodu seçilen giriş sekmesi için yetkili değildir." },
          { status: 403 }
        );
      }

      // Secure Server-side Hash Verification
      const isPasswordCorrect = await verifyPassword(password, account.password_hash);
      if (!isPasswordCorrect) {
        return NextResponse.json(
          { success: false, error: "Hatalı kullanıcı adı veya şifre!" },
          { status: 401 }
        );
      }

      // Success Response with Session Cookie
      const response = NextResponse.json({
        success: true,
        user: {
          user_code: account.user_code,
          role: requestedRole,
          school_id: account.school_id
        },
        redirectUrl
      });

      response.cookies.set("koza_role", requestedRole, { path: "/", httpOnly: false });
      response.cookies.set("koza_school_id", account.school_id, { path: "/", httpOnly: false });
      response.cookies.set("koza_user_code", account.user_code, { path: "/", httpOnly: false });

      return response;
    }

    // Legacy school_users check for backwards compatibility
    const { data: legacyUser } = await sb
      .from("school_users")
      .select("school_id, username, role, password_plain")
      .eq("username", userCode)
      .eq("password_plain", password)
      .maybeSingle();

    if (legacyUser) {
      let redirectUrl = "/";
      if (requestedRole === "student" && legacyUser.role === "student") redirectUrl = "/dashboard/student";
      else if (requestedRole === "pdr" && legacyUser.role === "pdr") redirectUrl = "/dashboard/pdr";
      else if (requestedRole === "meb" && legacyUser.role === "principal") redirectUrl = "/yonetici/ozet-panel";
      else {
        return NextResponse.json(
          { success: false, error: "Bu kullanıcı kodu seçilen giriş sekmesi için yetkili değildir." },
          { status: 403 }
        );
      }

      const response = NextResponse.json({
        success: true,
        user: {
          user_code: legacyUser.username,
          role: requestedRole,
          school_id: legacyUser.school_id
        },
        redirectUrl
      });

      response.cookies.set("koza_role", requestedRole, { path: "/", httpOnly: false });
      response.cookies.set("koza_school_id", legacyUser.school_id, { path: "/", httpOnly: false });
      return response;
    }

    return NextResponse.json(
      { success: false, error: "Hatalı kullanıcı adı veya şifre!" },
      { status: 401 }
    );
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası: " + (err.message || err) },
      { status: 500 }
    );
  }
}
