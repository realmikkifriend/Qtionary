<script lang="ts">
    import { onMount } from 'svelte';

    let { word = '' } = $props();

    let wordData: any = $state(null);
    let loading = $state(true);
    let errorMessage = $state('');

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
            <!-- {#if wordData.langlinks && wordData.langlinks.length > 0}
                <h2>
                    Available in:
                    {#each wordData.langlinks as link}
                        <a href={link.url} target="_blank" rel="noreferrer"
                            >{link.langname}</a
                        >{', '}
                    {/each}
                </h2>
            {/if} -->
        </hgroup>

        <div class="word-content">
            {@html wordData.text}
        </div>

        <!-- {#if wordData.categories && wordData.categories.length > 0}
            <footer>
                <h3>Categories:</h3>
                <ul>
                    {#each wordData.categories as category}
                        <li>{category.category}</li>
                    {/each}
                </ul>
            </footer>
        {/if} -->
    {:else}
        <p>No information available for "{word}".</p>
    {/if}
</article>

<style>
    .word-content :global(h2) {
        font-size: 1.5em;
        margin-top: 1em;
        margin-bottom: 0.5em;
    }
    .word-content :global(h3) {
        font-size: 1.2em;
        margin-top: 0.8em;
        margin-bottom: 0.4em;
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
