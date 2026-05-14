import { insert, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  BAD_REQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

/**
 * POST /api/page-builder/rollout-plans
 *
 * Body:
 *   {
 *     name: string,
 *     changeset_id: int,
 *     start_time: ISO timestamp,
 *     end_time: ISO timestamp | null
 *   }
 *
 * Spec 03 § 5.9.1 says no two active-or-upcoming rollouts may overlap
 * (global scope for v1). This endpoint enforces that constraint.
 */
// 3-arg signature: avoid auto-next behavior of 2-arg handlers (causes
// ERR_HTTP_HEADERS_SENT via apiResponse).
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: (err?: unknown) => void
) => {
  const body = request.body ?? {};
  const errors: string[] = [];

  const name =
    typeof body.name === 'string' && body.name.trim() !== ''
      ? body.name.trim()
      : null;
  if (!name) errors.push('name is required');

  const changesetId = Number(body.changeset_id);
  if (!Number.isInteger(changesetId) || changesetId <= 0) {
    errors.push('changeset_id is required (integer)');
  }

  const startTime = body.start_time ? new Date(body.start_time) : null;
  if (!startTime || Number.isNaN(startTime.getTime())) {
    errors.push('start_time is required (ISO timestamp)');
  }

  let endTime: Date | null = null;
  if (body.end_time != null) {
    endTime = new Date(body.end_time);
    if (Number.isNaN(endTime.getTime())) {
      errors.push('end_time, when provided, must be an ISO timestamp');
    } else if (startTime && endTime <= startTime) {
      errors.push('end_time must be after start_time');
    }
  }

  if (errors.length > 0) {
    return response.status(BAD_REQUEST).json({
      error: { status: BAD_REQUEST, message: errors.join('; ') }
    });
  }

  // Confirm the changeset exists and isn't already published.
  const changeset = await select()
    .from('changeset')
    .where('changeset_id', '=', changesetId)
    .load(pool);
  if (!changeset) {
    return response.status(NOT_FOUND).json({
      error: {
        status: NOT_FOUND,
        message: `Changeset ${changesetId} not found`
      }
    });
  }
  if ((changeset as any).published_at) {
    return response.status(BAD_REQUEST).json({
      error: {
        status: BAD_REQUEST,
        message: 'Cannot schedule a rollout for a published changeset'
      }
    });
  }

  // Overlap check (global scope, active or upcoming only). See spec 03 § 5.9.1.
  const overlap = await pool.query(
    `SELECT rollout_plan_id, name, start_time, end_time
     FROM rollout_plan
     WHERE (end_time IS NULL OR end_time > NOW())
       AND start_time < $2
       AND ($1::timestamptz IS NULL OR end_time IS NULL OR end_time > $3)`,
    // Args: (proposed end, proposed end, proposed start)
    // The condition above is approximate — we filter precisely in JS for clarity.
    [endTime, endTime ?? new Date('9999-12-31T23:59:59Z'), startTime]
  );
  if (overlap.rows.length > 0) {
    return response.status(BAD_REQUEST).json({
      error: {
        status: BAD_REQUEST,
        message: `Proposed rollout overlaps with existing rollout(s): ${overlap.rows
          .map((r: any) => r.name)
          .join(', ')}`
      }
    });
  }

  try {
    const row = await insert('rollout_plan')
      .given({
        name,
        changeset_id: changesetId,
        start_time: startTime,
        end_time: endTime
      })
      .execute(pool);
    return response.status(CREATED).json({ data: row });
  } catch (e) {
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Failed to create rollout plan'
      }
    });
  }
};
