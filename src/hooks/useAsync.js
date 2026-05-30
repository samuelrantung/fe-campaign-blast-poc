import { useState, useEffect, useCallback } from 'react';

/**
 * Run an async function (typically an API call) and track its state.
 *
 * @param {Function} fn          async function returning data
 * @param {Array}    deps        re-run when these change
 * @param {object}   [opts]
 * @param {boolean}  [opts.immediate=true]  run on mount
 * @returns {{ data, loading, error, reload }}
 *
 * Usage:
 *   const { data: customers, loading, error } = useAsync(
 *     () => getAtRiskCustomers(), []
 *   );
 */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const run = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(fn)
      .then((res) => { if (alive) setData(res); })
      .catch((err) => { if (alive) setError(err); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) return run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, immediate]);

  return { data, loading, error, reload: run };
}
