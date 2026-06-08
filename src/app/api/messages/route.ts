import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/messages?reportId=xxx&token=yyy&role=student|pdr
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId");
  const token = searchParams.get("token");
  const role = searchParams.get("role") ?? "student";

  if (!reportId) {
    return NextResponse.json({ error: "reportId gerekli" }, { status: 400 });
  }

  // PDR: token gerekmez, rapor mevcutsa tüm mesajları getir
  if (role === "pdr") {
    const { data, error } = await sb
      .from("anonymous_messages")
      .select("id, sender_role, content, is_read, created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data });
  }

  // Öğrenci: token zorunlu, rapordaki token ile eşleştir
  if (!token) {
    return NextResponse.json({ error: "Token gerekli" }, { status: 401 });
  }

  // Token doğrulama — session_token alanı raporda mevcut olmalı
  const { data: report, error: reportErr } = await sb
    .from("reports")
    .select("session_token")
    .eq("id", reportId)
    .single();

  if (reportErr || !report) {
    return NextResponse.json({ error: "Rapor bulunamadı" }, { status: 404 });
  }

  if (report.session_token !== token) {
    return NextResponse.json({ error: "Geçersiz token" }, { status: 403 });
  }

  const { data, error } = await sb
    .from("anonymous_messages")
    .select("id, sender_role, content, is_read, created_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Öğrenciye gelen PDR mesajlarını okundu işaretle
  await sb
    .from("anonymous_messages")
    .update({ is_read: true })
    .eq("report_id", reportId)
    .eq("sender_role", "pdr")
    .eq("is_read", false);

  return NextResponse.json({ messages: data });
}

// POST /api/messages
// Body: { reportId, token?, content, role: 'student' | 'pdr' }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { reportId, token, content, role } = body;

  if (!reportId || !content || !role) {
    return NextResponse.json({ error: "reportId, content ve role gerekli" }, { status: 400 });
  }

  // Öğrenci için token doğrula
  if (role === "student") {
    if (!token) {
      return NextResponse.json({ error: "Token gerekli" }, { status: 401 });
    }

    const { data: report, error: reportErr } = await sb
      .from("reports")
      .select("session_token")
      .eq("id", reportId)
      .single();

    if (reportErr || !report || report.session_token !== token) {
      return NextResponse.json({ error: "Yetkisiz işlem" }, { status: 403 });
    }
  }

  const { data, error } = await sb.from("anonymous_messages").insert([
    {
      report_id: reportId,
      session_token: token ?? "pdr-system",
      sender_role: role,
      content,
    },
  ]).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}
