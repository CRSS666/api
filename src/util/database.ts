import pg, { Pool, QueryResultRow } from 'pg';

class Database {
  private static pool: Pool | undefined;

  constructor() {
    if (!Database.pool) {
      Database.pool = new Pool({
        host: process.env.DB_HOST!,

        user: process.env.DB_USER!,
        password: process.env.DB_PASS!,

        database: process.env.DB_NAME!,

        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      });
    }
  }

  public async query<T>(
    query: string,
    values?: (string | number | bigint | Date | null | undefined)[]
  ): Promise<T[] | undefined> {
    pg.defaults.parseInputDatesAsUTC = true;
    pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (value: string) => {
      return new Date(value.split(' ').join('T') + 'Z');
    });

    return (await Database.pool?.query<QueryResultRow>(query, values))?.rows as
      | T[]
      | undefined;
  }
}

export const db = new Database();
export { Database };

export default db;
