import { Sorter } from './sort';
import { SearchResult } from './indexer';

export function fastTrim(input:string):string {
    if (input == null) {
        return null;
    } else {
        const str = input.replace(/^\s\s*/, '');
        const ws = /\s/;
        let i = str.length;

        while (ws.test(str.charAt(--i))) { }

        return str.slice(0, i + 1);
    }
}

export function applyCaseSensitivity(token:string, caseSensitive:boolean):string {
    if (caseSensitive) {
        return token;
    } else {
        return token.toLowerCase();
    }
}

export function defaultIdFunction(obj:any):string {
    return obj.id;
}

export function listInsert(list:Array<SearchResult>, value:any, sorter:Sorter):void {
    if (list.length === 0) {
        list.push(value);
        return;
    }
    function _i(start:number, end:number) {

        const idx = start + Math.floor((end - start) / 2);
        const val = list[idx];
        const comp = sorter.compare(val, value);

        if (comp === 0) {
            list.splice(idx, 0, value);
            return;
        } else if (comp === -1) {
            // list value is less than value to insert.
            // if value is the last value, push to end and return.
            if (idx === list.length - 1) {
                list.push(value);
                return;
            } else {
                const comp2 = sorter.compare(list[idx + 1], value);
                if (comp2 !== comp) {
                    list.splice(idx + 1, 0, value);
                    return;
                }
            }
            _i(idx + 1, end);
        } else {
            // list value is greater than value to insert.
            // if idx was zero, push value to head and return
            if (idx === 0) {
                list.unshift(value);
                return;
            } else {
                const comp2 = sorter.compare(list[idx - 1], value);
                if (comp2 !== comp) {
                    list.splice(idx, 0, value);
                    return;
                }
            }
            _i(start, start + Math.floor((end - start) / 2));
        }
    }

    _i(0, list.length - 1);

}