import { get } from 'svelte/store';
import { userSettings } from '../lib/stores';
import {
    wrapSections,
    applySectionSettings,
    processUsageLabelSense,
    processTranslationCollapsibility
} from './documentProcessor';

function processHtmlText(htmlText: string): {
    doc: Document;
    sectionSettings: any;
} {
    const modifiedHtmlText = htmlText.replace(/\btright\b/g, 'float-right');
    const parser = new DOMParser();
    const doc = parser.parseFromString(modifiedHtmlText, 'text/html');
    const sectionSettings = get(userSettings).sectionSettings;

    return { doc, sectionSettings };
}

function processLinks(doc: Document): void {
    const links = doc.querySelectorAll('a');
    links.forEach((link) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/wiki/')) {
            const wordParam = href.replace('/wiki/', '').split('#')[0];
            link.setAttribute('href', 'javascript:void(0)');
            link.setAttribute(
                'onclick',
                `
                event.preventDefault();
                const url = new window.URL(window.location.href);
                url.searchParams.set('word', '${wordParam}');
                window.history.pushState({}, '', url.origin + url.pathname + url.search);
                window.dispatchEvent(new CustomEvent('urlchange'));
            `
            );
        } else {
            const textNode = doc.createTextNode(link.textContent || '');
            link.parentNode?.replaceChild(textNode, link);
        }
    });
}

function processDocumentSections(doc: Document): void {
    const parserOutput = doc.querySelector('.mw-parser-output');
    if (!parserOutput) return;

    wrapSections(parserOutput, doc);
    processUsageLabelSense(doc);
}

function extractLanguages(doc: Document): { name: string; content: string }[] {
    const parserOutput = doc.querySelector('.mw-parser-output');
    if (!parserOutput) return [];

    const extractedLanguages: { name: string; content: string }[] = [];
    let currentLanguage: { name: string; content: string } | null = null;

    let node = parserOutput.firstElementChild;
    while (node) {
        if (node.matches('.mw-heading2')) {
            const h2 = node.querySelector('h2');
            if (h2) {
                if (currentLanguage) {
                    extractedLanguages.push(currentLanguage);
                }
                currentLanguage = {
                    name: h2.textContent || 'Unknown',
                    content: ''
                };
            }
            node = node.nextElementSibling;
            continue;
        }

        if (currentLanguage) {
            currentLanguage.content += node.outerHTML;
        }
        node = node.nextElementSibling;
    }

    if (currentLanguage) {
        extractedLanguages.push(currentLanguage);
    }

    return extractedLanguages;
}

function filterLanguages(languages: { name: string; content: string }[]): {
    filteredLanguages: { name: string; content: string }[];
    activeTab: string;
} {
    const currentSettings = get(userSettings);
    const filteredLanguages = languages.filter((lang) =>
        currentSettings.displayLanguages.includes(lang.name)
    );

    let activeTab = '';
    if (filteredLanguages.length > 0) {
        activeTab = filteredLanguages[0].name;
    }

    return { filteredLanguages, activeTab };
}

function initializeDocument(htmlText: string): {
    doc: Document;
    sectionSettings: any;
    parserOutput: Element | null;
} {
    const { doc, sectionSettings } = processHtmlText(htmlText);
    const parserOutput = doc.querySelector('.mw-parser-output');
    return { doc, sectionSettings, parserOutput };
}

export function parseLanguageSections(htmlText: string): {
    languages: { name: string; content: string }[];
    activeTab: string;
} {
    const { doc, sectionSettings, parserOutput } = initializeDocument(htmlText);

    if (!parserOutput) {
        return { languages: [], activeTab: '' };
    }

    processLinks(doc);
    processDocumentSections(doc);
    processTranslationCollapsibility(doc);
    applySectionSettings(doc);

    const extractedLanguages = extractLanguages(doc);
    const { filteredLanguages, activeTab } =
        filterLanguages(extractedLanguages);

    return { languages: filteredLanguages, activeTab };
}
