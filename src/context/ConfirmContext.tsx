import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm harus dipakai di dalam <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ message: string; options: ConfirmOptions } | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirmDialog = useCallback<ConfirmFn>((message, options = {}) => {
    setState({ message, options });
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function handleClose(result: boolean) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      {state && (
        <div className="confirm-backdrop" onClick={() => handleClose(false)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            {state.options.title && <h3 style={{ marginBottom: 8 }}>{state.options.title}</h3>}
            <p style={{ margin: 0 }}>{state.message}</p>
            <div className="btn-row" style={{ marginTop: 18, justifyContent: "flex-end" }}>
              <button className="btn btn--ghost" onClick={() => handleClose(false)}>
                {state.options.cancelLabel || "Batal"}
              </button>
              <button
                className={`btn ${state.options.danger === false ? "btn--primary" : "btn--danger"}`}
                onClick={() => handleClose(true)}
                autoFocus
              >
                {state.options.confirmLabel || "Ya, Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}