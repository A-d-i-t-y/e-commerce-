import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../lib/util/camelCase.js';

export default {
  Query: {
    changeset: async (
      _: unknown,
      args: { id?: number; uuid?: string; token?: string },
      { pool }: any
    ) => {
      const query = select().from('changeset');
      if (args.id !== undefined) query.where('changeset_id', '=', args.id);
      else if (args.uuid !== undefined) query.where('uuid', '=', args.uuid);
      else if (args.token !== undefined) query.where('token', '=', args.token);
      else return null;
      const row = await query.load(pool);
      return row ? camelCase(row) : null;
    },

    changesets: async (_: unknown, __: unknown, ___: any) => {
      // Minimal stub for Phase 3a — returns all changesets without filters.
      // Full collection support (filters, paging) lands in Phase 3c.
      return {
        // Resolver-side fields below; query items via direct SELECT.
        currentPage: 1,
        currentFilters: []
      };
    }
  },

  ChangesetCollection: {
    items: async (_root: any, _args: any, { pool }: any) => {
      const rows = await select()
        .from('changeset')
        .execute(pool);
      return rows.map(camelCase);
    },
    total: async (_root: any, _args: any, { pool }: any) => {
      const rows = await select('COUNT(changeset_id)', 'total')
        .from('changeset')
        .execute(pool);
      return Number(rows[0]?.total ?? 0);
    }
  },

  Changeset: {
    operations: async (changeset: any, _args: any, { pool }: any) => {
      const query = select().from('changeset_operation');
      query.where('changeset_id', '=', changeset.changesetId);
      query.orderBy('change_order', 'asc');
      const rows = await query.execute(pool);
      return rows.map(camelCase);
    },
    routeCursors: (changeset: any) => {
      // Source row stores JSONB which the driver returns as a JS object
      // already. Defensive default to {} so the field never resolves to null.
      const v = changeset.routeCursors;
      if (v == null) return {};
      if (typeof v === 'string') {
        try {
          return JSON.parse(v);
        } catch {
          return {};
        }
      }
      return v;
    },
    canUndo: async (
      changeset: any,
      args: { route: string },
      { pool }: any
    ) => {
      const cursors =
        (typeof changeset.routeCursors === 'string'
          ? JSON.parse(changeset.routeCursors)
          : changeset.routeCursors) ?? {};
      const cursorOrder = Number(cursors[args.route] ?? 0);
      if (cursorOrder <= 0) return false;
      // There's at least one applied op on this route that we could move
      // back past.
      const row = await select('changeset_operation_id')
        .from('changeset_operation')
        .where('changeset_id', '=', changeset.changesetId)
        .and('route', '=', args.route)
        .and('change_order', '<=', cursorOrder)
        .and('change_order', '>', 0)
        .load(pool);
      return !!row;
    },
    canRedo: async (
      changeset: any,
      args: { route: string },
      { pool }: any
    ) => {
      const cursors =
        (typeof changeset.routeCursors === 'string'
          ? JSON.parse(changeset.routeCursors)
          : changeset.routeCursors) ?? {};
      const cursorOrder = Number(cursors[args.route] ?? 0);
      const row = await select('changeset_operation_id')
        .from('changeset_operation')
        .where('changeset_id', '=', changeset.changesetId)
        .and('route', '=', args.route)
        .and('change_order', '>', cursorOrder)
        .load(pool);
      return !!row;
    },
    operationCountForRoute: async (
      changeset: any,
      args: { route: string },
      { pool }: any
    ) => {
      const result = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM changeset_operation
         WHERE changeset_id = $1 AND route = $2`,
        [changeset.changesetId, args.route]
      );
      return Number((result.rows[0] as any)?.count ?? 0);
    },
    operationCountsByRoute: async (
      changeset: any,
      _args: any,
      { pool }: any
    ) => {
      const result = await pool.query(
        `SELECT route, COUNT(*)::int AS count
         FROM changeset_operation
         WHERE changeset_id = $1
         GROUP BY route
         ORDER BY count DESC, route ASC`,
        [changeset.changesetId]
      );
      return result.rows.map((r: any) => ({
        route: r.route,
        count: Number(r.count)
      }));
    },
    rolloutPlan: async (changeset: any, _args: any, { pool }: any) => {
      const row = await select()
        .from('rollout_plan')
        .where('changeset_id', '=', changeset.changesetId)
        .load(pool);
      return row ? camelCase(row) : null;
    }
  }
};
