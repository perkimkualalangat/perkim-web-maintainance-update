import { createContext, useContext, useEffect, useState } from 'react';
import { ENTITY_TYPES } from '../lib/entities.js';

const DataContext = createContext(null);

async function loadEntity(type) {
  try {
    const response = await fetch(`/data/${type}.json`);
    if (!response.ok) return [];
    const payload = await response.json();
    if (Array.isArray(payload)) return payload;
    return Array.isArray(payload?.[type]) ? payload[type] : [];
  } catch {
    return [];
  }
}

export function DataProvider({ children }) {
  const [data, setData] = useState({});
  const [report, setReport] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAll() {
      setIsLoading(true);
      try {
        const results = await Promise.all(
          ENTITY_TYPES.map(async (type) => [type, await loadEntity(type)]),
        );
        setData(Object.fromEntries(results));
        setLastUpdated(new Date().toISOString());
        setError(null);
      } catch (loadError) {
        console.error('Failed to load data:', loadError);
        setError(loadError);
      } finally {
        setIsLoading(false);
      }
    }
    loadAll();
  }, []);

  const value = {
    data,
    report,
    lastUpdated,
    isLoading,
    error,
    setData,
    setReport,
    setLastUpdated,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider.');
  }
  return context;
}
