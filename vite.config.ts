import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import mkcert from 'vite-plugin-mkcert';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    base: './',
    server: {
        https: true,
        host: true
    },
    plugins: [
        svelte(),
        mkcert({
            hosts: ['localhost', '127.0.0.1', '192.168.0.231']
        }),
        VitePWA({
            registerType: 'autoUpdate',
            devOptions: {
                enabled: true
            },
            manifest: {
                name: 'QDictionary Wiktionary Wrapper',
                short_name: 'QDictionary',
                start_url: './',
                id: '/',
                display: 'standalone',
                orientation: 'portrait',
                // background_color: '#ffffff',
                // theme_color: '#0f172a',
                // icon source https://www.flaticon.com/free-icon/dictionary_3285819
                icons: [
                    {
                        src: '/dictionary.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ],
                screenshots: [
                    {
                        src: '/screenshot.png',
                        sizes: '1269x682',
                        type: 'image/png'
                    }
                ]
            }
        })
    ]
});
