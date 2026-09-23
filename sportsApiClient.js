const API_BASE_URL = '/api';

export async function fetchSportsEvents(sportCategory = 'all') {
  try {
    const res = await fetch(`${API_BASE_URL}/sports/events?sport=${sportCategory}`);
    if (!res.ok) throw new Error('Proxy connection failed');
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    return null; // Signals hook to fall back locally
  }
}

export function subscribeToSportsStream(onMessage, onError) {
  try {
    const eventSource = new EventSource(`${API_BASE_URL}/sports/stream`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    eventSource.onerror = (err) => {
      if (onError) onError(err);
      eventSource.close();
    };

    return () => eventSource.close();
  } catch (e) {
    if (onError) onError(e);
    return () => {};
  }
}