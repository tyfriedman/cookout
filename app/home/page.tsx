'use client';

import { useRouter } from 'next/navigation';

function Icon({ name }: { name: 'basket' | 'book' | 'dish' | 'fire' | 'stick' }) {
  const common = { width: 28, height: 28 } as const;
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

function Card({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 20,
      borderRadius: 16,
      border: '1px solid #e5e7eb',
      background: '#ffffff',
      cursor: 'pointer',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      width: 180,
      height: 140
    }}>
      <div style={{ color: '#111827' }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, textAlign: 'center', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  return (
    <main style={{ minHeight: '100svh', display: 'grid', alignItems: 'center', padding: '6vh 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: 0 }}>Cookout</h1>
          {/* <p style={{ color: '#6b7280', marginTop: 8 }}>Choose where to go</p> */}
        </header>
        <section style={{ display: 'flex', flexWrap: 'nowrap', gap: 20, overflowX: 'auto', justifyContent: 'center' }}>
          <Card title="Pantry" icon={<Icon name="basket" />} onClick={() => router.push('/pantry')} />
          <Card title="Recipes" icon={<Icon name="book" />} onClick={() => router.push('/recipes/search')} />
          <Card title="Posts" icon={<Icon name="dish" />} onClick={() => router.push('/posts')} />
          <Card title="Cookout" icon={<Icon name="fire" />} onClick={() => router.push('/cookout')} />
          <Card title="Profile" icon={<Icon name="stick" />} onClick={() => router.push('/profile')} />
        </section>
      </div>
    </main>
  );
}


