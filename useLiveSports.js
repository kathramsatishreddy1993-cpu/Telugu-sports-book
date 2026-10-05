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
    let mounted = true;
    let unsubscribe = () => {};

    const sport =
      String(selectedSport || 'all').toLowerCase();

    const filterEvents = (incomingEvents) => {
      if (!Array.isArray(incomingEvents)) {
        return [];
      }

      if (sport === 'all') {
        return incomingEvents;
      }

      return incomingEvents.filter(
        (event) =>
          String(event?.sport || '').toLowerCase() === sport
      );
    };

    /*
     * Initial REST request.
     */
    const loadInitialEvents = async () => {
      try {
        const data = await fetchSportsEvents(sport);

        if (!mounted) return;

        if (Array.isArray(data) && data.length > 0) {
          const filtered = filterEvents(data);

          setEvents(filtered);

          const source =
            filtered[0]?.source || 'DEMO_MOCK';

          setDataFeedType(source);

          if (source === 'REAL_API') {
            setIsLiveConnected(true);
          }
        }
      } catch (error) {
        console.error(
          'Initial sports data error:',
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialEvents();

    /*
     * Real-time Server-Sent Events connection.
     */
    unsubscribe = subscribeToSportsStream(
      (data) => {
        if (!mounted) return;

        if (
          !data ||
          !Array.isArray(data.events)
        ) {
          return;
        }

        const filtered = filterEvents(data.events);

        setEvents(filtered);

        const source =
          data.source ||
          filtered[0]?.source ||
          'DEMO_MOCK';

        setDataFeedType(source);

        /*
         * SSE is connected regardless of whether the data
         * is REAL_API or DEMO_MOCK.
         */
        setIsLiveConnected(true);

        setLoading(false);
      },
      () => {
        if (!mounted) return;

        /*
         * The REST endpoint / backend polling can still
         * provide data even if SSE disconnects.
         */
        setIsLiveConnected(false);
      }
    );

    return () => {
      mounted = false;

      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [selectedSport]);

  return {
    events,
    loading,
    isLiveConnected,
    dataFeedType,
  };
}
