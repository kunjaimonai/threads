import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const incoming = await req.formData();
    const shoe_id = incoming.get("shoe_id");
    const file = incoming.get("file") as File | null;

    if (!shoe_id || !file) {
      return NextResponse.json({ error: "shoe_id and file are required" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const forward = new FormData();
    forward.append("shoe_id", String(shoe_id));
    forward.append("file", new Blob([buffer], { type: file.type }), file.name);

    const res = await fetch("http://127.0.0.1:8000/analyze/box_advanced", {
      method: "POST",
      body: forward,
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText || `Status ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: String(err.message) }, { status: 502 });
  }
}
