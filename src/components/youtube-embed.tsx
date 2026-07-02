import { getYouTubeEmbedUrl } from "@/lib/youtube";
import type { Work } from "@/types/work";

type YouTubeEmbedProps = {
  work: Work;
  autoplay?: boolean;
  className?: string;
};

export function YouTubeEmbed({
  work,
  autoplay = false,
  className,
}: YouTubeEmbedProps) {
  return (
    <iframe
      className={className}
      src={getYouTubeEmbedUrl(work.youtubeUrl, autoplay)}
      title={work.title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}
