import { Component, type ReactNode } from 'react';

/**
 * Se alguma tela quebrar, em vez de ficar tudo preto mostra um aviso com saída:
 * recarregar ou baixar os dados salvos neste celular (direto do armazenamento, sem depender do app).
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Forja quebrou:', error);
  }

  private download = () => {
    try {
      const raw = localStorage.getItem('forja-v1');
      const state = raw ? (JSON.parse(raw) as { state?: { profiles?: unknown; currentId?: string } }).state : null;
      if (!state?.profiles) return alert('Não achei dados salvos neste celular.');
      const file = { app: 'forja', version: 1, exportedAt: new Date().toISOString(), data: { profiles: state.profiles, currentId: state.currentId } };
      const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `forja-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      alert('Não foi possível gerar o backup.');
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app" role="alert">
        <main className="screen">
          <section className="panel">
            <h2>Algo deu errado nesta tela</h2>
            <p className="muted small">Seus treinos continuam salvos neste celular. Recarregar costuma resolver.</p>
            <button className="primary big" onClick={() => location.reload()}>
              Recarregar
            </button>
            <button className="ghost" onClick={this.download}>
              Baixar backup dos meus dados
            </button>
            <p className="muted small" style={{ wordBreak: 'break-word' }}>
              Detalhe: {String(this.state.error.message).slice(0, 200)}
            </p>
          </section>
        </main>
      </div>
    );
  }
}
