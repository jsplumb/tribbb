;(function() {
    var index;
    QUnit.module("tribbb");

    test("simple search, default settings", function() {
        var index = new Tribbb.Index({
            data:TestJSON
        });

        var docs = index.search("A2");
        equal(docs.length, 1, "1 doc found");

        docs = index.search("A");
        equal(docs.length, 10, "10 docs found");
    });

}).call(typeof window === "undefined" ? this : window);
