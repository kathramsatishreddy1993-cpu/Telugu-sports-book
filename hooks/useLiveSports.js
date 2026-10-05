
import { useEffect, useState } from 'react';
import {
  fetchSportsEvents,
  subscribeToSportsStream,
} from '../services/sportsApiClient';

export function useLiveSports(selectedSport = 'all') {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [dataFeedType, setDataFeedType] = useState('DEMO_MOCK');

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    const loadEvents = async () => {
      setLoading(true);

      try {
        const data = await fetchSportsEvents(selectedSport);

        if (!isMounted) return;

        if (Array.isArray(data) && data.length > 0) {
          setEvents(data);
          setIsLiveConnected(true);
          setDataFeedType(data[0]?.source || 'DEMO_MOCK');
        } else {
          setEvents([]);
          setIsLiveConnected(false);
          setDataFeedType('DEMO_MOCK');
        }
      } catch (error) {
        console.error('Failed to load sports events:', error);

        if (!isMounted) return;

        setEvents([]);
        setIsLiveConnected(false);
        setDataFeedType('DEMO_MOCK');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEvents();

    unsubscribe = subscribeToSportsStream(
      (data) => {
        if (!isMounted || !data?.events) return;

        const incomingEvents = Array.isArray(data.events)
          ? data.events
          : [];

        const filteredEvents =
          selectedSport === 'all'
            ? incomingEvents
            : incomingEvents.filter(
                (event) =>
                  event?.sport?.toLowerCase() ===
                  selectedSport.toLowerCase()
              );

        setEvents(filteredEvents);

        if (filteredEvents.length > 0) {
          setIsLiveConnected(true);
          setDataFeedType(
            filteredEvents[0]?.source || 'DEMO_MOCK'
          );
        }
      },
      () => {
        if (!isMounted) return;

        setIsLiveConnected(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [selectedSport]);

  return {
    events,
    loading,
    isLiveConnected,
    dataFeedType,
  };
}
