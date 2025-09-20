export async function fetchWordData(wordName: string) {
    const response = await fetch(
        `https://en.wiktionary.org/w/api.php?action=parse&format=json&page=${wordName}&pst=1&disableeditsection=1&disabletoc=1&formatversion=2&origin=*`
    );
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.info);
    }

    return data.parse;
}

export async function searchWiktionary(term: string) {
    const response = await fetch(
        `https://en.wiktionary.org/w/api.php?` +
            `action=query&format=json&list=search&` +
            `formatversion=2&srsearch=${term}&srnamespace=0&srlimit=10&origin=*`
    );
    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.info);
    }
    return data.query;
}

export async function fetchGlossary() {
    const response = await fetch(
        `https://en.m.wiktionary.org/w/api.php?action=parse&format=json&page=Appendix%3AGlossary&disableeditsection=1&formatversion=2&origin=*`
    );
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.info);
    }

    return data.parse;
}
