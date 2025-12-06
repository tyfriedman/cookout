'use client';

import { useEffect, useMemo, useState } from 'react';

type User = {
  username: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  join_date: string | null;
  profile_picture_url: string | null;
};

type Post = {
  post_id: number;
  usernamefk: string;
  recipeid: number | null;
  caption: string;
  image_url: string | null;
  like_count: number;
  post_time: string;
  profile_picture_url?: string | null;
};

type Recipe = {
  recipe_id: number;
  name: string;
};

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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedProfilePic, setSelectedProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);

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
        
        // Set profile picture preview if user has one
        if (userData.user?.profile_picture_url) {
          setProfilePicPreview(userData.user.profile_picture_url);
        }
        
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

  const since = useMemo(() => formatTimeSince(user?.join_date ?? null), [user?.join_date]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please select an image file (JPEG, PNG, GIF, or WebP).');
      return;
    }
  
    // Validate file size (max 5MB)
    const maxSize = 50 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }
  
    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setNewPost({ ...newPost, image_url: '' });
    // Reset file input
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    
    setSubmitting(true);
    let imageUrl = newPost.image_url;
  
    // Upload image if a file is selected
    if (selectedImage) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedImage);
  
        const uploadRes = await fetch('/api/posts/upload-image', {
          method: 'POST',
          body: formData,
        });
  
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Failed to upload image');
        }
  
        imageUrl = uploadData.url;
      } catch (e: any) {
        setUploadingImage(false);
        setSubmitting(false);
        alert(e.message || 'Failed to upload image');
        return;
      }
      setUploadingImage(false);
    }
    
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          caption: newPost.caption,
          image_url: imageUrl || null,
          recipeid: newPost.recipeid ? parseInt(newPost.recipeid) : null,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create post');
      
      setPosts([data.post, ...posts]);
      setNewPost({ caption: '', image_url: '', recipeid: '' });
      setRecipeSearch('');
      setSelectedImage(null);
      setImagePreview(null);
      setShowCreatePost(false);
      // Reset file input
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
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
    <main style={{ minHeight: '100svh', padding: '6vh 20px 40px', background: '#f9fafb' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', position: 'relative' }}>
        <button
          type="button"
          onClick={() => { window.location.href = '/home'; }}
          aria-label="Back to home"
          style={{ position: 'absolute', top: 0, left: 0, padding: 8, borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb', cursor: 'pointer' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        
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
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              {/* Profile Information */}
              <div style={{ display: 'grid', gap: 12, flex: 1 }}>
                <Row label="Username" value={user.username} />
                <Row label="First name" value={user.firstname || '—'} />
                <Row label="Last name" value={user.lastname || '—'} />
                <Row label="Email" value={user.email || '—'} />
                <Row label="Joined" value={since} />
              </div>

              {/* Profile Picture Section */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0, marginRight: 100}}>
                <div style={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: '50%', 
                  background: (profilePicPreview || user.profile_picture_url)
                    ? 'none' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                  display: 'grid', 
                  placeItems: 'center', 
                  color: '#fff', 
                  fontSize: 40,
                  fontWeight: 600,
                  overflow: 'hidden',
                  border: '2px solid #e5e7eb'
                }}>
                  {(profilePicPreview || user.profile_picture_url) ? (
                    <img 
                      src={profilePicPreview || user.profile_picture_url || ''} 
                      alt="Profile" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <input
                    id="profile-pic-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                        if (!allowedTypes.includes(file.type)) {
                          alert('Invalid file type. Please select an image file.');
                          return;
                        }
                        const maxSize = 5 * 1024 * 1024; // 5MB
                        if (file.size > maxSize) {
                          alert('File too large. Maximum size is 5MB.');
                          return;
                        }
                        setSelectedProfilePic(file);
                        
                        // Show preview immediately
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setProfilePicPreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                        
                        // Upload the profile picture
                        setUploadingProfilePic(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          
                          const uploadRes = await fetch('/api/users/upload-profile-picture', {
                            method: 'POST',
                            body: formData,
                          });
                          
                          const uploadData = await uploadRes.json();
                          if (!uploadRes.ok) {
                            throw new Error(uploadData.error || 'Failed to upload image');
                          }
                          
                          // Save profile picture URL to database
                          if (username) {
                            const saveRes = await fetch('/api/users/update-profile-picture', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                username,
                                profile_picture_url: uploadData.url,
                              }),
                            });
                            
                            const saveData = await saveRes.json();
                            if (!saveRes.ok) {
                              throw new Error(saveData.error || 'Failed to save profile picture');
                            }
                            
                            // Update user state with new profile picture URL
                            setUser({ ...user, profile_picture_url: uploadData.url });
                          }
                        } catch (err: any) {
                          alert(err.message || 'Failed to upload profile picture');
                          // Revert preview on error
                          setProfilePicPreview(user.profile_picture_url || null);
                        } finally {
                          setUploadingProfilePic(false);
                        }
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const fileInput = document.getElementById('profile-pic-upload') as HTMLInputElement;
                      fileInput?.click();
                    }}
                    disabled={uploadingProfilePic}
                    style={{
                      padding: '6px 16px',
                      fontSize: 12,
                      background: uploadingProfilePic ? '#9ca3af' : '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: uploadingProfilePic ? 'not-allowed' : 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {uploadingProfilePic ? 'Uploading...' : 'Change photo'}
                  </button>
                </div>
              </div>
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
                    <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontWeight: 500 }}>Image (optional)</label>
                    
                    {imagePreview ? (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                          <img
                            src={imagePreview}
                            alt="Preview"
                            style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8, border: '1px solid #d1d5db' }}
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              padding: '6px 12px',
                              background: 'rgba(0, 0, 0, 0.7)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 500
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 12 }}>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={handleImageSelect}
                          style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                        />
                        <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                          Upload an image (JPEG, PNG, GIF, or WebP, max 50MB)
                        </p>
                      </div>
                    )}

                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                      <label style={{ display: 'block', marginBottom: 8, color: '#6b7280', fontWeight: 400, fontSize: 13 }}>Or enter image URL:</label>
                      <input
                        type="url"
                        value={newPost.image_url}
                        onChange={(e) => setNewPost({ ...newPost, image_url: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        disabled={!!selectedImage}
                        style={{ 
                          width: '100%', 
                          padding: 12, 
                          border: '1px solid #d1d5db', 
                          borderRadius: 8, 
                          fontSize: 14,
                          background: selectedImage ? '#f3f4f6' : '#fff',
                          opacity: selectedImage ? 0.6 : 1
                        }}
                      />
                    </div>
                  </div>
                  
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  style={{ padding: '12px 24px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, cursor: (submitting || uploadingImage) ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500 }}
                >
                  {uploadingImage ? 'Uploading image...' : submitting ? 'Posting...' : 'Post'}
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
                    <div style={{ width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: 12, marginTop: 12 }}>
                      <img
                        src={post.image_url}
                        alt="Post"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
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
    </main>
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