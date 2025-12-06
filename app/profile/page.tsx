'use client';

import { useEffect, useMemo, useState } from 'react';

type User = {
  username: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  join_date: string | null;
};

type Post = {
  post_id: number;
  usernamefk: string;
  recipeid: number | null;
  caption: string;
  image_url: string | null;
  like_count: number;
  post_time: string;
};

type Recipe = {
  recipe_id: number;
  name: string;
};

function formatJoinDate(dateIso: string | null): string {
  if (!dateIso) return '—';
  const then = new Date(dateIso);
  const now = new Date();
  
  // Reset time to midnight for both dates to compare just the days
  const thenDate = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = nowDate.getTime() - thenDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Joined today';
  if (diffDays === 1) return 'Joined one day ago';
  if (diffDays === 2) return 'Joined two days ago';
  if (diffDays === 3) return 'Joined three days ago';
  if (diffDays === 4) return 'Joined four days ago';
  if (diffDays === 5) return 'Joined five days ago';
  if (diffDays === 6) return 'Joined six days ago';
  if (diffDays === 7) return 'Joined one week ago';
  return `Joined ${diffDays} days ago`;
}

function formatTimeSince(dateIso: string | null): string {
  if (!dateIso) return '—';
  const then = new Date(dateIso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day} day${day === 1 ? '' : 's'} ago`;
  if (hr > 0) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  if (min > 0) return `${min} minute${min === 1 ? '' : 's'} ago`;
  return `${sec} second${sec === 1 ? '' : 's'} ago`;
}

export default function ProfilePage() {
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ caption: '', image_url: '', recipeid: '' });
  const [recipeSearch, setRecipeSearch] = useState('');
  const [showRecipeDropdown, setShowRecipeDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('cookout_username') : null;
    setUsername(stored);
  }, []);

  useEffect(() => {
    async function run() {
      if (!username) {
        setLoading(false);
        return;
      }
      try {
        const userRes = await fetch(`/api/users?username=${encodeURIComponent(username)}`);
        
        if (!userRes.ok) {
          const userData = await userRes.json();
          throw new Error(userData.error || 'Failed to load user');
        }
        
        const userData = await userRes.json();
        setUser(userData.user as User);
        
        // Load posts
        try {
          const postsRes = await fetch(`/api/posts?username=${encodeURIComponent(username)}`);
          if (postsRes.ok) {
            const postsData = await postsRes.json();
            setPosts(postsData.posts || []);
          }
        } catch (postsError) {
          console.error('Posts API not available:', postsError);
          setPosts([]);
        }
      } catch (e: any) {
        setError(e.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [username]);

  // Load recipes when create post is opened
  useEffect(() => {
    if (showCreatePost && recipes.length === 0) {
      loadRecipes();
    }
  }, [showCreatePost]);

  // Filter recipes based on search
  useEffect(() => {
    if (recipeSearch.trim() === '') {
      setFilteredRecipes([]);
      setShowRecipeDropdown(false);
    } else {
      const filtered = recipes.filter(r => 
        r.name.toLowerCase().includes(recipeSearch.toLowerCase())
      );
      setFilteredRecipes(filtered);
      setShowRecipeDropdown(filtered.length > 0);
    }
  }, [recipeSearch, recipes]);

  const loadRecipes = async () => {
    try {
      const res = await fetch('/api/posts/recipes');
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes || []);
      }
    } catch (e) {
      console.error('Failed to load recipes:', e);
    }
  };

  const joinDate = useMemo(() => formatJoinDate(user?.join_date ?? null), [user?.join_date]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          caption: newPost.caption,
          image_url: newPost.image_url || null,
          recipeid: newPost.recipeid ? parseInt(newPost.recipeid) : null,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create post');
      
      setPosts([data.post, ...posts]);
      setNewPost({ caption: '', image_url: '', recipeid: '' });
      setRecipeSearch('');
      setShowCreatePost(false);
    } catch (e: any) {
      alert(e.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!username || !confirm('Delete this post?')) return;
    
    try {
      const res = await fetch('/api/posts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, username }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete post');
      
      setPosts(posts.filter(p => p.post_id !== postId));
    } catch (e: any) {
      alert(e.message || 'Failed to delete post');
    }
  };

  const selectRecipe = (recipe: Recipe) => {
    setNewPost({ ...newPost, recipeid: recipe.recipe_id.toString() });
    setRecipeSearch(recipe.name);
    setShowRecipeDropdown(false);
  };

  const clearRecipe = () => {
    setNewPost({ ...newPost, recipeid: '' });
    setRecipeSearch('');
  };

  const getRecipeName = (recipeId: number | null) => {
    if (!recipeId) return null;
    const recipe = recipes.find(r => r.recipe_id === recipeId);
    return recipe?.name || `Recipe #${recipeId}`;
  };

  return (
    <div>
      <header style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, lineHeight: 1.2, margin: 0 }}>Profile</h1>
      </header>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, background: '#ffffff', marginBottom: 24 }}>
          {!username && (
            <div>
              <p style={{ marginTop: 0 }}>You are not logged in.</p>
              <a href="/" style={{ color: '#111827' }}>Go to home to log in.</a>
            </div>
          )}

          {username && loading && <p style={{ margin: 0 }}>Loading…</p>}
          {username && error && <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p>}
          {username && user && (
            <div style={{ display: 'grid', gap: 12 }}>
              <Row label="Username" value={user.username} />
              <Row label="First name" value={user.firstname || '—'} />
              <Row label="Last name" value={user.lastname || '—'} />
              <Row label="Email" value={user.email || '—'} />
              <Row label="Joined" value={joinDate} />
            </div>
          )}
        </div>

        {username && user && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 24, margin: 0 }}>My Posts</h2>
              <button
                onClick={() => setShowCreatePost(!showCreatePost)}
                style={{ padding: '10px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
              >
                {showCreatePost ? 'Cancel' : '+ Create Post'}
              </button>
            </div>

            {showCreatePost && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, background: '#ffffff', marginBottom: 24 }}>
                <form onSubmit={handleCreatePost} style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontWeight: 500 }}>Caption *</label>
                    <textarea
                      value={newPost.caption}
                      onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                      required
                      placeholder="What's on your mind?"
                      style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, minHeight: 100, fontFamily: 'inherit' }}
                    />
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontWeight: 500 }}>Recipe (optional)</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                        placeholder="Search recipes by name..."
                        disabled={!!newPost.recipeid}
                        style={{ flex: 1, padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: newPost.recipeid ? '#f3f4f6' : '#fff' }}
                      />
                      {newPost.recipeid && (
                        <button
                          type="button"
                          onClick={clearRecipe}
                          style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {showRecipeDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        {filteredRecipes.map(recipe => (
                          <div
                            key={recipe.recipe_id}
                            onClick={() => selectRecipe(recipe)}
                            style={{ padding: 12, cursor: 'pointer', borderBottom: '1px solid #e5e7eb' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                          >
                            <div style={{ fontWeight: 500, color: '#111827' }}>{recipe.name}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>ID: {recipe.recipe_id}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontWeight: 500 }}>Image URL (optional)</label>
                    <input
                      type="url"
                      value={newPost.image_url}
                      onChange={(e) => setNewPost({ ...newPost, image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: '12px 24px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500 }}
                  >
                    {submitting ? 'Posting...' : 'Post'}
                  </button>
                </form>
              </div>
            )}

            <div style={{ display: 'grid', gap: 16 }}>
              {posts.length === 0 && !loading && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, background: '#ffffff', textAlign: 'center', color: '#6b7280' }}>
                  No posts yet. Create your first post!
                </div>
              )}
              
              {posts.map((post) => (
                <div key={post.post_id} style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                        {formatTimeSince(post.post_time)}
                      </div>
                      <p style={{ margin: 0, color: '#111827', whiteSpace: 'pre-wrap' }}>{post.caption}</p>
                    </div>
                    <button
                      onClick={() => handleDeletePost(post.post_id)}
                      style={{ padding: 8, background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', color: '#b91c1c' }}
                      aria-label="Delete post"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                  
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      style={{ width: '100%', borderRadius: 12, marginTop: 12, maxHeight: 400, objectFit: 'cover' }}
                    />
                  )}
                  
                  <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 14, color: '#6b7280' }}>
                    <span>❤️ {post.like_count}</span>
                    {post.recipeid && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                        {getRecipeName(post.recipeid)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'center' }}>
      <div style={{ color: '#6b7280' }}>{label}</div>
      <div style={{ color: '#111827' }}>{value}</div>
    </div>
  );
}