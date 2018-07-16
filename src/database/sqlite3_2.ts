import * as child_process from 'child_process';
import { StdoutStreamParser, StdoutParser } from './stdoutParser';
import { logger } from '../logging/logger';

// output object of SQLite.querySync
interface OutputObject {
    error?: Error;
    output: Object[];
}

export class SQLite {

    static query(cmdSqlite: string, dbPath: string, query: string, callback: (obj: Object[], err?: Error) => void) {
        // for debugging purposes
        let queryStart = Date.now();

        let args = [
            `${dbPath}`, `${query}`,
            `-header`, // print the headers before the result rows
            `-nullvalue`, `NULL`, // print NULL for null values
            `-echo`, // print the statement before the result
            `-cmd`, `.mode tcl`, // execute this command before the query, in mode tcl each field is in double quotes
            ];

        let proc = child_process.spawn(cmdSqlite, args, {stdio: ['ignore', "pipe", "pipe" ]});

        let stdoutParser = new StdoutStreamParser();
        proc.stdout.pipe(stdoutParser);

        proc.stderr.once('data', (err) => {
            stdoutParser.removeAllListeners();
            callback([], Error(err.toString().trim()));
        });

        proc.once('error', (err) => {
            stdoutParser.removeAllListeners();
            callback([], Error(err.toString().trim()));
        });

        stdoutParser.once('finish', () => {
            logger.debug(`Time: ${Date.now() - queryStart}`);

            let out = stdoutParser.done();
            callback(out);
        });
    }

    static querySync(cmdSqlite: string, dbPath: string, query: string) {
        // for debugging purposes
        let queryStart = Date.now();

        let args = [
            `${dbPath}`, `${query}`,
            `-header`, // print the headers before the result rows
            `-nullvalue`, `NULL`, // print NULL for null values
            `-echo`, // print the statement before the result
            `-cmd`, `.mode tcl`, // execute this command before the query, in mode tcl each field is in double quotes
            ];

        let ret = child_process.spawnSync(cmdSqlite, args, {stdio: ['ignore', "pipe", "pipe" ]});
        
        if (ret.error) {
            let err = Error(ret.error.toString().trim());
            return {error: err, output: []} as OutputObject;
        } else if (ret.stderr.byteLength) {
            let err = Error(ret.stderr.toString().trim());
            return {error: err, output: []} as OutputObject;
        } else {
            let stdoutParser = new StdoutParser();
            stdoutParser.parse(ret.stdout.toString());
            let output = stdoutParser.done();
            logger.debug(`Time: ${Date.now() - queryStart}`);

            return {output: output} as OutputObject;
        }
    }
}