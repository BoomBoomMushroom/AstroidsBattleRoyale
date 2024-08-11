self.addEventListener('install', (e) => {
    console.log("Service Worker Installed");
    // pre-cache assets here
})

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request)
        })
    )
})