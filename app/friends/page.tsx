'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type User = {
  username: string;
  firstname: string | null;
  lastname: string | null;
  profile_picture_url: string | null;
};

type FriendRequest = {
  sender_username: string;
  receiver_username: string;
  status: string;
  created_at: string;
  user: User;
};

export default function FriendsPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);

  useEffect(() => {
    const u = window.localStorage.getItem('cookout_username');
    setUsername(u);
  }, []);

  useEffect(() => {
    if (username) {
      loadRequests();
      loadFriends();
    }
  }, [username]);

  async function loadRequests() {
    if (!username) return;
    setLoadingRequests(true);
    try {
      const [receivedRes, sentRes] = await Promise.all([
        fetch(`/api/friends/requests?username=${encodeURIComponent(username)}&type=received`),
        fetch(`/api/friends/requests?username=${encodeURIComponent(username)}&type=sent`),
      ]);

      const receivedData = await receivedRes.json();
      const sentData = await sentRes.json();

      if (receivedRes.ok) {
        setReceivedRequests(receivedData.requests || []);
      }
      if (sentRes.ok) {
        setSentRequests(sentData.requests || []);
      }
    } catch (e: any) {
      // Error loading requests
    } finally {
      setLoadingRequests(false);
    }
  }

  async function loadFriends() {
    if (!username) return;
    setLoadingFriends(true);
    try {
      const res = await fetch(`/api/friends/list?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (res.ok) {
        setFriends(data.friends || []);
      }
    } catch (e: any) {
      // Error loading friends
    } finally {
      setLoadingFriends(false);
    }
  }

  async function searchUsers() {
    if (!username || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/friends/search?username=${encodeURIComponent(username)}&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.users || []);
      }
    } catch (e: any) {
      // Error searching users
    } finally {
      setSearching(false);
    }
  }

  async function sendFriendRequest(receiverUsername: string) {
    if (!username) return;
    try {
      const res = await fetch('/api/friends/send-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_username: username,
          receiver_username: receiverUsername,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await loadRequests();
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (e: any) {
      // Failed to send friend request
    }
  }

  async function respondToRequest(senderUsername: string, action: 'accept' | 'decline') {
    if (!username) return;
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_username: senderUsername,
          receiver_username: username,
          action,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await loadRequests();
        await loadFriends();
      }
    } catch (e: any) {
      // Failed to respond to request
    }
  }

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchUsers();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  return (
    <div>
      <header style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Friends</h1>
      </header>

      {!username && (
        <div style={{ color: '#b91c1c', marginBottom: 16 }}>No user found. Please log in.</div>
      )}

      <div style={{ display: 'grid', gap: 24 }}>
        {/* Search Users */}
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, background: '#fff' }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Add Friends</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Search for users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 16,
              }}
            />
          </div>
          {searching && <p style={{ color: '#6b7280' }}>Searching...</p>}
          {!searching && searchResults.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              {searchResults.map((user) => (
                <div
                  key={user.username}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: user.profile_picture_url
                          ? 'none'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: 600,
                        overflow: 'hidden',
                      }}
                    >
                      {user.profile_picture_url ? (
                        <img
                          src={user.profile_picture_url}
                          alt={user.username}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{user.username}</div>
                      {(user.firstname || user.lastname) && (
                        <div style={{ fontSize: 14, color: '#6b7280' }}>
                          {[user.firstname, user.lastname].filter(Boolean).join(' ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => sendFriendRequest(user.username)}
                    style={{
                      padding: '8px 16px',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
          {!searching && searchQuery.trim() && searchResults.length === 0 && (
            <p style={{ color: '#6b7280' }}>No users found</p>
          )}
        </section>

        {/* Received Requests */}
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, background: '#fff' }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Friend Requests</h2>
          {loadingRequests ? (
            <p style={{ color: '#6b7280' }}>Loading...</p>
          ) : receivedRequests.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No pending friend requests</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {receivedRequests.map((request) => (
                <div
                  key={`${request.sender_username}-${request.receiver_username}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: request.user.profile_picture_url
                          ? 'none'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: 600,
                        overflow: 'hidden',
                      }}
                    >
                      {request.user.profile_picture_url ? (
                        <img
                          src={request.user.profile_picture_url}
                          alt={request.user.username}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        request.user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <Link href={`/profile?username=${request.user.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
                          {request.user.username}
                        </div>
                      </Link>
                      {(request.user.firstname || request.user.lastname) && (
                        <div style={{ fontSize: 14, color: '#6b7280' }}>
                          {[request.user.firstname, request.user.lastname].filter(Boolean).join(' ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => respondToRequest(request.sender_username, 'accept')}
                      style={{
                        padding: '8px 16px',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToRequest(request.sender_username, 'decline')}
                      style={{
                        padding: '8px 16px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, background: '#fff' }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Sent Requests</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {sentRequests.map((request) => (
                <div
                  key={`${request.sender_username}-${request.receiver_username}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: request.user.profile_picture_url
                          ? 'none'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: 600,
                        overflow: 'hidden',
                      }}
                    >
                      {request.user.profile_picture_url ? (
                        <img
                          src={request.user.profile_picture_url}
                          alt={request.user.username}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        request.user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <Link href={`/profile?username=${request.user.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
                          {request.user.username}
                        </div>
                      </Link>
                      {(request.user.firstname || request.user.lastname) && (
                        <div style={{ fontSize: 14, color: '#6b7280' }}>
                          {[request.user.firstname, request.user.lastname].filter(Boolean).join(' ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{ padding: '8px 16px', color: '#6b7280', fontSize: 14 }}>
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Friends List */}
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, background: '#fff' }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Your Friends ({friends.length})</h2>
          {loadingFriends ? (
            <p style={{ color: '#6b7280' }}>Loading...</p>
          ) : friends.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No friends yet. Search above to add friends!</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {friends.map((friend) => (
                <Link
                  key={friend.username}
                  href={`/profile?username=${friend.username}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      background: '#f9fafb',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f9fafb')}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: friend.profile_picture_url
                          ? 'none'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: 600,
                        overflow: 'hidden',
                      }}
                    >
                      {friend.profile_picture_url ? (
                        <img
                          src={friend.profile_picture_url}
                          alt={friend.username}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        friend.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{friend.username}</div>
                      {(friend.firstname || friend.lastname) && (
                        <div style={{ fontSize: 14, color: '#6b7280' }}>
                          {[friend.firstname, friend.lastname].filter(Boolean).join(' ')}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

