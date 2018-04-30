import { Tokenizer, WhitespaceReplacingTokenizer, WhitespaceTokenizer } from './tokenizer';
import { ByScoreSorter, Sorter } from './sort';
import { applyCaseSensitivity, defaultIdFunction, listInsert } from './util';

export type IDFunction = (obj:any) => string;

export type SearchResult = {
    score:number;
    document:any;
}

type Node = {
    index:number;
    children:Map<string, Node>;
    documentIds:Map<string, boolean>;
}

const DEFAULT_LIMIT = 10;

export type TribbParams = {

    /** array of field names to index, optional, defaults to everything. */
    fields?:Array<string>;
    /** function to use to tokenize field values; optional, defaults to a tokenizer that splits on whitespace, and also adds a copy of the original token with all of its
     whitespace converted to underscores.*/
    tokenizer?:Tokenizer;
    /** function to use to tokenize the search input. optional. defaults to a tokenizer that
     converts all whitespace in the search term to underscores (and which does not split
     by whitespace...)
     */
    searchTokenizer?:Tokenizer;
    /**
     * optional function to use to extract an id for any given document. defaults to returning
     the document's "id" member.
     */
    idFunction?:IDFunction;
    /**
     * optional limit to the number of documents returned. default is 10.
     */
    limit?:number;
    /**
     * optional, defaults to false.
     */
    caseSensitive?:boolean;
    /**
     * optional function to use for sorting a list of results.
     */
    sort?:Sorter;
    /**
     * optional callback for when the data has been loaded.
     */
    onDataLoaded?:() => void;
    /**
     * optional initial data
     */
    data?:Array<any>;
}

export class Index {

    fields:Array<string>;
    tokenizer:Tokenizer;
    searchTokenizer:Tokenizer;
    idFunction:IDFunction;
    limit:number;
    caseSensitive:boolean;
    sorter:Sorter;
    onDataLoaded:() => void;

    private nodeMap:Map<string, Map<number, Node>>;
    private documentMap:Map<string, any>;
    private documentList:Array<any>;
    private _nodeIndex:number;
    private root:Node;

    constructor(params?:TribbParams) {
        params = params || {};
        this.fields = params.fields;
        this.tokenizer = params.tokenizer || new WhitespaceTokenizer();
        this.searchTokenizer = params.searchTokenizer || new WhitespaceReplacingTokenizer();
        this.idFunction = params.idFunction || defaultIdFunction;
        this.limit = params.limit || DEFAULT_LIMIT;
        this.caseSensitive = params.caseSensitive === true;
        this.sorter = params.sort || new ByScoreSorter();
        this.onDataLoaded = params.onDataLoaded;
        this._nodeIndex = 0;
        this.root = this._makeNode();
        this.documentList = [];
        this.documentMap = new Map();
        this.nodeMap = new Map();

        if (params.data) {
            for (let i = 0; i < params.data.length; i++) {
                this.add(params.data[i]);
            }
        }
    }

    private _makeNode():Node {
        return { index: this._nodeIndex++, children: new Map(), documentIds: new Map() };
    }

    // store a node reference for some document
    private _storeNodeReferenceForDocument(docId:string, node:Node) {
        let nodes = this.nodeMap[docId];
        if (!nodes) {
            nodes = new Map();
            this.nodeMap.set(docId, nodes);
        }
        nodes.set(node.index, node);
    }

    // add a token to the index, storing its document id, or add the given document id to a token we are already storing.
    private _addToken(token:string, docId:string):void {

        let _oneLevel = (node:Node, idx:number, token:string, docId:string) => {
            // if at the end of the token, we are done.
            if (idx === token.length) {
                return;
            }
            // otherwise, get the char for this index
            let c = token[idx],
                // see if this node already has a child for that char
                child = node.children.get(c);
            // if not, create it
            if (!child) {
                child = this._makeNode();
                node.children.set(c, child);
            }
            // add this doc id to the list for this node, since we have traversed through it.
            child.documentIds.set(docId, true);
            // store a reference to this node in the docId->node map.
            this._storeNodeReferenceForDocument(docId, child);
            _oneLevel(child, idx + 1, token, docId);
        };

        _oneLevel(this.root, 0, token, docId);
    }

