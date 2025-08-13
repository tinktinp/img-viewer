export {};

declare global {
    interface InstallEvent extends ExtendableEvent {
        /**
         * Chrome’s experimental Service Worker Static Routing API.
         * Defines one or more static routing rules for handling requests.
         */
        addRoutes(
            routerRules: ServiceWorkerStaticRoute | ServiceWorkerStaticRoute[],
        ): Promise<void>;
    }

    interface ServiceWorkerStaticRoute {
        condition?: {
            urlPattern?: URLPatternConstructorInput;
            requestMethod?: string;
            requestMode?: string;
            requestDestination?: string;
            runningStatus?: 'running' | 'not-running';
            not?: Omit<ServiceWorkerStaticRoute['condition'], 'not' | 'or'>;
            or?: Array<
                Omit<ServiceWorkerStaticRoute['condition'], 'not' | 'or'>
            >;
        };
        source:
            | 'cache'
            | 'network'
            | 'fetch-event'
            | 'race-network-and-fetch-handler'
            | { cacheName: string };
    }

    interface ServiceWorkerGlobalScopeEventMap
        extends WorkerGlobalScopeEventMap {
        install: InstallEvent;
    }
}
