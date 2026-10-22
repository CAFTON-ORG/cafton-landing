"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Badge } from "@/components/dashboard/ui/badge";
import { Input } from "@/components/dashboard/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { setTags } from "../actions/tags";
import { MAX_TAGS, normalizeTags, type Taggable } from "../tags";

const PERMISSION = {
  lead: "leads:update",
  contact: "contacts:update",
  organization: "organizations:update",
  deal: "deals:update",
} as const;

/** The tags of one record: badges you can remove, and a box to add more (Enter or comma). */
export function TagsEditor({
  kind,
  id,
  initial,
  suggestions = [],
}: {
  kind: Taggable;
  id: string;
  initial: string[];
  suggestions?: string[];
}) {
  const canEdit = useCan(PERMISSION[kind]);
  const [tags, setLocal] = useState(initial);
  const [draft, setDraft] = useState("");
  const { run, pending } = useServerAction();
  const listId = useId();

  function save(next: string[]) {
    run(() => setTags({ kind, id, tags: next }), {
      onSuccess: (data) => data && setLocal(data.tags),
    });
  }

  function add(text: string) {
    const merged = normalizeTags([...tags, ...text.split(/[,;]/)]);
    setDraft("");
    if (merged.length !== tags.length) save(merged);
  }

  return (
    <div className="grid gap-2">
      {tags.length === 0 && !canEdit && <p className="text-muted-foreground text-sm">No tags.</p>}
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {tag}
                {canEdit && (
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={`Remove the tag ${tag}`}
                    onClick={() => save(tags.filter((t) => t !== tag))}
                    className="hover:bg-foreground/10 focus-visible:ring-ring rounded-full p-0.5 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                )}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {canEdit && tags.length < MAX_TAGS && (
        <div className="relative">
          <Plus
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={draft}
            list={listId}
            disabled={pending}
            maxLength={40}
            placeholder="Add a tag and press Enter"
            aria-label="Add a tag"
            className="pl-8"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                if (draft.trim()) add(draft);
              }
            }}
            onBlur={() => draft.trim() && add(draft)}
          />
          <datalist id={listId}>
            {suggestions
              .filter((tag) => !tags.includes(tag))
              .map((tag) => (
                <option key={tag} value={tag} />
              ))}
          </datalist>
        </div>
      )}
    </div>
  );
}
