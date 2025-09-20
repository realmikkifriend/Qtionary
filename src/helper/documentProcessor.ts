import { get } from 'svelte/store';
import { userSettings } from '../lib/stores';
import type { SectionSetting } from '../lib/stores';

function processSection(
    currentNode: Element,
    sectionClass: string,
    stopSelectors: string[],
    doc: Document
): Element | null {
    const sectionDiv = doc.createElement('div');
    sectionDiv.classList.add(sectionClass);

    const headingNode = currentNode;
    let tempSibling: Element | null = currentNode.nextElementSibling;

    if (headingNode.id) {
        sectionDiv.id = headingNode.id;
        headingNode.removeAttribute('id');
    }
    headingNode.replaceWith(sectionDiv);
    sectionDiv.appendChild(headingNode);

    while (tempSibling && !tempSibling.matches(stopSelectors.join(', '))) {
        if (tempSibling.matches('.mw-heading4')) {
            const nextSiblingAfterNestedSection = processSection(
                tempSibling,
                'section-4',
                ['.mw-heading2', '.mw-heading3', '.mw-heading4'],
                doc
            );
            sectionDiv.appendChild(
                nextSiblingAfterNestedSection!.previousElementSibling!
            );
            tempSibling = nextSiblingAfterNestedSection;
        } else if (tempSibling.matches('.mw-heading5')) {
            const nextSiblingAfterNestedSection = processSection(
                tempSibling,
                'section-5',
                [
                    '.mw-heading2',
                    '.mw-heading3',
                    '.mw-heading4',
                    '.mw-heading5'
                ],
                doc
            );
            sectionDiv.appendChild(
                nextSiblingAfterNestedSection!.previousElementSibling!
            );
            tempSibling = nextSiblingAfterNestedSection;
        } else {
            const toMove = tempSibling;
            tempSibling = tempSibling.nextElementSibling;
            sectionDiv.appendChild(toMove);
        }
    }
    return tempSibling;
}

export function wrapSections(parserOutput: Element, doc: Document) {
    let node: Element | null = parserOutput.firstElementChild;

    while (node) {
        if (node.matches('.mw-heading3')) {
            node = processSection(
                node,
                'section-3',
                ['.mw-heading2', '.mw-heading3'],
                doc
            );
        } else if (node.matches('.mw-heading4')) {
            node = processSection(
                node,
                'section-4',
                ['.mw-heading2', '.mw-heading3', '.mw-heading4'],
                doc
            );
        } else {
            node = node.nextElementSibling;
        }
    }
}

export function applySectionSettings(doc: Document) {
    const sectionSettings = get(userSettings).sectionSettings;

    doc.querySelectorAll('.section-3, .section-4, .section-5').forEach(
        (sectionDiv) => {
            const headingElement = sectionDiv.querySelector('h3, h4, h5');
            if (!headingElement) return;

            const sectionId = headingElement.id;

            let setting: SectionSetting | undefined;
            for (const key in sectionSettings) {
                if (sectionId === key || sectionId.startsWith(key)) {
                    setting = sectionSettings[key];
                    break;
                }
            }

            if (setting === undefined) {
                if (sectionDiv.classList.contains('section-3')) {
                    setting = 'collapsible-open';
                } else if (
                    sectionDiv.classList.contains('section-4') ||
                    sectionDiv.classList.contains('section-5')
                ) {
                    setting = 'collapsible-closed';
                }
            }

            if (setting === 'hide') {
                sectionDiv.remove();
                return;
            }

            if (setting && setting.startsWith('collapsible')) {
                const details = doc.createElement('details');
                details.open = setting === 'collapsible-open';
                details.classList.add('collapsible-section');

                sectionDiv.classList.forEach((className) => {
                    if (className.startsWith('section-')) {
                        details.classList.add(className);
                    }
                });

                const summary = doc.createElement('summary');
                summary.innerHTML = headingElement.innerHTML;
                details.appendChild(summary);

                for (let i = sectionDiv.children.length - 1; i >= 0; i--) {
                    const child = sectionDiv.children[i];
                    if (child !== headingElement) {
                        details.prepend(child);
                    }
                }

                sectionDiv.replaceWith(details);
                const parentHeadingDiv = headingElement.parentNode;
                if (parentHeadingDiv instanceof Element) {
                    parentHeadingDiv.remove();
                }
            }

            if (sectionId === 'Quick_conjugation') {
                const quickConjugationSetting = setting || 'always-show';

                const headwordLine = sectionDiv.querySelector('.headword-line');
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
                        } else if (
                            meaning === 'first-person singular preterite'
                        ) {
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
                    if (headingElement) {
                        headingElement.after(table);
                    } else {
                        sectionDiv.prepend(table);
                    }

                    if (quickConjugationSetting.startsWith('collapsible')) {
                        const details = doc.createElement('details');
                        details.classList.add('float-right');
                        details.open =
                            quickConjugationSetting === 'collapsible-open';
                        const summary = doc.createElement('summary');
                        summary.classList.add(
                            'float-right',
                            'text-xs',
                            '!mb-1'
                        );
                        summary.textContent = 'Quick Conjugation Table';
                        details.appendChild(summary);
                        table.parentNode?.insertBefore(details, table);
                        details.appendChild(table);
                    }

                    headwordLine.remove();
                }
            }
        }
    );
}

