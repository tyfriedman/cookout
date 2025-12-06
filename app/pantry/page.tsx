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
  
  // Mode toggle: 'add' or 'borrow'
  const [mode, setMode] = useState<'add' | 'borrow'>('add');
  
  // Borrow ingredient feature state (using same query)
  const [borrowResults, setBorrowResults] = useState<Array<{ food_id: number; name: string; users: string[] }>>([]);
  const [loadingBorrowUsers, setLoadingBorrowUsers] = useState(false);
  const [borrowError, setBorrowError] = useState<string | null>(null);

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

  // Search for food options (only in 'add' mode)
  useEffect(() => {
    if (mode !== 'add') {
      setOptions([]);
      return;
    }
    
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
  }, [debouncedQuery, mode]);

  // Auto-search for users with matching ingredients (only in 'borrow' mode)
  useEffect(() => {
    if (mode !== 'borrow') {
      setBorrowResults([]);
      setBorrowError(null);
      setLoadingBorrowUsers(false);
      return;
    }
    
    const q = debouncedQuery.trim();
    if (!q || !username) {
      setBorrowResults([]);
      setBorrowError(null);
      setLoadingBorrowUsers(false);
      return;
    }

    // Debounce: wait 300ms after user stops typing
    const timeoutId = setTimeout(async () => {
      let abort = false;
      setLoadingBorrowUsers(true);
      setBorrowError(null);
      
      try {
        const res = await fetch('/api/pantry/search-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, username }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to search');
        if (!abort) {
          setBorrowResults(data.results || []);
        }
      } catch (e: any) {
        if (!abort) {
          setBorrowError(e.message || 'Unexpected error');
          setBorrowResults([]);
        }
      } finally {
        if (!abort) {
          setLoadingBorrowUsers(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [debouncedQuery, username, mode]);

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
    <div>
      <header style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Pantry</h1>
      </header>

        {!username && (
          <div style={{ color: '#b91c1c', marginBottom: 16 }}>No user found. Please log in.</div>
        )}

        <section style={{ display: 'grid', gap: 24 }}>
          {/* Search Bar with Toggle */}
          <div style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { 
                  setQuery(e.target.value); 
                  if (mode === 'add') setShowDropdown(true);
                }}
                onFocus={() => { if (mode === 'add') setShowDropdown(true); }}
                onKeyDown={(e) => {
                  if (mode !== 'add' || !showDropdown || options.length === 0) return;
                  if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, options.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter') { e.preventDefault(); const opt = options[highlightIdx]; if (opt) addFoodById(opt.food_id); }
                  else if (e.key === 'Escape') { setShowDropdown(false); }
                }}
                placeholder={mode === 'add' ? 'Search food to add to your pantry...' : 'Search ingredient to find who has it...'}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 16 }}
              />
              {mode === 'add' && showDropdown && options.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0 0 8px 8px', marginTop: 4, maxHeight: 280, overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  {options.map((opt, idx) => (
                    <button
                      key={opt.food_id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); }}
                      onClick={() => addFoodById(opt.food_id)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '12px 16px',
                        background: idx === highlightIdx ? '#f3f4f6' : '#fff', border: 'none', borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer'
                      }}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => { setMode('add'); setQuery(''); setBorrowResults([]); setOptions([]); }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: mode === 'add' ? '#e5e7eb' : '#f9fafb',
                  color: mode === 'add' ? '#111827' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: mode === 'add' ? 600 : 400,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  width: '80px',
                  textAlign: 'center'
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setMode('borrow'); setQuery(''); setBorrowResults([]); setOptions([]); }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: mode === 'borrow' ? '#e5e7eb' : '#f9fafb',
                  color: mode === 'borrow' ? '#111827' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: mode === 'borrow' ? 600 : 400,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  width: '80px',
                  textAlign: 'center'
                }}
              >
                Borrow
              </button>
            </div>
          </div>

          {/* Borrow Results - shown when in borrow mode and searching */}
          {mode === 'borrow' && query.trim() && (
            <div>
              {loadingBorrowUsers ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>Searching for users...</div>
              ) : borrowError ? (
                <div style={{ padding: 16, color: '#b91c1c' }}>{borrowError}</div>
              ) : borrowResults.length === 0 ? (
                <div style={{ padding: 16, color: '#6b7280', textAlign: 'center' }}>
                  No one has ingredients matching &quot;<strong>{query}</strong>&quot; in their pantry.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {borrowResults.map((result) => (
                    <div key={result.food_id}>
                      <div style={{ marginBottom: 8 }}>
                        <p style={{ margin: 0, color: '#374151', fontWeight: 600, fontSize: 18 }}>
                          {result.name}
                        </p>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: 14 }}>
                          {result.users.length} {result.users.length === 1 ? 'user has' : 'users have'} this
                        </p>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {result.users.map((user) => (
                          <div
                            key={user}
                            style={{
                              padding: '12px 16px',
                              background: '#f9fafb',
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#6b7280' }}>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            <span style={{ fontSize: 16, color: '#111827' }}>{user}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Your Pantry Items */}
          <div>
            <h2 style={{ fontSize: 20, margin: '0 0 16px 0', fontWeight: 600, color: '#111827' }}>Your Pantry</h2>
            {loading ? (
              <div style={{ padding: 16, color: '#6b7280' }}>Loading…</div>
            ) : error ? (
              <div style={{ padding: 16, color: '#b91c1c' }}>{error}</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 16, color: '#6b7280' }}>No items yet. Search above to add ingredients.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {items.map((item) => (
                  <div
                    key={item.food_id}
                    onMouseEnter={() => setHoverFoodId(item.food_id)}
                    onMouseLeave={() => setHoverFoodId((id) => (id === item.food_id ? null : id))}
                    style={{ 
                      position: 'relative', 
                      padding: '12px 16px', 
                      background: '#f9fafb',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontSize: 16, color: '#111827' }}>{item.name}</span>
                    <button
                      type="button"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => deleteFood(item.food_id)}
                      style={{
                        border: 'none', borderRadius: 6, padding: 6,
                        background: 'transparent', cursor: 'pointer', 
                        display: hoverFoodId === item.food_id ? 'inline-flex' : 'none',
                        color: '#6b7280'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 6h18" />
                        <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
                        <path d="M10 6V4h4v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
    </div>
  );
}


