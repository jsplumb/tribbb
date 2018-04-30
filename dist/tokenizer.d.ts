export interface Tokenizer {
    tokenize(input: string): Array<string>;
}
export declare class WhitespaceTokenizer implements Tokenizer {
    tokenize(value: string): Array<string>;
}
export declare class WhitespaceReplacingTokenizer implements Tokenizer {
    tokenize(value: string): Array<string>;
}
