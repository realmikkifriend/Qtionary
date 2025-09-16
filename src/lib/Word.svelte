<script lang="ts">
    import { onMount } from 'svelte';
    import { userSettings, type SectionSetting } from './stores';
    import { get } from 'svelte/store';
    import { fetchWordData as fetchWordDataFromApi } from '../helper/api';

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
                parseLanguageSections(wordData.text);
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

    function handleHeading(
        node: Element,
        nextNode: Element | null,
        doc: Document,
        sectionSettings: { [key: string]: SectionSetting }
    ): { nextNodeForLoop: Element | null; contentToAdd: string | null } {
        const heading = node.querySelector('h3, h4');
        if (!heading) {
            return { nextNodeForLoop: nextNode, contentToAdd: node.outerHTML };
        }

        const sectionName = heading.id;
        let setting: SectionSetting = 'always-show';
        for (const key in sectionSettings) {
            if (sectionName.startsWith(key)) {
                setting = sectionSettings[key];
                break;
            }
        }

        if (setting === 'hide') {
            node.remove();
            let tempNode = nextNode;
            while (
                tempNode &&
                !tempNode.matches('.mw-heading2, .mw-heading3, .mw-heading4')
            ) {
                const toRemove = tempNode;
                tempNode = tempNode.nextElementSibling;
                toRemove.remove();
            }
            return { nextNodeForLoop: tempNode, contentToAdd: null };
        }

        if (setting.startsWith('collapsible')) {
            const details = doc.createElement('details');
            details.open = setting === 'collapsible-open';
            const summary = doc.createElement('summary');
            summary.innerHTML = heading.outerHTML;
            details.appendChild(summary);

            let tempSibling = nextNode;
            while (
                tempSibling &&
                !tempSibling.matches('.mw-heading2, .mw-heading3, .mw-heading4')
            ) {
                const toMove = tempSibling;
                tempSibling = tempSibling.nextElementSibling;
                details.appendChild(toMove);
            }
            node.replaceWith(details);
            return {
                nextNodeForLoop: tempSibling,
                contentToAdd: details.outerHTML
            };
        }

        return { nextNodeForLoop: nextNode, contentToAdd: node.outerHTML };
    }

    function parseLanguageSections(htmlText: string) {
        const modifiedHtmlText = htmlText.replace(/\btright\b/g, 'float-right');
        const parser = new DOMParser();
        const doc = parser.parseFromString(modifiedHtmlText, 'text/html');
        const extractedLanguages: { name: string; content: string }[] = [];
        let currentLanguage: { name: string; content: string } | null = null;
        const sectionSettings = get(userSettings).sectionSettings;

        const parserOutput = doc.querySelector('.mw-parser-output');
        if (!parserOutput) {
            return;
        }

        const links = doc.querySelectorAll('a');
        links.forEach((link) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/wiki/')) {
                const wordParam = href.replace('/wiki/', '').split('#')[0];
                link.setAttribute('href', 'javascript:void(0)');
                link.setAttribute(
                    'onclick',
                    `
                    event.preventDefault();
                    const url = new window.URL(window.location.href);
                    url.searchParams.set('word', '${wordParam}');
                    window.history.pushState({}, '', url.origin + url.pathname + url.search);
                    window.dispatchEvent(new CustomEvent('urlchange'));
                `
                );
            } else {
                const textNode = doc.createTextNode(link.textContent || '');
                link.parentNode?.replaceChild(textNode, link);
            }
        });

        let node = parserOutput.firstElementChild;
        while (node) {
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
                node = node.nextElementSibling;
                continue;
            }

            if (node.matches('.mw-heading3') || node.matches('.mw-heading4')) {
                const result = handleHeading(
                    node,
                    node.nextElementSibling,
                    doc,
                    sectionSettings
                );
                if (currentLanguage && result.contentToAdd) {
                    currentLanguage.content += result.contentToAdd;
                }
                node = result.nextNodeForLoop;
                continue;
            }

            if (currentLanguage) {
                currentLanguage.content += node.outerHTML;
            }
            node = node.nextElementSibling;
        }

        if (currentLanguage) {
            extractedLanguages.push(currentLanguage);
        }
        languages = extractedLanguages;
        const currentSettings = get(userSettings);
        languages = extractedLanguages.filter((lang) =>
            currentSettings.displayLanguages.includes(lang.name)
        );
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
    }
    .word-content :global(p) {
        margin-bottom: 0.5em;
    }
    .word-content :global(ol),
    .word-content :global(ul) {
        margin-left: 1.5em;
        margin-bottom: 0.5em;
    }
    .word-content :global(li) {
        list-style-type: disc;
    }
    .word-content :global(a) {
        color: var(--primary);
        text-decoration: underline;
    }
</style>