    add(obj:any) {
        let _a = (doc:any) => {

            // add to list
            listInsert(this.documentList, {document: doc, score: 1}, this.sorter);

            let docId = this.idFunction(doc),
                // two ways of looping: if field ids provided, use them. otherwise loop through all fields in document.
                _loopers = {
                    "fields":  (f:(v:string)=>void) => {
                        for (let i = 0; i < this.fields.length; i++) {
                            let v = doc[this.fields[i]];
                            f(v);
                        }
                    },
                    "document": (f:(v:string)=>void) => {
                        for (let i in doc) {
                            if (i !== "id") {
                                f(doc[i]);
                            }
                        }
                    }
                };

            this.documentMap.set(docId, doc);
            // loop through all the fields we need to and index.
            _loopers[this.fields ? "fields" : "document"]( (v:string) => {
                if (v) {
                    let tokens = this.tokenizer.tokenize(v);
                    for (let j = 0; j < tokens.length; j++) {
                        this._addToken(applyCaseSensitivity(tokens[j], this.caseSensitive), docId);
                    }
                }
            });
        };

        if (obj.constructor === Array) {
            for (let i = 0; i < obj.length; i++) {
                _a(obj[i]);
            }
        }
        else {
            _a(obj);
        }
    }

    addAll(...docs:Array<any>) {
        docs.forEach(this.add);
    }

    remove(doc:any) {
        let docId = this.idFunction(doc),
            nodes = this.nodeMap.get(docId),
            i;

        if (nodes) {
            nodes.forEach((value:Node, _:number) => {
                value.documentIds.delete(docId);
            });
        }

        let idx = -1;
        for (i = 0; i < this.documentList.length; i++) {
            let id = this.idFunction(this.documentList[i].document);
            if (id === docId) {
                idx = i;
                break;
            }
        }
        if (idx !== -1) {
            this.documentList.splice(idx, 1);
        }

        this.documentMap.delete(docId);
    }

    reindex(doc:any):void {
        this.remove(doc);
        this.add(doc);
    }

    clear():void {
        this.documentMap.clear();
        this.nodeMap.clear();
        this._nodeIndex = 0;
        this.documentList.length = 0;
        this.root = this._makeNode();
    }

    search(query:string):Array<SearchResult> {
        let tokens = this.searchTokenizer.tokenize(query),
            idMap = {}, docs = [], scores = {},
            hit = function (docId:string, token:string) {
                let d = idMap[docId];
                if (!d) {
                    d = {};
                    idMap[docId] = d;
                    scores[docId] = 0;
                }
                if (!d[token]) {
                    d[token] = true;
                    scores[docId]++;
                }
            },
            _oneToken = function (node:Node, idx:number, token:string) {
                if (idx === token.length) {
                    node.documentIds.forEach((value:boolean, key:string) => {
                        if (value) {
                            hit(key, token)
                        }
                    });
                    return;
                }
                let c = token[idx];
                if (node.children.get(c)) {
                    // recurse down a level
                    _oneToken(node.children.get(c), idx + 1, token);
                }
            };

        tokens.forEach((token:string) => _oneToken(this.root, 0, applyCaseSensitivity(token, this.caseSensitive)));

        // retrieve the documents.
        for (let j in idMap){
            docs.unshift({document: this.documentMap.get(j), score: scores[j]});
        }

        docs.sort(this.sorter.compare);
        return docs.slice(0, this.limit);
    }

    getDocumentCount ():number {
        return this.documentList.length;
    }

    // gets all documents, sorted according to the way search results are sorted.
    getDocumentList ():Array<any> {
        return this.documentList;
    }

    getDocument (id:string):any {
        return this.documentMap.get(id);
    }
}