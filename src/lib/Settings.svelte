<script lang="ts">
    import { onMount } from 'svelte';
    import { userSettings } from './stores';
    import { get } from 'svelte/store';

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
    let selectedLanguages: Record<string, boolean> = $state(
        Object.fromEntries(
            get(userSettings).displayLanguages.map((langName: string) => [
                langName,
                true
            ])
        )
    );
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

            const currentDisplayLanguages = get(userSettings).displayLanguages;
            selectedLanguages = Object.fromEntries(
                languages.map((lang) => [
                    lang.code,
                    currentDisplayLanguages.includes(lang.name)
                ])
            );
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
        userSettings.update((settings: { displayLanguages: string[] }) => {
            const languageName = languages.find((l) => l.code === code)?.name;
            if (languageName) {
                if (selectedLanguages[code]) {
                    settings.displayLanguages.push(languageName);
                } else {
                    settings.displayLanguages =
                        settings.displayLanguages.filter(
                            (name) => name !== languageName
                        );
                }
            }
            return settings;
        });
    }

    function selectAll(langs: Language[], select: boolean) {
        const newSelection = { ...selectedLanguages };
        const updatedDisplayLanguages: string[] = [];
        for (const lang of langs) {
            newSelection[lang.code] = select;
            if (select) {
                updatedDisplayLanguages.push(lang.name);
            }
        }
        selectedLanguages = newSelection;
        userSettings.update((settings: { displayLanguages: string[] }) => {
            settings.displayLanguages = select
                ? [
                      ...new Set([
                          ...settings.displayLanguages,
                          ...updatedDisplayLanguages
                      ])
                  ]
                : settings.displayLanguages.filter(
                      (name) => !langs.some((l) => l.name === name)
                  );
            return settings;
        });
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
                        {#each langs.sort((a, b) => {
                            const aChecked = selectedLanguages[a.code];
                            const bChecked = selectedLanguages[b.code];
                            if (aChecked && !bChecked) return -1;
                            if (!aChecked && bChecked) return 1;
                            return a.name.localeCompare(b.name);
                        }) as lang (lang.code)}
                            <li class="!list-none">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={selectedLanguages[lang.code]}
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
