import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Loads a GET endpoint and exposes reload(). Pass null to skip (e.g. a role cannot see that data).
export function useFetch(path, initial = []) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState('');

  const reload = useCallback(
    () => (path ? api(path).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message)) : Promise.resolve()),
    [path],
  );

  useEffect(() => {
    if (!path) return undefined;
    let live = true;
    api(path)
      .then((d) => { if (live) { setData(d); setError(''); } })
      .catch((e) => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [path]);

  return { data, loading, error, reload };
}
