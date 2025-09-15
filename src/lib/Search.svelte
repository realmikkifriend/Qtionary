<script lang="ts">
    import { debounce } from 'lodash';
    import { onMount } from 'svelte';

    let { initialQuery = '' } = $props();

    let searchTerm = $state('');
    let searchResults: any[] = $state([]);
    let totalHits = $state(0);
    let loading = $state(false);
    let errorMessage = $state('');
    let searchInput: HTMLInputElement | undefined = $state();
    let lastSearchedTerm = $state('');

    const searchWiktionary = debounce(async (term: string) => {
        if (term.length < 3) {
            searchResults = [];
            lastSearchedTerm = term;
            return;
        }

        if (term === lastSearchedTerm) {
            return;
        }

        loading = true;
        searchResults = [];
        try {
            const response = await fetch(
                `https://en.wiktionary.org/w/api.php?` +
                    `action=query&format=json&list=search&` +
                    `formatversion=2&srsearch=${term}&srnamespace=0&srlimit=10&origin=*`
            );
            const data = await response.json();
            searchResults = data.query.search;
            totalHits = data.query.searchinfo.totalhits;
            lastSearchedTerm = term;
            errorMessage = '';
        } catch (error: any) {
            console.error('Error fetching from Wiktionary:', error);
            errorMessage = 'Failed to fetch results. Are you offline?';
        } finally {
            loading = false;
        }
    }, 500);

    $effect(() => {
        if (searchTerm !== lastSearchedTerm) {
            updateUrl(searchTerm);
            searchWiktionary(searchTerm);
        }
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
        if (searchInput) {
            searchInput.focus();
        }
    });

    $effect(() => {
        if (initialQuery && searchTerm !== initialQuery) {
            loading = true;
            searchTerm = initialQuery;
            searchWiktionary(initialQuery);
            initialQuery = undefined;
        }
    });

    function handleResultClick(title: string) {
        const url = new URL(window.location.href);
        url.searchParams.set('word', title);
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new CustomEvent('urlchange'));
    }
</script>

<div class="relative flex items-center">
    {#if searchResults.length > 0}
        <h6 class="absolute right-4">
            {totalHits > 10 ? '10+' : searchResults.length} results
        </h6>
    {/if}
    <input
        type="search"
        id="search"
        name="search"
        placeholder="search Wiktionary..."
        bind:value={searchTerm}
        bind:this={searchInput}
        aria-label="Search"
        onkeydown={(e) => {
            if (e.key === 'Enter' && searchResults.length > 0) {
                handleResultClick(searchResults[0].title);
            }
        }}
    />
</div>

<article>
    {#if loading}
        <p aria-busy="true">Searching...</p>
    {:else if searchResults.length > 0}
        <ul class="px-6">
            {#each searchResults as result (result.pageid)}
                <li class="!list-none">
                    <option onclick={() => handleResultClick(result.title)}>
                        {result.title}
                    </option>
                </li>
            {/each}
        </ul>
    {:else if errorMessage}
        <p class="!text-red-600">{errorMessage}</p>
    {:else if searchTerm.length >= 3 && !loading}
        <p class="!text-orange-300">
            No results found for <strong>{searchTerm}</strong>...
        </p>
    {/if}
</article>
