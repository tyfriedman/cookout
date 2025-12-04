import AuthForm from '@/app/components/AuthForm';

export default function Page() {
  return (
    <main style={{ minHeight: '100svh', display: 'grid', alignItems: 'center', padding: '6vh 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: 0 }}>Cookout</h1>
          <p style={{ color: '#6b7280', marginTop: 8 }}>
          Cook. Share. Enjoy.
          </p>
        </header>

        <AuthForm />
      </div>
    </main>
  );
}


