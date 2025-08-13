/// <reference path="./service-worker-static-routing.d.ts" />

/**
 * A "caching" service worker based on the MDN example code.
 *
 * In our case, we don't make any real API calls. Instead, the
 * page adds items into the cache and then requests them.
 *
 * Why do this crazy thing?
 *
 * We were using `URL.createObjectURL()`. But then browser
 * considers the name of that url to be a uuid, or "download.png",
 * or something else unhelpful. Chrome has some ways around this,
 * but they are hacky and not well supported in other browsers.
 *
 * By putting the images in a cache and using "real" urls, which
 * we make "real" by faking it with a service worker, we give
 * the images proper names, and make right click->Save Image
 * and drag and drop work correctly.
 */

const CACHE_VERSION = 1;
const CURRENT_CACHES = {
    img: `img-library-cache-v${CACHE_VERSION}`,
};

function isServiceWorker(s: object): s is ServiceWorkerGlobalScope {
    if ('onfetch' in s) return true;
    return false;
}

if (!isServiceWorker(self)) {
    throw new Error('This file should only be run as a service worker!');
}

const swSelf: ServiceWorkerGlobalScope = self;

self.addEventListener('activate' as const, (event: ExtendableEvent) => {
    // console.log('service-worker activated!');
    event.waitUntil(swSelf.clients.claim());
});

const cachedUrlPrefix = '/img-cache/';
swSelf.addEventListener('install', (event) => {
    if (isInstallEvent(event)) {
        event.addRoutes({
            condition: {
                urlPattern: `${cachedUrlPrefix}*`,
            },
            source: {
                cacheName: CURRENT_CACHES.img,
            },
        });
    }
});

self.addEventListener('fetch', (event: FetchEvent) => {
    if (event.request.method !== 'GET') return;
    const path = new URL(event.request.url).pathname;
    // console.log('request is', event.request, { path }, 'test');

    if (!path.startsWith(cachedUrlPrefix)) return;
    // console.log('Handling fetch event for', event.request.url);

    event.respondWith(
        caches.open(CURRENT_CACHES.img).then(async (cache) => {
            const response = await cache.match(event.request);
            if (response) {
                // If there is an entry in the cache for event.request,
                // then response will be defined and we can just return it.
                // Note that in this example, only font resources are cached.
                // console.log('Found response in cache:', response);

                return response;
            }

            // Otherwise, if there is no entry in the cache for event.request,
            // since this is our own special url and the objects don't really exist,
            // throw an error
            throw new Error('cache only url not found in cache!');
        }),
    );
});

function isInstallEvent(event: ExtendableEvent): event is InstallEvent {
    return 'addRoutes' in event;
}