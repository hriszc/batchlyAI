import { createFileRoute, Link } from "@tanstack/react-router";
import {
  HeartIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  SendIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

interface WorkData {
  id: string;
  promptTemplate: string;
  resultImageUrl: string;
  title: string;
  model: string;
  aspectRatio: string;
  category: string;
  likeCount: number;
  commentCount: number;
  remixCount: number;
  createdAt: number;
  userName: string;
}

interface CommentData {
  id: string;
  content: string;
  createdAt: number;
  userName: string;
  userImage: string | null;
}

function WorkDetailPage() {
  const { workId } = Route.useParams();
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();

  const [work, setWork] = useState<WorkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Like state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  // Comment state
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Fetch work data
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`/api/works?remix=${encodeURIComponent(workId)}`);
        const data = (await resp.json()) as { work?: WorkData; error?: string };
        if (data.error || !data.work) {
          setError(data.error || "Work not found");
          return;
        }
        setWork(data.work);
        setLikeCount(data.work.likeCount);
      } catch {
        setError("Failed to load work");
      } finally {
        setLoading(false);
      }
    })();
  }, [workId]);

  // Fetch comments
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(
          `/api/works/comment?workId=${encodeURIComponent(workId)}&limit=20`,
        );
        const data = (await resp.json()) as { comments?: CommentData[] };
        if (data.comments) setComments(data.comments);
      } catch {
        // Non-critical
      }
    })();
  }, [workId]);

  // Toggle like
  const handleLike = useCallback(async () => {
    if (!session?.user) {
      toast.error("Please login to like");
      return;
    }
    setLikeLoading(true);
    try {
      const resp = await fetch("/api/works/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId }),
      });
      const data = (await resp.json()) as { liked?: boolean; likeCount?: number; error?: string };
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setLiked(data.liked ?? false);
      setLikeCount(data.likeCount ?? likeCount);
    } catch {
      toast.error("Failed to toggle like");
    } finally {
      setLikeLoading(false);
    }
  }, [workId, session, likeCount]);

  // Submit comment
  const handleComment = useCallback(async () => {
    if (!session?.user) {
      toast.error("Please login to comment");
      return;
    }
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const resp = await fetch("/api/works/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId, content: commentText.trim() }),
      });
      const data = (await resp.json()) as { id?: string; error?: string };
      if (data.error) {
        toast.error(data.error);
        return;
      }
      // Add new comment to list
      setComments((prev) => [
        {
          id: data.id || `temp_${Date.now()}`,
          content: commentText.trim(),
          createdAt: Math.floor(Date.now() / 1000),
          userName: session.user.name || "User",
          userImage: null,
        },
        ...prev,
      ]);
      setCommentText("");
      // Update comment count locally
      if (work) {
        setWork({ ...work, commentCount: work.commentCount + 1 });
      }
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  }, [workId, commentText, session, work]);

  // Remix
  const handleRemix = useCallback(() => {
    window.location.href = `/?remix=${encodeURIComponent(workId)}`;
  }, [workId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-[#0071e3]" />
        </div>
      </main>
    );
  }

  if (error || !work) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-lg text-muted-foreground">{error || "Work not found"}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#0071e3] hover:underline"
          >
            <ArrowLeftIcon className="size-4" />
            {t("goBack")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        {t("goBack")}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cover image */}
        <div className="rounded-2xl overflow-hidden bg-muted">
          <img
            src={work.resultImageUrl}
            alt={work.title || "Work"}
            className="w-full aspect-square object-cover"
            loading="lazy"
          />
        </div>

        {/* Info + Interactions */}
        <div className="flex flex-col gap-6">
          {/* Title and author */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {work.title || "Untitled"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              by {work.userName || "Anonymous"}
            </p>
          </div>

          {/* Prompt template */}
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
              {t("sharePromptTemplate")}
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {work.promptTemplate}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {likeCount} {t("like")}
            </span>
            <span>
              {work.commentCount} {t("comment")}
            </span>
            <span>
              {work.remixCount} {t("remix")}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              disabled={likeLoading}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                liked
                  ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                  : "border-border hover:bg-muted text-foreground"
              }`}
            >
              <HeartIcon
                className={`size-4 ${liked ? "fill-red-500 text-red-500" : ""}`}
              />
              {t("like")}
            </button>

            <button
              onClick={handleRemix}
              className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#0077ed] active:scale-[0.98]"
            >
              <RefreshCwIcon className="size-4" />
              {t("remix")}
            </button>
          </div>

          {/* Comments section */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageCircleIcon className="size-4" />
              {t("comment")}
              {comments.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({comments.length})
                </span>
              )}
            </h2>

            {/* Comment input */}
            <div className="flex items-center gap-2 mb-6">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleComment();
                  }
                }}
                placeholder={t("addComment")}
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
                maxLength={1000}
              />
              <button
                onClick={() => void handleComment()}
                disabled={commentLoading || !commentText.trim()}
                className="inline-flex items-center justify-center rounded-full bg-[#0071e3] p-2 text-white transition-all hover:bg-[#0077ed] active:scale-[0.98] disabled:opacity-40"
              >
                <SendIcon className="size-4" />
              </button>
            </div>

            {/* Comments list */}
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 text-center py-8">
                {t("noComments")}
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-xl bg-muted/30 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {comment.userName || "Anonymous"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

const seo = createPageMeta({
  title: "Work — BatchlyAI",
  description: "View and interact with AI-generated works",
  path: "/works",
  locale: "en",
});

export const Route = createFileRoute("/works/$workId")({
  head: () => ({
    meta: seo.meta,
    links: seo.links,
    scripts: seo.scripts,
  }),
  component: WorkDetailPage,
});
