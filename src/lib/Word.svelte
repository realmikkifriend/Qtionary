<script lang="ts">
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { Icon, MagnifyingGlass, Link, GlobeAlt } from 'svelte-hero-icons';
    import { userSettings } from './stores';
    import { fetchWordData as fetchWordDataFromApi } from '../helper/api';
    import { parseLanguageSections } from '../helper/parser';
    import './styles/word.css';

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
