<script lang="ts">
    import { Icon, Cog6Tooth, XMark } from 'svelte-hero-icons';
    import Search from './lib/Search.svelte';
    import Word from './lib/Word.svelte';
    import Settings from './lib/Settings.svelte';

    let initialQuery = $state('');
    let currentWord = $state('');
    let currentView = $state('home'); // 'home' or 'settings'

    function updateFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const protocolUrl = urlParams.get('url');
        let effectiveQueryParams = urlParams;

        if (protocolUrl) {
            try {
                const decodedUrl = decodeURIComponent(protocolUrl);
                const searchPart = decodedUrl.split('://')[1];
                if (searchPart) {
                    effectiveQueryParams = new URLSearchParams(
                        searchPart.split('?')[1]
                    );
                }
            } catch (e) {
                console.error('Error decoding protocol URL:', e);
            }
        }

        const query = effectiveQueryParams.get('q');
        const wordParam = effectiveQueryParams.get('word');
        const viewParam = effectiveQueryParams.get('view');

        if (viewParam === 'settings') {
            currentView = 'settings';
        } else if (wordParam) {
            currentWord = wordParam;
            initialQuery = '';
            currentView = 'home';
        } else if (query) {
            initialQuery = query;
            currentWord = '';
            currentView = 'home';
        } else {
            initialQuery = '';
            currentWord = '';
            currentView = 'home';
        }
    }

    $effect(() => {
        updateFromUrl();
        window.addEventListener('urlchange', updateFromUrl);
        window.addEventListener('popstate', updateFromUrl);
        return () => {
            window.removeEventListener('urlchange', updateFromUrl);
            window.removeEventListener('popstate', updateFromUrl);
        };
    });
</script>

<main class="container">
    <hgroup class="flex items-baseline">
        <h1>Qtionary</h1>
        <h2>Wiktionary Search</h2>
        <nav class="absolute right-3">
            <a
                href={currentView === 'settings' ? '/' : '?view=settings'}
                onclick={(e) => {
                    e.preventDefault();
                    const newView =
                        currentView === 'settings' ? 'home' : 'settings';
                    window.history.pushState(
                        {},
                        '',
                        newView === 'home' ? '/' : '?view=settings'
                    );
                    window.dispatchEvent(new Event('urlchange'));
                }}
            >
                {#if currentView === 'settings'}
                    <Icon src={XMark} size="24" class="stroke-red-500" />
                {:else}
                    <Icon src={Cog6Tooth} size="24" class="stroke-white" />
                {/if}
            </a>
        </nav>
    </hgroup>

    {#if currentView === 'settings'}
        <Settings />
    {:else if currentWord}
        <Word word={currentWord} />
    {:else}
        <Search {initialQuery} />
    {/if}

    <footer class="relative opacity-50 text-xs bottom-0">
        This is a hobby project and not affiliated with Wiktionary. View the <a
            href="https://github.com/realmikkifriend/Qtionary">source code</a
        >.
    </footer>
</main>
