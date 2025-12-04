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
      } else {
        // store username for subsequent pages and navigate to home
        const username = payload.username as string;
        try { window.localStorage.setItem('cookout_username', username); } catch {}
        window.location.href = '/home';
      }
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => setMode('signup')}
          aria-pressed={mode === 'signup'}
          style={{
            padding: 0,
            border: 'none',
            background: 'none',
            color: mode === 'signup' ? '#111827' : '#6b7280',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: mode === 'signup' ? 600 : 400,
            textDecoration: 'none',
          }}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => setMode('login')}
          aria-pressed={mode === 'login'}
          style={{
            padding: 0,
            border: 'none',
            background: 'none',
            color: mode === 'login' ? '#111827' : '#6b7280',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: mode === 'login' ? 600 : 400,
            textDecoration: 'none',
          }}
        >
          Log in
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={2}
          maxLength={50}
          pattern="[A-Za-z0-9_\-]{2,25}"
          title="Use 2–25 characters: letters, numbers, underscores, or hyphens"
          placeholder="Username"
          style={{ padding: '12px', border: 'none', borderBottom: '1px solid #e5e7eb', borderRadius: 0, background: 'transparent', fontSize: 16 }}
        />

        {mode === 'signup' && (
          <>
            <input
              id="firstname"
              name="firstname"
              type="text"
              placeholder="First name"
              style={{ padding: '12px', border: 'none', borderBottom: '1px solid #e5e7eb', borderRadius: 0, background: 'transparent', fontSize: 16 }}
            />
            <input
              id="lastname"
              name="lastname"
              type="text"
              placeholder="Last name"
              style={{ padding: '12px', border: 'none', borderBottom: '1px solid #e5e7eb', borderRadius: 0, background: 'transparent', fontSize: 16 }}
            />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email"
              style={{ padding: '12px', border: 'none', borderBottom: '1px solid #e5e7eb', borderRadius: 0, background: 'transparent', fontSize: 16 }}
            />
          </>
        )}

        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={8}
          placeholder="Password"
          style={{ padding: '12px', border: 'none', borderBottom: '1px solid #e5e7eb', borderRadius: 0, background: 'transparent', fontSize: 16 }}
        />

        {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 14 }}>{error}</div>}
        {success && <div role="status" style={{ color: '#065f46', fontSize: 14 }}>{success}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            padding: '12px',
            border: 'none',
            background: '#111827',
            color: '#ffffff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 16,
            borderRadius: 0,
          }}
        >
          {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
        </button>
      </form>
    </div>
  );
}


