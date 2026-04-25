import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_ORIGINS } from "@/lib/allowed-referers";

export function createCors(req: NextRequest) {
  const origin = req.headers.get("origin") || "";

  const cors = (res: NextResponse) => {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return res;
  };

  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  return { origin, cors, isAllowed };
}

export function handleOptions(req: NextRequest) {
  const origin = req.headers.get("origin") || "";

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
