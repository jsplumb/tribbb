import { fastTrim } from './util';

export interface Tokenizer {
    tokenize(input:string):Array<string>;
}

export class WhitespaceTokenizer implements Tokenizer {
    tokenize(value:string):Array<string> {
        value = "" + value;
        let spacesReplaced = value.replace(/\s/g, "_"),
            parts = value.split(/\s/), out = [ spacesReplaced ];

        for (let i = 0; i < parts.length; i++) {
            let s = fastTrim(parts[i].replace(/[^\w]*/, ""));
            if (s != null && s.length > 0) {
                out.push(s);
            }
        }

        return out;
    }
}

export class WhitespaceReplacingTokenizer implements Tokenizer {
    tokenize(value:string):Array<string> {
        value = fastTrim(value);
        return [ value.replace(/\s/g, '_') ];
    }
}