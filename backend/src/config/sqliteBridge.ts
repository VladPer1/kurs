import { DatabaseSync } from 'node:sqlite';

/**
 * Clean bridge between Node 22 built-in node:sqlite DatabaseSync
 * and the callback-based sqlite3 driver API required by Sequelize.
 * Eliminates external native C++ glibc compilation dependencies.
 */
export class SqliteBridge {
  private db!: DatabaseSync;
  public filename!: string;

  constructor(filename: string, mode: any, callback?: (err: any) => void) {
    try {
      this.filename = filename;
      this.db = new DatabaseSync(filename === ':memory:' ? ':memory:' : filename);
      if (callback) {
        setImmediate(() => callback(null));
      }
    } catch (e) {
      if (callback) {
        setImmediate(() => callback(e));
      }
    }
  }

  private _normalizeValue(val: any): any {
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val;
  }

  private _exec(stmt: any, params: any, method: 'run' | 'all' | 'get') {
    if (!params || (Array.isArray(params) && params.length === 0)) {
      return stmt[method]();
    }
    if (Array.isArray(params)) {
      const normalized = params.map((p) => this._normalizeValue(p));
      return stmt[method](...normalized);
    }
    const normalized: Record<string, any> = {};
    for (const [k, v] of Object.entries(params)) {
      normalized[k] = this._normalizeValue(v);
    }
    return stmt[method](normalized);
  }

  run(sql: string, params: any, callback?: (err: any) => void) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    try {
      if (!params || (Array.isArray(params) && params.length === 0)) {
        this.db.exec(sql);
        const ctx = { lastID: 0, changes: 0 };
        if (callback) setImmediate(() => callback.call(ctx, null));
      } else {
        const stmt = this.db.prepare(sql);
        const info = this._exec(stmt, params, 'run');
        const ctx = {
          lastID: Number(info ? info.lastInsertRowid : 0),
          changes: info ? info.changes : 0,
        };
        if (callback) setImmediate(() => callback.call(ctx, null));
      }
    } catch (err) {
      if (callback) setImmediate(() => callback(err));
    }
  }

  all(sql: string, params: any, callback?: (err: any, rows?: any[]) => void) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    try {
      const stmt = this.db.prepare(sql);
      const rows = this._exec(stmt, params, 'all');
      if (callback) setImmediate(() => callback.call(ctx, null, rows || []));
    } catch (err) {
      if (callback) setImmediate(() => callback(err));
    }
    const ctx = {};
  }

  get(sql: string, params: any, callback?: (err: any, row?: any) => void) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    try {
      const stmt = this.db.prepare(sql);
      const row = this._exec(stmt, params, 'get');
      if (callback) setImmediate(() => callback.call(ctx, null, row));
    } catch (err) {
      if (callback) setImmediate(() => callback(err));
    }
    const ctx = {};
  }

  serialize(fn?: () => void) {
    if (fn) fn();
  }

  close(callback?: (err: any) => void) {
    try {
      this.db.close();
      if (callback) setImmediate(() => callback(null));
    } catch (e) {
      if (callback) setImmediate(() => callback(e));
    }
  }
}

export const sqliteDialectModule = {
  Database: SqliteBridge,
  OPEN_READWRITE: 2,
  OPEN_CREATE: 4,
};
