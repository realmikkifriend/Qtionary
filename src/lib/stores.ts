import { writable, type Writable } from 'svelte/store';
import { persisted } from 'svelte-persisted-store';

export interface ResettableStore<T> extends Writable<T> {
    reset: () => void;
}

/**
 * Creates a resettable writable store.
 * @param {T} initialValue - The value with which to instantiate the store.
 * @returns A resettable writable store.
 */
export function resettableWritable<T>(initialValue: T): ResettableStore<T> {
    const { subscribe, set, update } = writable<T>(initialValue);
    return {
        subscribe,
        set,
        update,
        reset: () => set(initialValue)
    };
}

/**
 * Creates a resettable persisted store.
 * @param {string} key - The key of the new store.
 * @param {T} initialValue - The value with which to instantiate the store.
 * @param {Parameters<typeof persisted<T>>[2]} options - The store's options.
 * @returns A resettable persisted store.
 */
export function resettablePersisted<T>(
    key: string,
    initialValue: T,
    options?: Parameters<typeof persisted<T>>[2]
): ResettableStore<T> {
    const { subscribe, set, update } = persisted<T>(key, initialValue, {
        ...options,
        serializer: {
            parse: (text: string) => {
                const parsed = JSON.parse(text);
                return { ...initialValue, ...parsed };
            },
            stringify: JSON.stringify
        }
    });
    return {
        subscribe,
        set,
        update,
        reset: () => {
            set(initialValue);
            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }
        }
    };
}

const stores: ResettableStore<unknown>[] = [];

/**
 * Registers new stores.
 * @param {ResettableStore<T>} store - The store to register.
 */
export function registerStore<T>(store: ResettableStore<T>): void {
    stores.push(store);
}

/**
 * Resets all stores.
 */
export function resetAllStores(): void {
    stores.forEach((store) => store.reset());
}

export type SectionSetting =
    | 'always-show'
    | 'collapsible-open'
    | 'collapsible-closed'
    | 'hide';

export interface UserSettings {
    displayLanguages: string[];
    sectionSettings: Record<string, SectionSetting>;
}

export const userSettings = resettablePersisted<UserSettings>('userSettings', {
    displayLanguages: ['English', 'Spanish', 'Latin', 'Italian'],
    sectionSettings: {
        Alternative_forms: 'collapsible-closed',
        Etymology: 'always-show',
        Pronunciation: 'hide',
        Quick_conjugation: 'collapsible-closed',
        Conjugation: 'collapsible-closed',
        Usage_notes: 'collapsible-open',
        Derived_terms: 'collapsible-open',
        Related_terms: 'collapsible-open',
        Descendants: 'collapsible-open',
        Translation: 'collapsible-closed',
        Synonyms: 'collapsible-closed',
        Antonyms: 'collapsible-closed',
        Hypernyms: 'collapsible-closed',
        Hyponyms: 'hide',
        Meronyms: 'hide',
        Holonyms: 'hide',
        Troponyms: 'hide',
        Anagrams: 'hide',
        Coordinate_terms: 'collapsible-closed',
        Collocations: 'collapsible-closed',
        Further_reading: 'hide',
        References: 'hide'
    }
});

registerStore(userSettings);
