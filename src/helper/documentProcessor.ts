import type { SectionSetting } from '../lib/stores';
import { get } from 'svelte/store';
import { userSettings } from '../lib/stores';

export function processHeading(
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

export function wrapSections(parserOutput: Element, doc: Document) {
    let node = parserOutput.firstElementChild;
    while (node) {
        if (
            node.matches('.mw-heading3') ||
            (node.matches('.mw-heading4') &&
                node.querySelector('h4')?.id.startsWith('Noun')) ||
            (node.matches('.mw-heading4') &&
                node.querySelector('h4')?.id.startsWith('Verb'))
        ) {
            const contentDiv = doc.createElement('div');
            contentDiv.classList.add('word-sense-content');

            const h3Node = node;
            let tempSibling = node.nextElementSibling;

            h3Node.replaceWith(contentDiv);
            contentDiv.appendChild(h3Node);

            while (
                tempSibling &&
                !tempSibling.matches('.mw-heading2, .mw-heading3, .mw-heading4')
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

export function processHeadwordLine(doc: Document) {
    const sectionSettings = get(userSettings).sectionSettings;
    const quickConjugationSetting =
        sectionSettings.Quick_conjugation || 'always-show';

    if (quickConjugationSetting === 'hide') {
        doc.querySelectorAll('.headword-line').forEach((headwordLine) => {
            headwordLine.remove();
        });
        return;
    }

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
                    meaning += '<br /><em>("I ___")</em>';
                } else if (meaning === 'first-person singular preterite') {
                    meaning += '<br /><em>("I ___ed")</em>';
                } else if (meaning === 'past participle') {
                    meaning += '<em>("I have ___ed")</em>';
                    conjugation = conjugation;
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

            if (quickConjugationSetting.startsWith('collapsible')) {
                const details = doc.createElement('details');
                details.classList.add('float-right');
                details.open = quickConjugationSetting === 'collapsible-open';
                const summary = doc.createElement('summary');
                summary.classList.add('float-right', 'text-xs', '!mb-1');
                summary.textContent = 'Quick Conjugation Table';
                details.appendChild(summary);
                table.parentNode?.insertBefore(details, table);
                details.appendChild(table);
            }

            headwordLine.remove();
        }
    });
}

export function processUsageLabelSense(doc: Document) {
    doc.querySelectorAll('.word-sense-content').forEach((sense) => {
        const usageLabelSenses = sense.querySelectorAll('.usage-label-sense');
        if (usageLabelSenses.length === 0) return;

        usageLabelSenses.forEach((usageLabelSense) => {
            const tagsContainer = doc.createElement('div');
            tagsContainer.classList.add('usage-tags');

            const anchorTags = usageLabelSense.querySelectorAll(
                '.ib-content.label-content a'
            );
            anchorTags.forEach((anchor) => {
                const tag = doc.createElement('span');
                tag.classList.add('usage-tag');
                const textContent = anchor.textContent || '';
                tag.textContent = textContent;
                tag.setAttribute('aria-label', textContent);
                tag.setAttribute('data-content', textContent.toLowerCase());
                tagsContainer.appendChild(tag);
            });

            usageLabelSense.after(tagsContainer);

            usageLabelSense.remove();
        });
    });
}
