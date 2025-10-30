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

        <section style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 24,
        }}>
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 24,
            background: '#ffffff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ fontSize: 20, marginTop: 0, marginBottom: 12 }}>Get started</h2>
            <AuthForm />
          </div>
        </section>
      </div>
    </main>
  );
}


