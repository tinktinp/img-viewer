import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
    html: {
        title: 'img viewer',
    },
    plugins: [pluginReact()],
    output: {
        distPath: {
            jsAsync: '.', // this is for the service worker
        },
        assetPrefix: '/img-viewer/',
    },
    server: {
        htmlFallback: false, // we don't use any routing, so let's 404 instead
    },
});