export function processUsageLabelSense(doc: Document) {
    doc.querySelectorAll('.section-3, .section-4, .section-5').forEach(
        (sectionDiv) => {
            const usageLabelSenses =
                sectionDiv.querySelectorAll('.usage-label-sense');
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
        }
    );
}

export function processTranslationCollapsibility(doc: Document): void {
    const { displayLanguages } = get(userSettings);

    const translationFrames = doc.querySelectorAll(
        '.NavFrame[id^="Translations-"]'
    );

    translationFrames.forEach((frame) => {
        const navHead = frame.querySelector('.NavHead');
        const navContent = frame.querySelector('.NavContent');

        if (!navHead || !navContent) return;

        const details = doc.createElement('details');
        details.id = frame.id;
        details.open = false;

        const summary = doc.createElement('summary');
        const summaryContentContainer = doc.createElement('div');
        summaryContentContainer.classList.add('summary-content-container');

        const originalNavHeadContent = navHead.innerHTML;
        const navHeadTextContent = navHead.textContent || '';
        const usageSenseMatch = navHeadTextContent.match(/^\s*\(([^)]+)\)/);

        if (usageSenseMatch) {
            const usageSense = usageSenseMatch[1];
            const usageLabel = doc.createElement('div');
            usageLabel.classList.add('usage-tags');
            const tag = doc.createElement('span');
            tag.classList.add('usage-tag');
            tag.textContent = usageSense;
            tag.setAttribute('aria-label', usageSense);
            tag.setAttribute('data-content', usageSense.toLowerCase());
            usageLabel.appendChild(tag);
            summaryContentContainer.appendChild(usageLabel);
        }

        const container = doc.createElement('div');
        container.innerHTML = originalNavHeadContent.replace(
            /^\s*\(<i[^>]*>[^<]*<\/i>\)\s*/,
            ''
        );
        summaryContentContainer.appendChild(container);
        summary.appendChild(summaryContentContainer);
        details.appendChild(summary);

        const translationMap = new Map<string, string>();
        const translationListItems = navContent.querySelectorAll('li');

        translationListItems.forEach((li) => {
            const languageMatch = li.textContent?.match(/^([A-Za-z]+):/);
            if (languageMatch) {
                const language = languageMatch[1];
                if (displayLanguages.includes(language)) {
                    const anchorElement = li.querySelector('a');
                    let translationContent: string;

                    if (anchorElement) {
                        translationContent = anchorElement.outerHTML;
                    } else {
                        translationContent =
                            li.textContent?.replace(/^[A-Za-z]+:\s*/, '') || '';
                    }

                    translationMap.set(language, translationContent);
                }
            }
        });

        displayLanguages.forEach((language) => {
            if (translationMap.has(language)) {
                const translationText = translationMap.get(language) || '';
                const translationSpan = doc.createElement('span');
                translationSpan.classList.add('displayed-translation');
                translationSpan.innerHTML = `<strong>${language}:</strong> ${translationText}`;
                summary.appendChild(translationSpan);
            }
        });

        while (navContent.firstChild) {
            details.appendChild(navContent.firstChild);
        }

        frame.replaceWith(details);
    });
}
