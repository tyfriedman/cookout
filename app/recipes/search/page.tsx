'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type Recipe = {recipe_id: number, 
            name: string, 
            calories: number, 
            fat: number,
            sugar: number,
            carb: number,
            protein: number
            }

export default function RecipesPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<FoodOption[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [searchQuery, setSearchQuery] = useState('');
  const [userPreferences, setUserPreferences] = useState({
    mealType: 'All',
    prepTime: 'All',
    origin: 'All',
    dietary: {
      vegetarian: false,
      vegan: false,
      pescatarian: false,
      glutenFree: false,
      nutFree: false,
      dairyFree: false,
    },
    health: {
      lowCalorie: false,
      lowFat: false,
      lowSugar: false,
      lowSodium: false,
      lowCarb: false,
    },
  });

  useEffect(() => {
    const u = window.localStorage.getItem('cookout_username');
    setUsername(u);
  }, []);

  useEffect(() => {
    if (username !== null) fetchRecipes();
  }, [username, searchQuery, userPreferences]);
  
  async function fetchRecipes() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/recipes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: searchQuery,
          filters: userPreferences,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch recipes');
      
      setRecipes(data.recipes);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
<main
  style={{
    minHeight: '100svh',
    display: 'grid',
    gridTemplateColumns: '3fr 1fr', 
    gap: '24px',
    padding: '6vh 40px', 
    backgroundColor: '#f9fafb',
    alignItems: 'start',
  }}
>
  {/* Recipe Search */}
  <div
  style={{
    width: '100%',
    position: 'relative',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',      
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)', 
    padding: '24px',
    height: '100%',                   
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
        Find hundreds of recipes with what you have in your 
        <a href='/pantry' style={{color: '#3895d3'}}> pantry</a>
      </p>
    </header>

    {!username && (
      <div style={{ color: '#b91c1c', marginBottom: 16 }}>
        No user found. Please log in.
      </div>
    )}

    <section style={{ display: 'grid', gap: 20 }}>
      <section style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: 16,
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
          onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
        />

        {/* Search Button */}
        {/* <button
          type="button"
          onClick={async () => {
            try {
              setLoading(true);
              const response = await fetch('/api/recipes/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  keywords: searchQuery,
                  filters: userPreferences,
                }),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error || 'Search failed');
              setRecipes(data.recipes);
              setSearchQuery('')
            } catch (err: any) {
              setError(err.message);
            } finally {
              setLoading(false);
            }
          }}
          style={{
            background: '#2563eb',
            color: 'white',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: 16,
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1e40af')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2563eb')}
        >
          Search
        </button> */}
      </section>
      <section 
        style={{ 
          marginTop: 24, 
          flex: 1,
          overflowY: 'auto',
          maxHeight: '60vh',
          paddingRight: 8 }}>
          {loading && <p>Loading recipes...</p>}
          {error && <p style={{ color: '#b91c1c' }}>{error}</p>}

          {!loading && !error && recipes.length === 0 && (
            <p style={{ color: '#6b7280' }}>No recipes found</p>
          )}

          {!loading && !error && recipes.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recipes.map((recipe) => (
                <li key={recipe.recipe_id} style={{ marginBottom: 12 }}>
                    <Link href={`/recipes/${recipe.recipe_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div
                      style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                      }}>
                        <h3 style={{ margin: 0, fontSize: 18 }}>{recipe.name}</h3>
                        <p style={{ color: '#6b7280', marginTop: 4 }}>
                          {recipe.calories} calories • {recipe.protein} g protein • {recipe.carb} g carbs • {recipe.sugar} g sugar • {recipe.fat} g fat
                        </p>
                        <p style={{ marginTop: 8 }}>{recipe.description}</p>
                      </div>
                    </Link>
                  </li>
              ))}
            </ul>
          )}
      </section>
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
    overflow: 'visible',      
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
        <select style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
        value={userPreferences.mealType}
        onChange={(e) => setUserPreferences(prev => ({ ...prev, mealType: e.target.value }))}>
          <option>All</option>
          <option>Main Dish</option>
          <option>Side Dish</option>
          <option>Breakfast</option>
          <option>Lunch</option>
          <option>Dinner</option>
          <option>Dessert</option>
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: 8 }}>
        <span style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>Prep Time</span>
        <select style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
        value={userPreferences.prepTime}
        onChange={(e) => setUserPreferences(prev => ({ ...prev, prepTime: e.target.value }))}>
          <option>All</option>
          <option>15 min</option>
          <option>30 min</option>
          <option>60 min</option>
          <option>90 min</option>
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: 8 }}>
        <span style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>Origin</span>
        <select style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
        value={userPreferences.origin}
        onChange={(e) => setUserPreferences(prev => ({ ...prev, origin: e.target.value }))}>
          <option>All</option>
          <option>North American</option>
          <option>Mexican</option>
          <option>European</option>
        </select>
      </label>

      <div style={{ marginBottom: 8 }}>
        <span style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>Dietary Restrictions</span>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} 
          checked={userPreferences.dietary.vegetarian}
          onChange={(e) => setUserPreferences(prev => ({...prev, dietary: { ...prev.dietary, vegetarian: e.target.checked }}))}/>
          Vegetarian
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} 
          checked={userPreferences.dietary.vegan}
          onChange={(e) => setUserPreferences(prev => ({...prev, dietary: { ...prev.dietary, vegan: e.target.checked }}))}/>
          Vegan
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} 
          checked={userPreferences.dietary.pescatarian}
          onChange={(e) => setUserPreferences(prev => ({...prev, dietary: { ...prev.dietary, pescatarian: e.target.checked }}))}/>
          Pescatarian
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} 
          checked={userPreferences.dietary.glutenFree}
          onChange={(e) => setUserPreferences(prev => ({...prev, dietary: { ...prev.dietary, glutenFree: e.target.checked }}))}/>
          Gluten Free
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }}  
          checked={userPreferences.dietary.nutFree}
          onChange={(e) => setUserPreferences(prev => ({...prev, dietary: { ...prev.dietary, nutFree: e.target.checked }}))}/>
          Nut Free
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} 
          checked={userPreferences.dietary.dairyFree}
          onChange={(e) => setUserPreferences(prev => ({...prev, dietary: { ...prev.dietary, dairyFree: e.target.checked }}))}/>
          Dairy Free
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <span style={{ display: 'block', color: '#6b7280', marginBottom: 4 }}>Health Preferences</span>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} 
          checked={userPreferences.health.lowCalorie}
          onChange={(e) => setUserPreferences(prev => ({...prev, health: { ...prev.health, lowCalorie: e.target.checked }}))}/>
          Low Calorie
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} 
          checked={userPreferences.health.lowFat}
          onChange={(e) => setUserPreferences(prev => ({...prev, health: { ...prev.health, lowFat: e.target.checked }}))}/>
          Low Fat
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} 
          checked={userPreferences.health.lowSugar}
          onChange={(e) => setUserPreferences(prev => ({...prev, health: { ...prev.health, lowSugar: e.target.checked }}))}/>
          Low Sugar
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} 
          checked={userPreferences.health.lowSodium}
          onChange={(e) => setUserPreferences(prev => ({...prev, health: { ...prev.health, lowSodium: e.target.checked }}))}/>
          Low Sodium
        </label>
        <label style={{ display: 'block', marginBottom: 4 }}>
          <input type="checkbox" style={{ marginRight: 8 }} 
          checked={userPreferences.health.lowCarb}
          onChange={(e) => setUserPreferences(prev => ({...prev, health: { ...prev.health, lowCarb: e.target.checked }}))}/>
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

    





