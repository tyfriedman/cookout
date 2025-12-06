'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

function Icon({ name }: { name: 'basket' | 'book' | 'dish' | 'fire' | 'stick' }) {
  const common = { width: 32, height: 32 } as const;
  switch (name) {
    case 'basket':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 9h18" />
          <path d="M6 9l2 10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l2-10" />
          <path d="M9 9l3-6 3 6" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5z" />
          <path d="M6 5h10" />
        </svg>
      );
    case 'dish':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 13a8 8 0 0 1 16 0" />
          <path d="M2 13h20" />
          <path d="M7 13v3" />
          <path d="M17 13v3" />
        </svg>
      );
    case 'fire':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-4 4-8 4-8z" />
          <path d="M8 14a4 4 0 1 0 8 0" />
        </svg>
      );
    case 'stick':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="6.5" r="3" />
          <path d="M12 9.5v5" />
          <path d="M8 13l4 2 4-2" />
          <path d="M9 20l3-5 3 5" />
        </svg>
      );
  }
}

type NavItem = {
  path: string;
  label: string;
  icon: 'basket' | 'book' | 'dish' | 'fire' | 'stick';
};

const navItems: NavItem[] = [
  { path: '/pantry', label: 'Pantry', icon: 'basket' },
  { path: '/recipes/search', label: 'Recipes', icon: 'book' },
  { path: '/home', label: 'Posts', icon: 'dish' },
  { path: '/cookout', label: 'Cookout', icon: 'fire' },
  { path: '/profile', label: 'Profile', icon: 'stick' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const u = window.localStorage.getItem('cookout_username');
    setUsername(u);
    setIsLoggedIn(!!u);
  }, []);

  const handleSignOut = () => {
    window.localStorage.removeItem('cookout_username');
    setUsername(null);
    setIsLoggedIn(false);
    router.push('/');
  };

  const handleSignIn = () => {
    router.push('/');
  };

  // Don't show layout on login/signup page
  if (pathname === '/') {
    return <>{children}</>;
  }

  const getActivePath = () => {
    if (pathname === '/home') return '/home';
    if (pathname.startsWith('/pantry')) return '/pantry';
    if (pathname.startsWith('/recipes')) return '/recipes/search';
    if (pathname.startsWith('/posts')) return '/home';
    if (pathname.startsWith('/cookout')) return '/cookout';
    if (pathname.startsWith('/profile')) return '/profile';
    return '/home';
  };

  const activePath = getActivePath();

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
      {/* Top Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img 
            src="/favicon.ico" 
            alt="Cookout" 
            style={{ width: 32, height: 32 }}
          />
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#111827' }}>Cookout</h1>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '20px', paddingBottom: 100, overflowY: 'auto' }}>
        <div style={{ 
          maxWidth: pathname.startsWith('/recipes') ? 1200 : pathname.startsWith('/pantry') ? 960 : 640, 
          margin: '0 auto', 
          width: '100%' 
        }}>
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#ffffff',
        borderTop: '1px solid #f3f4f6',
        padding: '6px 0',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 100
      }}>
        {navItems.map((item) => {
          const isActive = activePath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? '#111827' : '#9ca3af',
                transition: 'color 0.2s'
              }}
            >
              <div style={{ color: isActive ? '#111827' : '#9ca3af' }}>
                <Icon name={item.icon} />
              </div>
              <span style={{
                fontSize: 16,
                fontWeight: isActive ? 600 : 400
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

