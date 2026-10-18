import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export async function flightApi(url, body) {
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',

    credentials: 'same-origin',

    cache: 'no-store',

    headers: {
      Accept: 'application/json',

      ...(body === undefined
        ? {}
        : {
            'Content-Type': 'application/json',
          }),
    },

    ...(body === undefined
      ? {}
      : {
          body: JSON.stringify(body),
        }),
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      'Server response is not JSON. Check that the new backend is deployed.',
    );
  }

  if (!response.ok) {
    const error = new Error(
      result.error || 'Request failed.',
    );

    error.status = response.status;

    throw error;
  }

  return result;
}

export function useFlightState(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [receivedAt, setReceivedAt] = useState(0);

  const alive = useRef(false);
  const pending = useRef(false);
  const version = useRef(0);

  const refresh = useCallback(async () => {
    if (pending.current) {
      return;
    }

    pending.current = true;

    const current = ++version.current;

    try {
      const result = await flightApi(url);

      if (
        alive.current &&
        version.current === current
      ) {
        setData(result);
        setError('');
        setUnauthorized(false);
        setReceivedAt(Date.now());
      }
    } catch (error) {
      if (
        alive.current &&
        version.current === current
      ) {
        setError(error.message);
        setUnauthorized(error.status === 401);
      }
    } finally {
      pending.current = false;
    }
  }, [url]);

  useEffect(() => {
    alive.current = true;

    refresh();

    const timer = setInterval(refresh, 1000);

    return () => {
      alive.current = false;
      version.current++;

      clearInterval(timer);
    };
  }, [refresh]);

  return {
    data,
    error,
    unauthorized,
    receivedAt,
    refresh,
  };
}

export function flightRequestKey() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `flight-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function notifyFlightWallet() {
  window.dispatchEvent(
    new Event('demo-balance-updated'),
  );
}
