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
 * Per-route undo/redo (spec § 5.1, § 5.4). Each changeset carries
 * `route_cursors JSONB` mapping route → highest applied `change_order`. An
 * op is included iff `op.change_order <= route_cursors[op.route]` (default 0
 * when the route is absent from the map). This means a user who pressed Undo
 * twice on homepage and then switches to cart sees the cart at its own
 * cursor — homepage ops past the undone position simply aren't returned.
 *
 * Returned ops are ordered by `change_order` ascending.
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
  // Production / rollout path: same per-route cursor filter applies. Rollout
  // plans reference a changeset; the merchandiser may have undo'd before
  // saving as a rollout, and the rollout should render the cursor-pinned
  // state.
  const result = await pool.query(
    `SELECT op.*
     FROM changeset_operation op
     INNER JOIN rollout_plan rp ON rp.changeset_id = op.changeset_id
     INNER JOIN changeset cs    ON cs.changeset_id = op.changeset_id
     WHERE rp.start_time <= NOW()
       AND (rp.end_time IS NULL OR rp.end_time > NOW())
       AND op.change_order <= COALESCE((cs.route_cursors ->> op.route)::int, 0)
     ORDER BY op.change_order ASC`
  );
  return result.rows as ChangesetOperationRow[];
}
