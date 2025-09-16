import { userSettings } from '../lib/stores';
import type { SectionSetting } from '../lib/stores';

interface Language {
    code: string;
    bcp47: string;
    name: string;
}

export function toggleLanguage(
    code: string,
    selectedLanguages: Record<string, boolean>,
    languages: Language[],
    setSelectedLanguages: (
        newSelectedLanguages: Record<string, boolean>
    ) => void
) {
    const newSelectedLanguages = {
        ...selectedLanguages,
        [code]: !selectedLanguages[code]
    };
    setSelectedLanguages(newSelectedLanguages);

    userSettings.update((settings) => {
        const languageName = languages.find((l) => l.code === code)?.name;
        if (languageName) {
            if (newSelectedLanguages[code]) {
                settings.displayLanguages.push(languageName);
            } else {
                settings.displayLanguages = settings.displayLanguages.filter(
                    (name) => name !== languageName
                );
            }
        }
        return settings;
    });
}

export function selectAll(
    langs: Language[],
    select: boolean,
    selectedLanguages: Record<string, boolean>,
    setSelectedLanguages: (
        newSelectedLanguages: Record<string, boolean>
    ) => void,
    languages: Language[]
) {
    const newSelection = { ...selectedLanguages };
    const updatedDisplayLanguages: string[] = [];
    for (const lang of langs) {
        newSelection[lang.code] = select;
        if (select) {
            updatedDisplayLanguages.push(lang.name);
        }
    }
    setSelectedLanguages(newSelection);

    userSettings.update((settings) => {
        settings.displayLanguages = select
            ? [
                  ...Array.from(
                      new Set([
                          ...settings.displayLanguages,
                          ...updatedDisplayLanguages
                      ])
                  )
              ]
            : settings.displayLanguages.filter(
                  (name) => !langs.some((l) => l.name === name)
              );
        return settings;
    });
}

export function updateSectionSetting(
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

export function handleDragStart(
    index: number,
    setDraggingIndex: (index: number | null) => void
) {
    setDraggingIndex(index);
}

export function handleDragOver(
    event: DragEvent,
    index: number,
    draggingIndex: number | null,
    orderedDisplayLanguages: Language[],
    setOrderedDisplayLanguages: (newOrder: Language[]) => void,
    setDraggingIndex: (index: number | null) => void
) {
    event.preventDefault();
    if (draggingIndex === null || draggingIndex === index) return;

    const newOrder = [...orderedDisplayLanguages];
    const [draggedItem] = newOrder.splice(draggingIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    setOrderedDisplayLanguages(newOrder);
    setDraggingIndex(index);
}

export function handleDragEnd(
    orderedDisplayLanguages: Language[],
    setDraggingIndex: (index: number | null) => void
) {
    setDraggingIndex(null);
    userSettings.update((settings) => {
        settings.displayLanguages = orderedDisplayLanguages.map(
            (lang) => lang.name
        );
        return settings;
    });
}
