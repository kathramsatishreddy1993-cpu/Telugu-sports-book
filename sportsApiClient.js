const API_BASE_URL = "/api";

/*
  Reads saved data from our server.
  Customer requests do not call Sportmonks directly.
*/
export async function fetchSportsEvents(
  sportCategory = "all",
) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/sports/events?sport=${encodeURIComponent(
        sportCategory,
      )}`,
      {
        cache: "no-store",
        credentials: "same-origin",
      },
    );

    if (!response.ok) {
      throw new Error("Proxy connection failed");
    }

    const data = await response.json();

    return Array.isArray(data.data)
      ? data.data
      : [];
  } catch {
    return null;
  }
}

/*
  Receives shared updates from our server.
  Reconnects automatically after temporary
  network interruptions.
*/
export function subscribeToSportsStream(
  onMessage,
  onError,
) {
  try {
    const stream = new EventSource(
      `${API_BASE_URL}/sports/stream`,
    );

    stream.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        onError?.(error);
      }
    };

    stream.onerror = error => {
      onError?.(error);
    };

    return () => {
      stream.close();
    };
  } catch (error) {
    onError?.(error);

    return () => {};
  }
}

export default {
  fetchSportsEvents,
  subscribeToSportsStream,
};
