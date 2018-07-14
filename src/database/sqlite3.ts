import * as child_process from 'child_process';
import { logger } from '../logging/logger';
import { replaceEscapedOctetsWithChar } from '../utils/utils';

export class SQLite {

    static query(cmdSqlite: string, dbPath: string, query: string, outputBuffer: number, callback: (rows: Object[], err?:Error) => void) {
        query = this.sanitizeQueryForExec(query);
        
        const args = [
            `"${dbPath}"`, `"${query}"`,
            `-header`, // print the headers before the result rows
            `-nullvalue "NULL"`, // print NULL for null values
            `-echo`, // print the statement before the result
            `-cmd ".mode tcl"`, // execute this command before the query, in mode tcl each field is in double quotes
            ];
            
        const cmd = `${cmdSqlite} ${args.join(' ')}`;
        logger.debug(`[QUERY CMD] ${cmd}`);
        let queryStart = Date.now();

        child_process.exec(cmd, {maxBuffer: outputBuffer}, (err: Error, stdout: string, stderr: string) => {
            let queryEnd = Date.now();
            if (err) {
                callback([], parseError(err.message));
            } else {
                callback(parseOutput(stdout), undefined);
            }
            logger.debug("Time query: "+(queryEnd-queryStart));
            logger.debug("Time query+parse: "+(Date.now()-queryStart));
        });
    }

    static querySync(cmdSqlite: string, dbPath: string, query: string, outputBuffer: number): Object[] | Error {
        query = this.sanitizeQueryForExec(query);
        
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
            return parseOutput(stdout.toString());
        } catch(err) {
            return parseError(err.message);
        }
    }

    /**
     * replace " with \"
     */
    private static sanitizeQueryForExec(query: string) {
        query = query.replace(/\"/g, '\\"');
        return query;
    }
}


export function parseError(err: string) {
    let lines = err.split(/(?!\B\"[^\"]*)\n(?![^\"]*\"\B)/g);
    for (var i=0; i<lines.length; i++) {
        if (lines[i].startsWith('Error')) {
            return new Error(lines[i]);
        }
    }
    // overwrite "max output buffer exceeded" error message
    if (err.startsWith("stdout")) {
        err += ": increase setting sqlite.outputBuffer value to display this table.";
    }
    return Error(err);
}

export function parseOutput(stdout: string) {
    let data: Object[] = [];
    let stmt: string = "";
    let rows: string[][] = [];
    let isInStmt: boolean = true;
    let isInString: boolean = false;
    let stringChar: string = "";

    for(let i=0; i<stdout.length; i++) {
        let char = stdout[i];
        let prevChar = (n?: number) => {
            n = Math.abs(n!==undefined? n : 1);
            return i-n >= 0? stdout[i-n] : "";
        };
        let nextChar = (n?: number) => {
            n = Math.abs(n!==undefined? n : 1);
            return i+n < stdout.length? stdout[i+n] : "";
        };

        if (isInStmt) {
            // start of string
            if (!isInString && (char === `"` || char === `'`)) {
                stmt += char;
                isInString = true;
                stringChar = char;
                continue;
            }
            // end of string
            if (isInString && char === stringChar) {
                stmt += char;
                isInString = false;
                stringChar = "";
                continue;
            }
            // end of stmt
            if (!isInString && char === `;`) {
                stmt += char;
                isInStmt = false;
                if (nextChar() === "") {
                    // end of output
                    data.push({stmt: stmt, rows: rows});
                }
                continue;
            }

            stmt += char;
        } else {
            // start of new statement (case: no result)
            if (!isInString && char !== `"` && prevChar() === `\n`) {
                data.push({stmt: stmt, rows: rows});
                stmt = char;
                rows = [];
                isInStmt = true;
                continue;
            }
            // first field of row
            if (!isInString && char === `"` && prevChar() === `\n`) {
                isInString = true;
                rows.push([]);
                rows[rows.length-1].push("");
                continue;
            }
            // start of field
            if (!isInString && char === `"` && prevChar() === ` `) {
                isInString = true;
                rows[rows.length-1].push("");
                continue;
            }
            // end of field
            if (isInString && char === `"` && prevChar() !== `\\`) {
                isInString = false;
                
                let row = rows[rows.length-1];
                row[row.length-1] = replaceEscapedOctetsWithChar(row[row.length-1]);

                if (nextChar() === "") {
                    // end of output
                    data.push({stmt: stmt, rows: rows});
                }
                continue;
            }
            // inside field
            if (isInString) {
                let row = rows[rows.length-1];
                row[row.length-1] += char;
                continue;
            }
            // end of row and end of query result
            if (!isInString && char === `\n` && nextChar() !== `"`) {
                data.push({stmt: stmt, rows: rows});
                stmt = "";
                rows = [];
                isInStmt = true;
                continue;
            }
        }
    }

    return data;
}