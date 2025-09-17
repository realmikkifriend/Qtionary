import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
// import mkcert from 'vite-plugin-mkcert';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    base: './',
    server: {
        // https: true,
        host: true
    },
    plugins: [
        tailwindcss(),
        svelte(),
        // mkcert({
        //     hosts: ['localhost', '127.0.0.1', '192.168.0.231']
        // }),
        VitePWA({
            registerType: 'autoUpdate',
            devOptions: {
                enabled: true
            },
            manifest: {
                name: 'Qtionary Wiktionary Wrapper',
                short_name: 'Qtionary',
                start_url: './',
                id: '/',
                display: 'standalone',
                orientation: 'portrait',
                // icon source https://www.flaticon.com/free-icon/dictionary_3285819
                icons: [
                    {
                        src: '/dictionary.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: '/dictionary-sm.png',
                        sizes: '192x192',
                        type: 'image/png'
                    }
                ],
                screenshots: [
                    {
                        src: '/screenshot.png',
                        sizes: '1269x682',
                        type: 'image/png'
                    }
                ],
                protocol_handlers: [
                    {
                        protocol: 'web+qtionary',
                        url: '/?url=%s'
                    }
                ],
                share_target: {
                    action: '/?q=%s',
                    method: 'GET',
                    enctype: 'application/x-www-form-urlencoded',
                    params: {
                        text: 'q'
                    }
                }
            }
        })
    ]
});
