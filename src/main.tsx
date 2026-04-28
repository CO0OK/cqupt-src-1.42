import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const nativeFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const isApiRequest = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
  if (!isApiRequest) {
    return nativeFetch(input, init);
  }

  return nativeFetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include',
  });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
