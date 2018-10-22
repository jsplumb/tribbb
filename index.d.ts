declare module Tribbb {

    interface Dictionary<T> {
        [Key: string]: T;
    }

    type Tokenizer = (value:string) => Array<string>;
    type Sorter<T> = (a:T, b:T) => number;
    type IdFunction<T> = (doc:T) => string;

    type Hit<T> = {
        document:T;
        score:number;
    }

    type IndexNode<T> = {
        children:Array<IndexNode<T>>;
        documentIds:Dictionary<T>;
    }

    type SerializedIndex<T> = {
        list:Array<T>;
        map: Dictionary<T>;
        root:IndexNode<T>;
    }

    module Tokenizers {
        function WhitespaceTokenizer(value:string): Array<string>;
        function WhitespaceReplacingTokenizer(value:string):Array<string>;
        function DefaultTokenizer(value:string):Array<string>;
    }

    module Sorters {
        function ByScoreSorter<T>(a:T, b:T):number;
    }

    type TribbIndexOptions<T> = {
        fields?:Array<string>;
        tokenizer?:Tokenizer;
        searchTokenizer?:Tokenizer;
        idFunction?:IdFunction<T>;
        limit?:number;
        caseSensitive?:boolean;
        sort?:Sorter<T>;
        url?:string;
        data?:Array<any>;
        index?:SerializedIndex<T>;
        onDataLoaded?:Function;
        exclusions?:Array<string>;
    }

    class Index<T> {
        constructor(options:TribbIndexOptions<T>);

        serialize():SerializedIndex<T>;
        deserialize(index:SerializedIndex<T>):void;

        search(term:string):Array<Hit<T>>;

        getDocumentCount():number;
        getDocumentList():Array<T>;
        getDocument(id:string):T;

        clear():void;

        remove(doc:T):void;

        add(doc:T|Array<T>):void;
        addAll(...doc:T[]):void;
        reindex(doc:T):void;
    }



}