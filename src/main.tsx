import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global HTTP Cache Interceptor to make all GET requests load instantly (0ms) from memory when navigating tabs
const fetchCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_MAX_AGE = 30000; // 30 seconds of memory cache

const originalFetch = window.fetch;
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
  const method = init?.method || 'GET';

  // Cache public and protected GET queries for database entities
  if (method === 'GET' && url.includes('/api/')) {
    const cached = fetchCache.get(url);
    const now = Date.now();

    if (cached && (now - cached.timestamp < CACHE_MAX_AGE)) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const res = await originalFetch(input, init);
    if (res.ok) {
      const clone = res.clone();
      try {
        const data = await clone.json();
        fetchCache.set(url, { timestamp: now, data });
      } catch (e) {
        // Response is not JSON (e.g. text or blob), do not cache
      }
    }
    return res;
  }

  // Clear cache immediately on mutations (POST, PUT, DELETE) so subsequent loads fetch fresh database records
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    fetchCache.clear();
  }

  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
