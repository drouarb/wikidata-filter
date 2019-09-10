const parseLine = require('./lib/parse_line');
const entitySerializer = require('./lib/entity_serializer');
const wikidataFilter = require('./lib/wikidata_filter');

const { parentPort, workerData } = require("worker_threads");
const { TextDecoder, TextEncoder } = require('util');

const wdFilter = wikidataFilter(workerData);

function work(line) {
    const parsedLine = parseLine(line);
    if (!parsedLine)
        return null;
    const filtered = wdFilter(parsedLine);
    if (!filtered)
        return null;
    return entitySerializer(filtered);
}

const decoder = new TextDecoder('utf8');
const encoder = new TextEncoder();

parentPort.on("message", (lineBatch) => {
    let result = lineBatch
        .map((b) => decoder.decode(b))
        .map(l => work(l))
        .filter(l => l !== null);

    const encoded = encoder.encode(result.join(''));
    const encodedResult = new Uint8Array(new SharedArrayBuffer(encoded.length));
    encodedResult.set(encoded);

    parentPort.postMessage({
        processed: lineBatch.length,
        matched: result.length,
        result: encodedResult
    });
});


