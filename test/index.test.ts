const tribbb = require("../dist/tribbb.js");

const TestJSON = [
    {
        "name": "A2",
        "id": "A2"
    },
    {
        "name": "A0100B",
        "id": "A0100B"
    },
    {
        "name": "A0020",
        "id": "A0020"
    },
    {
        "name": "A0101A",
        "id": "A0101A"
    },
    {
        "name": "A0021",
        "id": "A0021"
    },
    {
        "name": "A0100A",
        "id": "A0100A"
    },
    {
        "name": "A0100C",
        "id": "A0100C"
    },
    {
        "name": "A1601A",
        "id": "A1601A"
    },
    {
        "name": "A0103A",
        "id": "A0103A"
    },
    {
        "name": "A0101B",
        "id": "A0101B"
    }
];

test('index tests', () => {

    const index = new tribbb.Index({
        data:TestJSON
    });

    expect(index.getDocumentCount()).toBe(10);

    let docs = index.search("A2");
    expect(docs.length).toBe(1);
    expect(docs[0].document.name).toBe("A2");

    docs = index.search("A");
    expect(docs.length).toBe(10);
    expect(docs[0].document.name).toBe("A2");
    expect(docs[1].document.name).toBe("A0100B");

    index.remove(docs[0].document);
    docs = index.search("A2");
    expect(docs.length).toBe(0);

    expect(index.getDocumentCount()).toBe(9);
});
