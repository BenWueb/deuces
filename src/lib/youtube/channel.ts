import "server-only";

export type YouTubeChannelInfo = {
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string | null;
};

type ChannelRef =
  | { kind: "handle"; value: string }
  | { kind: "id"; value: string }
  | { kind: "username"; value: string }
  | { kind: "search"; value: string };

type ApiChannel = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  brandingSettings?: {
    image?: {
      bannerExternalUrl?: string;
    };
  };
};

function requireApiKey(): string {
  const key =
    process.env.YOUTUBE_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Add GOOGLE_MAPS_API_KEY (or YOUTUBE_API_KEY) and enable YouTube Data API v3 to look up channels.",
    );
  }
  return key;
}

export function parseYouTubeChannelRef(rawUrl: string): ChannelRef | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (
    host !== "youtube.com" &&
    host !== "m.youtube.com" &&
    host !== "music.youtube.com"
  ) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const [first, second] = parts;

  if (first?.startsWith("@") && first.length > 1) {
    return { kind: "handle", value: first.slice(1) };
  }

  if (first === "channel" && second) {
    return { kind: "id", value: second };
  }

  if (first === "user" && second) {
    return { kind: "username", value: second };
  }

  if (first === "c" && second) {
    return { kind: "search", value: second };
  }

  if (
    first &&
    !second &&
    !["watch", "playlist", "shorts", "results"].includes(first)
  ) {
    return { kind: "search", value: first };
  }

  return null;
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

async function youtubeJson<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const apiKey = requireApiKey();
  const search = new URLSearchParams({ ...params, key: apiKey });
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/${path}?${search}`,
    { cache: "no-store" },
  );

  const body = (await res.json()) as T & {
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
          "In Google Cloud → APIs & Services → Credentials, edit the API key: " +
          "set Application restrictions to None (not HTTP referrers), " +
          "and allow YouTube Data API v3 under API restrictions.",
      );
    }
    throw new Error(message || `YouTube lookup failed (${res.status}).`);
  }

  return body;
}

async function fetchChannelByParams(
  params: Record<string, string>,
): Promise<ApiChannel | null> {
  const body = await youtubeJson<{ items?: ApiChannel[] }>("channels", {
    part: "snippet,brandingSettings",
    ...params,
  });
  return body.items?.[0] ?? null;
}

/** Prefer wide banner for cards; fall back to the largest channel avatar. */
function pickChannelImage(channel: ApiChannel): string | null {
  const banner = channel.brandingSettings?.image?.bannerExternalUrl?.trim();
  if (banner) {
    // bannerExternalUrl is a base URL — append a width for a sharp card image.
    return `${banner}=w1280`;
  }

  const thumbs = channel.snippet?.thumbnails;
  const avatar =
    thumbs?.high?.url || thumbs?.medium?.url || thumbs?.default?.url || null;
  if (!avatar) return null;

  // Request a larger avatar variant when YouTube uses the sNNN size token.
  return avatar.replace(/=s\d+(-[^=]*)?$/i, "=s800$1");
}

function toInfo(channel: ApiChannel, fallbackUrl: string): YouTubeChannelInfo {
  const title = channel.snippet?.title?.trim();
  if (!title) {
    throw new Error("YouTube returned a channel without a name.");
  }

  const custom = channel.snippet?.customUrl?.trim();
  let url = fallbackUrl.trim();
  if (custom) {
    if (custom.startsWith("http")) url = custom;
    else if (custom.startsWith("@")) url = `https://www.youtube.com/${custom}`;
    else url = `https://www.youtube.com/@${custom}`;
  } else if (channel.id) {
    url = `https://www.youtube.com/channel/${channel.id}`;
  }

  return {
    title: truncate(title, 120),
    description: truncate(channel.snippet?.description ?? "", 500),
    url,
    thumbnailUrl: pickChannelImage(channel),
  };
}

export async function lookupYouTubeChannel(
  rawUrl: string,
): Promise<YouTubeChannelInfo> {
  const ref = parseYouTubeChannelRef(rawUrl);
  if (!ref) {
    throw new Error(
      "Use a channel URL like youtube.com/@handle or youtube.com/channel/…",
    );
  }

  let channel: ApiChannel | null = null;

  if (ref.kind === "handle") {
    channel = await fetchChannelByParams({ forHandle: ref.value });
  } else if (ref.kind === "id") {
    channel = await fetchChannelByParams({ id: ref.value });
  } else if (ref.kind === "username") {
    channel = await fetchChannelByParams({ forUsername: ref.value });
  } else {
    const search = await youtubeJson<{
      items?: { id?: { channelId?: string } }[];
    }>("search", {
      part: "snippet",
      type: "channel",
      maxResults: "1",
      q: ref.value,
    });
    const channelId = search.items?.[0]?.id?.channelId;
    if (channelId) {
      channel = await fetchChannelByParams({ id: channelId });
    }
  }

  if (!channel) {
    throw new Error("Could not find that YouTube channel.");
  }

  return toInfo(channel, rawUrl);
}
