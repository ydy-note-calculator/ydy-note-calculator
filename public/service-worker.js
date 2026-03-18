const CACHE_NAME = 'ydy-pwa-cache-v1';

// Kurulum Aşaması: Beklemeyi atla, direkt kontrolü al
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Aktivasyon Aşaması: Eski verileri temizle ve sistemi devral
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Veri Çekme Aşaması: Uygulama kimliğini doğrulamak için ağ isteklerine yanıt ver
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response("Çevrimdışı Mod.");
    })
  );
});
