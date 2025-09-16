import type { SectionSetting } from '../lib/stores';
import { get } from 'svelte/store';
import { userSettings } from '../lib/stores';

function processHeading(
    node: Element,
    doc: Document,
    sectionSettings: { [key: string]: SectionSetting }
): Element | null {
    const nextNode = node.nextElementSibling;
    const heading = node.querySelector('h3, h4');
    if (!heading) {
        return nextNode;
    }

    const isH3 = heading.tagName === 'H3';

    const sectionName = heading.id;
    let setting: SectionSetting = 'always-show';
    for (const key in sectionSettings) {
        if (sectionName.startsWith(key)) {
            setting = sectionSettings[key];
            break;
        }
    }

    if (setting === 'hide') {
        node.remove();
        let tempNode = nextNode;
        while (
            tempNode &&
            !(isH3
                ? tempNode.matches('.mw-heading2, .mw-heading3')
                : tempNode.matches('.mw-heading2, .mw-heading3, .mw-heading4'))
        ) {
            const toRemove = tempNode;
            tempNode = tempNode.nextElementSibling;
            toRemove.remove();
        }
        return tempNode;
    }

    if (setting.startsWith('collapsible')) {
        const details = doc.createElement('details');
        details.open = setting === 'collapsible-open';
        const summary = doc.createElement('summary');
        summary.innerHTML = heading.outerHTML;
        details.appendChild(summary);

        let tempSibling = nextNode;
        while (
            tempSibling &&
            !(isH3
                ? tempSibling.matches('.mw-heading2, .mw-heading3')
                : tempSibling.matches(
                      '.mw-heading2, .mw-heading3, .mw-heading4'
                  ))
        ) {
            const toMove = tempSibling;
            tempSibling = tempSibling.nextElementSibling;
            details.appendChild(toMove);
        }
        node.replaceWith(details);
        return tempSibling;
    }

    return nextNode;
}

function wrapSections(parserOutput: Element, doc: Document) {
    let node = parserOutput.firstElementChild;
    while (node) {
        if (node.matches('.mw-heading3')) {
            const contentDiv = doc.createElement('div');
            contentDiv.classList.add('word-sense-content');

            const h3Node = node;
            let tempSibling = node.nextElementSibling;

            h3Node.replaceWith(contentDiv);
            contentDiv.appendChild(h3Node);

            while (
                tempSibling &&
                !tempSibling.matches('.mw-heading2, .mw-heading3')
            ) {
                const toMove = tempSibling;
                tempSibling = tempSibling.nextElementSibling;
                contentDiv.appendChild(toMove);
            }
            node = contentDiv.nextElementSibling;
            continue;
        }
        node = node.nextElementSibling;
    }
}

function processHeadwordLine(doc: Document) {
    doc.querySelectorAll('.word-sense-content').forEach((sense) => {
        const headwordLine = sense.querySelector('.headword-line');
        if (!headwordLine) return;

        const table = doc.createElement('table');
        table.classList.add('headword-table');
        const tbody = doc.createElement('tbody');

        const headerRow = doc.createElement('tr');
        const th1 = doc.createElement('th');
        th1.textContent = 'Tense (Meaning)';
        const th2 = doc.createElement('th');
        th2.textContent = 'Conjugation';
        headerRow.appendChild(th1);
        headerRow.appendChild(th2);
        tbody.appendChild(headerRow);

        const content = headwordLine.innerHTML;

        const conjugationPairRegex =
            /<i\b[^>]*>([\s\S]*?)<\/i>\s*<b\b[^>]*>\s*(?:<a\b[^>]*>)?([\s\S]*?)(?:<\/a>)?\s*<\/b>/gi;
        const matches = [...content.matchAll(conjugationPairRegex)];

        if (matches.length > 0) {
            matches.forEach((match) => {
                let meaning = match[1].replace(/<.*?>/g, '').trim();
                let conjugation = match[2].replace(/<.*?>/g, '').trim();

                if (meaning === 'first-person singular present') {
                    meaning += ' <em>("I ___")</em>';
                } else if (meaning === 'first-person singular preterite') {
                    meaning += ' <em>("I ___ed")</em>';
                } else if (meaning === 'past participle') {
                    meaning += ' <em>("I have ___ed")</em>';
                    conjugation = '[haber] ' + conjugation;
                }

                const row = doc.createElement('tr');
                const td1 = doc.createElement('td');
                td1.innerHTML = meaning;
                const td2 = doc.createElement('td');
                td2.textContent = conjugation;
                row.appendChild(td1);
                row.appendChild(td2);
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            const h3Element = sense.querySelector('h3');
            if (h3Element) {
                h3Element.after(table);
            } else {
                sense.prepend(table);
            }

            headwordLine.remove();
        }
    });
}

export function parseLanguageSections(htmlText: string): {
    languages: { name: string; content: string }[];
    activeTab: string;
} {
    const modifiedHtmlText = htmlText.replace(/\btright\b/g, 'float-right');
    const parser = new DOMParser();
    const doc = parser.parseFromString(modifiedHtmlText, 'text/html');
    const extractedLanguages: { name: string; content: string }[] = [];
    let currentLanguage: { name: string; content: string } | null = null;
    const sectionSettings = get(userSettings).sectionSettings;

    const parserOutput = doc.querySelector('.mw-parser-output');
    if (!parserOutput) {
        return { languages: [], activeTab: '' };
    }

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

    let node = parserOutput.firstElementChild;
    while (node) {
        if (node.matches('.mw-heading3') || node.matches('.mw-heading4')) {
            node = processHeading(node, doc, sectionSettings);
        } else {
            node = node.nextElementSibling;
        }
    }

    wrapSections(parserOutput, doc);
    processHeadwordLine(doc);

    node = parserOutput.firstElementChild;
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

    const currentSettings = get(userSettings);
    const filteredLanguages = extractedLanguages.filter((lang) =>
        currentSettings.displayLanguages.includes(lang.name)
    );

    let activeTab = '';
    if (filteredLanguages.length > 0) {
        activeTab = filteredLanguages[0].name;
    }

    return { languages: filteredLanguages, activeTab };
}
