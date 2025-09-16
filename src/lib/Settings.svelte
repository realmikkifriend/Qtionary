<script lang="ts">
    import { onMount } from 'svelte';
    import { userSettings, resetAllStores } from './stores';
    import { get } from 'svelte/store';
    import type { SectionSetting } from './stores';

    interface Language {
        code: string;
        bcp47: string;
        name: string;
    }

    const sectionOptions = [
        { value: 'always-show', label: 'Always show' },
        { value: 'collapsible-open', label: 'Collapsible (open)' },
        { value: 'collapsible-closed', label: 'Collapsible (closed)' },
        { value: 'hide', label: 'Hide' }
    ];

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
    let groupOpenStates: Record<string, boolean> = $state({});

    onMount(async () => {
        languages.forEach((lang) => (groupOpenStates[lang.code] = false));
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
        userSettings.update((settings) => {
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
        userSettings.update((settings) => {
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

    function updateSectionSetting(
        sectionName: string,
        setting: SectionSetting
    ) {
        userSettings.update((settings) => {
            settings.sectionSettings = {
                ...settings.sectionSettings,
                [sectionName]: setting
            };
            return settings;
        });
    }

    let orderedDisplayLanguages: Language[] = $state([]);
    let draggingIndex: number | null = $state(null);

    $effect(() => {
        if (languages.length > 0) {
            orderedDisplayLanguages = $userSettings.displayLanguages
                .map((langName) => languages.find((l) => l.name === langName))
                .filter((lang): lang is Language => lang !== undefined);
        }
    });

    function handleDragStart(index: number) {
        draggingIndex = index;
    }

    function handleDragOver(event: DragEvent, index: number) {
        event.preventDefault();
        if (draggingIndex === null || draggingIndex === index) return;

        const newOrder = [...orderedDisplayLanguages];
        const [draggedItem] = newOrder.splice(draggingIndex, 1);
        newOrder.splice(index, 0, draggedItem);

        orderedDisplayLanguages = newOrder;
        draggingIndex = index; // Update draggingIndex to reflect the new position
    }

    function handleDragEnd() {
        draggingIndex = null;
        userSettings.update((settings) => {
            settings.displayLanguages = orderedDisplayLanguages.map(
                (lang) => lang.name
            );
            return settings;
        });
    }
</script>

<article>
    <button class="absolute right-3" onclick={resetAllStores}>Reset</button>
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
                                    selectAll(langs, true);
                                }}>Select All</button
                            >
                            <button
                                class="l-2 py-0 px-0.5 !text-xs text-nowrap cursor-pointer"
                                onclick={(event: Event) => {
                                    event.preventDefault();
                                    selectAll(langs, false);
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

    <section class="mt-8">
        <h2>Language Display Order</h2>
        {#if loading}
            <p>Loading languages...</p>
        {:else if error}
            <p class="error">Error: {error}</p>
        {:else}
            <ul class="list-none p-0">
                {#each orderedDisplayLanguages as lang, index (lang.code)}
                    <li
                        class="flex items-center py-0 px-1 mb-1 border border-gray-200 rounded cursor-grab"
                        draggable="true"
                        ondragstart={() => handleDragStart(index)}
                        ondragover={(event) => handleDragOver(event, index)}
                        ondragend={handleDragEnd}
                        class:dragging={index === draggingIndex}
                    >
                        <span class="text-gray-500 h-full mx-1 pb-1"
                            >&#9776;</span
                        >
                        {lang.name} ({lang.code})
                    </li>
                {/each}
            </ul>
        {/if}
    </section>

    <section>
        <h2>Sections</h2>
        {#each Object.entries($userSettings.sectionSettings) as [sectionName, currentSetting]}
            <div
                class="flex justify-between items-center h-10 mb-2 py-2 border-b border-dashed border-gray-200"
            >
                <label
                    for={`section-${sectionName}`}
                    class="flex-grow text-nowrap !font-bold h-8 mr-4 w-52"
                >
                    {sectionName.replace(/_/g, ' ')}
                </label>
                <select
                    id={`section-${sectionName}`}
                    value={currentSetting}
                    onchange={(e) =>
                        updateSectionSetting(
                            sectionName,
                            (e.target as HTMLSelectElement)
                                .value as SectionSetting
                        )}
                    class="p-1 h-8 items-center rounded border border-gray-300"
                >
                    {#each sectionOptions as option}
                        <option value={option.value}>{option.label}</option>
                    {/each}
                </select>
            </div>
        {/each}
    </section>
</article>

<style>
    .dragging {
        opacity: 0.5;
        border: 2px dashed #007bff;
    }
</style>
