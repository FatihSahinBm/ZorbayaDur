import { NextRequest, NextResponse } from "next/server";

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
