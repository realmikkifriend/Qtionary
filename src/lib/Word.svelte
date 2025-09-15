<script lang="ts">
    import { onMount } from 'svelte';

    let { word = '' } = $props();

    let wordData: any = $state(null);
    let loading = $state(true);
    let errorMessage = $state('');
    let languages: { name: string; content: string }[] = $state([]);
    let activeTab: string = $state('');

    onMount(() => {
        if (word) {
            fetchWordData(word);
        } else {
            errorMessage = 'No word provided.';
            loading = false;
        }
    });

    async function fetchWordData(wordName: string) {
        loading = true;
        errorMessage = '';
        try {
            const response = await fetch(
                `https://en.wiktionary.org/w/api.php?action=parse&format=json&page=${wordName}&pst=1&disableeditsection=1&disabletoc=1&formatversion=2&origin=*`
            );
            const data = await response.json();

            if (data.parse) {
                wordData = data.parse;
                parseLanguageSections(wordData.text);
            } else if (data.error) {
                errorMessage = `Error: ${data.error.info}`;
            } else {
                errorMessage = 'No data found for this word.';
            }
        } catch (error: any) {
            console.error('Error fetching word data:', error);
            errorMessage = 'Failed to fetch word data. Are you offline?';
        } finally {
            loading = false;
        }
    }

    function parseLanguageSections(htmlText: string) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const extractedLanguages: { name: string; content: string }[] = [];
        let currentLanguage: { name: string; content: string } | null = null;

        const parserOutput = doc.querySelector('.mw-parser-output');
        if (!parserOutput) {
            return;
        }

        const children = Array.from(parserOutput.children);

        for (const node of children) {
            if (node.matches('.mw-heading2')) {
                const h2 = node.querySelector('h2');
                if (h2) {
                    if (currentLanguage) {
                        extractedLanguages.push(currentLanguage);
                    }
                    currentLanguage = {
                        name: h2.textContent || 'Unknown',
                        content: ''
                    };
                }
            } else if (currentLanguage) {
                currentLanguage.content += node.outerHTML;
            }
        }

        if (currentLanguage) {
            extractedLanguages.push(currentLanguage);
        }
        languages = extractedLanguages;
        if (languages.length > 0) {
            activeTab = languages[0].name;
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
                        class="word-content p-4 border-t border-base-300"
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
