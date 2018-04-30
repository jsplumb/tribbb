import { Tokenizer } from './tokenizer';
import { Sorter } from './sort';
export declare type IDFunction = (obj: any) => string;
export declare type SearchResult = {
    score: number;
    document: any;
};
export declare type TribbParams = {
    fields?: Array<string>;
    tokenizer?: Tokenizer;
    searchTokenizer?: Tokenizer;
    idFunction?: IDFunction;
    limit?: number;
    caseSensitive?: boolean;
    sort?: Sorter;
    onDataLoaded?: () => void;
    data?: Array<any>;
};
export declare class Index {
    fields: Array<string>;
    tokenizer: Tokenizer;
    searchTokenizer: Tokenizer;
    idFunction: IDFunction;
    limit: number;
    caseSensitive: boolean;
    sorter: Sorter;
    onDataLoaded: () => void;
    private nodeMap;
    private documentMap;
    private documentList;
    private _nodeIndex;
    private root;
    constructor(params?: TribbParams);
    private _makeNode();
    private _storeNodeReferenceForDocument(docId, node);
    private _addToken(token, docId);
    add(obj: any): void;
    addAll(...docs: Array<any>): void;
    remove(doc: any): void;
    reindex(doc: any): void;
    clear(): void;
    search(query: string): Array<SearchResult>;
    getDocumentCount(): number;
    getDocumentList(): Array<any>;
    getDocument(id: string): any;
}
