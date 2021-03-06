import * as child_process from 'child_process';
import * as csv_parse from 'csv-parse/lib/sync';
import { logger } from '../logging/logger';
import { splitNotInString, replaceEscapedOctetsWithChar } from '../utils/utils';
import { platform } from 'os';

/* regex */
const reNewLine = /(?!\B\"[^\"]*)\n(?![^\"]*\"\B)/g; // match new lines not in quotes

export class SQLite {

    static query(cmdSqlite: string, dbPath: string, query: string, outputBuffer: number, callback: (rows: Object[], err?:Error) => void) {
        query = this.sanitizeQuery(query);
        
        const args = [
            `"${dbPath}"`, `"${query}"`,
            `-header`, // print the headers before the result rows
            `-nullvalue "NULL"`, // print NULL for null values
            `-echo`, // print the statement before the result
            `-cmd ".mode tcl"`, // execute this command before the query, in mode tcl each field is in double quotes
            ];
            
        const cmd = `${cmdSqlite} ${args.join(' ')}`;
        logger.debug(`[QUERY CMD] ${cmd}`);

        child_process.exec(cmd, {maxBuffer: outputBuffer}, (err: Error, stdout: string, stderr: string) => {
            if (err) {
                callback([], this.parseError(err.message));
            } else {
                callback(this.parseOutput(stdout), undefined);
            }
        });
    }

    static querySync(cmdSqlite: string, dbPath: string, query: string, outputBuffer: number): Object[] | Error {
        query = this.sanitizeQuery(query);
        
        const args = [
            `"${dbPath}"`, `"${query}"`,
            `-header`, // print the headers before the result rows
            `-nullvalue "NULL"`, // print NULL for null values
            `-echo`, // print the statement before the result
            `-cmd ".mode tcl"`, // execute this command before the query, in mode tcl each field is in double quotes
            ];
            
        const cmd = `${cmdSqlite} ${args.join(' ')}`;
        logger.debug(`[QUERY CMD] ${cmd}`);

        try {
            let stdout = child_process.execSync(cmd, {maxBuffer: outputBuffer});
            return this.parseOutput(stdout.toString());
        } catch(err) {
            return this.parseError(err.message);
        }
    }

    /**
     * replace " with \"
     */
    private static sanitizeQuery(query: string) {
        query = query.replace(/\"/g, '\\"');
        return query;
    }

    public static parseError(message: string): Error {
        let lines = message.split(reNewLine);
        for (var i=0; i<lines.length; i++) {
            if (lines[i].startsWith('Error')) {
                return new Error(lines[i]);
            }
        }
        // overwrite "max output buffer exceeded" error message
        if (message.startsWith("stdout")) {
            message += ": increase setting sqlite.outputBuffer value to display this table.";
        }
        return Error(message);
    }

    // TODO: refactor this part and maybe move it in its own module
    public static parseOutput(output: string) {
        let data: Object[] = [];

        let splitChar = platform() === 'win32'? '\r\n' : '\n';
        let lines = splitNotInString(splitChar, output);
        lines = lines.filter(line => line.trim() !== '');
        
        let stmt = '';
        let rowsStr: string | null = null;
        for (var index = 0; index < lines.length; index++) {
            let line = lines[index];
            let prev = index > 0? lines[index-1] : null;

            if (line.startsWith('"')) {
                if (rowsStr) {
                    rowsStr = rowsStr+'\n'+line;
                } else {
                    rowsStr = line;
                }
                // if its the last line push stmt and rows
                if (index === lines.length-1) {
                    let csv_parse_options = {delimiter: ' ', quote: '"', escape: '\\'};
                    let rows = rowsStr? csv_parse(rowsStr, csv_parse_options) : [];
                    rows = rows.map((row: string[]) => row.map(field => replaceEscapedOctetsWithChar(field)));
                    data.push({stmt: stmt, rows: rows});
                }
            } else {
                // push previous (if there is) stmt and rows to data
                if (prev) {
                    let csv_parse_options = {delimiter: ' ', quote: '"', escape: '\\'};
                    let rows = rowsStr? csv_parse(rowsStr, csv_parse_options) : [];
                    rows = rows.map((row: string[]) => row.map(field => replaceEscapedOctetsWithChar(field)));
                    data.push({stmt: stmt, rows: rows});
                    rowsStr = null;
                }
                stmt = line;
                // if its the last line push stmt without rows
                if (index === lines.length-1) {
                    data.push({stmt: stmt, rows: []});
                }
            }

        }

        return data;
    }

}