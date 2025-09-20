import { get } from 'svelte/store';
import { userSettings, glossary } from '../lib/stores';
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
    const currentGlossary = get(glossary);

    links.forEach((link) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/wiki/Appendix:Glossary#')) {
            const term = href.split('#')[1];
            const definition = currentGlossary[term];
            if (definition) {
                const tooltipDiv = doc.createElement('div');
                tooltipDiv.classList.add('tooltip');

                const tooltipContentDiv = doc.createElement('div');
                tooltipContentDiv.classList.add(
                    'tooltip-content',
                    'bg-[var(--pico-background-color)]',
                    'max-w-56',
                    'text-[var(--pico-h1-color)]',
                    'p-2',
                    'rounded-sm',
                    'text-sm',
                    'text-left'
                );
                tooltipContentDiv.innerHTML = definition;

                const anchorElement = doc.createElement('a');
                anchorElement.classList.add('!decoration-dotted');
                anchorElement.textContent = link.textContent;

                tooltipDiv.appendChild(tooltipContentDiv);
                tooltipDiv.appendChild(anchorElement);

                link.parentNode?.replaceChild(tooltipDiv, link);
            } else {
                setLinkOnClick(link, href);
            }
        } else if (href && href.startsWith('/wiki/')) {
            setLinkOnClick(link, href);
        } else {
            const textNode = doc.createTextNode(link.textContent || '');
            link.parentNode?.replaceChild(textNode, link);
        }
    });
}

function setLinkOnClick(link: HTMLAnchorElement, href: string): void {
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

    const currentSettings = get(userSettings);
    let activeTab = '';
    const firstDisplayLanguage = extractedLanguages.find((lang) =>
        currentSettings.displayLanguages.includes(lang.name)
    );
    if (firstDisplayLanguage) {
        activeTab = firstDisplayLanguage.name;
    } else if (extractedLanguages.length > 0) {
        activeTab = extractedLanguages[0].name;
    }

    return { languages: extractedLanguages, activeTab };
}

export function parseGlossary(htmlText: string): Record<string, string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    doc.querySelectorAll('span').forEach((span) => {
        if (span.querySelector('div.interproject-box')) {
            span.remove();
        }
    });

    const glossaryData: Record<string, string> = {};

    const dts = doc.querySelectorAll('dt');
    dts.forEach((dt) => {
        const term = dt.textContent?.trim();
        const dd = dt.nextElementSibling;
        if (term && dd && dd.tagName === 'DD') {
            const tempDiv = doc.createElement('div');
            tempDiv.innerHTML = dd.innerHTML;
            tempDiv.querySelectorAll('a').forEach((a) => {
                const strongElement = doc.createElement('strong');
                strongElement.textContent = a.textContent;
                a.parentNode?.replaceChild(strongElement, a);
            });
            glossaryData[term] = tempDiv.innerHTML.trim();
        }
    });
    return glossaryData;
}
