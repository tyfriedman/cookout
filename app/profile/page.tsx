'use client';

import { useEffect, useMemo, useState } from 'react';

type User = {
  username: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  join_date: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        const res = await fetch(`/api/users?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load user');
        setUser(data.user as User);
      } catch (e: any) {
        setError(e.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [username]);

  const since = useMemo(() => formatTimeSince(user?.join_date ?? null), [user?.join_date]);

  return (
    <main style={{ minHeight: '100svh', display: 'grid', alignItems: 'center', padding: '6vh 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <header style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 32, lineHeight: 1.2, margin: 0 }}>Profile</h1>
        </header>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, background: '#ffffff' }}>
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
              <Row label="Joined" value={since} />
            </div>
          )}
        </div>
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


