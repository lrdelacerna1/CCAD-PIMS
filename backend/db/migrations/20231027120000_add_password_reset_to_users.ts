import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table("users", (table) => {
    table.string("passwordResetToken");
    table.timestamp("passwordResetExpires");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table("users", (table) => {
    table.dropColumn("passwordResetToken");
    table.dropColumn("passwordResetExpires");
  });
}
