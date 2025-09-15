<script lang="ts">
    import { onMount } from 'svelte';
    import { userSettings, type SectionSetting } from './stores';
    import { get } from 'svelte/store';

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
            const nextNode = node.nextElementSibling;

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
            } else if (node.matches('.mw-heading3')) {
                const h3 = node.querySelector('h3');
                if (h3) {
                    const sectionName = h3.id;
                    let setting: SectionSetting = 'always-show';
                    for (const key in sectionSettings) {
                        if (sectionName.startsWith(key)) {
                            setting = sectionSettings[key];
                            break;
                        }
                    }
                    console.log(sectionName);
                    console.log(sectionSettings);
                    console.log(setting);

                    if (setting === 'hide') {
                        node.remove();
                        let tempNode = nextNode;
                        while (
                            tempNode &&
                            !tempNode.matches('.mw-heading2') &&
                            !tempNode.matches('.mw-heading3')
                        ) {
                            const toRemove = tempNode;
                            tempNode = tempNode.nextElementSibling;
                            toRemove.remove();
                        }
                        node = tempNode;
                        continue;
                    }

                    if (setting.startsWith('collapsible')) {
                        const details = doc.createElement('details');
                        details.open = setting === 'collapsible-open';
                        const summary = doc.createElement('summary');
                        summary.innerHTML = h3.outerHTML;
                        details.appendChild(summary);

                        let tempSibling = nextNode;
                        while (
                            tempSibling &&
                            !tempSibling.matches('.mw-heading2') &&
                            !tempSibling.matches('.mw-heading3')
                        ) {
                            const toMove = tempSibling;
                            tempSibling = tempSibling.nextElementSibling;
                            details.appendChild(toMove);
                        }
                        node.replaceWith(details);
                        node = details;
                        if (currentLanguage) {
                            currentLanguage.content += node.outerHTML;
                        }
                        node = tempSibling;
                        continue;
                    }
                }
                if (currentLanguage) {
                    currentLanguage.content += node.outerHTML;
                }
            } else if (currentLanguage) {
                currentLanguage.content += node.outerHTML;
            }
            node = nextNode;
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
