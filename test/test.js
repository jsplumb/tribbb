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


    test("serialize/deserialise", function() {
        var t = new Tribbb.Index({
            fields:["content"],
            idFunction:function(entry) { return entry.articleUrl },
            exclusions:["content"]
        });

        var d1 = {
            articleUrl:"foo",
            content:"the quick brown fox",
            categoryUrl:"shazam"
        }, d2 = {
            articleUrl:"baz",
            content:"jumps over the lazy dog",
            categoryUrl:"shazam"
        };

        t.add(d1);

        t.add(d2);

        var index = t.serialize();

        equal(t.search("lazy").length, 1, "1 result from original index for 'lazy'");
        equal(t.search("the quick").length, 1, "1 result from original index for 'the quick'");
        equal(t.search("the quick brown").length, 1, "1 result from original index for 'the quick brown'");
        equal(t.search("the quick brown fox").length, 0, "0 results from original index for 'the quick brown fox' - too many words, limit is 3");
        equal(t.search("lazy dog").length, 1, "1 result from original index for 'lazy dog'");

        // make a new index and deserialize the previous one into it; then run a search, we should get the same results.
        var tt = new Tribbb.Index({
            fields:["content"],
            idFunction:function(entry) { return entry.articleUrl },
            exclusions:["content"]
        });

        tt.deserialize(index);
        equal(tt.search("lazy").length, 1, "1 result from index loaded via deserialize for 'lazy'");

        // make a 2nd new index, passing in the serialized data to the constructor, then search it

        var ttt = new Tribbb.Index({
            fields:["content"],
            idFunction:function(entry) { return entry.articleUrl },
            exclusions:["content"],
            index:index
        });

        equal(ttt.search("lazy").length, 1, "1 result from index loaded via constructor for 'lazy'");

        // ---------------- remove d2 from the first index; the previous search should now return no results
        t.remove(d2);
        equal(t.search("lazy").length, 0, "0 results from original index for 'lazy' after doc removal");

        // ---------------- remove d2 from the second index; the previous search should now return no results
        tt.remove(d2);
        equal(tt.search("lazy").length, 0, "0 results from index loaded via deserialize for 'lazy' after doc removal");

        // ---------------- remove d2 from the third index; the previous search should now return no results
        ttt.remove(d2);
        equal(ttt.search("lazy").length, 0, "0 results from index loaded via constructor for 'lazy' after doc removal");
    });

}).call(typeof window === "undefined" ? this : window);
