<script lang="ts">
    import { onMount } from 'svelte';
    import { userSettings } from '../stores';
    import { get } from 'svelte/store';
    import { toggleLanguage, selectAll } from '../../helper/settingsHelper';

    interface Language {
        code: string;
        bcp47: string;
        name: string;
    }

    let {
        languages = [],
        selectedLanguages = {},
        loading = false,
        error = null,
        updateSelectedLanguages
    } = $props();

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
    let groupOpenStates: Record<string, boolean> = $state({});

    $effect(() => {
        // Initialize group open states when languages change
        const newGroupOpenStates: Record<string, boolean> = {};
        Object.keys(groupedLanguages).forEach((groupName) => {
            newGroupOpenStates[groupName] = false;
        });
        groupOpenStates = newGroupOpenStates;
    });

    function handleToggleLanguage(code: string) {
        toggleLanguage(
            code,
            selectedLanguages,
            languages,
            (newSelectedLanguages) => {
                updateSelectedLanguages(newSelectedLanguages);
            }
        );
    }

    function handleSelectAll(langs: Language[], select: boolean) {
        selectAll(
            langs,
            select,
            selectedLanguages,
            (newSelectedLanguages) => {
                updateSelectedLanguages(newSelectedLanguages);
            },
            languages
        );
    }
</script>

<section>
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
            <details
                class="mb-4 border border-gray-200 p-2 rounded"
                bind:open={groupOpenStates[groupName]}
            >
                <summary
                    class="cursor-pointer flex items-center justify-between"
                >
                    <h5 class="m-0 flex-grow !mb-0">{groupName}</h5>
                    {#if groupOpenStates[groupName]}
                        <button
                            class="ml-2 py-0 px-0.5 !text-xs text-nowrap cursor-pointer"
                            onclick={(event: Event) => {
                                event.preventDefault();
                                handleSelectAll(langs, true);
                            }}>Select All</button
                        >
                        <button
                            class="l-2 py-0 px-0.5 !text-xs text-nowrap cursor-pointer"
                            onclick={(event: Event) => {
                                event.preventDefault();
                                handleSelectAll(langs, false);
                            }}>Unselect All</button
                        >
                    {/if}
                </summary>
                <ul class="list-none p-0 mt-2">
                    {#each langs.sort((a, b) => {
                        const aChecked = selectedLanguages[a.code];
                        const bChecked = selectedLanguages[b.code];
                        if (aChecked && !bChecked) return -1;
                        if (!aChecked && bChecked) return 1;
                        return a.name.localeCompare(b.name);
                    }) as lang (lang.code)}
                        <li class="!list-none mb-0.5">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selectedLanguages[lang.code]}
                                    onchange={() =>
                                        handleToggleLanguage(lang.code)}
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

<style>
    /* Add any specific styles for this component if needed */
</style>
