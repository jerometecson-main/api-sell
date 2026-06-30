import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

const PROXY_WORKERS = [
  // "https://proxy.jerometecson-main.workers.dev",
  "https://berkas.test01-05a.workers.dev/",
  "https://berkas.test02-663.workers.dev/",
  "https://berkas.test03-4fb.workers.dev/",
  "https://berkas.test04-cee.workers.dev/",
];
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
async function getHealthyWorker(testUrl: string): Promise<string | null> {
  const candidates = shuffle(PROXY_WORKERS);

  for (const worker of candidates) {
    try {
      const testLink = `${worker}/?url=${testUrl}`;
      const res = await fetchWithTimeout(testLink, { method: "HEAD" }, 3000);

      if (res.ok) {
        return worker;
      }
    } catch {}
  }

  return null;
}

const STREAMDATA_URL = "https://streamdata.vaplayer.ru/api.php";

export async function GET(req: NextRequest) {
  const logRequest = (status: number, reason: string) => {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const extra = mediaType === "tv" ? `/${season}/${episode}` : "";
    console.log(
      `[BERKAS] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason}`,
    );
  };

  try {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const title = req.nextUrl.searchParams.get("f");
    const year = req.nextUrl.searchParams.get("g");
    const imdbId = req.nextUrl.searchParams.get("imdb"); // optional
    const ts = Number(req.nextUrl.searchParams.get("gago"));
    const token = req.nextUrl.searchParams.get("putangnamo")!;
    const f_token = req.nextUrl.searchParams.get("f_token")!;

    if (!tmdbId || !mediaType || !title || !year || !ts || !token) {
      logRequest(404, "missing params");
      return NextResponse.json(
        { success: false, error: "need token" },
        { status: 404 },
      );
    }

    if (Date.now() - ts > 8000) {
      logRequest(403, "token expired");
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    if (!validateBackendToken(tmdbId, f_token, ts, token)) {
      logRequest(403, "invalid token");
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    const referer = req.headers.get("referer") || "";
    if (!isValidReferer(referer)) {
      logRequest(403, "invalid referrer");
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const qs = new URLSearchParams({
      tmdb: tmdbId,
      type: mediaType,
    });

    if (mediaType === "tv") {
      qs.set("season", season!);
      qs.set("episode", episode!);
    }

    const res = await fetchWithTimeout(
      `${STREAMDATA_URL}?${qs.toString()}`,
      {},
      8000,
    );
    const data = await res.json();

    const streamUrls: string[] = data?.data?.stream_urls ?? [];

    if (data?.status_code !== "200" || !streamUrls.length) {
      logRequest(404, "no streams found");
      return NextResponse.json(
        { success: false, error: "No streams found" },
        { status: 404 },
      );
    }

    const proxyWorker = await getHealthyWorker(streamUrls[0]);

    if (!proxyWorker) {
      logRequest(503, "all proxy workers unavailable");
      return NextResponse.json(
        { success: false, error: "No proxy workers available" },
        { status: 503 },
      );
    }

    const links = streamUrls.map((url, i) => ({
      type: "hls" as const,
      link: `${proxyWorker}/?url=${url}`,
      resolution: streamUrls.length - i,
    }));

    const subtitles = (data?.default_subs ?? []).map(
      (sub: any, index: number) => ({
        id: sub.sid ?? sub.id ?? index,
        display:
          sub.lang ?? sub.language ?? sub.display ?? sub.code ?? "Unknown",
        language: sub.code ?? "",
        file: sub.url ?? sub.file,
      }),
    );
    logRequest(200, "OK!!!!!");
    return NextResponse.json({ success: true, links, subtitles });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// // import { NextRequest, NextResponse } from "next/server";
// // import { validateBackendToken } from "@/lib/validate-token";
// // import { createClient } from "@supabase/supabase-js";
// // import { isValidReferer } from "@/lib/allowed-referers";
// // import { fetchWithTimeout } from "@/lib/fetch-timeout";
// // import { createCors, handleOptions } from "@/lib/cors";

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// // );

// // const ENC_DEC_API = "https://enc-dec.app/api";
// // const SNOWHOUSE_BASE = "https://snowhouse.lordflix.club";
// // const LORDFLIX_SERVER = "Phoenix";
// // const LORDFLIX_HEADERS = {
// //   Accept: "*/*",
// //   Origin: "https://lordflix.org",
// //   Referer: "https://lordflix.org/",
// //   "User-Agent":
// //     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
// // };

// // async function fetchLordflixStreams(
// //   title: string,
// //   year: string,
// //   tmdbId: string,
// //   imdbId: string | null,
// //   mediaType: string,
// //   season: string | null,
// //   episode: string | null,
// // ): Promise<{ links: any[]; subtitles: any[] }> {
// //   const params = new URLSearchParams({
// //     title,
// //     type: mediaType === "movie" ? "movie" : "series",
// //     year,
// //     tmdb: tmdbId,
// //     server: LORDFLIX_SERVER,
// //     ...(imdbId && { imdb: imdbId }),
// //     ...(season && { season }),
// //     ...(episode && { episode }),
// //   });

// //   const encData = await fetchWithTimeout(
// //     `${ENC_DEC_API}/enc-lordflix?url=${encodeURIComponent(`${SNOWHOUSE_BASE}/?${params}`)}`,
// //     {},
// //     8000,
// //   ).then((r) => r.json());

// //   if (encData.status !== 200 || !encData.result?.url)
// //     throw new Error(`enc-lordflix failed: ${encData.error ?? "unknown"}`);

// //   const { url: encUrl, sign } = encData.result;

// //   const encryptedText = await fetchWithTimeout(
// //     encUrl,
// //     { headers: LORDFLIX_HEADERS },
// //     20000,
// //   ).then((r) => r.text());

// //   const decData = await fetchWithTimeout(
// //     `${ENC_DEC_API}/dec-lordflix`,
// //     {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({ text: encryptedText, sign }),
// //     },
// //     15000,
// //   ).then((r) => r.json());

// //   if (decData.status !== 200 || !decData.result)
// //     throw new Error(`dec-lordflix failed: ${decData.error ?? "unknown"}`);

// //   const result = decData.result;
// //   const sources: any[] =
// //     result.stream ?? result.sources ?? result.streams ?? [];

// //   const links = sources.map((s: any) => ({
// //     type: "hls" as const,
// //     link: s.playlist ?? s.url ?? s.file ?? s.link,
// //     resolution: parseInt(s.quality ?? s.label ?? "0") || 0,
// //   }));

// //   const rawSubs: any[] =
// //     result.captions ??
// //     result.subtitles ??
// //     result.tracks ??
// //     sources.flatMap((s: any) => s.captions ?? []);

// //   const subtitles = rawSubs
// //     .filter((s: any) => s.kind !== "thumbnails")
// //     .map((s: any) => ({
// //       id: s.id ?? s.sid,
// //       display: s.label ?? s.language,
// //       file: s.file ?? s.url,
// //     }));

// //   return { links, subtitles };
// // }

// // export async function OPTIONS(req: NextRequest) {
// //   return handleOptions(req);
// // }

// // export async function GET(req: NextRequest) {
// //   const { cors, isAllowed } = createCors(req);

// //   if (!isAllowed) {
// //     return cors(
// //       NextResponse.json(
// //         { success: false, error: "Forbidden" },
// //         { status: 403 },
// //       ),
// //     );
// //   }

// //   try {
// //     const { searchParams } = req.nextUrl;

// //     const tmdbId = searchParams.get("a");
// //     const mediaType = searchParams.get("b");
// //     const season = searchParams.get("c");
// //     const episode = searchParams.get("d");
// //     const title = searchParams.get("f");
// //     const year = searchParams.get("g");
// //     const imdbId = searchParams.get("imdb");
// //     const ts = Number(searchParams.get("gago"));
// //     const token = searchParams.get("putangnamo")!;
// //     const f_token = searchParams.get("f_token")!;

// //     if (!tmdbId || !mediaType || !title || !year || !ts || !token)
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "need token" },
// //           { status: 404 },
// //         ),
// //       );

// //     if (Date.now() - ts > 8000)
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "Invalid token" },
// //           { status: 403 },
// //         ),
// //       );

// //     if (!validateBackendToken(tmdbId, f_token, ts, token))
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "Invalid token" },
// //           { status: 403 },
// //         ),
// //       );

// //     const referer = req.headers.get("referer") || "";
// //     if (!isValidReferer(referer)) {
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "Forbidden" },
// //           { status: 403 },
// //         ),
// //       );
// //     }

// //     const { links, subtitles } = await fetchLordflixStreams(
// //       title,
// //       year,
// //       tmdbId,
// //       imdbId,
// //       mediaType,
// //       season,
// //       episode,
// //     );

// //     if (!links.length)
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "No streams found" },
// //           { status: 404 },
// //         ),
// //       );

// //     return cors(NextResponse.json({ success: true, links, subtitles }));
// //   } catch (err: any) {
// //     console.error("API Error:", err);
// //     return cors(
// //       NextResponse.json(
// //         { success: false, error: "Internal server error" },
// //         { status: 500 },
// //       ),
// //     );
// //   }
// // }
