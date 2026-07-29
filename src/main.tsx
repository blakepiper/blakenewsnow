import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import { CssBaseline, StylesProvider, ThemeProvider } from '@material-ui/core';
import './index.css';
import App from './App.tsx';
import { theme } from './theme';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, app still works
    });
  });
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
