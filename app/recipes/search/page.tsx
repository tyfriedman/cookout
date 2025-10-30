'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Recipe = {recipe_id: number, 
            name: string, 
            instructions: string, 
            calories: float,
            fat: float,

            }

export default function RecipesPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<FoodOption[]>([]);


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
<main
  style={{
    minHeight: '100svh',
    display: 'grid',
    gridTemplateColumns: '3fr 1fr', // Left = 75%, Right = 25%
    gap: '24px',
    padding: '6vh 40px', // equal padding on both sides
    backgroundColor: '#f9fafb',
    alignItems: 'start',
  }}
>
  {/* LEFT SIDE — Recipe Search */}
  <div
    style={{
      width: '100%',
      position: 'relative',
      background: '#fff',
      borderRadius: 12,
      padding: '24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}
  >
    <button
      type="button"
      onClick={() => { window.location.href = '/home'; }}
      aria-label="Back to home"
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        padding: 8,
        borderRadius: 8,
        background: 'transparent',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>

    <header style={{ marginBottom: 24, paddingLeft: 44 }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Recipe Search</h1>
      <p style={{ color: '#6b7280', marginTop: 8 }}>
        Find hundreds of recipes with what you have on hand
      </p>
    </header>

    {!username && (
      <div style={{ color: '#b91c1c', marginBottom: 16 }}>
        No user found. Please log in.
      </div>
    )}

    <section style={{ display: 'grid', gap: 20 }}>
      {/* 🔍 Search input + dropdown here */}
    </section>
  </div>

  {/* Filters */}
  <aside
    style={{
      display: 'grid',
      gridTemplateRows: 'auto 1fr',
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      height: '80vh',
    }}
  >
    {/* FILTERS */}
    <div
      style={{
        padding: '16px 24px',
        // borderBottom: '1px solid #e5e7eb',
        //background: '#f9fafb',
      }}
    >
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>Filters</h2>
      <label style={{ display: 'block', marginBottom: 8 }}>
        <span style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>Meal Type</span>
        <select style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}>
          <option>All</option>
          <option>Main Dish</option>
          <option>Side Dish</option>
          <option>Breakfast</option>
          <option>Lunch</option>
          <option>Dinner</option>
          <option>Snack</option>
          <option>Dessert</option>
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: 8 }}>
        <span style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>Prep Time</span>
        <select style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}>
          <option>All</option>
          <option>15 min</option>
          <option>30 min</option>
          <option>60 min</option>
          <option>90 min</option>
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: 8 }}>
        <span style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>Origin</span>
        <select style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}>
          <option>All</option>
          <option>North American</option>
          <option>Mexican</option>
          <option>European</option>
        </select>
      </label>

      <div style={{ marginBottom: 8 }}>
        <span style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>Dietary Restrictions</span>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Vegetarian
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Vegan
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Pescatarian
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Gluten Free
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Nut Free
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Dairy Free
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <span style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>Health Preferences</span>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Low Calorie
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Low Fat
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Low Sugar
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Low Sodium
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Low Carb
        </label>
      </div>



      {/* <button
        style={{
          width: '100%',
          padding: 10,
          marginTop: 8,
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Apply Filters
      </button> */}
    </div>

    {/* PANTRY
    <div style={{ overflowY: 'auto', padding: '16px 24px' }}>
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Your Pantry</h2>
      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div style={{ color: '#b91c1c' }}>{error}</div>
      ) : items.length === 0 ? (
        <div style={{ color: '#6b7280' }}>No items yet.</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((item) => (
            <li
              key={item.food_id}
              onMouseEnter={() => setHoverFoodId(item.food_id)}
              onMouseLeave={() => setHoverFoodId((id) => (id === item.food_id ? null : id))}
              style={{
                position: 'relative',
                padding: '10px 0',
                borderTop: '1px solid #f3f4f6',
              }}
            >
              {item.name}
              <button
                type="button"
                aria-label={`Delete ${item.name}`}
                onClick={() => deleteFood(item.food_id)}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: 4,
                  background: '#fff',
                  cursor: 'pointer',
                  display: hoverFoodId === item.food_id ? 'inline-flex' : 'none',
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
    </div> */}
  </aside>
</main>


  )
}

    





