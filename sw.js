// sw.js - Service Worker
const CACHE_NAME = 'yds-v1';

// Kurulum
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Aktivasyon
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Arka plan periyodik kontrol (her 2 dakikada bir)
// NOT: Bu sadece tarayıcı açıkken çalışır ama PWA modunda
// uygulama arka plandayken de devam eder
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-leaderboard') {
    event.waitUntil(checkLeaderboardBackground());
  }
});

// Arka plan leaderboard kontrolü
async function checkLeaderboardBackground() {
  const PANTRY_ID = "41e0725c-beab-4cea-9de2-ed320c7b115a";
  const BUCKET_NAME = "YdsLiderlikTablosu";
  const url = `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/${BUCKET_NAME}`;

  try {
    const todayStr = new Date().toLocaleDateString("tr-TR");
    const resp = await fetch(url);
    if (!resp.ok) return;
    const data = await resp.json();
    if (!data.players || data.date !== todayStr) return;

    data.players.sort((a, b) => b.score - a.score);

    // Tüm açık sekmelere mesaj gönder
    const allClients = await clients.matchAll({ type: 'window' });
    allClients.forEach(client => {
      client.postMessage({
        type: 'LEADERBOARD_UPDATE',
        players: data.players
      });
    });
  } catch (e) {
    console.log('Background check failed:', e);
  }
}

// Push notification gelince göster
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🚨 Liderlik Uyarısı!';
  const options = {
    body: data.body || 'Biri seni geçti!',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'leaderboard-alert',
    renotify: true,
    data: { url: self.registration.scope }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime tıklanınca uygulamayı aç
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Zaten açık pencere varsa ona odaklan
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      // Yoksa yeni pencere aç
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
