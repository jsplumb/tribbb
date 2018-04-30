(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.Tribbb = {})));
}(this, (function (exports) { 'use strict';

    function fastTrim(input) {
        if (input == null) {
            return null;
        }
        else {
            const str = input.replace(/^\s\s*/, '');
            const ws = /\s/;
            let i = str.length;
            while (ws.test(str.charAt(--i))) { }
            return str.slice(0, i + 1);
        }
    }
    function applyCaseSensitivity(token, caseSensitive) {
        if (caseSensitive) {
            return token;
        }
        else {
            return token.toLowerCase();
        }
    }
    function defaultIdFunction(obj) {
        return obj.id;
    }
    function listInsert(list, value, sorter) {
        if (list.length === 0) {
            list.push(value);
            return;
        }
        function _i(start, end) {
            const idx = start + Math.floor((end - start) / 2);
            const val = list[idx];
            const comp = sorter.compare(val, value);
            if (comp === 0) {
                list.splice(idx, 0, value);
                return;
            }
            else if (comp === -1) {
                if (idx === list.length - 1) {
                    list.push(value);
                    return;
                }
                else {
                    const comp2 = sorter.compare(list[idx + 1], value);
                    if (comp2 !== comp) {
                        list.splice(idx + 1, 0, value);
                        return;
                    }
                }
                _i(idx + 1, end);
            }
            else {
                if (idx === 0) {
                    list.unshift(value);
                    return;
                }
                else {
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

    class WhitespaceTokenizer {
        tokenize(value) {
            value = "" + value;
            let spacesReplaced = value.replace(/\s/g, "_"), parts = value.split(/\s/), out = [spacesReplaced];
            for (let i = 0; i < parts.length; i++) {
                let s = fastTrim(parts[i].replace(/[^\w]*/, ""));
                if (s != null && s.length > 0) {
                    out.push(s);
                }
            }
            return out;
        }
    }
    class WhitespaceReplacingTokenizer {
        tokenize(value) {
            value = fastTrim(value);
            return [value.replace(/\s/g, '_')];
        }
    }

    class ByScoreSorter {
        compare(a, b) {
            return (a.score > b.score) ? -1 : 1;
        }
    }

    const DEFAULT_LIMIT = 10;
    class Index {
        constructor(params) {
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
        _makeNode() {
            return { index: this._nodeIndex++, children: new Map(), documentIds: new Map() };
        }
        _storeNodeReferenceForDocument(docId, node) {
            let nodes = this.nodeMap[docId];
            if (!nodes) {
                nodes = new Map();
                this.nodeMap.set(docId, nodes);
            }
            nodes.set(node.index, node);
        }
        _addToken(token, docId) {
            let _oneLevel = (node, idx, token, docId) => {
                if (idx === token.length) {
                    return;
                }
                let c = token[idx], child = node.children.get(c);
                if (!child) {
                    child = this._makeNode();
                    node.children.set(c, child);
                }
                child.documentIds.set(docId, true);
                this._storeNodeReferenceForDocument(docId, child);
                _oneLevel(child, idx + 1, token, docId);
            };
            _oneLevel(this.root, 0, token, docId);
        }
        add(obj) {
            let _a = (doc) => {
                listInsert(this.documentList, { document: doc, score: 1 }, this.sorter);
                let docId = this.idFunction(doc), _loopers = {
                    "fields": (f) => {
                        for (let i = 0; i < this.fields.length; i++) {
                            let v = doc[this.fields[i]];
                            f(v);
                        }
                    },
                    "document": (f) => {
                        for (let i in doc) {
                            if (i !== "id") {
                                f(doc[i]);
                            }
                        }
                    }
                };
                this.documentMap.set(docId, doc);
                _loopers[this.fields ? "fields" : "document"]((v) => {
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
        addAll(...docs) {
            docs.forEach(this.add);
        }
        remove(doc) {
            let docId = this.idFunction(doc), nodes = this.nodeMap.get(docId), i;
            if (nodes) {
                nodes.forEach((value, _) => {
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
        reindex(doc) {
            this.remove(doc);
            this.add(doc);
        }
        clear() {
            this.documentMap.clear();
            this.nodeMap.clear();
            this._nodeIndex = 0;
            this.documentList.length = 0;
            this.root = this._makeNode();
        }
        search(query) {
            let tokens = this.searchTokenizer.tokenize(query), idMap = {}, docs = [], scores = {}, hit = function (docId, token) {
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
            }, _oneToken = function (node, idx, token) {
                if (idx === token.length) {
                    node.documentIds.forEach((value, key) => {
                        if (value) {
                            hit(key, token);
                        }
                    });
                    return;
                }
                let c = token[idx];
                if (node.children.get(c)) {
                    _oneToken(node.children.get(c), idx + 1, token);
                }
            };
            tokens.forEach((token) => _oneToken(this.root, 0, applyCaseSensitivity(token, this.caseSensitive)));
            for (let j in idMap) {
                docs.unshift({ document: this.documentMap.get(j), score: scores[j] });
            }
            docs.sort(this.sorter.compare);
            return docs.slice(0, this.limit);
        }
        getDocumentCount() {
            return this.documentList.length;
        }
        getDocumentList() {
            return this.documentList;
        }
        getDocument(id) {
            return this.documentMap.get(id);
        }
    }

    exports.Index = Index;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
