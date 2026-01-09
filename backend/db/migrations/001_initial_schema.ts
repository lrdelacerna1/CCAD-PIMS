import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('user_type', (table) => {
        table.increments('id').primary();
        table.string('type_name').notNullable().unique();
    });

    await knex.schema.createTable('user', (table) => {
        table.increments('id').primary();
        table.string('first_name').notNullable();
        table.string('last_name').notNullable();
        table.string('contact_number');
        table.integer('user_type_id').unsigned().notNullable();
        table.foreign('user_type_id').references('user_type.id');
        table.string('email_address').notNullable().unique();
        table.boolean('borrowing_privileges').defaultTo(true);
        table.string('password_hash').notNullable();
    });

    await knex.schema.createTable('student', (table) => {
        table.integer('user_id').unsigned().primary();
        table.foreign('user_id').references('user.id');
        table.string('student_number').notNullable().unique();
    });

    await knex.schema.createTable('guest', (table) => {
        table.integer('user_id').unsigned().primary();
        table.foreign('user_id').references('user.id');
        table.string('organization');
    });

    await knex.schema.createTable('faculty', (table) => {
        table.integer('user_id').unsigned().primary();
        table.foreign('user_id').references('user.id');
    });

    await knex.schema.createTable('superadmin', (table) => {
        table.integer('user_id').unsigned().primary();
        table.foreign('user_id').references('user.id');
    });

    await knex.schema.createTable('admin', (table) => {
        table.integer('user_id').unsigned().primary();
        table.foreign('user_id').references('user.id');
    });

}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('admin');
    await knex.schema.dropTableIfExists('superadmin');
    await knex.schema.dropTableIfExists('faculty');
    await knex.schema.dropTableIfExists('guest');
    await knex.schema.dropTableIfExists('student');
    await knex.schema.dropTableIfExists('user');
    await knex.schema.dropTableIfExists('user_type');
}
