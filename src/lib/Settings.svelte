<script lang="ts">
    import { onMount } from 'svelte';

    interface Language {
        code: string;
        bcp47: string;
        name: string;
    }

    let languages: Language[] = $state([]);
    let groupedLanguages: Record<string, Language[]> = $derived(
        languages.length > 0
            ? languages.reduce(
                  (acc, lang) => {
                      const codeLength = lang.code.length;
                      let groupKey: string;
                      if (codeLength === 2) {
                          groupKey = 'Main Languages';
                      } else if (codeLength === 3) {
                          groupKey = 'Dialects';
                      } else {
                          groupKey = 'Other';
                      }

                      if (!acc[groupKey]) {
                          acc[groupKey] = [];
                      }
                      acc[groupKey].push(lang);
                      return acc;
                  },
                  {} as Record<string, Language[]>
              )
            : {}
    );
    let selectedLanguages: Record<string, boolean> = $state({});
    let loading = $state(true);
    let error: string | null = $state(null);

    onMount(async () => {
        try {
            const response = await fetch(
                'https://en.wiktionary.org/w/api.php?action=query&format=json&meta=siteinfo&formatversion=2&siprop=languages&siinlanguagecode=English&origin=*'
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            languages = data.query.languages;
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    });

    function toggleLanguage(code: string) {
        selectedLanguages = {
            ...selectedLanguages,
            [code]: !selectedLanguages[code]
        };
    }

    function selectAll(langs: Language[], select: boolean) {
        const newSelection = { ...selectedLanguages };
        for (const lang of langs) {
            newSelection[lang.code] = select;
        }
        selectedLanguages = newSelection;
    }
</script>

<article>
    <section>
        <h1>Settings</h1>

        <h2>Displayed Languages</h2>
        {#if loading}
            <p>Loading languages...</p>
        {:else if error}
            <p class="error">Error: {error}</p>
        {:else}
            {#each Object.entries(groupedLanguages).sort(([a], [b]) => {
                const order = ['Main Languages', 'Dialects', 'Other'];
                return order.indexOf(a) - order.indexOf(b);
            }) as [groupName, langs]}
                <details class="language-group">
                    <summary>
                        <h3>{groupName}</h3>
                        <button
                            onclick={(event) => {
                                event.preventDefault();
                                selectAll(langs, true);
                            }}>Select All</button
                        >
                        <button
                            onclick={(event) => {
                                event.preventDefault();
                                selectAll(langs, false);
                            }}>Unselect All</button
                        >
                    </summary>
                    <ul>
                        {#each langs.sort( (a, b) => a.name.localeCompare(b.name) ) as lang}
                            <li class="!list-none">
                                <label>
                                    <input
                                        type="checkbox"
                                        bind:checked={
                                            selectedLanguages[lang.code]
                                        }
                                        onchange={() =>
                                            toggleLanguage(lang.code)}
                                    />
                                    {lang.name} ({lang.code})
                                </label>
                            </li>
                        {/each}
                    </ul>
                </details>
            {/each}
        {/if}
    </section>
</article>

<style>
    .language-group {
        margin-bottom: 1em;
        border: 1px solid #eee;
        padding: 0.5em;
        border-radius: 4px;
    }

    .language-group summary {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .language-group summary h3 {
        margin: 0;
        flex-grow: 1;
    }

    .language-group ul {
        list-style: none;
        padding: 0;
        margin-top: 0.5em;
    }

    .language-group li {
        margin-bottom: 0.2em;
    }

    .language-group button {
        margin-left: 0.5em;
        padding: 0.2em 0.5em;
        cursor: pointer;
    }

    .language-group:not([open]) summary button {
        display: none;
    }
</style>
