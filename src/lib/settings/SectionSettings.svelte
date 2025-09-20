<script lang="ts">
    import type { SectionSetting } from '../stores';
    import { updateSectionSetting } from '../../helper/settingsHelper';

    let { sectionSettings = {} } = $props();

    const sectionOptions = [
        { value: 'always-show', label: 'Always show' },
        { value: 'collapsible-open', label: 'Collapsible (open)' },
        { value: 'collapsible-closed', label: 'Collapsible (closed)' },
        { value: 'hide', label: 'Hide' }
    ];
</script>

<section>
    <h2>Sections</h2>
    {#each Object.entries(sectionSettings) as [sectionName, currentSetting]}
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
                        (e.target as HTMLSelectElement).value as SectionSetting
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
