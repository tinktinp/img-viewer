import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
    html: {
        title: 'img viewer',
    },
    plugins: [
        pluginReact({
            reactRefreshOptions: {
                exclude: [/service-worker/, /[\\/]node_modules[\\/]/],
            },
        }),
    ],
    output: {
        distPath: {
            jsAsync: '.', // this is for the service worker
        },
        assetPrefix: '/img-viewer/',
        copy: [
            // {
            //     from: 'node_modules/@tinktinp/dcs-decoder/src/build/DCSDecoder.wasm.map',
            //     to: 'static/wasm/',
            // },
        ],
    },
    server: {
        htmlFallback: false, // we don't use any routing, so let's 404 instead
    },
});
