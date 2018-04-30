import { SearchResult } from "./indexer";
export type CompareResult = 1 | 0 | -1;
export interface Sorter {
    compare(a:SearchResult, b:SearchResult):CompareResult;
}

export class ByScoreSorter implements Sorter {
    compare(a:SearchResult, b:SearchResult):CompareResult {
        return (a.score > b.score) ? -1 : 1;
    }
}