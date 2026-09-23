import { useState, useEffect } from 'react';
import { fetchSportsEvents, subscribeToSportsStream } from '../services/sportsApiClient';

export function useLiveSports(selectedSport = 'all') {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [dataFeedType, setDataFeedType] = useState('DEMO_MOCK');

  useEffect(() => {
    let unsubscribe = () => {};

    // Initial REST Fetch
    fetchSportsEvents(selectedSport).then((data) => {
      if (data && data.length > 0) {
        setEvents(data);
        setIsLiveConnected(true);
        setDataFeedType(data[0].source || 'DEMO_MOCK');
        setLoading(false);
      } else {
        setIsLiveConnected(false);
        setDataFeedType('DEMO_MOCK');
        setLoading(false);
      }
    });

    // Real-Time SSE Stream Listener
    unsubscribe = subscribeToSportsStream(
      (data) => {
        if (data && data.events) {
          const filtered = selectedSport === 'all' 
            ? data.events 
            : data.events.filter(e => e.sport === selectedSport.toLowerCase());
          setEvents(filtered);
          setIsLiveConnected(true);
          if (filtered.length > 0) setDataFeedType(filtered[0].source);
        }
      },
      () => {
        setIsLiveConnected(false);
      }
    );

    return () => unsubscribe();
  }, [selectedSport]);

  return { events, loading, isLiveConnected, dataFeedType };
}