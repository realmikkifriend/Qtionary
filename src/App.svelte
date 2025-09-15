<script lang="ts">
    import { onMount } from 'svelte';
    import Search from './lib/Search.svelte';
    import Word from './lib/Word.svelte';
    import Settings from './lib/Settings.svelte';

    let initialQuery = $state('');
    let currentWord = $state('');
    let currentView = $state('home'); // 'home' or 'settings'

    function updateFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        const wordParam = urlParams.get('word');
        const viewParam = urlParams.get('view');

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
                >{currentView === 'settings' ? 'Close settings' : 'Settings'}</a
            >
        </nav>
    </hgroup>

    {#if currentView === 'settings'}
        <Settings />
    {:else if currentWord}
        <Word word={currentWord} />
    {:else}
        <Search {initialQuery} />
    {/if}
</main>
