<script lang="ts">
    import { onMount } from 'svelte';
    import {
        searchTerm,
        searchResults,
        totalHits,
        loading,
        errorMessage,
        lastSearchedTerm,
        searchWiktionary
    } from '../helper/search';

    let { initialQuery }: { initialQuery?: string } = $props();

    let searchInput: HTMLInputElement | undefined = $state();

    $effect(() => {
        if ($searchTerm !== $lastSearchedTerm) {
            updateUrl($searchTerm);
            searchWiktionary($searchTerm);
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
        let currentSearchTerm = '';
        searchTerm.subscribe((value) => (currentSearchTerm = value))();
        if (initialQuery && currentSearchTerm !== initialQuery) {
            loading.set(true);
            searchTerm.set(initialQuery);
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
    {#if $searchResults.length > 0}
        <button
            class="absolute right-4 !bg-transparent top-2 !p-0 !border-0 !shadow-none"
            onclick={() => searchTerm.set('')}
        >
            {$totalHits > 10 ? '10+' : $searchResults.length} results<span
                class="!text-red-600 ml-2">X</span
            >
        </button>
    {/if}
    <input
        type="search"
        id="search"
        name="search"
        placeholder="search Wiktionary..."
        bind:value={$searchTerm}
        bind:this={searchInput}
        aria-label="Search"
        onkeydown={(e) => {
            if (e.key === 'Enter' && $searchResults.length > 0) {
                handleResultClick($searchResults[0].title);
            }
        }}
    />
</div>

<article>
    {#if $loading}
        <p aria-busy="true">Searching...</p>
    {:else if $searchResults.length > 0}
        <ul class="px-6">
            {#each $searchResults as result (result.pageid)}
                <li class="!list-none">
                    <option onclick={() => handleResultClick(result.title)}>
                        {result.title}
                    </option>
                </li>
            {/each}
        </ul>
    {:else if $errorMessage}
        <p class="!text-red-600">{$errorMessage}</p>
    {:else if $searchTerm.length >= 3 && !$loading}
        <p class="!text-orange-300">
            No results found for <strong>{$searchTerm}</strong>...
        </p>
    {/if}
</article>
