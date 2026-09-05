import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { decryptReportContent } from "@/lib/crypto/reportCrypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getServerSupabase() {
  if (supabaseUrl && supabaseUrl.startsWith("http") && supabaseKey) {
    return createClient<Database>(supabaseUrl, supabaseKey);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json({ error: "Veritabanı bağlantısı yok." }, { status: 500 });
    }

    // 1. Session ve Yetki Kontrolü
    const roleCookie = request.cookies.get("koza_role")?.value;
    const sessionCookie = request.cookies.get("koza_session")?.value;
    const schoolIdCookie = request.cookies.get("koza_school_id")?.value;

    let userRole = roleCookie;
    let schoolId = schoolIdCookie;

    if (sessionCookie) {
      try {
        const sessionPayload = JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf-8"));
        userRole = sessionPayload.role || userRole;
        schoolId = sessionPayload.school_id || schoolId;
      } catch (e) {
        // ignore parse error
      }
    }

    // PDR rolü doğrulaması (güvenlik)
    if (userRole && userRole !== "pdr" && userRole !== "superadmin") {
      return NextResponse.json(
        { error: "Bu verilere erişim yetkiniz bulunmamaktadır." },
        { status: 403 }
      );
    }

    // 2. İhbarları Çek (Okul Filtresi İle)
    let query = sb
      .from("reports")
      .select("*")
      .eq("assigned_role", "pdr");

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data: reports, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("PDR reports fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. PDR Oturumu İçin İçerikleri AES-256 Şifresinden Çöz
    const decryptedReports = await Promise.all(
      (reports || []).map(async (report) => {
        let plainContent = report.content;
        if (report.content) {
          plainContent = await decryptReportContent(report.content);
        }
        return {
          ...report,
          content: plainContent
        };
      })
    );

    return NextResponse.json({
      success: true,
      reports: decryptedReports
    });
  } catch (err: any) {
    console.error("PDR reports API error:", err);
    return NextResponse.json({ error: err.message || err }, { status: 500 });
  }
}
