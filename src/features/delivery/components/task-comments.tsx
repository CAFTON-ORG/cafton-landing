"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Person } from "@/components/dashboard/shared/person";
import { Button } from "@/components/dashboard/ui/button";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatRelative } from "@/lib/format";
import { addComment, deleteComment, getComments } from "../actions/extras";
import { MAX_COMMENT } from "../rules/core";
import type { CommentView } from "../types/core";

/** The conversation on one task: read it, add to it, remove your own. */
export function TaskComments({ taskId, me }: { taskId: string; me?: string }) {
  const router = useRouter();
  const canPost = useCan("projects:update");
  const canModerate = useCan("projects:delete");
  const { run, pending } = useServerAction();
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  // Bumped to fetch the conversation again after a post or a delete.
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((current) => current + 1);

  useEffect(() => {
    let active = true;
    void getComments(taskId).then((result) => {
      if (!active) return;
      if (result.ok) {
        setComments(result.data ?? []);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
    return () => {
      active = false;
    };
  }, [taskId, version]);

  function post() {
    setError("");
    run(() => addComment({ taskId, body }), {
      onSuccess: () => {
        setBody("");
        reload();
        router.refresh();
      },
      onFieldErrors: (errors) => setError(errors.body ?? ""),
    });
  }

  return (
    <section aria-labelledby="comments-title" className="grid gap-3 border-t pt-4">
      <h3 id="comments-title" className="text-sm font-semibold">
        Comments
        {comments && comments.length > 0 && (
          <span className="text-muted-foreground ml-1.5 text-xs font-normal">
            {comments.length}
          </span>
        )}
      </h3>
      {failed ? (
        <p className="text-destructive text-sm">The comments couldn&apos;t be loaded.</p>
      ) : comments === null ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground text-sm">No comments yet.</p>
      ) : (
        <ul className="grid gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="grid gap-1 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Person name={comment.authorName} />
                  <time dateTime={comment.createdAt} className="text-muted-foreground text-xs">
                    {formatRelative(comment.createdAt)}
                  </time>
                </span>
                {(canModerate || (me !== undefined && comment.authorId === me)) && canPost && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete this comment"
                    disabled={pending}
                    onClick={() =>
                      run(() => deleteComment(comment.id), {
                        onSuccess: () => {
                          reload();
                          router.refresh();
                        },
                      })
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </div>
              <p className="pl-8 break-words whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}
      {canPost && (
        <div className="grid gap-2">
          <label htmlFor="comment-body" className="sr-only">
            Add a comment
          </label>
          <Textarea
            id="comment-body"
            rows={2}
            value={body}
            maxLength={MAX_COMMENT}
            placeholder="Add a comment…"
            onChange={(event) => setBody(event.target.value)}
            aria-invalid={!!error}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div>
            <Button type="button" size="sm" disabled={pending || !body.trim()} onClick={post}>
              {pending ? "Posting…" : "Post comment"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
