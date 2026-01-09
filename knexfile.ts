
import type { Knex } from 'knex';

// Update this configuration to match your environment.
const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './backend/db/development.sqlite3'
    },
    migrations: {
      directory: './backend/db/migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './backend/db/seeders'
    },
    useNullAsDefault: true
  }
};

export default config;
