export interface Tokenizer {
	tokenize(input: string): Array<string>;
}
export declare class WhitespaceTokenizer implements Tokenizer {
	tokenize(value: string): Array<string>;
}
export declare class WhitespaceReplacingTokenizer implements Tokenizer {
	tokenize(value: string): Array<string>;
}
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
export declare type CompareResult = 1 | 0 | -1;
export interface Sorter {
	compare(a: SearchResult, b: SearchResult): CompareResult;
}
export declare class ByScoreSorter implements Sorter {
	compare(a: SearchResult, b: SearchResult): CompareResult;
}
export declare function fastTrim(input: string): string;
export declare function applyCaseSensitivity(token: string, caseSensitive: boolean): string;
export declare function defaultIdFunction(obj: any): string;
export declare function listInsert(list: Array<SearchResult>, value: any, sorter: Sorter): void;