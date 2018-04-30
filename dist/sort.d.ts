import { SearchResult } from "./indexer";
export declare type CompareResult = 1 | 0 | -1;
export interface Sorter {
    compare(a: SearchResult, b: SearchResult): CompareResult;
}
export declare class ByScoreSorter implements Sorter {
    compare(a: SearchResult, b: SearchResult): CompareResult;
}
