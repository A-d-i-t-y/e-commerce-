import { insert } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../lib/postgres/connection.js';

/**
 * Per spec 03 § 5.7: one open draft changeset per admin user, spanning
 * every route that user edits during the session. The draft is named
 * `pb-draft-<userId>` and reused until the user publishes it (which sets
 * `published_at`), saves it as a rollout plan, or explicitly discards it.
 *
 * The caller still tracks the current route in editor state — that is a
 * UI concern, not part of the draft identity. A single changeset can
 * carry operations against multiple routes (each `changeset_operation`
 * row carries its own `route` column).
 */
export async function getOrCreateDraftChangeset(opts: {
  userId: number;
}): Promise<{
  changeset_id: number;
  uuid: string;
  token: string;
}> {
  const { userId } = opts;
  const name = `pb-draft-${userId}`;

  // Plain pool.query — the typed builder doesn't compose `IS NULL` cleanly
  // with parameter binding; using literal `IS NULL` keeps the SQL valid.
  //
  // Defensive `NOT EXISTS` against rollout_plan: if a previous "Save as
  // rollout plan" left the draft attached to a rollout (createRolloutPlan
  // now renames on success, but old rows from before that fix may still be
  // tangled), skip it so the user gets a fresh draft instead of the rollout
  // bleeding into the draft session.
  const existing = await pool.query(
    `SELECT changeset_id, uuid, token
       FROM changeset
      WHERE name = $1
        AND published_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM rollout_plan rp
           WHERE rp.changeset_id = changeset.changeset_id
        )
      LIMIT 1`,
    [name]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    return {
      changeset_id: row.changeset_id,
      uuid: row.uuid,
      token: row.token
    };
  }

  const created = await insert('changeset')
    .given({
      uuid: uuidv4(),
      name,
      token: uuidv4(),
      created_by: userId
    })
    .execute(pool);
  return {
    changeset_id: (created as any).changeset_id,
    uuid: (created as any).uuid,
    token: (created as any).token
  };
}
