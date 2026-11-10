import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/manrope/wght.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles.css';

registerSW({ immediate: true });

// Pede ao navegador para não apagar os dados do app quando faltar espaço no celular.
void navigator.storage?.persist?.().catch(() => undefined);

const render = () =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );

// ?demo=1 (link de demonstração e prints do README): entra na demo antes de desenhar,
// sem passar pela tela de boas-vindas.
if (new URLSearchParams(location.search).get('demo') === '1') {
  Promise.all([import('./demo'), import('./store')])
    .then(([d, s]) => s.useStore.getState().enterDemo(d.demoProfiles()))
    .finally(render);
} else render();
