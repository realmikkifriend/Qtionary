<script lang="ts">
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { Icon, MagnifyingGlass, Link, GlobeAlt } from 'svelte-hero-icons';
    import { userSettings } from './stores';
    import { fetchWordData as fetchWordDataFromApi } from '../helper/api';
    import { parseLanguageSections } from '../helper/parser';

    let { word: initialWord = '' } = $props();

    let word = $state(initialWord);
    let wordData: any = $state(null);
    let loading = $state(true);
    let errorMessage = $state('');
    let languages: { name: string; content: string }[] = $state([]);
    let activeTab: string = $state('');

    let orderedLanguages: () => { name: string; content: string }[] = $derived(
        () => {
            const settings = get(userSettings);
            const displayOrder = settings.displayLanguages;

            const languageMap = new Map(
                languages.map((lang) => [lang.name, lang])
            );

            const filteredAndOrdered = displayOrder
                .map((langName) => languageMap.get(langName))
                .filter(
                    (lang): lang is { name: string; content: string } =>
                        lang !== undefined
                );

            return filteredAndOrdered;
        }
    );

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
                if (orderedLanguages().length > 0) {
                    const initialActiveTab = parsed.activeTab;
                    if (orderedLanguages().length > 0) {
                        activeTab = orderedLanguages()[0].name;
                    }
                } else {
                    activeTab = '';
                }
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
    <button class="absolute right-3 !p-3" onclick={goBack}>
        <Icon src={MagnifyingGlass} size="20" />
    </button>
    {#if loading}
        <p class="p-3" aria-busy="true">Loading "{word}"...</p>
    {:else if errorMessage}
        <p class="!text-red-600">{errorMessage}</p>
    {:else if wordData}
        <div class="flex flex-row gap-1 items-center">
            <hgroup class="h-8">
                <h1>{wordData.title}</h1>
            </hgroup>
            <a href="https://qtionary.netlify.app/?word={word}">
                <Icon src={Link} size="20" />
            </a>
            <a
                href="https://en.wiktionary.org/wiki/{word}#{activeTab}"
                class="relative"
            >
                <Icon src={Link} size="20" />
                <Icon
                    src={GlobeAlt}
                    class="absolute bottom-0 right-0"
                    size="10"
                    solid
                    micro
                />
            </a>
        </div>

        {#if orderedLanguages().length > 0}
            <div role="tablist" class="tabs flex gap-0.5">
                {#each orderedLanguages() as lang}
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
            {#each orderedLanguages() as lang}
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
        padding: 0.5rem 0.75rem;
    }
    .tab-active {
        background-color: #535bf2 !important;
    }
    .word-content :global(h3),
    .word-content :global(.section-3 > summary) {
        font-size: 1.8em;
        border-bottom: 1px solid var(--pico-muted-color);
        width: 100%;
        font-weight: bold !important;
    }
    .word-content :global(.section-3 > summary) {
        height: 2rem;
    }
    .word-content :global(.section-4 > summary) {
        width: fit-content;
        background-color: var(--pico-primary-background);
        border-radius: 2rem;
        padding: 0.25rem 0.5rem;
    }
    .word-content :global(h3),
    .word-content :global(.section-3 > summary),
    .word-content :global(.section-4 > summary) {
        color: var(--pico-h3-color) !important;
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

    .word-content :global(.usage-tags) {
        display: flex;
        gap: 0.25rem;
        align-items: center;
    }
    .word-content :global(.usage-tag) {
        background-color: var(--color-purple-500);
        border-radius: 2rem;
        padding: 0 0.3rem;
        font-weight: bolder;
        font-size: 0.65em;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        max-height: 1rem;
    }

    .word-content :global(.usage-tag[data-content='archaic']) {
        background-color: var(--color-red-600);
    }

    .word-content :global(details[id^='Translations-']),
    .word-content :global(div[id^='Translations-']) {
        padding: 0.5rem;
        margin-bottom: 1rem;
        border-radius: 0.25rem;
    }
    .word-content :global(details[id^='Translations-']) {
        background-color: var(--pico-progress-background-color);
    }
    .word-content :global(div[id^='Translations-']) {
        background-color: var(--pico-card-sectioning-background-color);
    }
    .word-content :global(.summary-content-container) {
        flex-direction: row;
        display: flex;
        gap: 0.25rem;
    }
    .word-content :global(details[id^='Translations-'] summary) {
        flex-direction: column;
        align-items: start;
    }
    .word-content :global(details[id^='Translations-'] summary::after) {
        position: absolute;
        right: 1.25rem;
    }
    .word-content :global(details[id^='Translations-'] table) {
        margin-bottom: 0;
    }
    .word-content :global(details[id^='Translations-'] td) {
        background-color: transparent;
    }

    .word-content
        :global(details[id^='Translations-'] * .displayed-translation) {
        margin-top: 1rem;
    }

    .word-content :global(.thumbinner) {
        display: flex;
        flex-direction: column;
        background-color: var(--pico-card-background-color);
        max-width: 10rem !important;
        padding: 0.5rem;
        gap: 0.75rem;
    }
    .word-content :global(.tsingle) {
        max-width: 9rem !important;
        font-size: 0.75em;
    }

    .word-content :global(ol * ul),
    .word-content :global(ol * dl),
    .word-content :global(dd) {
        display: none;
    }

    .word-content :global(.NavContent) {
        font-size: 0.8em;
    }
    .word-content :global(.NavContent * td),
    .word-content :global(.NavContent * th) {
        max-width: 18rem;
        width: fit-content;
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
    .word-content :global(dl) {
        display: block;
        width: 100%;
    }
</style>
