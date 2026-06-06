import { getDb } from './db.js';

/**
 * Test-only DB queries for the page-builder changeset model. Centralised so
 * specs don't reach into raw SQL inline — keeps cleanup + lookup logic
 * consistent across the suite.
 */

/**
 * Most recent un-published changeset for the given admin user. Returns
 * null if they haven't opened the editor yet. The page-builder edit
 * route calls `getOrCreateDraftChangeset` on open, so once the test
 * navigates to /admin/page-builder/edit/<route> this is guaranteed to
 * resolve.
 */
export async function getActiveChangesetId(
  adminUserId: number
): Promise<number | null> {
  const db = getDb();
  const result = await db.query<{ changeset_id: number }>(
    `SELECT changeset_id FROM changeset
     WHERE created_by = $1 AND published_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [adminUserId]
  );
  return result.rows[0]?.changeset_id ?? null;
}

/**
 * Count operations in a changeset. Useful for asserting that a UI
 * action did (or did not) emit an op.
 */
export async function countOperations(changesetId: number): Promise<number> {
  const db = getDb();
  const result = await db.query<{ c: string }>(
    `SELECT COUNT(*) AS c FROM changeset_operation WHERE changeset_id = $1`,
    [changesetId]
  );
  return Number(result.rows[0]?.c ?? 0);
}

/**
 * Return placement-op rows in the changeset for a given widget instance
 * uuid. Useful for asserting "this widget has a placement at route='all'
 * after drop to global area".
 */
export async function placementsForWidget(
  changesetId: number,
  widgetInstanceUuid: string
): Promise<
  Array<{
    placementUuid: string;
    route: string;
    area: string;
    sortOrder: number;
  }>
> {
  const db = getDb();
  const result = await db.query<{ new_payload: any }>(
    `SELECT new_payload FROM changeset_operation
     WHERE changeset_id = $1
       AND entity_urn LIKE 'urn:evershop:cms:widget_placement:%'
       AND new_payload IS NOT NULL
     ORDER BY change_order`,
    [changesetId]
  );
  return result.rows
    .map((row) => row.new_payload as any)
    .filter((p) => p?.widget_instance_uuid === widgetInstanceUuid)
    .map((p) => ({
      placementUuid: p.uuid as string,
      route: p.route as string,
      area: p.area as string,
      sortOrder: Number(p.sort_order ?? 0)
    }));
}
