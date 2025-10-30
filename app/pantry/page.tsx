'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type PantryItem = { food_id: number; name: string };
type FoodOption = { food_id: number; name: string };

export default function PantryPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<FoodOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hoverFoodId, setHoverFoodId] = useState<number | null>(null);

  useEffect(() => {
    const u = window.localStorage.getItem('cookout_username');
    setUsername(u);
  }, []);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setItems(data.items as PantryItem[]);
      } catch (e: any) {
        setError(e.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const debouncedQuery = useMemo(() => query, [query]);

  useEffect(() => {
    let abort = false;
    (async () => {
      const q = debouncedQuery.trim();
      if (!q) {
        setOptions([]);
        return;
      }
      try {
        const res = await fetch(`/api/food/search?q=${encodeURIComponent(q)}&limit=10`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to search');
        if (!abort) {
          setOptions(data.items as FoodOption[]);
          setHighlightIdx(0);
        }
      } catch (e: any) {
        if (!abort) setOptions([]);
      }
    })();
    return () => {
      abort = true;
    };
  }, [debouncedQuery]);

  async function addFoodById(food_id: number) {
    if (!username) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/pantry/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, food_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      setQuery('');
      setOptions([]);
      setShowDropdown(false);
      // refresh list
      const res2 = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data2 = await res2.json();
      if (res2.ok) setItems(data2.items as PantryItem[]);
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setAdding(false);
    }
  }

  async function deleteFood(food_id: number) {
    if (!username) return;
    setError(null);
    try {
      const res = await fetch('/api/pantry/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, food_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setItems((prev) => prev.filter((i) => i.food_id !== food_id));
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    }
  }

  return (
    <main style={{ minHeight: '100svh', display: 'grid', alignItems: 'start', padding: '6vh 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', position: 'relative' }}>
        <button
          type="button"
          onClick={() => { window.location.href = '/home'; }}
          aria-label="Back to home"
          style={{ position: 'absolute', top: 0, left: 0, padding: 8, borderRadius: 8, background: 'transparent', border: '1px solid #e5e7eb', cursor: 'pointer' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <header style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Pantry</h1>
        </header>

        {!username && (
          <div style={{ color: '#b91c1c', marginBottom: 16 }}>No user found. Please log in.</div>
        )}

        <section style={{ display: 'grid', gap: 20 }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => {
                if (!showDropdown || options.length === 0) return;
                if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, options.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, 0)); }
                else if (e.key === 'Enter') { e.preventDefault(); const opt = options[highlightIdx]; if (opt) addFoodById(opt.food_id); }
                else if (e.key === 'Escape') { setShowDropdown(false); }
              }}
              placeholder="Search food to add (e.g., Eggs)"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
            />
            {showDropdown && options.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: 280, overflowY: 'auto' }}>
                {options.map((opt, idx) => (
                  <button
                    key={opt.food_id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); }}
                    onClick={() => addFoodById(opt.food_id)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 12px',
                      background: idx === highlightIdx ? '#f3f4f6' : '#fff', border: 'none', borderTop: '1px solid #f3f4f6', cursor: 'pointer'
                    }}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}>
            {loading ? (
              <div style={{ padding: 16 }}>Loading…</div>
            ) : error ? (
              <div style={{ padding: 16, color: '#b91c1c' }}>{error}</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 16, color: '#6b7280' }}>No items yet.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {items.map((item) => (
                  <li
                    key={item.food_id}
                    onMouseEnter={() => setHoverFoodId(item.food_id)}
                    onMouseLeave={() => setHoverFoodId((id) => (id === item.food_id ? null : id))}
                    style={{ position: 'relative', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}
                  >
                    {item.name}
                    <button
                      type="button"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => deleteFood(item.food_id)}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        border: '1px solid #e5e7eb', borderRadius: 6, padding: 6,
                        background: '#fff', cursor: 'pointer', display: hoverFoodId === item.food_id ? 'inline-flex' : 'none'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 6h18" />
                        <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
                        <path d="M10 6V4h4v2" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}


