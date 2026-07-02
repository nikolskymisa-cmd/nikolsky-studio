import type { Work } from "@/types/work";

export function getYouTubeId(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    }

    if (parsed.pathname.startsWith("/embed/")) {
      return parsed.pathname.split("/").filter(Boolean)[1] ?? "";
    }

    if (parsed.pathname.startsWith("/shorts/")) {
      return parsed.pathname.split("/").filter(Boolean)[1] ?? "";
    }

    return parsed.searchParams.get("v") ?? "";
  } catch {
    const match = url.match(
      /(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{6,})/,
    );
    return match?.[1] ?? "";
  }
}

export function getYouTubeEmbedUrl(url: string, autoplay = false) {
  const id = getYouTubeId(url);

  if (!id) {
    return url;
  }

  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    controls: "1",
  });

  if (autoplay) {
    params.set("autoplay", "1");
    params.set("mute", "1");
    params.set("loop", "1");
    params.set("playlist", id);
  }

  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export function getThumbnailUrl(work: Work) {
  if (work.thumbnail && work.thumbnail !== "auto") {
    return work.thumbnail;
  }

  const id = getYouTubeId(work.youtubeUrl);
  return id
    ? `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    : "https://img.youtube.com/vi/ysz5S6PUM-U/hqdefault.jpg";
}
