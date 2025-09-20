<script lang="ts">
    import {
        handleDragStart,
        handleDragOver,
        handleDragEnd
    } from '../../helper/settingsHelper';

    let {
        orderedDisplayLanguages = [],
        updateOrderedDisplayLanguages,
        loading = false,
        error = null
    } = $props();

    let draggingIndex: number | null = $state(null);

    function handleDragStartWrapper(index: number) {
        handleDragStart(index, (newIndex) => {
            draggingIndex = newIndex;
        });
    }

    function handleDragOverWrapper(event: DragEvent, index: number) {
        handleDragOver(
            event,
            index,
            draggingIndex,
            orderedDisplayLanguages,
            (newOrder) => {
                updateOrderedDisplayLanguages(newOrder);
            },
            (newIndex) => {
                draggingIndex = newIndex;
            }
        );
    }

    function handleDragEndWrapper() {
        handleDragEnd(orderedDisplayLanguages, (newIndex) => {
            draggingIndex = newIndex;
        });
    }
</script>

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
                    ondragstart={() => handleDragStartWrapper(index)}
                    ondragover={(event) => handleDragOverWrapper(event, index)}
                    ondragend={handleDragEndWrapper}
                    class:dragging={index === draggingIndex}
                >
                    <span class="text-gray-500 h-full mx-1 pb-1">&#9776;</span>
                    {lang.name} ({lang.code})
                </li>
            {/each}
        </ul>
    {/if}
</section>

<style>
    .dragging {
        opacity: 0.5;
        border: 2px dashed #007bff;
    }
</style>
