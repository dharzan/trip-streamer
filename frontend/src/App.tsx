import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { ActiveDealsDocument, Deal } from './graphql/deals';

interface Filters {
  destination: string;
  maxPrice: string;
}

function useActiveDealsFilters() {
  const [filters, setFilters] = useState<Filters>({ destination: '', maxPrice: '' });

  const variables = useMemo(() => {
    return {
      destination: filters.destination.trim() || undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    };
  }, [filters]);

  return { filters, setFilters, variables };
}

export default function App() {
  const { filters, setFilters, variables } = useActiveDealsFilters();
  const { data, loading, error, refetch } = useQuery(ActiveDealsDocument, {
    variables,
    notifyOnNetworkStatusChange: true,
  });

  const deals = data?.activeDeals ?? [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void refetch(variables);
  };

  return (
    <div className="app-shell">
      <header>
        <h1>TripStreamer Deals</h1>
        <p>Live travel deals streaming from the backend pipeline.</p>
      </header>

      <section className="filters">
        <form onSubmit={handleSubmit}>
          <label>
            Destination
            <input
              type="text"
              value={filters.destination}
              placeholder="e.g. SYD"
              onChange={(event) => setFilters((prev) => ({ ...prev, destination: event.target.value }))}
            />
          </label>
          <label>
            Max price (USD)
            <input
              type="number"
              min="0"
              step="50"
              value={filters.maxPrice}
              placeholder="500"
              onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Apply filters'}
          </button>
        </form>
      </section>

      <section className="results">
        {error && <p className="error">Failed to load deals: {error.message}</p>}
        {!loading && deals.length === 0 && !error && <p>No deals match the current filters yet.</p>}

        <ul className="deal-list">
          {deals.map((deal: Deal) => (
            <li key={deal.id} className="deal-card">
              <div>
                <h3>
                  {deal.destination} · {deal.airline}
                </h3>
                <p className="price">${deal.price.toFixed(2)}</p>
              </div>
              <div className="meta">
                <p>
                  <span>Deal ID:</span> {deal.id}
                </p>
                <p>
                  <span>Created:</span> {new Date(deal.createdAt).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
