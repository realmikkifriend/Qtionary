<script lang="ts">
    import { onMount } from 'svelte';
    import { userSettings, type SectionSetting } from './stores';
    import { get } from 'svelte/store';
    import { fetchWordData as fetchWordDataFromApi } from '../helper/api';
    import { parseLanguageSections } from '../helper/parser';

    let { word: initialWord = '' } = $props();

    let word = $state(initialWord);
    let wordData: any = $state(null);
    let loading = $state(true);
    let errorMessage = $state('');
    let languages: { name: string; content: string }[] = $state([]);
    let activeTab: string = $state('');

    onMount(() => {
        const handleUrlChange = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const newWord = urlParams.get('word');
            if (newWord && newWord !== word) {
                word = newWord;
                fetchWordData(word);
            } else if (!newWord && word) {
                word = '';
                wordData = null;
                languages = [];
                activeTab = '';
                errorMessage = 'No word provided.';
                loading = false;
            }
        };

        window.addEventListener('urlchange', handleUrlChange);

        if (word) {
            fetchWordData(word);
        } else {
            errorMessage = 'No word provided.';
            loading = false;
        }

        return () => {
            window.removeEventListener('urlchange', handleUrlChange);
        };
    });

    async function fetchWordData(wordName: string) {
        loading = true;
        errorMessage = '';
        try {
            const data = await fetchWordDataFromApi(wordName);

            if (data) {
                wordData = data;
                const parsed = parseLanguageSections(wordData.text);
                languages = parsed.languages;
                activeTab = parsed.activeTab;
            } else {
                errorMessage = 'No data found for this word.';
            }
        } catch (error: any) {
            console.error('Error fetching word data:', error);
            errorMessage =
                error.message || 'Failed to fetch word data. Are you offline?';
        } finally {
            loading = false;
        }
    }

    function goBack() {
        const url = new URL(window.location.href);
        url.searchParams.delete('word');
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new CustomEvent('urlchange'));
    }
</script>

<article>
    <button class="absolute right-3" onclick={goBack}>&larr; Search</button>
    {#if loading}
        <p class="p-3" aria-busy="true">Loading "{word}"...</p>
    {:else if errorMessage}
        <p class="!text-red-600">{errorMessage}</p>
    {:else if wordData}
        <hgroup>
            <h1>{wordData.title}</h1>
        </hgroup>

        {#if languages.length > 0}
            <div role="tablist" class="tabs flex gap-0.5">
                {#each languages as lang}
                    <button
                        role="tab"
                        aria-selected={activeTab === lang.name}
                        class="tab"
                        class:tab-active={activeTab === lang.name}
                        onclick={() => (activeTab = lang.name)}
                    >
                        {lang.name}
                    </button>
                {/each}
            </div>
            {#each languages as lang}
                {#if activeTab === lang.name}
                    <div
                        role="tabpanel"
                        class="word-content pt-4 border-t border-base-300"
                    >
                        {@html lang.content}
                    </div>
                {/if}
            {/each}
        {/if}
    {:else}
        <p>No information available for "{word}".</p>
    {/if}
</article>

<style>
    button[role='tab'] {
        border-radius: 0.5rem 0.5rem 0 0;
        background-color: var(--pico-muted-color);
    }
    .tab-active {
        background-color: #535bf2 !important;
    }
    .word-content :global(h3) {
        font-size: 1.8em;
        border-bottom: 1px solid var(--pico-muted-color);
    }
    .word-content :global(p) {
        margin-bottom: 0.5em;
    }
    .word-content :global(ol),
    .word-content :global(ul) {
        margin-left: 1.5em;
        margin-bottom: 0.5em;
    }
    .word-content :global(ol li) {
        list-style-type: decimal;
    }
    .word-content :global(li) {
        list-style-type: disc;
    }
    .word-content :global(a) {
        color: var(--primary);
        text-decoration: underline;
    }
    .word-content :global(.headword-table) {
        float: right;
        margin-bottom: 1em;
        border-collapse: collapse;
        font-size: 0.8em;
        max-width: 20rem;
    }
    .word-content :global(.headword-table th),
    .word-content :global(.headword-table td) {
        border: 1px solid var(--pico-muted-border-color);
        padding: 0.3em 0.6em;
    }
    .word-content :global(.headword-table th) {
        font-weight: bolder;
        background-color: var(--pico-muted-background-color);
    }
    .word-content :global(.word-sense-content) {
        position: relative;
    }
</style>
