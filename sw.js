/*
 * Equipment Scanner Service Worker
 */

const CACHE_NAME = "equipment-v4";


const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./app.js",
    "./manifest.webmanifest",
    "./icon.svg"
];


/*
 * Install the new service worker.
 */

self.addEventListener(
    "install",
    function (event) {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(
                    function (cache) {

                        return cache.addAll(
                            FILES_TO_CACHE
                        );

                    }
                )

        );


        /*
         * Activate immediately.
         */

        self.skipWaiting();

    }
);


/*
 * Remove old caches.
 */

self.addEventListener(
    "activate",
    function (event) {

        event.waitUntil(

            caches
                .keys()
                .then(
                    function (cacheNames) {

                        return Promise.all(

                            cacheNames
                                .filter(
                                    function (cacheName) {

                                        return (
                                            cacheName !==
                                            CACHE_NAME
                                        );

                                    }
                                )
                                .map(
                                    function (cacheName) {

                                        return caches.delete(
                                            cacheName
                                        );

                                    }
                                )

                        );

                    }
                )

        );


        self.clients.claim();

    }
);


/*
 * Network first.
 *
 * This allows updated files to be loaded
 * while we are developing the application.
 */

self.addEventListener(
    "fetch",
    function (event) {

        event.respondWith(

            fetch(event.request)

                .then(
                    function (response) {

                        const responseCopy =
                            response.clone();


                        caches
                            .open(CACHE_NAME)
                            .then(
                                function (cache) {

                                    cache.put(
                                        event.request,
                                        responseCopy
                                    );

                                }
                            );


                        return response;

                    }
                )

                .catch(
                    function () {

                        return caches.match(
                            event.request
                        );

                    }
                )

        );

    }
);