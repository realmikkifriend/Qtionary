<script lang="ts">
    import { onMount } from 'svelte';
    import Search from './lib/Search.svelte';
    import Word from './lib/Word.svelte';

    let initialQuery = $state('');
    let currentWord = $state('');

    function updateFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        const wordParam = urlParams.get('word');

        if (wordParam) {
            currentWord = wordParam;
            initialQuery = '';
        } else if (query) {
            initialQuery = query;
            currentWord = '';
        } else {
            initialQuery = '';
            currentWord = '';
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
    </hgroup>

    {#if currentWord}
        <Word word={currentWord} />
    {:else}
        <Search {initialQuery} />
    {/if}
</main>
