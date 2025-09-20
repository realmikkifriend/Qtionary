import { writable } from 'svelte/store';
import { searchWiktionary as searchWiktionaryFromApi } from './api';

export const searchTerm = writable('');
export const searchResults = writable<any[]>([]);
export const totalHits = writable(0);
export const loading = writable(false);
export const errorMessage = writable('');
export const lastSearchedTerm = writable('');

function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number,
    immediate?: boolean
) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function (this: any, ...args: Parameters<T>) {
        const context = this;
        clearTimeout(timeout!);
        if (immediate && !timeout) func.apply(context, args);
        timeout = setTimeout(() => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        }, wait);
    };
}

export const searchWiktionary = debounce(async (term: string) => {
    if (term.length < 3) {
        searchResults.set([]);
        lastSearchedTerm.set(term);
        return;
    }

    let lastTerm = '';
    lastSearchedTerm.subscribe((value) => (lastTerm = value))();
    if (term === lastTerm) {
        return;
    }

    loading.set(true);
    searchResults.set([]);
    try {
        const data = await searchWiktionaryFromApi(term);
        const sortedResults = data.search.sort((a: any, b: any) => {
            const aMatch = a.title === term;
            const bMatch = b.title === term;
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
        });
        searchResults.set(sortedResults);
        totalHits.set(data.searchinfo.totalhits);
        lastSearchedTerm.set(term);
        errorMessage.set('');
    } catch (error: any) {
        console.error('Error fetching from Wiktionary:', error);
        errorMessage.set(
            error.message || 'Failed to fetch results. Are you offline?'
        );
    } finally {
        loading.set(false);
    }
}, 500);
