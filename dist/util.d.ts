import { Sorter } from './sort';
import { SearchResult } from './indexer';
export declare function fastTrim(input: string): string;
export declare function applyCaseSensitivity(token: string, caseSensitive: boolean): string;
export declare function defaultIdFunction(obj: any): string;
export declare function listInsert(list: Array<SearchResult>, value: any, sorter: Sorter): void;
