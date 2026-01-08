// This is a placeholder for a database seeder file.
// Seeders are used to populate the database with initial data.

/*
Example using Knex.js:

import { Knex } from 'knex';
import bcrypt from 'bcrypt'; // Or another hashing library

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('users').del();

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('password', salt);

  // Inserts seed entries
  await knex('users').insert([
    {
      id: 'some-uuid-for-admin',
      email: 'admin@test.com',
      password_hash: adminPasswordHash,
      first_name: 'Admin',
      last_name: 'User',
      is_verified: true,
      role: 'admin'
    },
  ]);
}
*/

console.log('Placeholder for admin user seeder.');
