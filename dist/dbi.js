import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url); // Get the full file path
const __dirname = path.dirname(__filename); // Get the directory name
const debugging = true;
if (debugging)
    sqlite3.verbose();
export default class dbi {
    constructor() {
        this.name = '';
        this.debug = true;
    }
    logSQL(statement, params = []) {
        if (this.debug) {
            console.log('Executing SQL:', statement);
            if (params.length > 0) {
                console.log('With parameters:', params);
            }
        }
    }
    validateSchema(schema) {
        // Mapping of SQLite extended type names to their corresponding affinities
        const validTypes = [
            'TEXT', 'INTEGER', 'REAL', 'BLOB', 'NUMERIC',
            'BOOLEAN', 'DATE', 'DATETIME', 'DECIMAL', 'CHAR',
            'VARCHAR', 'CLOB', 'FLOAT', 'DOUBLE', 'BIGINT',
            'TINYINT', 'SMALLINT'
        ];
        if (Object.keys(schema).length === 0) {
            console.error('Schema must have at least one column.');
            return false;
        }
        for (const type of Object.values(schema)) {
            // Extract the first word (type) and check against valid types
            const baseType = type.toUpperCase().split(' ')[0];
            if (!validTypes.includes(baseType)) {
                console.error(`Invalid column type: ${type}`);
                return false;
            }
        }
        return true;
    }
    createDB() {
        this.db = new sqlite3.Database(path.join(__dirname, this.name + '.db'), (err) => {
            if (err) {
                console.error('Error opening database:', err);
            }
            else {
                console.log('Connected to SQLite database');
            }
        });
    }
    async createTable(name, tableInfo) {
        if (!this.db) {
            console.error('Database is not initialized. Call createDB() first.');
            return false;
        }
        if (!this.validateSchema(tableInfo)) {
            console.error(`Schema validation failed for table "${name}".`);
            return false;
        }
        const columns = Object.entries(tableInfo)
            .map(([columnName, columnType]) => `${columnName} ${columnType}`)
            .join(', ');
        const sqlStatement = `CREATE TABLE IF NOT EXISTS ${name} (${columns})`;
        this.logSQL(sqlStatement); // Log SQL
        try {
            await new Promise((resolve, reject) => {
                this.db.run(sqlStatement, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
            console.log(`Table "${name}" created or already exists.`);
            return true;
        }
        catch (err) {
            if (err instanceof Error) {
                console.error(`Error creating table "${name}":`, err.message);
            }
            else {
                console.error(`Unknown error creating table "${name}":`, err);
            }
            return false;
        }
    }
    async addRow(tableName, row) {
        if (!this.db) {
            console.error('Database is not initialized. Call createDB() first.');
            return false;
        }
        const columns = Object.keys(row);
        const tableColumns = await this.getColumns(tableName);
        const placeholders = columns.map(() => '?').join(', ');
        const values = Object.values(row);
        if (columns.length === 0 || values.length === 0) {
            console.error('Row data is empty.');
            return false;
        }
        for (const column of columns) {
            if (!tableColumns.includes(column)) {
                console.error(`Column "${column}" does not exist in the table.`);
                return false; // Exit early
            }
        }
        const insertSQL = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        this.logSQL(insertSQL); // Log SQL
        try {
            const result = await new Promise((resolve, reject) => {
                this.db.run(insertSQL, values, function (err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(this.lastID); // `this` refers to the statement context
                    }
                });
            });
            console.log('Row added with ID:', result);
            return true;
        }
        catch (err) {
            if (err instanceof Error) {
                console.error('Error inserting row:', err.message);
            }
            else {
                console.error('Unknown error inserting row:', err);
            }
            return false;
        }
    }
    async updateRow(tableName, updates, conditions) {
        if (!this.db) {
            console.error('Database is not initialized. Call createDB() first.');
            return false;
        }
        const updateColumns = Object.keys(updates).map(col => `${col} = ?`).join(', ');
        const conditionColumns = Object.keys(conditions).map(col => `${col} = ?`).join(' AND ');
        const sqlStatement = `UPDATE ${tableName} SET ${updateColumns} WHERE ${conditionColumns}`;
        this.logSQL(sqlStatement); // Log SQL
        const values = [...Object.values(updates), ...Object.values(conditions)];
        try {
            await new Promise((resolve, reject) => {
                this.db.run(sqlStatement, values, function (err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
            console.log(`Row(s) updated in table "${tableName}".`);
            return true;
        }
        catch (err) {
            if (err instanceof Error) {
                console.error(`Error updating row(s) in table "${tableName}":`, err.message);
            }
            else {
                console.error(`Unknown error updating row(s) in table "${tableName}":`, err);
            }
            return false;
        }
    }
    async deleteRow(tableName, conditions) {
        if (!this.db) {
            console.error('Database is not initialized. Call createDB() first.');
            return false;
        }
        const conditionColumns = Object.keys(conditions).map(col => `${col} = ?`).join(' AND ');
        const sqlStatement = `DELETE FROM ${tableName} WHERE ${conditionColumns}`;
        this.logSQL(sqlStatement); // Log SQL
        const values = Object.values(conditions);
        try {
            await new Promise((resolve, reject) => {
                this.db.run(sqlStatement, values, function (err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
            console.log(`Row(s) deleted from table "${tableName}".`);
            return true;
        }
        catch (err) {
            if (err instanceof Error) {
                console.error(`Error deleting row(s) from table "${tableName}":`, err.message);
            }
            else {
                console.error(`Unknown error deleting row(s) from table "${tableName}":`, err);
            }
            return false;
        }
    }
    async queryRows(tableName, conditions) {
        if (!this.db) {
            console.error('Database is not initialized. Call createDB() first.');
            return [];
        }
        let sqlStatement = `SELECT * FROM ${tableName}`;
        this.logSQL(sqlStatement); // Log SQL
        const values = [];
        if (conditions) {
            const conditionColumns = Object.keys(conditions)
                .map(col => `${col} = ?`)
                .join(' AND ');
            sqlStatement += ` WHERE ${conditionColumns}`;
            values.push(...Object.values(conditions));
        }
        try {
            const rows = await new Promise((resolve, reject) => {
                this.db.all(sqlStatement, values, (err, rows) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(rows);
                    }
                });
            });
            return rows;
        }
        catch (err) {
            if (err instanceof Error) {
                console.error(`Error querying rows from table "${tableName}":`, err.message);
            }
            else {
                console.error(`Unknown error querying rows from table "${tableName}":`, err);
            }
            return [];
        }
    }
    async dropTable(tableName) {
        if (!this.db) {
            console.error('Database is not initialized. Call createDB() first.');
            return false;
        }
        const sqlStatement = `DROP TABLE IF EXISTS ${tableName}`;
        this.logSQL(sqlStatement); // Log SQL
        try {
            await new Promise((resolve, reject) => {
                this.db.run(sqlStatement, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
            console.log(`Table "${tableName}" dropped successfully.`);
            return true;
        }
        catch (err) {
            if (err instanceof Error) {
                console.error(`Error dropping table "${tableName}":`, err.message);
            }
            else {
                console.error(`Unknown error dropping table "${tableName}":`, err);
            }
            return false;
        }
    }
    getColumns(tableName) {
        return new Promise((resolve, reject) => {
            const query = `PRAGMA table_info(${tableName})`;
            this.logSQL(query); // Log SQL
            this.db.all(query, (err, rows) => {
                if (err) {
                    console.error('Error fetching table info:', err.message);
                    reject(err);
                }
                else {
                    const columns = rows.map((row) => row.name); // Extract column names
                    resolve(columns);
                }
            });
        });
    }
    async batchInsert(tableName, rows) {
        if (!this.db) {
            console.error('Database is not initialized. Call createDB() first.');
            return false;
        }
        if (rows.length === 0) {
            console.error('No rows provided for batch insert.');
            return false;
        }
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const sqlStatement = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        this.logSQL(sqlStatement); // Log SQL
        try {
            await new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    const stmt = this.db.prepare(sqlStatement);
                    rows.forEach((row) => {
                        stmt.run(Object.values(row), (err) => {
                            if (err)
                                reject(err);
                        });
                    });
                    stmt.finalize((err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                });
            });
            console.log(`Batch insert completed for table "${tableName}".`);
            return true;
        }
        catch (err) {
            console.error(`Error during batch insert into "${tableName}":`, err);
            return false;
        }
    }
    async batchUpdate(tableName, updates) {
        if (!this.db) {
            console.error('Database is not initialized. Call createDB() first.');
            return false;
        }
        try {
            await new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    updates.forEach(({ data, conditions }) => {
                        const updateColumns = Object.keys(data).map(col => `${col} = ?`).join(', ');
                        const conditionColumns = Object.keys(conditions).map(col => `${col} = ?`).join(' AND ');
                        const sqlStatement = `UPDATE ${tableName} SET ${updateColumns} WHERE ${conditionColumns}`;
                        const values = [...Object.values(data), ...Object.values(conditions)];
                        this.logSQL(sqlStatement, values); // Log SQL
                        this.db.run(sqlStatement, values, (err) => {
                            if (err)
                                reject(err);
                        });
                    });
                    resolve();
                });
            });
            console.log(`Batch update completed for table "${tableName}".`);
            return true;
        }
        catch (err) {
            console.error(`Error during batch update in "${tableName}":`, err);
            return false;
        }
    }
    async batchDelete(tableName, conditions) {
        if (!this.db) {
            console.error('Database is not initialized. Call createDB() first.');
            return false;
        }
        try {
            await new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    conditions.forEach((condition) => {
                        const conditionColumns = Object.keys(condition).map(col => `${col} = ?`).join(' AND ');
                        const sqlStatement = `DELETE FROM ${tableName} WHERE ${conditionColumns}`;
                        const values = Object.values(condition);
                        this.logSQL(sqlStatement, values); // Log SQL
                        this.db.run(sqlStatement, values, (err) => {
                            if (err)
                                reject(err);
                        });
                    });
                    resolve();
                });
            });
            console.log(`Batch delete completed for table "${tableName}".`);
            return true;
        }
        catch (err) {
            console.error(`Error during batch delete in "${tableName}":`, err);
            return false;
        }
    }
    closeDB() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                }
                else {
                    console.log('Database connection closed.');
                }
            });
        }
    }
}
