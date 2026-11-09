import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/manrope/wght.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import App from './App';
import './styles.css';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
