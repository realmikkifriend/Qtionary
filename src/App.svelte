<script lang="ts">
    import { debounce } from 'lodash';
    import { onMount } from 'svelte';

    let searchTerm = $state('');
    let searchResults: any[] = $state([]);
    let loading = $state(false);
    let searchInput: HTMLInputElement | undefined = $state();
    let initialLoad = $state(true);

    const searchWiktionary = debounce(async (term: string) => {
        if (term.length < 3) {
            searchResults = [];
            return;
        }

        loading = true;
        searchResults = [];
        try {
            const response = await fetch(
                `https://en.wiktionary.org/w/api.php?action=query&format=json&list=search&formatversion=2&srsearch=${term}&srnamespace=0&srlimit=10&origin=*`
            );
            const data = await response.json();
            searchResults = data.query.search;
        } catch (error) {
            console.error('Error fetching from Wiktionary:', error);
        } finally {
            loading = false;
        }
    }, 500);

    $effect(() => {
        if (!initialLoad) {
            updateUrl(searchTerm);
        }
        searchWiktionary(searchTerm);
    });

    function updateUrl(term: string) {
        const url = new URL(window.location.href);
        if (term) {
            url.searchParams.set('q', term);
        } else {
            url.searchParams.delete('q');
        }
        window.history.replaceState({}, '', url.toString());
    }

    onMount(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            searchTerm = query;
        }

        if (searchInput) {
            searchInput.focus();
        }

        setTimeout(() => {
            initialLoad = false;
        }, 1000);
    });
</script>

<main class="container">
    <hgroup>
        <h1>Qtionary</h1>
        <h2>Wiktionary Search</h2>
    </hgroup>

    <input
        type="search"
        id="search"
        name="search"
        placeholder="search Wiktionary..."
        bind:value={searchTerm}
        bind:this={searchInput}
        aria-label="Search"
    />

    {#if loading}
        <p aria-busy="true">Searching...</p>
    {:else if searchResults.length > 0}
        <article>
            <hgroup>
                <h3>Search Results ({searchResults.length})</h3>
            </hgroup>
            <ul style="list-style: none; padding-left: 0;">
                {#each searchResults as result (result.pageid)}
                    <li>
                        <a
                            href="https://en.wiktionary.org/wiki/{result.title}"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <strong>{result.title}</strong>
                        </a>
                    </li>
                {/each}
            </ul>
        </article>
    {:else if searchTerm.length >= 3 && !loading && !initialLoad}
        <p>No results found for "{searchTerm}".</p>
    {/if}
</main>
