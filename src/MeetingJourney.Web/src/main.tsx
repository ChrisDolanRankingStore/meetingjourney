import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      // Vite development must always use the current modules. Remove the
      // production cache worker so an old app shell cannot mask HMR updates.
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
      caches.keys().then(keys => {
        keys.filter(key => key.startsWith('meeting-journey-')).forEach(key => caches.delete(key));
      });
      return;
    }

    navigator.serviceWorker.register('/sw.js?v=20261023').catch(() => undefined);
  });
}
