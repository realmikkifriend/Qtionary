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
    let containerRef: HTMLElement | null = $state(null);

    function handleDragStartWrapper(event: Event, index: number) {
        handleDragStart(event, index, (newIndex) => {
            draggingIndex = newIndex;
        });
    }

    function handleDragOverWrapper(event: Event, index: number) {
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
            },
            containerRef
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
        <ul class="list-none p-0" bind:this={containerRef}>
            {#each orderedDisplayLanguages as lang, index (lang.code)}
                <li
                    class="flex items-center py-0 px-1 mb-1 border border-gray-200 rounded cursor-grab"
                    draggable="true"
                    style="touch-action: none;"
                    ondragstart={(event) =>
                        handleDragStartWrapper(event, index)}
                    ontouchstart={(event) =>
                        handleDragStartWrapper(event, index)}
                    ondragover={(event) => handleDragOverWrapper(event, index)}
                    ontouchmove={(event) => {
                        event.preventDefault();
                        handleDragOverWrapper(event, index);
                    }}
                    ondragend={handleDragEndWrapper}
                    ontouchend={handleDragEndWrapper}
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
