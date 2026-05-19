import { pool } from '../../../lib/postgres/connection.js';
import type { ChangesetOperationRow } from '../../../types/db/index.js';

/**
 * Fetch the changeset operations that should be overlaid on the current
 * storefront request.
 *
 * Two modes:
 *   - **Preview** — caller passes a `previewChangesetToken`. Returns the
 *     specified changeset's ops. Used by the page-builder iframe via the
 *     `?changeset=<token>` query param.
 *   - **Production** — no token. Returns the union of operations from every
 *     active rollout plan (`start_time <= NOW() < end_time`).
 *
 * Per-route undo/redo (spec § 5.1, § 5.4). The cursor source differs by mode:
 *
 *   - **Preview** uses `changeset.route_cursors` — the live editor state, so
 *     the iframe reflects the merchandiser's current undo/redo position.
 *   - **Production** uses `rollout_plan.route_cursors` — the snapshot frozen
 *     at Save time. In-progress edits in the editor (which advance
 *     `changeset.route_cursors`) do not leak to the live storefront until the
 *     merchandiser clicks Save and the rollout's snapshot is updated.
 *
 * Either way: an op is included iff `op.change_order <= cursor[op.route]`
 * (default 0 when the route is absent from the map). Returned ops are ordered
 * by `change_order` ascending.
 */
export async function loadActiveOps(opts: {
  previewChangesetToken?: string | null;
}): Promise<ChangesetOperationRow[]> {
  if (opts.previewChangesetToken) {
    const result = await pool.query(
      `SELECT op.*
       FROM changeset_operation op
       INNER JOIN changeset cs ON cs.changeset_id = op.changeset_id
       WHERE cs.token = $1
         AND op.change_order <= COALESCE((cs.route_cursors ->> op.route)::int, 0)
       ORDER BY op.change_order ASC`,
      [opts.previewChangesetToken]
    );
    return result.rows as ChangesetOperationRow[];
  }
  // Production / rollout path. Filter on rp.route_cursors so editor-side
  // changes only affect the storefront once the user clicks Save (sync).
  const result = await pool.query(
    `SELECT op.*
     FROM changeset_operation op
     INNER JOIN rollout_plan rp ON rp.changeset_id = op.changeset_id
     WHERE rp.start_time <= NOW()
       AND (rp.end_time IS NULL OR rp.end_time > NOW())
       AND op.change_order <= COALESCE((rp.route_cursors ->> op.route)::int, 0)
     ORDER BY op.change_order ASC`
  );
  return result.rows as ChangesetOperationRow[];
}
