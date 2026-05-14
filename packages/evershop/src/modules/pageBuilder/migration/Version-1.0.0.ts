import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Phase 3a — Page builder backend. Creates the three core tables for the
 * changeset / rollout-plan model described in
 * `specifications/03-page-builder-specification.md` § 5.
 *
 * Order:
 *  1. `changeset`         — sessions of edits.
 *  2. `changeset_operation` — individual ops within a session.
 *  3. ALTER `changeset` to add the `current_change` FK to changeset_operation
 *     (created circular-FK style; deferred until both tables exist).
 *  4. `rollout_plan`      — schedule rows that activate a changeset on the
 *     storefront for a window.
 *
 * All timestamps are `TIMESTAMP WITH TIME ZONE` per `wiki/timezone.md`.
 */
export default async (connection: PoolClient): Promise<void> => {
  // 1. changeset (without the circular current_change FK initially)
  //
  // `route_cursors` is the authoritative per-route undo/redo cursor map:
  //   { "homepage": 12, "cart": 5, ... } — each value is a `change_order`.
  // An op is "applied" iff op.change_order <= route_cursors[op.route] (default
  // 0 when the route is absent from the map). `change_order` itself stays
  // globally monotonic across the whole changeset so storage order is
  // unambiguous, but each route's apply window is independent. The legacy
  // `current_change` column is kept as a denormalized "highest applied op
  // anywhere in the changeset" for back-compat with consumers that read it,
  // but it is no longer authoritative for undo/redo.
  await execute(
    connection,
    `CREATE TABLE changeset (
      changeset_id INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      current_change INT NULL,
      route_cursors JSONB NOT NULL DEFAULT '{}'::jsonb,
      token VARCHAR(50) NOT NULL,
      published_at TIMESTAMP WITH TIME ZONE NULL,
      created_by INT NOT NULL REFERENCES admin_user(admin_user_id),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT changeset_uuid_key UNIQUE (uuid),
      CONSTRAINT changeset_token_key UNIQUE (token)
    )`
  );
  await execute(
    connection,
    `CREATE INDEX idx_changeset_token ON changeset(token)`
  );
  await execute(
    connection,
    `CREATE INDEX idx_changeset_published_at ON changeset(published_at)`
  );

  // 2. changeset_operation
  await execute(
    connection,
    `CREATE TABLE changeset_operation (
      changeset_operation_id INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      changeset_id INT NOT NULL REFERENCES changeset(changeset_id) ON DELETE CASCADE,
      route VARCHAR(255) NOT NULL,
      entity_urn VARCHAR(255) NOT NULL,
      old_payload JSONB,
      new_payload JSONB,
      change_order INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT changeset_operation_uuid_key UNIQUE (uuid)
    )`
  );
  await execute(
    connection,
    `CREATE INDEX idx_changeset_operation_changeset_id ON changeset_operation(changeset_id)`
  );
  await execute(
    connection,
    `CREATE INDEX idx_changeset_operation_entity_urn ON changeset_operation(entity_urn)`
  );

  // 3. Add the circular FK now that both tables exist.
  // ON DELETE SET NULL — when the pointed-to op is deleted, the changeset's
  // current_change becomes null (don't cascade-delete the changeset).
  await execute(
    connection,
    `ALTER TABLE changeset
       ADD CONSTRAINT changeset_current_change_fkey
       FOREIGN KEY (current_change)
       REFERENCES changeset_operation(changeset_operation_id)
       ON DELETE SET NULL`
  );

  // 4. rollout_plan
  await execute(
    connection,
    `CREATE TABLE rollout_plan (
      rollout_plan_id INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      changeset_id INT NOT NULL REFERENCES changeset(changeset_id) ON DELETE CASCADE,
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT rollout_plan_uuid_key UNIQUE (uuid)
    )`
  );
  await execute(
    connection,
    `CREATE INDEX idx_rollout_plan_changeset_id ON rollout_plan(changeset_id)`
  );
  // Composite index for the active-rollout query
  // (start_time <= NOW() AND (end_time IS NULL OR end_time > NOW())).
  await execute(
    connection,
    `CREATE INDEX idx_rollout_plan_active ON rollout_plan(start_time, end_time)`
  );
};
