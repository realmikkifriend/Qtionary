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
    let temporaryDisplayLanguages: string[] = $state([]);
    let languageDropdown: HTMLDetailsElement | null = $state(null);

    let orderedLanguages: () => { name: string; content: string }[] = $derived(
        () => {
            const settings = get(userSettings);
            const displayOrder = [
                ...new Set([
                    ...settings.displayLanguages,
                    ...temporaryDisplayLanguages
                ])
            ];

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

    let otherLanguages: () => { name: string; content: string }[] = $derived(
        () => {
            const settings = get(userSettings);
            const combinedDisplayOrder = [
                ...new Set([
                    ...settings.displayLanguages,
                    ...temporaryDisplayLanguages
                ])
            ];
            const filteredOthers = languages.filter(
                (lang) => !combinedDisplayOrder.includes(lang.name)
            );
            return filteredOthers;
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
        temporaryDisplayLanguages = [];
        try {
            const data = await fetchWordDataFromApi(wordName);

            if (data) {
                wordData = data;
                const parsed = parseLanguageSections(wordData.text);
                languages = parsed.languages;
                if (orderedLanguages().length > 0) {
                    activeTab = orderedLanguages()[0].name;
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

    function addTemporaryLanguage(lang: { name: string; content: string }) {
        if (!temporaryDisplayLanguages.includes(lang.name)) {
            temporaryDisplayLanguages = [
                ...temporaryDisplayLanguages,
                lang.name
            ];
        }
        activeTab = lang.name;
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

        <div class="flex flex-row items-center gap-0.5">
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
            {/if}
            {#if otherLanguages().length > 0}
                <div class="relative dropdown-end h-10 -left-2 -top-1 ml-1">
                    <details
                        aria-label="Select"
                        name="select"
                        class="dropdown p-0 max-w-32"
                        bind:this={languageDropdown}
                    >
                        <summary
                            class="!border-0 w-10 !mx-1 !my-2 !h-8 !p-1"
                            class:!bg-sky-500={orderedLanguages().length === 0}
                            class:!bg-transparent={orderedLanguages().length >
                                0}
                        >
                            <Icon
                                src={GlobeAlt}
                                class="stroke-white ml-0.5"
                                size="20"
                            />
                        </summary>
                        <div
                            class="dropdown-options-container absolute z-10 bg-[var(--pico-form-element-background-color)] py-1 w-fit text-nowrap"
                        >
                            {#each otherLanguages() as lang}
                                <li
                                    class="list-none hover:cursor-pointer hover:bg-[var(--pico-primary-background)] px-3"
                                >
                                    <!-- svelte-ignore a11y_missing_attribute -->
                                    <a
                                        onmousedown={() => {
                                            if (languageDropdown) {
                                                languageDropdown.open = false;
                                            }
                                            addTemporaryLanguage(lang);
                                        }}
                                        role="option"
                                        aria-selected="false"
                                        tabindex="0"
                                        class="w-full inline-block"
                                    >
                                        {lang.name}
                                    </a>
                                </li>
                            {/each}
                        </div>
                    </details>
                </div>

                {#if orderedLanguages().length === 0}
                    <span class="opacity-50 text-sm -left-2 relative">
                        This word is not in your preferred languages...
                    </span>
                {/if}
            {/if}
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
    {:else}
        <p>No information available for "{word}".</p>
    {/if}
</article>
