'use client';

import { useState } from 'react';

type Mode = 'login' | 'signup';

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>('signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    };

    if (mode === 'signup') {
      payload.firstname = (formData.get('firstname') as string) || undefined;
      payload.lastname = (formData.get('lastname') as string) || undefined;
      payload.email = formData.get('email') as string;
    }

    try {
      const res = await fetch(`/api/auth/${mode === 'signup' ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      setSuccess(mode === 'signup' ? 'Account created. You can log in now.' : 'Logged in successfully.');
      if (mode === 'signup') {
        setMode('login');
      }
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setMode('signup')}
          aria-pressed={mode === 'signup'}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: mode === 'signup' ? '#111827' : '#ffffff',
            color: mode === 'signup' ? '#ffffff' : '#111827',
            cursor: 'pointer',
          }}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => setMode('login')}
          aria-pressed={mode === 'login'}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: mode === 'login' ? '#111827' : '#ffffff',
            color: mode === 'login' ? '#ffffff' : '#111827',
            cursor: 'pointer',
          }}
        >
          Log in
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <label htmlFor="username" style={{ fontSize: 14 }}>Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            minLength={2}
            maxLength={50}
            pattern="[A-Za-z0-9_-]+"
            placeholder="yourname"
            style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </div>

        {mode === 'signup' && (
          <>
            <div style={{ display: 'grid', gap: 4 }}>
              <label htmlFor="firstname" style={{ fontSize: 14 }}>First name</label>
              <input id="firstname" name="firstname" type="text" placeholder="Jane" style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }} />
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              <label htmlFor="lastname" style={{ fontSize: 14 }}>Last name</label>
              <input id="lastname" name="lastname" type="text" placeholder="Doe" style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }} />
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              <label htmlFor="email" style={{ fontSize: 14 }}>Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="jane@example.com"
                style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
              />
            </div>
          </>
        )}

        <div style={{ display: 'grid', gap: 4 }}>
          <label htmlFor="password" style={{ fontSize: 14 }}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            placeholder="••••••••"
            style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
          <small style={{ color: '#6b7280' }}>Minimum 8 characters.</small>
        </div>

        {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 14 }}>{error}</div>}
        {success && <div role="status" style={{ color: '#065f46', fontSize: 14 }}>{success}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid #111827',
            background: '#111827',
            color: '#ffffff',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
        </button>
      </form>
    </div>
  );
}


