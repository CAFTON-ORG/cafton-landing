"use client";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/actions";

/**
 * Runs a Server Action inside a transition and reports the outcome: a success
 * toast, or the action's error. Field errors are handed to `onFieldErrors` so a
 * form can show them inline instead of in a toast.
 */
export function useServerAction() {
  const [pending, start] = useTransition();

  const run = useCallback(
    <T>(
      action: () => Promise<ActionResult<T>>,
      options: {
        success?: string | ((data: T | undefined) => string);
        onSuccess?: (data: T | undefined) => void;
        onFieldErrors?: (errors: Record<string, string>) => void;
      } = {},
    ) => {
      start(async () => {
        const result = await action();
        if (result.ok) {
          const message =
            typeof options.success === "function" ? options.success(result.data) : options.success;
          if (message) toast.success(message);
          options.onSuccess?.(result.data);
          return;
        }
        if (result.fieldErrors && options.onFieldErrors) {
          options.onFieldErrors(result.fieldErrors);
          return;
        }
        toast.error(result.error);
      });
    },
    [],
  );

  return { run, pending };
}
