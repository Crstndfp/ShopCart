import sql from 'mssql';
import { env } from './env.js';
import { logger } from '../utils/logger.util.js';

const dbConfig: sql.config = {
  server: env.DB_SERVER,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  options: {
    encrypt: env.DB_ENCRYPT,
    trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
  },
  pool: {
    min: env.DB_POOL_MIN,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;
let telemetryInstrumented = false;

/**
 * Instruments mssql Request prototype to automatically log every Stored Procedure execution,
 * parameters sent, execution duration, and results or error codes.
 */
function instrumentSqlTelemetry(): void {
  if (telemetryInstrumented) {
    return;
  }
  telemetryInstrumented = true;

  const originalExecute = sql.Request.prototype.execute;
  const originalQuery = sql.Request.prototype.query;

  (sql.Request.prototype as any).execute = async function (this: sql.Request, procedure: string, ...rest: any[]) {
    const start = Date.now();
    const rawParams: Record<string, any> = {};

    const paramsObj = (this as any).parameters || {};
    for (const [key, param] of Object.entries(paramsObj)) {
      rawParams[key] = (param as any).value;
    }

    try {
      const result = await (originalExecute as any).apply(this, [procedure, ...rest]);
      const duration = Date.now() - start;

      const outputs = result.output && Object.keys(result.output).length > 0 ? result.output : undefined;
      const rowsCount = result.recordset?.length ?? (result.recordsets?.length ? result.recordsets.map((rs: any) => rs.length) : undefined);

      logger.sql(
        procedure,
        rawParams,
        { outputs, rows: rowsCount },
        duration
      );

      return result;
    } catch (error: any) {
      const duration = Date.now() - start;
      logger.error(
        `SQL Error executing '${procedure}' (${duration}ms): ${error.message}`,
        undefined,
        { procedure, parameters: rawParams }
      );
      throw error;
    }
  };

  (sql.Request.prototype as any).query = async function (this: sql.Request, command: any, ...rest: any[]) {
    const start = Date.now();
    const queryText = typeof command === 'string' ? command.trim() : 'Dynamic Query';

    try {
      const result = await (originalQuery as any).apply(this, [command, ...rest]);
      const duration = Date.now() - start;
      logger.sql(`QUERY: ${queryText}`, undefined, { rows: result.recordset?.length }, duration);
      return result;
    } catch (error: any) {
      const duration = Date.now() - start;
      logger.error(`SQL Query failed (${duration}ms): ${error.message}`, undefined, { query: queryText });
      throw error;
    }
  };
}

export async function getDbPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    instrumentSqlTelemetry();
    pool = await new sql.ConnectionPool(dbConfig).connect();
    logger.info(`Connected to SQL Server database '${env.DB_NAME}' on ${env.DB_SERVER}:${env.DB_PORT}`);
  }
  return pool;
}
