'use strict';
const entityParser = require('./lib/entity_parser');
const entitySerializer = require('./lib/entity_serializer');
const wikidataFilter = require('./lib/wikidata_filter');

const readline = require('readline');
const os  = require('os');
const { StaticPool } = require("node-worker-threads-pool");
const EventEmitter = require('events');
const split = require('binary-split');

class Reader {
    constructor(quantity) {
        this.rl = readline.createInterface({
            input: process.stdin
        });
        this.rl = process.stdin.pipe(split());

        this.event = new EventEmitter();
        this.quantity = quantity;
        this.finished = false;
        this.buffer = [];
        this.waiting = [];

        this.rl.on('data', (line) => {
            // console.error(line);
            this.buffer.push(line);

            if (this.buffer.length >= this.quantity) {
                if (this.waiting.length)
                    this.event.emit(this.waiting.pop());
            }
            if (this.buffer.length >= quantity * 50) {
                //console.error('PAUSE');
                this.rl.pause();
            }
        });

        this.rl.on('end', () => {
            console.error('CLOSE');
            this.finished = true;
            this.waiting.forEach((w) => this.event.emit(w));
        })
    }

    async getLines(workerId) {
        if (!this.finished && this.buffer.length < this.quantity * 3) {
            //console.error('RESUME');
            this.rl.resume()
        }

        if (this.buffer.length < this.quantity) {
            if (this.finished) {
                if (this.buffer.length > 0) {
                    return this.buffer.splice(0, this.buffer.length);
                } else {
                    return null;
                }
            } else {
                // console.error('SLEEP')
                return new Promise(resolve => {
                    this.event.once(workerId, () => resolve(this.getLines()));
                    this.waiting.push(workerId);
                })
            }
        }

        return this.buffer.splice(0, this.quantity);
    }
}

let total = 0;
let totalMatched = 0;
let batchSize = 100;

// Get line batch and send it to a worker
async function workerHandler(id, reader, pool) {
    console.error('Starting worker ' + id);
    let lineBatch;
    while ((lineBatch = await reader.getLines(id)) !== null) {
        let result = await pool.exec(lineBatch);
        total += result.processed;
        totalMatched += result.matched;
        console.error(`Processed ${total}, found ${totalMatched}`);
        process.stdout.write(result.result);
    }
}

async function main() {
    const reader = new Reader(batchSize);
    const options = require('./lib/program')();

    const workerData = {
        type: options.type,
        claim: options.claim,
        sitelink: options.sitelink,
        omit: options.omit,
        languages: options.languages,
        simplify: options.simplify,
        keep: options.keep,
        progress: 'false'
    };

    const pool = new StaticPool({
        size: os.cpus().length,
        task: './worker.js',
        workerData
    });

    // Spawn a worker handler per thread
    await Promise.all(os.cpus().map((id) => workerHandler(id, reader, pool)));

    console.error('Done');
    pool.destroy();
}

main();
