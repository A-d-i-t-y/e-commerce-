import {
  commit,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

/**
 * POST /api/page-builder/changesets/:id/move-current
 *
 * Body: { direction: 'undo' | 'redo', route: string }
 *
 * Per-route undo/redo. `changeset.route_cursors` is a JSONB map from route to
 * the highest applied `change_order` for that route. Moving the cursor for
 * route X does NOT affect any other route's cursor — only ops with
 * `route = X` are walked.
 *
 *   Undo: route_cursors[route] := largest change_order strictly less than
 *         current, restricted to this route. 0 (or removed) when no prior op
 *         on this route is in the applied region.
 *   Redo: route_cursors[route] := smallest change_order strictly greater than
 *         current, restricted to this route. No-op when no future op exists.
 *
 * Storage order (`change_order`) stays globally monotonic — only the apply
 * window is per-route. `current_change` is kept in sync as the denormalized
 * "highest applied op anywhere in the changeset" for back-compat with
 * consumers that still read it.
 *
 * Returns `{ direction, route, routeCursors, canUndo, canRedo, currentChange }`.
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

  const direction = (request.body?.direction || '').toString();
  if (direction !== 'undo' && direction !== 'redo') {
    return response.status(BAD_REQUEST).json({
      error: {
        status: BAD_REQUEST,
        message: "direction must be 'undo' or 'redo'"
      }
    });
  }

  const route =
    typeof request.body?.route === 'string' ? request.body.route : null;
  if (!route) {
    return response.status(BAD_REQUEST).json({
      error: { status: BAD_REQUEST, message: 'route is required' }
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
          message: 'Cannot undo/redo a published changeset'
        }
      });
    }

    const routeCursors =
      ((changeset as any).route_cursors as Record<string, number> | null) ?? {};
    const routeCursorOrder = Number(routeCursors[route] ?? 0);

    let newCursorOrder: number;
    if (direction === 'undo') {
      // Largest change_order strictly less than current, on this route.
      const q = select('change_order').from('changeset_operation');
      q.where('changeset_id', '=', changesetId)
        .and('route', '=', route)
        .and('change_order', '<', routeCursorOrder);
      q.orderBy('change_order', 'desc');
      const rows = await q.execute(conn);
      newCursorOrder = rows[0] ? Number((rows[0] as any).change_order) : 0;
    } else {
      // Smallest change_order strictly greater than current, on this route.
      const q = select('change_order').from('changeset_operation');
      q.where('changeset_id', '=', changesetId)
        .and('route', '=', route)
        .and('change_order', '>', routeCursorOrder);
      q.orderBy('change_order', 'asc');
      const rows = await q.execute(conn);
      // No future op → silently no-op (return same cursor).
      newCursorOrder = rows[0]
        ? Number((rows[0] as any).change_order)
        : routeCursorOrder;
    }

    // Update the route's cursor (or remove the entry if it's back to 0 to
    // keep the JSONB tidy).
    const nextRouteCursors: Record<string, number> = { ...routeCursors };
    if (newCursorOrder > 0) {
      nextRouteCursors[route] = newCursorOrder;
    } else {
      delete nextRouteCursors[route];
    }

    // Derived denormalized "highest applied op anywhere" for back-compat.
    // Looks up the changeset_operation_id matching the highest cursor across
    // all routes; null if no route has any applied ops.
    const allCursorOrders = Object.values(nextRouteCursors).filter(
      (n) => typeof n === 'number' && n > 0
    );
    let newCurrentChangeId: number | null = null;
    if (allCursorOrders.length > 0) {
      const maxOrder = Math.max(...allCursorOrders);
      const row = await select('changeset_operation_id')
        .from('changeset_operation')
        .where('changeset_id', '=', changesetId)
        .and('change_order', '=', maxOrder)
        .load(conn);
      newCurrentChangeId = row
        ? Number((row as any).changeset_operation_id)
        : null;
    }

    await conn.query(
      `UPDATE changeset
         SET route_cursors = $1::jsonb,
             current_change = $2,
             updated_at = NOW()
       WHERE changeset_id = $3`,
      [JSON.stringify(nextRouteCursors), newCurrentChangeId, changesetId]
    );

    // Compute canUndo / canRedo for this route post-move so the client can
    // refresh its button state in one round-trip.
    const undoExists = await select('changeset_operation_id')
      .from('changeset_operation')
      .where('changeset_id', '=', changesetId)
      .and('route', '=', route)
      .and('change_order', '<=', newCursorOrder)
      .and('change_order', '>', 0)
      .load(conn);
    const redoExists = await select('changeset_operation_id')
      .from('changeset_operation')
      .where('changeset_id', '=', changesetId)
      .and('route', '=', route)
      .and('change_order', '>', newCursorOrder)
      .load(conn);

    await commit(conn);

    return response.status(OK).json({
      data: {
        direction,
        route,
        routeCursors: nextRouteCursors,
        currentChange: newCurrentChangeId,
        currentChangeOrder: newCursorOrder,
        canUndo: !!undoExists && newCursorOrder > 0,
        canRedo: !!redoExists
      }
    });
  } catch (e) {
    await rollback(conn);
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Failed to move current'
      }
    });
  }
};
