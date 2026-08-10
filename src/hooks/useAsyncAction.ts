import { useCallback, useRef, useState } from "react";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

interface UseAsyncActionOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * Wraps a save/delete/mutation call with an idle → loading → success/error
 * contract, so a rejected promise can never silently leave the UI looking
 * like nothing happened — the recurring "save button does nothing on
 * failure" bug found across Settings, Nominee Tracker, and Goals.
 *
 * Pair `loading` with Button's existing `loading` prop, and read `error`
 * to show an inline message next to the field that failed.
 */
export function useAsyncAction<Args extends any[]>(
  action: (...args: Args) => Promise<void>,
  { onSuccess, onError }: UseAsyncActionOptions = {}
) {
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (...args: Args) => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      setStatus("loading");
      setError(null);
      try {
        await action(...args);
        setStatus("success");
        onSuccess?.();
      } catch (e: any) {
        setStatus("error");
        setError(e?.message || "Something went wrong. Please try again.");
        onError?.(e);
      } finally {
        resetTimer.current = setTimeout(() => setStatus("idle"), 2000);
      }
    },
    [action, onSuccess, onError]
  );

  return { run, status, error, loading: status === "loading" };
}
