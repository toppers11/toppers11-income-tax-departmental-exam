// Service Worker for Toppers11 - Offline Support & Caching Strategy
// Place this file as 'sw.js' in root directory

const CACHE_VERSION = 'toppers11-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800;900&family=Open+Sans:wght@400;600;700&family=Dancing+Script:wght@600;700&family=Playfair+Display:ital,wght@1,700;1,800&family=Righteous&display=swap',
];

// Install Event - Pre-cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.error('Cache installation failed:', err))
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event - Network first, cache fallback strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip analytics and external tracking
  if (url.hostname !== location.hostname) {
    // Network-only for cross-origin
    event.respondWith(fetch(request).catch(() => offlineFallback()));
    return;
  }

  // HTML - Network first
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || offlinePage();
          });
        })
    );
    return;
  }

  // CSS, JS, Fonts - Cache first, network fallback
  if (request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) return cached;
          
          return fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clone);
            });
            return response;
          });
        })
        .catch(() => offlineFallback())
    );
    return;
  }

  // Images - Cache first, network fallback
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) return cached;
          
          return fetch(request)
            .then((response) => {
              const clone = response.clone();
              caches.open(IMAGE_CACHE).then((cache) => {
                cache.put(request, clone);
              });
              return response;
            })
            .catch(() => {
              // Return placeholder for failed images
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" font-family="Arial" font-size="12" fill="#999">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            });
        })
    );
    return;
  }

  // Default - Network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || offlineFallback();
        });
      })
  );
});

// Offline fallback page
function offlinePage() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Toppers11 - Offline</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Open Sans', sans-serif;
          background: #f7f7f7;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        .offline-container {
          text-align: center;
          background: white;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          max-width: 500px;
        }
        .offline-icon {
          font-size: 80px;
          margin-bottom: 20px;
        }
        h1 {
          color: #1a1a2e;
          margin-bottom: 10px;
          font-size: 28px;
        }
        p {
          color: #555;
          margin-bottom: 20px;
          font-size: 16px;
          line-height: 1.6;
        }
        .cached-pages {
          background: #f0f0f0;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          text-align: left;
        }
        .cached-pages h2 {
          font-size: 14px;
          color: #1a1a2e;
          margin-bottom: 10px;
        }
        .cached-pages ul {
          list-style: none;
          padding: 0;
        }
        .cached-pages li {
          padding: 8px 0;
          border-bottom: 1px solid #ddd;
          color: #00ab84;
          text-decoration: none;
        }
        .cached-pages li:last-child {
          border-bottom: none;
        }
        .cached-pages a {
          color: #00ab84;
          text-decoration: none;
          transition: color 0.15s;
        }
        .cached-pages a:hover {
          color: #006d5b;
          text-decoration: underline;
        }
        .offline-actions {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .offline-actions button {
          background: #00ab84;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: background 0.15s;
          margin: 10px 5px;
        }
        .offline-actions button:hover {
          background: #006d5b;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h1>You're Offline</h1>
        <p>You don't have an internet connection, but you can still view previously loaded pages.</p>
        
        <div class="cached-pages">
          <h2>📑 Cached Pages</h2>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/about.html">About Us</a></li>
            <li><a href="/contact.html">Contact</a></li>
          </ul>
        </div>
        
        <p style="font-size: 14px; color: #999; margin-top: 20px;">Check your internet connection and refresh the page when back online.</p>
        
        <div class="offline-actions">
          <button onclick="location.reload()">🔄 Refresh Page</button>
          <button onclick="history.back()">⬅ Go Back</button>
        </div>
      </div>
    </body>
    </html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html; charset=UTF-8'
      })
    }
  );
}

// Offline fallback for API/dynamic requests
function offlineFallback() {
  return new Response(
    JSON.stringify({
      error: 'offline',
      message: 'You are offline. Please check your internet connection.'
    }),
    {
      status: 503,
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    }
  );
}

// Message handler for cache clearing
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
});

console.log('Service Worker loaded successfully');
