/*
 Tribbb. A reverse text index for JS documents.

 documents are JS objects with arbitrary fields. an instance of the indexer is configured with the ids of the
 fields to index.

 your JSON data must either have an 'id' field for each document, or you must supply your own 'idFunction' which
 can be used to derive an id for each document.

 each required field is first tokenized, using the active tokenizer. the default tokenizer splits by whitespace,
 and also strips out commas and other punctuation from tokens. you can supply your own tokenizer - it should be
 a function that takes a string and returns an array of strings.

 the tokens from each field are then inserted into the index, which consists of nodes that have a list of associated
 documents and a list of child nodes. well, actually, a map of child nodes, because it's more efficient when traversing
 the tree to organise the child nodes like that.  each node represents a single character, and the keys of each node
 in the child map are also characters. so say we have indexed cat, catheter, car and cow. we'd have a tree like this:

 c
 / 				\
 a   			 o
 / 		\			 |
 t (cat)   r (car)		 w (cow)
 |
 h
 |
 e
 |
 t
 |
 e
 |
 r (catheter)


 */
;
(function () {

    var exports = this;
    exports.Tribbb = {
        Tokenizers: {},
        Sorters: {}
    };

    var applyCaseSensitivity = function (token, caseSensitive) {
        if (caseSensitive)
            return token;
        else
            return token.toLowerCase();
    };

    var fastTrim = function (s) {
        var str = s.replace(/^\s\s*/, ''),
            ws = /\s/,
            i = str.length;
        while (ws.test(str.charAt(--i)));
        return str.slice(0, i + 1);
    };

    // default tokenizer splits by whitespace, and then removes non-word characters from each token,
    // making each token lower case. it also adds series' of up to three consecutive words, for instance the phrase
    //
    // the quick brown fox
    //
    // would result in these tokens being added:
    //
    // the
    // the quick
    // the quick brown
    // quick brown fox
    // brown fox
    // fox
    //
    var defaultTokenizer = exports.Tribbb.Tokenizers.WhitespaceTokenizer = function (value) {
        value = new String(value);
        var parts = value.split(/\s/), out = [ ];

        var queue = [], queueSize = 4;

        for (var i = 0; i < parts.length; i++) {
            var s = fastTrim(parts[i].replace(/[^\w]*/, ""));
            if (s.length > 0) {
                out.push(s);
                queue.unshift(s);
                queue.splice(queueSize - 1);
                if (queue.length > 1) {
                    queue.reverse();
                    out.push(queue.join(" "));
                    queue.reverse();
                }
            }
        }

        // there might be values left in queue. we snip the head value one at a time and if there's still more than one value, we write the phrase
        queue.pop();

        while(queue.length > 1) {
            queue.reverse();
            out.push(queue.join(" "));
            queue.reverse();
            queue.pop();
        }

        return out;
    };

    exports.Tribbb.Tokenizers.WhitespaceReplacingTokenizer = function (value) {
        value = fastTrim(value);
        return [ value.replace(/\s/g, "_") ];
    };

    var defaultSearchTokenizer = exports.Tribbb.Tokenizers.DefaultTokenizer = function (value) {
        return [ fastTrim(value) ];
    };

    // the default id function just looks for an 'id' member.
    var defaultIdFunction = function (obj) {
        return obj.id;
    };

    // default sorter.
    exports.Tribbb.Sorters.ByScoreSorter = function (a, b) {
        return (a.score > b.score) ? -1 : 1;
    };

    var ListInsert = function (list, value, compare) {
        if (list.length === 0) {
            list.push(value);
            return;
        }
        var _i = function (start, end) {
            var idx = start + Math.floor((end - start) / 2),
                val = list[idx],
                comp = compare(val, value),
                comp2;

            if (comp === 0) {
                list.splice(idx, 0, value);
                return;
            }
            else if (comp === -1) {
                // list value is less than value to insert.
                // if value is the last value, push to end and return.
                if (idx === list.length - 1) {
                    list.push(value);
                    return;
                }
                else {
                    comp2 = compare(list[idx + 1], value);
                    if (comp2 !== comp) {
                        list.splice(idx + 1, 0, value);
                        return;
                    }
                }
                _i(idx + 1, end);
            }
            else {
                // list value is greater than value to insert.
                // if idx was zero, push value to head and return
                if (idx === 0) {
                    list.unshift(value);
                    return;
                }
                else {
                    comp2 = compare(list[idx - 1], value);
                    if (comp2 !== comp) {
                        list.splice(idx, 0, value);
                        return;
                    }
                }
                _i(start, start + Math.floor((end - start) / 2));
            }
        };

        _i(0, list.length - 1);

    };

    /*
     A reverse text indexer.

     Params:

     fields                     array of field names to index, optional, defaults to everything.
     tokenizer                  function to use to tokenize field values; optional, defaults to a tokenizer that splits on whitespace
     searchTokenizer            function to use to tokenize the search input. optional. defaults to a tokenizer that converts all whitespace in the search term to underscores (and which does not split
                                by whitespace...)
     idFunction                 optional function to use to extract an id for any given document. defaults to returning the document's "id" member.
     limit                      optional limit to the number of documents returned. default is 10.
     caseSensitive              optional, defaults to false.
     sort                       optional function to use for sorting a list of results.
     url                        optional url for initial data.
     onDataLoaded               optional callback for when the data has been loaded.
     data                       optional initial data as an array of documents
     index                      optional previously serialized index
     exclusions                 optional array of field names for fields that should be excluded from storage. Often you'll want to tokenize some field
                                but not actually store the whole thing in the index.
     */
    exports.Tribbb.Index = function (params) {
        params = params || {};

        var fields = params.fields,
            _nodeIdx = 0,
            _makeNode = function () {
                return { index: _nodeIdx++, children: {}, documentIds: {} };
            },
            root = _makeNode(),
            tokenizer = params.tokenizer || defaultTokenizer,
            searchTokenizer = params.searchTokenizer || defaultSearchTokenizer,
            documentMap = {},
            documentList = [],
            idFunction = params.idFunction || defaultIdFunction,
            limit = params.limit || 10,
            caseSensitive = params.caseSensitive,
            documentCount = 0,
            // nodeMap maps document ids to lists of nodes containing a reference to that document.
            nodeMap = {},
            self = this,
            exclusions = params.exclusions || [];

        // helper method to store a node reference for some document
        var storeNodeReferenceForDocument = function (docId, node) {
            var nodes = nodeMap[docId];
            if (!nodes) {
                nodes = {};
                nodeMap[docId] = nodes;
            }
            nodes[node.index] = node;
        };

        // add a token to the index.
        var _addToken = function (token, docId) {

            var _oneLevel = function (node, idx, token, docId) {
                // if at the end of the token, we are done.
                if (idx === token.length) return;
                // otherwise, get the char for this index
                var c = token[idx],
                    // see if this node already has a child for that char
                    child = node.children[c];
                // if not, create it
                if (!child) {
                    child = _makeNode();
                    node.children[c] = child;
                }
                // add this doc id to the list for this node, since we have traversed through it.
                child.documentIds[docId] = true;
                // store a reference to this node in the docId->node map.
                storeNodeReferenceForDocument(docId, child);
                _oneLevel(child, idx + 1, token, docId);
            };

            _oneLevel(root, 0, token, docId);
        };

        var removeExclusions = function(doc) {
            var out = {};
            for (var k in doc) {
                if (exclusions.indexOf(k) === -1) {
                    out[k] = doc[k];
                }
            }
            return out;
        };

        // add a document
        this.add = function (doc) {
            var _a = function (doc) {

                var docToWrite = removeExclusions(doc);

                // add to list
                ListInsert(documentList, {document: docToWrite, score: 1}, _chooseSorter());

                var docId = idFunction(doc),
                    // two ways of looping: if field ids provided, use them. otherwise loop through all fields in document.
                    _loopers = {
                        "fields": function (f) {
                            for (var i = 0; i < fields.length; i++) {
                                var v = doc[fields[i]];
                                f(v);
                            }
                        },
                        "document": function (f) {
                            for (var i in doc) {
                                if (i !== "id") f(doc[i]);
                            }
                        }
                    };

                documentMap[docId] = docToWrite;

                // loop through all the fields we need to and index.
                _loopers[fields ? "fields" : "document"](function (v) {
                    if (v) {
                        var tokens = tokenizer(v);
                        for (var j = 0; j < tokens.length; j++)
                            _addToken(applyCaseSensitivity(tokens[j], caseSensitive), docId);
                    }
                });

                documentCount++;
            };
            if (doc.constructor === Array) {
                for (var i = 0; i < doc.length; i++)
                    _a(doc[i]);
            }
            else _a(doc);
        };

        this.addAll = function (docs__) {
            for (var i = 0; i < arguments.length; i++) {
                this.add(arguments[i]);
            }
        };

        //
        // re-index a document - you would call this after the document's contents had changed. this function first
        // removes the document from the index and then re-adds it.
        //
        this.reindex = function (doc) {
            self.remove(doc);
            self.add(doc);
        };

        //
        // remove a document from the index. This is quite an expensive operation, since it has to traverse the entire
        // tree to search for the document in every node. perhaps there are things we could do to make this run more
        // quickly...like keep a docId->nodelist map
        //
        this.remove = function (doc) {
            var docId = idFunction(doc),
                nodes = nodeMap[docId],
                i;

            if (nodes) {
                for (i in nodes) {
                    delete nodes[i].documentIds[docId];
                }
            }

            var idx = -1;
            for (i = 0; i < documentList.length; i++) {
                var id = idFunction(documentList[i].document);
                if (id === docId) {
                    idx = i;
                    break;
                }
            }
            if (idx !== -1) {
                documentList.splice(idx, 1);
                documentCount = documentList.length;
            }

            delete documentMap[docId];
        };

        /**
         * @method clear
         * clears all documents.
         */
        this.clear = function () {
            documentMap = {};
            nodeMap = {};
            _nodeIdx = 0;
            documentList = [];
            documentCount = 0;
            root = _makeNode();
        };

        /**
         * @method getDocumentCount
         * gets the number of documents in the index
         * @returns {number}
         */
        this.getDocumentCount = function () {
            return documentCount;
        };

        /**
         * @method getDocumentList
         * Gets all documents, sorted according to the way search results are sorted.
         * @returns {Array<T>}
         */
        this.getDocumentList = function () {
            return documentList;
        };

        /**
         * @method getDocument
         * Gets a specific document, by its id.
         * @param {string} id ID of the document to retrieve
         * @returns {T}
         */
        this.getDocument = function (id) {
            return documentMap[id];
        };

        // pick a suitable sort function.
        var _chooseSorter = function () {
            return params.sort ? params.sort : exports.Tribbb.Sorters.ByScoreSorter;
        };
        // helper to sort a list of docs.
        var _sortDocs = function (docs) {
            docs.sort(_chooseSorter());
        };

        /**
         * @method search
         * search the index
         * @param {string} q
         * @returns {Array<Hit>}
         */
        this.search = function (q) {
            var tokens = searchTokenizer(q),
                idMap = {}, docs = [], scores = {},
                hit = function (docId, token) {
                    var d = idMap[docId];
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
                _oneToken = function (node, idx, token) {
                    if (idx === token.length) {
                        for (var i in node.documentIds) {
                            if (node.documentIds.hasOwnProperty(i))
                                hit(i, token);
                        }
                        return;
                    }
                    var c = token[idx];
                    if (node.children[c]) {
                        // recurse down a level
                        _oneToken(node.children[c], idx + 1, token);
                    }
                };

            // process each token
            for (var i = 0; i < tokens.length; i++) {
                _oneToken(root, 0, applyCaseSensitivity(tokens[i], caseSensitive));
            }

            // retrieve the documents.
            for (var j in idMap)
                docs.unshift({document: documentMap[j], score: scores[j]});

            _sortDocs(docs);
            return docs.slice(0, limit);
        };

        /**
         * @method serialize
         * @returns {SerializedIndex} The index, serialized, in a format that `deserialize` can make sense of.
         */
        this.serialize = function() {
            return {
                list:documentList,
                root:root
            }
        };

        //
        // populate the node cache we use when removing documents
        var populateNodeMapFromNode = function(node) {
            for (var docId in node.documentIds) {
                storeNodeReferenceForDocument(docId, node);
            }

            for (var childId in node.children) {
                var child = node.children[childId];
                populateNodeMapFromNode(child);
            }
        };

        /**
         * @method deserialize
         * @param {SerializedIndex} d Data from a previous `serialize()` call on a Tribbb index
         */
        this.deserialize = function(d) {
            documentList = d.list;
            documentCount = documentList.length;

            documentMap = {};
            for (var i = 0; i < documentList.length; i++) {
                documentMap[idFunction(documentList[i])] = documentList[i];
            }

            root = d.root;
            nodeMap = {};
            populateNodeMapFromNode(root);
        };


        if (params.data) {
            for (var i = 0; i < params.data.length; i++) {
                this.add(params.data[i]);
            }
        } else if (params.index) {
            this.deserialize(params.index);
        }

    };
}).call(this);