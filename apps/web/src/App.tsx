import { useEffect, useState } from 'react';

type HealthStatusResponse = {
  status: 'ok';
  service: string;
};

export function App() {
  const [health, setHealth] = useState<HealthStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Health check failed (${response.status})`);
        }

        return response.json() as Promise<HealthStatusResponse>;
      })
      .then(setHealth)
      .catch((fetchError: unknown) => {
        const message =
          fetchError instanceof Error ? fetchError.message : 'Unknown health check error';
        setError(message);
      });
  }, []);

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        margin: '2rem auto',
        maxWidth: '40rem',
        padding: '0 1rem',
      }}
    >
      <h1>Truck Parts System</h1>
      <p>Release 1 — local development scaffold</p>
      {health && (
        <p>
          API health: <strong>{health.status}</strong> ({health.service})
        </p>
      )}
      {error && <p role="alert">API health error: {error}</p>}
    </main>
  );
}
