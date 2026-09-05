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

function setKozaCookies(
  response: NextResponse, 
  user: { role: string; user_code: string; school_id?: string | null }
) {
  // 1. Client-readable convenience cookies
  response.cookies.set("koza_role", user.role, { path: "/", httpOnly: false });
  if (user.school_id) {
    response.cookies.set("koza_school_id", user.school_id, { path: "/", httpOnly: false });
  }
  response.cookies.set("koza_user_code", user.user_code, { path: "/", httpOnly: false });

  // 2. Secure HttpOnly session cookie (persists across F5 reloads)
  const sessionPayload = JSON.stringify({
    user_code: user.user_code,
    role: user.role,
    school_id: user.school_id || null,
    createdAt: Date.now()
  });

  response.cookies.set("koza_session", Buffer.from(sessionPayload).toString("base64"), {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("koza_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf-8"));
    return NextResponse.json({
      authenticated: true,
      user: payload
    });
  } catch (e: any) {
    return NextResponse.json({ authenticated: false, error: e.message }, { status: 401 });
  }
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

      setKozaCookies(response, { role: "superadmin", user_code: "superadmin" });
      return response;
    }

    // 2. Demo Mock Fallbacks (Useful for offline / test environments)
    if (requestedRole === "student" && userCode === "1234" && password === "1234") {
      const response = NextResponse.json({
        success: true,
        user: { role: "student", user_code: "1234" },
        redirectUrl: "/dashboard/student"
      });
      setKozaCookies(response, { role: "student", user_code: "1234" });
      return response;
    }

    if (requestedRole === "teacher" && userCode === "ogretmen@okul.k12.tr" && password === "123") {
      const response = NextResponse.json({
        success: true,
        user: { role: "teacher", user_code: "ogretmen@okul.k12.tr" },
        redirectUrl: "/dashboard/teacher"
      });
      setKozaCookies(response, { role: "teacher", user_code: "ogretmen@okul.k12.tr" });
      return response;
    }

    if (requestedRole === "pdr" && userCode === "pdr@okul.k12.tr" && password === "123") {
      const response = NextResponse.json({
        success: true,
        user: { role: "pdr", user_code: "pdr@okul.k12.tr" },
        redirectUrl: "/dashboard/pdr"
      });
      setKozaCookies(response, { role: "pdr", user_code: "pdr@okul.k12.tr" });
      return response;
    }

    if (requestedRole === "meb" && userCode === "admin@meb.gov.tr" && password === "123") {
      const response = NextResponse.json({
        success: true,
        user: { role: "meb", user_code: "admin@meb.gov.tr" },
        redirectUrl: "/yonetici/ozet-panel"
      });
      setKozaCookies(response, { role: "meb", user_code: "admin@meb.gov.tr" });
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
    let account: any = null;
    const { data: directAccount, error: accErr } = await sb
      .from("school_accounts")
      .select("id, school_id, user_code, password_hash, role")
      .eq("user_code", userCode.toUpperCase())
      .maybeSingle();

    if (directAccount) {
      account = directAccount;
    } else {
      // If direct SELECT is restricted by RLS on anon and service role key is absent, use secure RPC function
      try {
        const { data: rpcData } = await (sb as any).rpc("get_school_account_for_auth", {
          p_user_code: userCode.toUpperCase()
        });
        if (rpcData && rpcData.length > 0) {
          account = rpcData[0];
        }
      } catch (rpcErr) {
        console.warn("RPC fallback check:", rpcErr);
      }
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

      setKozaCookies(response, {
        role: requestedRole,
        user_code: account.user_code,
        school_id: account.school_id
      });

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

      setKozaCookies(response, {
        role: requestedRole,
        user_code: legacyUser.username,
        school_id: legacyUser.school_id
      });

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
