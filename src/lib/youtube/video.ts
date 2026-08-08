import "server-only";

export type YouTubeVideoInfo = {
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string | null;
};

function requireApiKey(): string {
  const key =
    process.env.YOUTUBE_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Add GOOGLE_MAPS_API_KEY (or YOUTUBE_API_KEY) and enable YouTube Data API v3 to look up videos.",
    );
  }
  return key;
}

export function parseYouTubeVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^[\w-]{6,}$/.test(id) ? id : null;
  }

  if (
    host !== "youtube.com" &&
    host !== "m.youtube.com" &&
    host !== "music.youtube.com" &&
    host !== "youtube-nocookie.com"
  ) {
    return null;
  }

  const fromQuery = url.searchParams.get("v");
  if (fromQuery && /^[\w-]{6,}$/.test(fromQuery)) return fromQuery;

  const parts = url.pathname.split("/").filter(Boolean);
  if (
    parts[0] &&
    ["shorts", "embed", "live", "v"].includes(parts[0]) &&
    parts[1] &&
    /^[\w-]{6,}$/.test(parts[1])
  ) {
    return parts[1];
  }

  return null;
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export async function lookupYouTubeVideo(
  rawUrl: string,
): Promise<YouTubeVideoInfo> {
  const videoId = parseYouTubeVideoId(rawUrl);
  if (!videoId) {
    throw new Error(
      "Use a video URL like youtube.com/watch?v=… or youtu.be/…",
    );
  }

  const apiKey = requireApiKey();
  const search = new URLSearchParams({
    part: "snippet",
    id: videoId,
    key: apiKey,
  });
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${search}`,
    { cache: "no-store" },
  );

  const body = (await res.json()) as {
    items?: {
      snippet?: {
        title?: string;
        description?: string;
        thumbnails?: {
          maxres?: { url?: string };
          standard?: { url?: string };
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
    }[];
    error?: { message?: string; errors?: { reason?: string }[] };
  };

  if (!res.ok) {
    const reason = body.error?.errors?.[0]?.reason;
    const message = body.error?.message ?? "";
    if (
      reason === "accessNotConfigured" ||
      /accessNotConfigured|has not been used|disabled/i.test(message)
    ) {
      throw new Error(
        "Enable YouTube Data API v3 for your Google API key in Google Cloud Console.",
      );
    }
    if (
      reason === "ipRefererBlocked" ||
      /referer\s*<empty>|from referer|blocked/i.test(message)
    ) {
      throw new Error(
        "YouTube blocked this server request (empty HTTP referer). " +
          "In Google Cloud → Credentials, set Application restrictions to None " +
          "and allow YouTube Data API v3.",
      );
    }
    throw new Error(message || `YouTube lookup failed (${res.status}).`);
  }

  const snippet = body.items?.[0]?.snippet;
  const title = snippet?.title?.trim();
  if (!snippet || !title) {
    throw new Error("Could not find that YouTube video.");
  }

  const thumbs = snippet.thumbnails;
  const thumbnailUrl =
    thumbs?.maxres?.url ||
    thumbs?.standard?.url ||
    thumbs?.high?.url ||
    thumbs?.medium?.url ||
    thumbs?.default?.url ||
    null;

  return {
    title: truncate(title, 120),
    description: truncate(snippet.description ?? "", 500),
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl,
  };
}
