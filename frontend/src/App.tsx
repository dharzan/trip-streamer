import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { ActiveDealsDocument, Deal } from './graphql/deals';
import { queryRag, RagQueryResponse } from './services/ragClient';

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
  const [insightPrompt, setInsightPrompt] = useState('What are the best deals today?');
  const [insightResult, setInsightResult] = useState<RagQueryResponse | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const deals = data?.activeDeals ?? [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void refetch(variables);
  };

  const handleInsightRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = insightPrompt.trim();
    if (!prompt) {
      setInsightError('Enter a question to fetch insights.');
      return;
    }

    setInsightLoading(true);
    setInsightError(null);
    try {
      const result = await queryRag(prompt);
      setInsightResult(result);
    } catch (ragError) {
      setInsightError(ragError instanceof Error ? ragError.message : 'Failed to fetch insights');
    } finally {
      setInsightLoading(false);
    }
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

      <section className="insights">
        <div className="insights-header">
          <h2>AI Insights</h2>
          <p>Ask questions powered by the RAG assistant (e.g., “What are the hottest SYD deals under $400?”).</p>
        </div>
        <form onSubmit={handleInsightRequest} className="insights-form">
          <textarea
            value={insightPrompt}
            onChange={(event) => setInsightPrompt(event.target.value)}
            placeholder="Ask about destinations, price caps, or recent trends"
            rows={3}
          />
          <button type="submit" disabled={insightLoading}>
            {insightLoading ? 'Fetching insights...' : 'Ask'}
          </button>
        </form>
        {insightError && <p className="error">{insightError}</p>}
        {insightResult && (
          <div className="insights-result">
            <h3>Suggested context</h3>
            <pre>{insightResult.synthesizedResponse}</pre>

            {insightResult.matches.length > 0 && (
              <>
                <h4>Top matches</h4>
                <ul>
                  {insightResult.matches.map((match) => (
                    <li key={match.id}>
                      <strong>{match.source}</strong> ({match.score.toFixed(2)}): {match.text}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
