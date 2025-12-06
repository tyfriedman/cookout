// app/posts/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Post = {
  post_id: string;
  usernamefk: string;
  recipe_id_fk: string;
  caption: string;
  image_url: string;
  like_count: number;
  post_time: string;
  profile_picture_url?: string | null;
};

type Comment = {
  post_id: string;
  user_id: string;
  comment_time: string;
  content: string;
  profile_picture_url?: string | null;
};

export default function PostsPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<{[key: string]: Comment[]}>({});
  const [showComments, setShowComments] = useState<{[key: string]: boolean}>({});
  const [newComment, setNewComment] = useState<{[key: string]: string}>({});
  const [commentCounts, setCommentCounts] = useState<{[key: string]: number}>({});
  const [likeCounts, setLikeCounts] = useState<{[key: string]: number}>({});

  useEffect(() => {
    const u = window.localStorage.getItem('cookout_username');
    setUsername(u);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    // Fetch comment counts for all posts
    if (posts.length > 0) {
      posts.forEach(post => fetchCommentCount(post.post_id));
    }
  }, [posts]);

  async function fetchPosts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setPosts(data.posts as Post[]);
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLike(postId: string) {
    if (!username) {
      setError('Please log in to like posts');
      return;
    }
  
    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,     
          user_id: username,   // 
        }),
      });
  
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to like');
  
      // Optionally, update the like count locally
      setPosts(posts.map(post =>
        post.post_id === postId
          ? { ...post, like_count: post.like_count + (data.liked ? 1 : -1) }
          : post
      ));
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    }
  }
  

  async function fetchComments(postId: string) {
    try {
      const res = await fetch(`/api/posts/comments?postId=${postId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load comments');
      
      setExpandedComments(prev => ({ ...prev, [postId]: data.comments }));
      setCommentCounts(prev => ({ ...prev, [postId]: data.comments.length }));
      setShowComments(prev => ({ ...prev, [postId]: true }));
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    }
  }

  async function fetchCommentCount(postId: string) {
    try {
      const res = await fetch(`/api/posts/comments?postId=${postId}`);
      const data = await res.json();
      if (res.ok) {
        setCommentCounts(prev => ({ ...prev, [postId]: data.comments.length }));
      }
    } catch (e: any) {
      // Silently fail for counts
    }
  }

  function toggleComments(postId: string) {
    if (showComments[postId]) {
      setShowComments(prev => ({ ...prev, [postId]: false }));
    } else {
      if (!expandedComments[postId]) {
        fetchComments(postId);
      } else {
        setShowComments(prev => ({ ...prev, [postId]: true }));
      }
    }
  }

  async function handleAddComment(postId: string) {
    if (!username) {
      setError('Please log in to comment');
      return;
    }
    
    const content = newComment[postId]?.trim();
    if (!content) return;

    try {
      const res = await fetch('/api/posts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          username,
          content,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add comment');
      
      setExpandedComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data.comment]
      }));
      setCommentCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      setNewComment(prev => ({ ...prev, [postId]: '' }));
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100svh', display: 'grid', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280' }}>Loading posts…</div>
      </main>
    );
  }

  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Feed</h1>
        {!username && (
          <p style={{ color: '#b91c1c', marginTop: 8 }}>Not logged in</p>
        )}
      </header>

        {error && (
          <div style={{ padding: 12, marginBottom: 16, background: '#fee', border: '1px solid #fcc', borderRadius: 8, color: '#b91c1c' }}>
            {error}
          </div>
        )}
        
        {posts.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 32, textAlign: 'center', color: '#6b7280' }}>
            No posts yet. Be the first to share!
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {posts.map((post) => (
              <article key={post.post_id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                {/* Post Header */}
                <header style={{ padding: 16, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      background: post.profile_picture_url 
                        ? 'none' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      display: 'grid', 
                      placeItems: 'center', 
                      color: '#fff', 
                      fontWeight: 600,
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {post.profile_picture_url ? (
                        <img 
                          src={post.profile_picture_url} 
                          alt={post.usernamefk}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        post.usernamefk.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{post.usernamefk}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                        {new Date(post.post_time).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </header>

                {/* Post Image */}
                {post.image_url && (
                  <div style={{ width: '100%', aspectRatio: '1 / 1', overflow: 'hidden' }}>
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                )}

                {/* Post Actions */}
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                    <button
                      type="button"
                      onClick={() => handleLike(post.post_id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 0 }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      <span style={{ fontWeight: 500 }}>{post.like_count || 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleComments(post.post_id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 0 }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span style={{ fontWeight: 500 }}>
                        {commentCounts[post.post_id] || 0}
                      </span>
                    </button>
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontWeight: 600 }}>{post.usernamefk}</span>{' '}
                      <span>{post.caption}</span>
                    </div>
                  )}

                  {/* Comments Section */}
                  {showComments[post.post_id] && (
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, marginTop: 12 }}>
                      <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
                        {expandedComments[post.post_id]?.map((comment) => (
                          <div key={`${comment.post_id}-${comment.user_id}-${comment.comment_time}`} style={{ fontSize: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ 
                              width: 24, 
                              height: 24, 
                              borderRadius: '50%', 
                              background: comment.profile_picture_url 
                                ? 'none' 
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                              display: 'grid', 
                              placeItems: 'center', 
                              color: '#fff', 
                              fontSize: 10,
                              fontWeight: 600,
                              overflow: 'hidden',
                              flexShrink: 0
                            }}>
                              {comment.profile_picture_url ? (
                                <img 
                                  src={comment.profile_picture_url} 
                                  alt={comment.user_id}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                comment.user_id.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <span style={{ fontWeight: 600 }}>{comment.user_id}</span>{' '}
                              <span style={{ color: '#374151' }}>{comment.content}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Add Comment */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          placeholder="Add a comment…"
                          value={newComment[post.post_id] || ''}
                          onChange={(e) => setNewComment(prev => ({ ...prev, [post.post_id]: e.target.value }))}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.post_id)}
                          disabled={!username}
                          style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(post.post_id)}
                          disabled={!username}
                          style={{
                            padding: '8px 16px', background: username ? '#3b82f6' : '#9ca3af', color: '#fff', 
                            border: 'none', borderRadius: 8, cursor: username ? 'pointer' : 'not-allowed', 
                            fontWeight: 500, fontSize: 14
                          }}
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
    </div>
  );
}