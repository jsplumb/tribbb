;(function() {
    var index;
    QUnit.module("tribbb");

    test("simple search, default settings", function() {
        var index = new Tribbb.Index({
            data:TestJSON
        });

        equal(index.getDocumentCount(), 10, "there are 10 docs in the indexer");

        var docs = index.search("A2");
        equal(docs.length, 1, "1 doc found");
        equal(docs[0].document.name, "A2", "name of first document matches");

        docs = index.search("A");
        equal(docs.length, 10, "10 docs found");
        equal(docs[0].document.name, "A2", "name of first document matches");
        equal(docs[1].document.name, "A0100B", "name of second document matches");

        index.remove(docs[0].document);
        docs = index.search("A2");
        equal(docs.length, 0, "0 docs found");

        equal(index.getDocumentCount(), 9, "there are now 9 docs in the indexer");

    });

}).call(typeof window === "undefined" ? this : window);
