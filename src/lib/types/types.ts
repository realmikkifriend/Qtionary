export interface Language {
    code: string;
    bcp47: string;
    name: string;
}

export type Glossary = Record<string, string>;
