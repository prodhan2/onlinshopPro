import { useMemo, useState } from 'react';
import './posterHistory.css';

const HISTORY_KEY = 'beeimg_poster_history_v1';

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PosterHistoryPage({ onBack }) {
  const [history, setHistory] = useState(() => readHistory());

  const grouped = useMemo(() => {
    const map = new Map();
    history.forEach((item) => {
      const date = new Date(item.createdAt || Date.now());
      const key = date.toLocaleDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries());
  }, [history]);

  const clearHistory = () => {
    if (!window.confirm('Clear all poster history?')) return;
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  return (
    <section className="poster-history-page">
      <header className="poster-history-topbar">
        <button type="button" className="btn" onClick={() => window.history.back()}>Back</button>
        <h2>Poster History</h2>
        <button type="button" className="btn danger" onClick={clearHistory}>Clear</button>
      </header>

      {history.length === 0 ? (
        <div className="poster-history-empty">No poster history found.</div>
      ) : (
        <div className="poster-history-wrap">
          {grouped.map(([date, items]) => (
            <div className="poster-history-group" key={date}>
              <h3>{date}</h3>
              <div className="poster-history-grid">
                {items.map((item) => (
                  <article className="poster-history-card" key={`${item.id}-${item.createdAt}`}>
                    <img src={item.thumbnail_url || item.url} alt={item.id || 'poster'} loading="lazy" />
                    <div className="meta">
                      <div className="time">{new Date(item.createdAt).toLocaleTimeString()}</div>
                      <div className="actions">
                        <a href={item.view_url || item.url} target="_blank" rel="noreferrer">Open</a>
                        <a href={item.url} target="_blank" rel="noreferrer">Image</a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
