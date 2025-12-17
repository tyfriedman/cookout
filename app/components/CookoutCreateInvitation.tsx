'use client';

import { useEffect, useState } from 'react';

type RecipeSummary = {
  recipe_id: number;
  name: string;
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  sugar: number;
};

type RecipeDetail = RecipeSummary & {
  instructions: string;
  description: string;
  ingredients: string[];
};

type UserSearchResult = { username: string; firstname: string | null; lastname: string | null };

export default function CookoutCreateInvitation(props: {
  username: string;
  initialRecipeId?: number;
  title?: string;
  closeLabel?: string;
  onClose: () => void;
  onCreated?: (invitationId: number) => void;
}) {
  const {
    username,
    initialRecipeId,
    title = 'Create Cookout Invitation',
    closeLabel = '← Back',
    onClose,
    onCreated,
  } = props;

  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [recipeSearchResults, setRecipeSearchResults] = useState<RecipeSummary[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [cookoutDate, setCookoutDate] = useState('');
  const [cookoutTime, setCookoutTime] = useState('');
  const [invitedUsernames, setInvitedUsernames] = useState<string[]>([]);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameSearchResults, setUsernameSearchResults] = useState<UserSearchResult[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (recipeSearchQuery.trim()) {
      const timeout = setTimeout(() => {
        searchRecipes();
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setRecipeSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeSearchQuery]);

  useEffect(() => {
    if (usernameInput.trim()) {
      const timeout = setTimeout(() => {
        searchUsers();
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setUsernameSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameInput]);

  useEffect(() => {
    if (!initialRecipeId) return;
    fetchRecipeDetails(initialRecipeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRecipeId]);

  async function searchRecipes() {
    try {
      const response = await fetch('/api/recipes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: recipeSearchQuery,
          filters: {},
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setRecipeSearchResults((data.recipes || []) as RecipeSummary[]);
      }
    } catch {
      // ignore
    }
  }

  async function searchUsers() {
    try {
      const response = await fetch('/api/cookout/search-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: usernameInput }),
      });
      const data = await response.json();
      if (response.ok) {
        setUsernameSearchResults((data.users || []) as UserSearchResult[]);
      }
    } catch {
      // ignore
    }
  }

  async function fetchRecipeDetails(recipeId: number) {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`);
      const data = await response.json();
      if (response.ok && data.recipe) {
        const recipe = data.recipe as RecipeDetail;
        setSelectedRecipe(recipe);
        const cleanedIngredients = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
          .map((ing: unknown) => (typeof ing === 'string' ? ing.trim() : ''))
          .filter((ing: string) => ing.length > 0);
        setRecipeIngredients(cleanedIngredients);
        setSelectedIngredients(new Set());
        setRecipeSearchQuery('');
        setRecipeSearchResults([]);
      }
    } catch {
      // ignore
    }
  }

  async function createInvitation() {
    if (!selectedRecipe || !cookoutDate || !cookoutTime) return;

    const dateTime = new Date(`${cookoutDate}T${cookoutTime}`);
    if (isNaN(dateTime.getTime())) return;

    setCreating(true);
    try {
      const response = await fetch('/api/cookout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_username: username,
          recipe_id: selectedRecipe.recipe_id,
          cookout_date: dateTime.toISOString(),
          creator_ingredients: Array.from(selectedIngredients),
          invited_usernames: invitedUsernames,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const invitationId = Number(data.invitation_id);
        resetCreateForm();
        onCreated?.(invitationId);
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  function resetCreateForm() {
    setSelectedRecipe(null);
    setRecipeIngredients([]);
    setSelectedIngredients(new Set());
    setCookoutDate('');
    setCookoutTime('');
    setInvitedUsernames([]);
    setUsernameInput('');
    setUsernameSearchResults([]);
    setRecipeSearchQuery('');
    setRecipeSearchResults([]);
  }

  function addUsername(usernameToAdd: string) {
    if (usernameToAdd && !invitedUsernames.includes(usernameToAdd) && usernameToAdd !== username) {
      setInvitedUsernames([...invitedUsernames, usernameToAdd]);
      setUsernameInput('');
      setUsernameSearchResults([]);
    }
  }

  function removeUsername(usernameToRemove: string) {
    setInvitedUsernames(invitedUsernames.filter((u) => u !== usernameToRemove));
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => {
            resetCreateForm();
            onClose();
          }}
          style={{
            padding: '8px 16px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {closeLabel}
        </button>
        <h1 style={{ fontSize: 28, margin: 0 }}>{title}</h1>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
        {/* Recipe Selection */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Select Recipe</h2>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search for a recipe..."
              value={recipeSearchQuery}
              onChange={(e) => setRecipeSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 16,
                outline: 'none',
              }}
            />
            {recipeSearchResults.length > 0 && !selectedRecipe && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  marginTop: 4,
                  maxHeight: 300,
                  overflowY: 'auto',
                  zIndex: 10,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
              >
                {recipeSearchResults.map((recipe) => (
                  <div
                    key={recipe.recipe_id}
                    onClick={() => {
                      fetchRecipeDetails(recipe.recipe_id);
                    }}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <div style={{ fontWeight: 500 }}>{recipe.name}</div>
                    <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                      {recipe.calories} cal • {recipe.protein}g protein
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedRecipe && (
            <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 18 }}>{selectedRecipe.name}</div>
                  <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                    {selectedRecipe.calories} cal • {selectedRecipe.protein}g protein
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedRecipe(null);
                    setRecipeIngredients([]);
                    setSelectedIngredients(new Set());
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Ingredients Selection */}
        {selectedRecipe && recipeIngredients.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Select Ingredients You Already Have</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recipeIngredients.map((ingredient, index) => (
                <label
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px',
                    background: selectedIngredients.has(index) ? '#dbeafe' : '#f9fafb',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIngredients.has(index)}
                    onChange={(e) => {
                      const newSet = new Set(selectedIngredients);
                      if (e.target.checked) newSet.add(index);
                      else newSet.delete(index);
                      setSelectedIngredients(newSet);
                    }}
                    style={{ width: 20, height: 20, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 16 }}>{ingredient}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Date and Time */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Cookout Date & Time</h2>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#6b7280' }}>Date</label>
              <input
                type="date"
                value={cookoutDate}
                onChange={(e) => setCookoutDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  fontSize: 16,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#6b7280' }}>Time</label>
              <input
                type="time"
                value={cookoutTime}
                onChange={(e) => setCookoutTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  fontSize: 16,
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </section>

        {/* Invite Users */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Invite Users</h2>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Search for users by username..."
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 16,
                outline: 'none',
              }}
            />
            {usernameSearchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  marginTop: 4,
                  maxHeight: 200,
                  overflowY: 'auto',
                  zIndex: 10,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
              >
                {usernameSearchResults
                  .filter((u) => !invitedUsernames.includes(u.username) && u.username !== username)
                  .map((user) => (
                    <div
                      key={user.username}
                      onClick={() => addUsername(user.username)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                    >
                      <div style={{ fontWeight: 500 }}>{user.username}</div>
                      {(user.firstname || user.lastname) && (
                        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                          {[user.firstname, user.lastname].filter(Boolean).join(' ')}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
          {invitedUsernames.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {invitedUsernames.map((u) => (
                <div
                  key={u}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: '#dbeafe',
                    borderRadius: 20,
                    fontSize: 14,
                  }}
                >
                  <span>{u}</span>
                  <button
                    onClick={() => removeUsername(u)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 18,
                      color: '#1e40af',
                      padding: 0,
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Submit Button */}
        <button
          onClick={createInvitation}
          disabled={creating || !selectedRecipe || !cookoutDate || !cookoutTime}
          style={{
            width: '100%',
            padding: '14px',
            background: creating || !selectedRecipe || !cookoutDate || !cookoutTime ? '#d1d5db' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: creating || !selectedRecipe || !cookoutDate || !cookoutTime ? 'not-allowed' : 'pointer',
          }}
        >
          {creating ? 'Creating...' : 'Send Invitation'}
        </button>
      </div>
    </div>
  );
}


