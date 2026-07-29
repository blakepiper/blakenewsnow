import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import { CssBaseline, StylesProvider, ThemeProvider } from '@material-ui/core';
import './index.css';
import App from './App.tsx';
import { theme } from './theme';

// Replace legacy inline favicons even when an older HTML shell was restored.
document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach(link => link.remove());
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/svg+xml';
favicon.href = '/icons/bnn-favicon.svg?v=2';
document.head.appendChild(favicon);

// Keep the PWA in production, but never let its cache interfere with local development.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(() => {
        // Cache cleanup is best-effort and never blocks the app.
      });

    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(
          keys.filter(key => key.startsWith('bnn-cache-')).map(key => caches.delete(key))
        ))
        .catch(() => {
          // Cache cleanup is best-effort and never blocks the app.
        });
    }
  } else {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => registration.update())
        .catch(() => {
          // Service worker registration failed, app still works.
        });
    });
  }
}

ReactDOM.render(
  <StrictMode>
    <StylesProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </StylesProvider>
  </StrictMode>,
  document.getElementById('root'),
);
