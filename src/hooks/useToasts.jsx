import { useState, useCallback } from 'react';

/**
 * Lightweight toast system. Returns a `push(msg, kind)` and a <ToastHost/>
 * to render once near the app root.
 *   kind ∈ 'ok' | 'fail' | '' (neutral/dark)
 */
export function useToasts() {
  const [items, setItems] = useState([]);

  const push = useCallback((msg, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, msg, kind }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3000);
  }, []);

  const ToastHost = useCallback(
    () => (
      <div className="toast-wrap">
        {items.map((t) => (
          <div key={t.id} className={'toast ' + t.kind}>{t.msg}</div>
        ))}
      </div>
    ),
    [items],
  );

  return { push, ToastHost };
}
