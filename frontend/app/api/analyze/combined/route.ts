import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const incoming = await req.formData();
    const shoe_id = incoming.get("shoe_id");
    const sneaker_percent = incoming.get("sneaker_percent");
    const box_percent = incoming.get("box_percent");
    const video_percent = incoming.get("video_percent");

    if (!shoe_id || sneaker_percent === null || box_percent === null || video_percent === null) {
      return NextResponse.json(
        { error: "shoe_id, sneaker_percent, box_percent, and video_percent are required" },
        { status: 400 }
      );
    }

    const forward = new FormData();
    forward.append("shoe_id", String(shoe_id));
    forward.append("sneaker_percent", String(sneaker_percent));
    forward.append("box_percent", String(box_percent));
    forward.append("video_percent", String(video_percent));

    const res = await fetch("http://127.0.0.1:8000/analyze/combined", {
      method: "POST",
      body: forward,
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: errorText || `Status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: String(err.message) }, { status: 502 });
  }
}
