import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DbService implements OnModuleDestroy {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 8,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      ssl: process.env.DATABASE_SSL === 'false'
        ? false
        : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
    });

    this.pool.on('error', (err: Error) => {
      // Prevent unhandled error event from crashing the server when pooler closes idle connections
      console.warn('[DbService] Unexpected error on idle database pool client:', err.message);
    });

    this.pool.on('connect', (client: PoolClient) => {
      // Prevent individual Client instances from emitting unhandled 'error' events on socket closure
      client.on('error', (err: Error) => {
        console.warn('[DbService] Database client socket event caught:', err.message);
      });
    });
  }

  query<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }
  async tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const out = await fn(c);
      await c.query('COMMIT');
      return out;
    } catch (e) {
      try { await c.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      c.release();
    }
  }
  async onModuleDestroy() { await this.pool.end(); }
}
