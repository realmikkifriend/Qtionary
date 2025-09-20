<script lang="ts">
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { userSettings, resetAllStores } from './stores';
    import DisplayedLanguages from './settings/DisplayedLanguages.svelte';
    import LanguageDisplayOrder from './settings/LanguageDisplayOrder.svelte';
    import SectionSettings from './settings/SectionSettings.svelte';
    import type { Language } from './types/types';

    let languages: Language[] = $state([]);
    let selectedLanguages: Record<string, boolean> = $state({});
    let orderedDisplayLanguages: Language[] = $state([]);
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

            orderedDisplayLanguages = currentDisplayLanguages
                .map((langName) => languages.find((l) => l.name === langName))
                .filter((lang): lang is Language => lang !== undefined);
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    });

    $effect(() => {
        if (languages.length > 0) {
            orderedDisplayLanguages = $userSettings.displayLanguages
                .map((langName) => languages.find((l) => l.name === langName))
                .filter((lang): lang is Language => lang !== undefined);
        }
    });

    function updateSelectedLanguages(
        newSelectedLanguages: Record<string, boolean>
    ) {
        selectedLanguages = newSelectedLanguages;

        const newDisplayLanguages = languages
            .filter((lang) => newSelectedLanguages[lang.code])
            .map((lang) => lang.name);

        userSettings.set({
            ...get(userSettings),
            displayLanguages: newDisplayLanguages
        });
    }

    function updateOrderedDisplayLanguages(newOrder: Language[]) {
        orderedDisplayLanguages = newOrder;

        const newDisplayLanguages = newOrder.map((lang) => lang.name);
        userSettings.set({
            ...get(userSettings),
            displayLanguages: newDisplayLanguages
        });
    }
</script>

<article>
    <button class="absolute right-3" onclick={resetAllStores}>Reset</button>
    <section>
        <h1>Settings</h1>
        <DisplayedLanguages
            {languages}
            {selectedLanguages}
            {loading}
            {error}
            {updateSelectedLanguages}
        />
        <LanguageDisplayOrder
            {orderedDisplayLanguages}
            {loading}
            {error}
            {updateOrderedDisplayLanguages}
        />
        <SectionSettings sectionSettings={$userSettings.sectionSettings} />
    </section>
</article>
