import { useState, useCallback } from "react";
import { uid } from "../utils/finance";

export interface Toast {
  id: string;
  msg: string;
  type: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((msg: string, type = "success") => {
    const id = uid();
    setToasts((prev) => [...prev, { id, msg, type }]);
    const duration = type === "error" ? 5500 : type === "warn" ? 4500 : 3500;
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  return { toasts, showToast };
}
