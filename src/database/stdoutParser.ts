import { Writable } from "stream";
import { replaceEscapedOctetsWithChar } from "../utils/utils";

export class StdoutStreamParser extends Writable {

    private stdoutParser: StdoutParser;

    constructor() {
        super();
        this.stdoutParser = new StdoutParser();
    }
    
    _write(chunk: any, encoding: string, callback: (err?: Error) => void) {
        this.stdoutParser.parse(chunk.toString());
        callback();
    }

    done() {
        return this.stdoutParser.done();
    }
}

export class StdoutParser {
    private obj: Object[];
    private stmt: string;
    private rows: string[][];
    private isInStmt: boolean;
    private isInString: boolean;
    private stringChar: string;

    constructor() {
        this.obj = [];
        this.stmt = "";
        this.rows = [];
        this.isInStmt = true;
        this.isInString = false;
        this.stringChar = "";
    }

    done() {
        this.obj.push({ stmt: this.stmt, rows: this.rows });
        return this.obj;
    }

    parse(data: string) {
        for (let i = 0; i < data.length; i++) {
            let char = data[i];
            let prevChar = (n?: number) => {
                n = Math.abs(n !== undefined ? n : 1);
                return i - n >= 0 ? data[i - n] : "";
            };

            if (this.isInStmt) {
                // start of string (we don't want semicolons in a string)
                if (!this.isInString && (char === `"` || char === `'`)) {
                    this.stmt += char;
                    this.isInString = true;
                    this.stringChar = char;
                    continue;
                }
                // end of string
                if (this.isInString && char === this.stringChar) {
                    this.stmt += char;
                    this.isInString = false;
                    this.stringChar = "";
                    continue;
                }
                // end of stmt
                if (!this.isInString && char === `;`) {
                    this.stmt += char;
                    this.isInStmt = false;
                    continue;
                }

                this.stmt += char;
            } else {
                // end of rows and start of new stmt
                if (!this.isInString && char !== `"` && prevChar() === `\n`) {
                    this.obj.push({ stmt: this.stmt, rows: this.rows });
                    this.stmt = char;
                    this.rows = [];
                    this.isInStmt = true;
                    continue;
                }
                // first field of row
                if (!this.isInString && char === `"` && prevChar() === `\n`) {
                    this.isInString = true;
                    this.rows.push([]);
                    this.rows[this.rows.length - 1].push("");
                    continue;
                }
                // start of field
                if (!this.isInString && char === `"` && prevChar() === ` `) {
                    this.isInString = true;
                    this.rows[this.rows.length - 1].push("");
                    continue;
                }
                // end of field
                if (this.isInString && char === `"` && prevChar() !== `\\`) {
                    this.isInString = false;

                    let row = this.rows[this.rows.length - 1];
                    row[row.length - 1] = replaceEscapedOctetsWithChar(row[row.length - 1]);

                    continue;
                }
                // if the string contains \" (escaped quote)
                // we just write the " (quote) without the escaped char
                if (this.isInString && char === `"` && prevChar() === `\\`) {
                    let row = this.rows[this.rows.length - 1];
                    // remove escape char
                    row[row.length - 1] = row[row.length - 1].slice(0,-1);
                    // add quote char
                    row[row.length - 1] += char;
                    continue;
                }
                // inside field
                if (this.isInString) {
                    let row = this.rows[this.rows.length - 1];
                    row[row.length - 1] += char;
                    continue;
                }
            }
        }
    }
}