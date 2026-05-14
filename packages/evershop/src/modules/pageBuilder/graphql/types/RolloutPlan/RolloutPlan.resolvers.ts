import { select } from '@evershop/postgres-query-builder';
import { pool as defaultPool } from '../../../../../lib/postgres/connection.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';

export default {
  Query: {
    rolloutPlan: async (
      _: unknown,
      args: { id?: number; uuid?: string },
      { pool }: any
    ) => {
      const query = select().from('rollout_plan');
      if (args.id !== undefined) query.where('rollout_plan_id', '=', args.id);
      else if (args.uuid !== undefined) query.where('uuid', '=', args.uuid);
      else return null;
      const row = await query.load(pool);
      return row ? camelCase(row) : null;
    },

    rolloutPlans: async (_: unknown, __: unknown, { pool }: any) => {
      const query = select().from('rollout_plan');
      query.orderBy('start_time', 'desc');
      const rows = await query.execute(pool);
      return rows.map(camelCase);
    },

    activeRolloutPlans: async (_: unknown, __: unknown, { pool }: any) => {
      const conn = pool || defaultPool;
      // start_time <= NOW() AND (end_time IS NULL OR end_time > NOW())
      const result = await conn.query(
        `SELECT * FROM rollout_plan
         WHERE start_time <= NOW()
           AND (end_time IS NULL OR end_time > NOW())
         ORDER BY start_time ASC`
      );
      return result.rows.map(camelCase);
    }
  },

  RolloutPlan: {
    changeset: async (rolloutPlan: any, _args: any, { pool }: any) => {
      const row = await select()
        .from('changeset')
        .where('changeset_id', '=', rolloutPlan.changesetId)
        .load(pool);
      return row ? camelCase(row) : null;
    }
  }
};
