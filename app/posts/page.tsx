'use client';

import { useEffect, useState } from 'react';

type Post = {
  post_id: number;
  usernamefk: string;
  recipeid: number | null;
  caption: string;
  image_url: string | null;
  like_count: number;
  post_time: string;
};

type Comment = {
  comment_id: number;
  post_id: number;
  user_id: string;
  content: string;
};

type PostWithInteractions = Post & {
  likeCount: number;
  userHasLiked: boolean;
  comments: Comment[];
  showComments: boolean;
};

function formatTimeSince(dateIso: string): string {
  const then = new Date(dateIso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return `${sec}s ago`;
}

export default function PostsPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostWithInteractions[]>([]);
  const [recipes, setRecipes] = useState<{ recipe_id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComments, setNewComments] = useState<{ [postId: number]: string }>({});

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('cookout_username') : null;
    setUsername(stored);
  }, []);

  useEffect(() => {
    loadPosts();
    loadRecipes();
  }, [username]);

  const loadPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Failed to load posts');
      
      const data = await res.json();
      const postsData = data.posts || [];

      // Load likes and comments for each post
      const postsWithData = await Promise.all(
        postsData.map(async (post: Post) => {
          const [likesRes, commentsRes] = await Promise.all([
            fetch(`/api/posts/like?post_id=${post.post_id}&user_id=${username || ''}`),
            fetch(`/api/posts/comments?post_id=${post.post_id}`)
          ]);

          const likesData = likesRes.ok ? await likesRes.json() : { likeCount: 0, userHasLiked: false };
          const commentsData = commentsRes.ok ? await commentsRes.json() : { comments: [] };

          return {
            ...post,
            likeCount: likesData.likeCount,
            userHasLiked: likesData.userHasLiked,
            comments: commentsData.comments,
            showComments: false,
          };
        })
      );

      setPosts(postsWithData);
    } catch (e) {
      console.error('Failed to load posts:', e);
    } finally {
      setLoading(false);
    }
  };

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

  const toggleLike = async (postId: number) => {
    if (!username) {
      alert('Please log in to like posts');
      return;
    }

    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, user_id: username }),
      });

      if (!res.ok) throw new Error('Failed to toggle like');

      const data = await res.json();

      setPosts(posts.map(p => 
        p.post_id === postId 
          ? { 
              ...p, 
              userHasLiked: data.liked,
              likeCount: data.liked ? p.likeCount + 1 : p.likeCount - 1
            }
          : p
      ));
    } catch (e) {
      console.error('Failed to toggle like:', e);
    }
  };

  const toggleComments = (postId: number) => {
    setPosts(posts.map(p => 
      p.post_id === postId ? { ...p, showComments: !p.showComments } : p
    ));
  };

  const addComment = async (postId: number) => {
    if (!username) {
      alert('Please log in to comment');
      return;
    }

    const content = newComments[postId]?.trim();
    if (!content) return;

    try {
      const res = await fetch('/api/posts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, user_id: username, content }),
      });

      if (!res.ok) throw new Error('Failed to add comment');

      const data = await res.json();

      setPosts(posts.map(p =>
        p.post_id === postId
          ? { ...p, comments: [...p.comments, data.comment] }
          : p
      ));

      setNewComments({ ...newComments, [postId]: '' });
    } catch (e) {
      console.error('Failed to add comment:', e);
      alert('Failed to add comment');
    }
  };

  const deleteComment = async (postId: number, commentId: number) => {
    if (!username || !confirm('Delete this comment?')) return;

    try {
      const res = await fetch('/api/posts/comments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId, user_id: username }),
      });

      if (!res.ok) throw new Error('Failed to delete comment');

      setPosts(posts.map(p =>
        p.post_id === postId
          ? { ...p, comments: p.comments.filter(c => c.comment_id !== commentId) }
          : p
      ));
    } catch (e) {
      console.error('Failed to delete comment:', e);
      alert('Failed to delete comment');
    }
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
          <h1 style={{ fontSize: 32, lineHeight: 1.2, margin: 0 }}>Posts</h1>
        </header>

        {!username && (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, background: '#ffffff', marginBottom: 24, textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px 0', color: '#6b7280' }}>You are not logged in. Log in to like and comment on posts.</p>
            <a href="/" style={{ color: '#111827', textDecoration: 'underline' }}>Go to login</a>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: '#6b7280' }}>Loading posts...</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          {!loading && posts.length === 0 && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, background: '#ffffff', textAlign: 'center', color: '#6b7280' }}>
              No posts yet. Be the first to post!
            </div>
          )}

          {posts.map((post) => (
            <div key={post.post_id} style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, background: '#ffffff' }}>
              {/* Post Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{post.usernamefk}</div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>{formatTimeSince(post.post_time)}</div>
                </div>
              </div>

              {/* Caption */}
              <p style={{ margin: '0 0 12px 0', color: '#111827', whiteSpace: 'pre-wrap' }}>{post.caption}</p>

              {/* Image */}
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="Post"
                  style={{ width: '100%', borderRadius: 12, marginBottom: 12, maxHeight: 400, objectFit: 'cover' }}
                />
              )}

              {/* Recipe Tag */}
              {post.recipeid && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f3f4f6', borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  <span style={{ color: '#374151' }}>{getRecipeName(post.recipeid)}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => toggleLike(post.post_id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: post.userHasLiked ? '#ef4444' : '#6b7280' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={post.userHasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{post.likeCount}</span>
                </button>

                <button
                  onClick={() => toggleComments(post.post_id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7280' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{post.comments.length}</span>
                </button>
              </div>

              {/* Comments Section */}
              {post.showComments && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                  {/* Add Comment */}
                  {username && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <input
                        type="text"
                        value={newComments[post.post_id] || ''}
                        onChange={(e) => setNewComments({ ...newComments, [post.post_id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && addComment(post.post_id)}
                        placeholder="Add a comment..."
                        style={{ flex: 1, padding: 10, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                      />
                      <button
                        onClick={() => addComment(post.post_id)}
                        style={{ padding: '10px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
                      >
                        Post
                      </button>
                    </div>
                  )}

                  {/* Comments List */}
                  <div style={{ display: 'grid', gap: 12 }}>
                    {post.comments.length === 0 && (
                      <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>No comments yet. Be the first to comment!</p>
                    )}
                    {post.comments.map((comment) => (
                      <div key={comment.comment_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 4 }}>
                            {comment.user_id}
                          </div>
                          <div style={{ fontSize: 14, color: '#374151' }}>{comment.content}</div>
                        </div>
                        {username === comment.user_id && (
                          <button
                            onClick={() => deleteComment(post.post_id, comment.comment_id)}
                            style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
                            aria-label="Delete comment"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}


