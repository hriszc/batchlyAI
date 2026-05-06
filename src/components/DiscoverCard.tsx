import { Link } from "@tanstack/react-router";
import { HeartIcon, RefreshCwIcon } from "lucide-react";

interface DiscoverCardProps {
  workId: string;
  coverUrl: string;
  title: string;
  authorName: string;
  likeCount: number;
  remixCount: number;
}

export function DiscoverCard({
  workId,
  coverUrl,
  title,
  authorName,
  likeCount,
  remixCount,
}: DiscoverCardProps) {
  return (
    <Link
      to="/works/$workId"
      params={{ workId }}
      className="group block rounded-2xl overflow-hidden bg-card shadow-[rgba(0,0,0,0.08)_0px_2px_12px_0px] transition-all hover:shadow-[rgba(0,0,0,0.15)_0px_4px_20px_0px] hover:-translate-y-0.5"
    >
      {/* Cover image */}
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={coverUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium line-clamp-1 text-foreground">
          {title || "Untitled"}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
          {authorName || "Anonymous"}
        </p>

        {/* Stats */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <HeartIcon className="size-3" />
            {likeCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <RefreshCwIcon className="size-3" />
            {remixCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
