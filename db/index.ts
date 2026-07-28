import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql, {
  type Pool,
  type PoolConnection,
  type PoolOptions,
} from "mysql2/promise";

declare global {
  var avanzaMysqlPool: Pool | undefined;
  var avanzaMysqlSslConfig: string | undefined;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

function mysqlPort(): number {
  const port = Number(required("MYSQL_PORT"));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MYSQL_PORT debe ser un puerto válido.");
  }
  return port;
}

function mysqlSslOptions(): Pick<PoolOptions, "ssl"> {
  const caPath = process.env.MYSQL_SSL_CA_PATH?.trim();
  if (!caPath) return {};

  return {
    ssl: {
      ca: readFileSync(resolve(caPath), "utf8"),
      rejectUnauthorized: true,
    },
  };
}

function mysqlSslConfig(): string {
  return process.env.MYSQL_SSL_CA_PATH?.trim() || "disabled";
}

function createPool(): Pool {
  return mysql.createPool({
    host: required("MYSQL_HOST"),
    port: mysqlPort(),
    user: required("MYSQL_USER"),
    password: required("MYSQL_PASSWORD"),
    database: required("MYSQL_DATABASE"),
    charset: "utf8mb4",
    timezone: "Z",
    connectionLimit: 10,
    enableKeepAlive: true,
    ...mysqlSslOptions(),
  });
}

export function getDb(): Pool {
  const sslConfig = mysqlSslConfig();
  if (
    globalThis.avanzaMysqlPool &&
    globalThis.avanzaMysqlSslConfig !== sslConfig
  ) {
    void globalThis.avanzaMysqlPool.end().catch(() => {});
    globalThis.avanzaMysqlPool = undefined;
  }

  if (!globalThis.avanzaMysqlPool) globalThis.avanzaMysqlPool = createPool();
  globalThis.avanzaMysqlSslConfig = sslConfig;
  return globalThis.avanzaMysqlPool;
}

export async function withTransaction<T>(
  operation: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await getDb().getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
