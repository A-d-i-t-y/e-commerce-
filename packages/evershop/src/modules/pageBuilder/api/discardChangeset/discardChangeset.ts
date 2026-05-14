import {
  commit,
  del,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  BAD_REQUEST,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

/**
 * POST /api/page-builder/changesets/:id/discard
 *
 * Two modes:
 *
 *  - **Full discard (default).** No `route` query param. Deletes all
 *    `changeset_operation` rows for the changeset, then the changeset row
 *    itself (rollout_plan rows cascade per the migration).
 *
 *  - **Per-route discard.** `?route=<routeId>` query param present. Deletes
 *    only ops on that route, clears the route's entry from `route_cursors`,
 *    and recomputes `current_change` from whatever cursor remains highest.
 *    The changeset row stays alive so the user can keep editing other
 *    routes. If the per-route discard leaves the changeset with zero ops,
 *    the changeset row is removed too (no point keeping an empty draft).
 *
 * Refuses to discard published changesets — those are part of the audit
 * trail.
 *
 * Authorization: only the changeset's `created_by` admin user (or any
 * admin user — V1 keeps it simple by allowing all admins) can discard.
 */
// 3-arg signature: avoid auto-next behavior of 2-arg handlers (causes
// ERR_HTTP_HEADERS_SENT via apiResponse).
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: (err?: unknown) => void
) => {
  const changesetId = Number(request.params.id);
  if (!Number.isInteger(changesetId) || changesetId <= 0) {
    return response.status(BAD_REQUEST).json({
      error: { status: BAD_REQUEST, message: 'Invalid changeset id' }
    });
  }

  const userId = (request as any).locals?.user?.admin_user_id;
  if (!userId) {
    return response.status(FORBIDDEN).json({
      error: { status: FORBIDDEN, message: 'Admin auth required' }
    });
  }

  const conn = await getConnection();
  await startTransaction(conn);
  try {
    const changeset = await select()
      .from('changeset')
      .where('changeset_id', '=', changesetId)
      .load(conn);
    if (!changeset) {
      await rollback(conn);
      return response.status(NOT_FOUND).json({
        error: {
          status: NOT_FOUND,
          message: `Changeset ${changesetId} not found`
        }
      });
    }
    if ((changeset as any).published_at) {
      await rollback(conn);
      return response.status(BAD_REQUEST).json({
        error: {
          status: BAD_REQUEST,
          message: 'Cannot discard a published changeset'
        }
      });
    }

    const routeFilter =
      typeof request.query?.route === 'string' && request.query.route.length > 0
        ? String(request.query.route)
        : null;

    if (routeFilter) {
      // Per-route discard. Drop ops on this route, clear the cursor entry,
      // and recompute `current_change` from the remaining highest cursor.
      // Done in one transaction so the changeset never appears mid-state.
      await conn.query(
        `DELETE FROM changeset_operation
         WHERE changeset_id = $1 AND route = $2`,
        [changesetId, routeFilter]
      );

      // Count remaining ops; if zero, drop the changeset row too.
      const remainingRes = await conn.query(
        `SELECT COUNT(*)::int AS count FROM changeset_operation WHERE changeset_id = $1`,
        [changesetId]
      );
      const remaining = Number((remainingRes.rows[0] as any)?.count ?? 0);

      if (remaining === 0) {
        await del('changeset')
          .where('changeset_id', '=', changesetId)
          .execute(conn);
        await commit(conn);
        return response.status(OK).json({
          data: { discarded: true, mode: 'route', route: routeFilter, changesetDeleted: true }
        });
      }

      // Strip the route's cursor entry, then recompute current_change from
      // whichever route now has the highest cursor.
      const cursors =
        ((changeset as any).route_cursors as Record<string, number> | null) ??
        {};
      const nextCursors: Record<string, number> = { ...cursors };
      delete nextCursors[routeFilter];

      const remainingMax = Object.values(nextCursors).filter(
        (n) => typeof n === 'number' && n > 0
      );
      let newCurrentChangeId: number | null = null;
      if (remainingMax.length > 0) {
        const maxOrder = Math.max(...remainingMax);
        const row = await conn.query(
          `SELECT changeset_operation_id FROM changeset_operation
           WHERE changeset_id = $1 AND change_order = $2 LIMIT 1`,
          [changesetId, maxOrder]
        );
        newCurrentChangeId = row.rows[0]
          ? Number((row.rows[0] as any).changeset_operation_id)
          : null;
      }

      await conn.query(
        `UPDATE changeset
           SET route_cursors = $1::jsonb,
               current_change = $2,
               updated_at = NOW()
         WHERE changeset_id = $3`,
        [JSON.stringify(nextCursors), newCurrentChangeId, changesetId]
      );

      await commit(conn);
      return response.status(OK).json({
        data: {
          discarded: true,
          mode: 'route',
          route: routeFilter,
          changesetDeleted: false
        }
      });
    }

    // Full discard. Break the FK from changeset.current_change →
    // changeset_operation so we can safely delete operations first.
    // (Operations cascade-delete when the changeset row goes; we do the
    // same in two steps for clarity.)
    await del('changeset_operation')
      .where('changeset_id', '=', changesetId)
      .execute(conn);
    await del('changeset')
      .where('changeset_id', '=', changesetId)
      .execute(conn);

    await commit(conn);
    return response.status(OK).json({
      data: { discarded: true, mode: 'all', changesetDeleted: true }
    });
  } catch (e) {
    await rollback(conn);
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Discard failed'
      }
    });
  }
};
