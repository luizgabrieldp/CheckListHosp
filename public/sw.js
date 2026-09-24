// CheckList Hospitalar - PWA Service Worker
const CACHE_NAME = "checklist-hosp-v1";

// Recursos fundamentais pré-cacheados na instalação
const PRECACHE_URLS = [
  "./",
  "./manifest.json",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
  "./icons/apple-touch-icon.png",
  "./favicon.ico"
];

// Instalação do Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn("[PWA SW] Aviso no pré-cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições (Network-First com fallback de cache para assets estáticos)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignora requisições que não sejam GET ou que sejam de APIs em tempo real (Firebase / WebSockets / Chrome extensions)
  if (req.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Não intercepta chamadas do Firebase Firestore, Auth ou Google APIs para garantir sincronização em tempo real absoluta
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("identitytoolkit") ||
    url.hostname.includes("securetoken")
  ) {
    return;
  }

  // Estratégia Network-First: busca na rede e atualiza o cache para uso offline
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Se a resposta for válida, salva uma cópia no cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback em caso de falta de conexão: recupera do cache
        const cachedResponse = await caches.match(req);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Se for uma navegação de página e estiver offline, serve a raiz da aplicação
        if (req.mode === "navigate") {
          const rootCached = await caches.match("./");
          if (rootCached) return rootCached;
        }

        return new Response("Sem conexão com a internet. O CheckList Hospitalar tentará reconectar assim que o sinal retornar.", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
  );
});
