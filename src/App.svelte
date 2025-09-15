<script lang="ts">
    import { onMount } from 'svelte';
    import Search from './lib/Search.svelte';

    let initialQuery = $state('');

    onMount(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            initialQuery = query;
        }
    });
</script>

<main class="container">
    <hgroup class="flex items-baseline">
        <h1>Qtionary</h1>
        <h2>Wiktionary Search</h2>
    </hgroup>

    <Search {initialQuery} />
</main>
