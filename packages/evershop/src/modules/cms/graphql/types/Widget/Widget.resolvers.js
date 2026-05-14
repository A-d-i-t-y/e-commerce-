import { select } from '@evershop/postgres-query-builder';
import sanitizeHtml from 'sanitize-html';
import uniqid from 'uniqid';
import { error } from '../../../../../lib/log/logger.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import {
  getEnabledWidgets,
  getWidget
} from '../../../../../lib/widget/widgetManager.js';
import { applyOverlayToWidgets } from '../../../../pageBuilder/services/applyOverlayToWidgets.js';
import { loadActiveOps } from '../../../../pageBuilder/services/loadActiveOps.js';
import { getCmsPagesBaseQuery } from '../../../services/getCmsPagesBaseQuery.js';
import { getWidgetsBaseQuery } from '../../../services/getWidgetsBaseQuery.js';
import { WidgetCollection } from '../../../services/WidgetCollection.js';

const COLUMNS_AREA_PREFIX = 'columnsContainer_';

/**
 * Build the per-column children array for a container widget out of
 * already-overlay-applied widget + placement maps. Mirrors the SQL-based
 * `Widget.columns` resolver below — same prefix parsing, same ordering —
 * but operates on in-memory maps so the overlay merge is preserved.
 *
 * Each child also gets its own `_overlayPlacements` so a downstream
 * `Widget.placements` field resolution doesn't fall back to source SQL.
 * Children of children (nested containers) get `_overlayColumns` set
 * recursively so the Layers panel can render arbitrary nesting depth.
 */
function computeOverlayColumns(parentUuid, widgetMap, placementMap) {
  const prefix = `${COLUMNS_AREA_PREFIX}${parentUuid}_col_`;
  const groups = new Map();
  for (const p of placementMap.values()) {
    const area = p.area || '';
    if (!area.startsWith(prefix)) continue;
    const child = widgetMap.get(p.widget_instance_uuid);
    if (!child || child.status === false) continue;
    const idxRaw = area.slice(prefix.length);
    const idx = Number.parseInt(idxRaw, 10);
    if (!Number.isFinite(idx)) continue;
    if (!groups.has(idx)) groups.set(idx, []);
    groups.get(idx).push({ child, sortOrder: p.sort_order ?? 0 });
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, entries]) => {
      entries.sort((a, b) => a.sortOrder - b.sortOrder);
      return {
        index,
        widgets: entries.map(({ child }) => {
          const camel = camelCase(child);
          camel._overlayPlacements = [...placementMap.values()]
            .filter((p) => p.widget_instance_uuid === child.uuid)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map(camelCase);
          camel._overlayColumns = computeOverlayColumns(
            child.uuid,
            widgetMap,
            placementMap
          );
          return camel;
        })
      };
    });
}

export default {
  Query: {
    widget: async (root, { id }, { pool }) => {
      const query = getWidgetsBaseQuery();
      // Renamed in cms migration 1.3.0: widget_id → widget_instance_id.
      query.where('widget_instance_id', '=', id);
      const widget = await query.load(pool);
      return widget ? camelCase(widget) : null;
    },
    widgetByUuid: async (_, { uuid }, { pool }) => {
      const query = getWidgetsBaseQuery();
      query.where('uuid', '=', uuid);
      const widget = await query.load(pool);
      return widget ? camelCase(widget) : null;
    },
    widgets: async (_, { filters = [] }, { user }) => {
      const query = getWidgetsBaseQuery();
      const root = new WidgetCollection(query);
      await root.init(filters, !!user);
      return root;
    },
    /**
     * Page-builder layers panel: top-level widgets for a route. Returns
     * one entry per widget (de-duplicated across multiple placements);
     * children of container widgets are returned nested in each entry's
     * `columns` field via the parent value, not as separate top-level
     * entries.
     *
     * When `changeset` is provided, the resolver loads source widget +
     * placement state into in-memory maps, applies that changeset's draft
     * ops via `applyOverlayToWidgets`, then filters/groups the merged
     * state. Result matches what the iframe renders for the same token.
     * Without `changeset`, the resolver still goes through the same code
     * path but with zero ops applied — equivalent to source-only.
     *
     * The Widget.placements / Widget.columns field resolvers honor the
     * `_overlayPlacements` / `_overlayColumns` private fields set here so
     * they don't re-query source SQL and lose the overlay merge.
     */
    widgetsForRoute: async (_, { route, changeset }, { pool }) => {
      // 1. Load source widget_instance state.
      const widgetRows = await pool.query(
        `SELECT widget_instance_id, uuid, name, type, settings, status,
                created_at, updated_at
         FROM widget_instance`
      );
      const widgetMap = new Map();
      for (const row of widgetRows.rows) {
        widgetMap.set(row.uuid, row);
      }

      // 2. Load source widget_placement state (with widget_instance.uuid
      //    joined so the overlay engine doesn't need to translate ids).
      const placementRows = await pool.query(
        `SELECT p.widget_placement_id, p.uuid, p.route, p.area, p.sort_order,
                p.entity_urn, wi.uuid AS widget_instance_uuid
         FROM widget_placement p
         INNER JOIN widget_instance wi
                 ON wi.widget_instance_id = p.widget_instance_id`
      );
      const placementMap = new Map();
      for (const row of placementRows.rows) {
        placementMap.set(row.uuid, row);
      }

      // 3. Apply overlay (preview changeset only — admin's draft state).
      //    Active rollouts are NOT applied here on purpose: the page-builder
      //    iframe also doesn't apply rollouts when a preview token is
      //    present (loadStorefrontWidgets in cms/services/widget). Layers
      //    must match the iframe.
      if (typeof changeset === 'string' && changeset.length > 0) {
        const ops = await loadActiveOps({ previewChangesetToken: changeset });
        if (ops.length > 0) {
          applyOverlayToWidgets(widgetMap, placementMap, ops);
        }
      }

      // 4. Bucket placements per widget so we can compute the per-widget
      //    children + min_sort + filtered placements list in one pass.
      const placementsByWidget = new Map();
      for (const p of placementMap.values()) {
        const arr = placementsByWidget.get(p.widget_instance_uuid) ?? [];
        arr.push(p);
        placementsByWidget.set(p.widget_instance_uuid, arr);
      }

      // 5. Walk widgets, keeping only those with at least one route-matching,
      //    non-entity-scoped, non-synthetic placement. Compute min sort for
      //    ordering. Attach overlay-applied placements + columns as private
      //    fields the GraphQL field resolvers will short-circuit on.
      const result = [];
      for (const widget of widgetMap.values()) {
        if (widget.status === false) continue;
        const placements = placementsByWidget.get(widget.uuid) ?? [];
        const visiblePlacements = placements.filter(
          (p) =>
            p.entity_urn == null &&
            (p.route === 'all' || p.route === route) &&
            !(p.area || '').startsWith(COLUMNS_AREA_PREFIX)
        );
        if (visiblePlacements.length === 0) continue;
        const minSort = visiblePlacements.reduce(
          (m, p) => Math.min(m, p.sort_order ?? 0),
          Number.POSITIVE_INFINITY
        );
        const camel = camelCase(widget);
        camel._overlayPlacements = placements
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map(camelCase);
        camel._overlayColumns = computeOverlayColumns(
          widget.uuid,
          widgetMap,
          placementMap
        );
        result.push({ widget: camel, minSort });
      }

      result.sort((a, b) => a.minSort - b.minSort);
      return result.map((r) => r.widget);
    },
    widgetTypes: () => {
      const types = getEnabledWidgets();
      return types.map((row) => ({
        code: row.type,
        name: row.name,
        description: row.description,
        category: row.category ?? null,
        settingComponent: row.settingComponent,
        component: row.component,
        // Field name matches the schema's `defaultSetting` (singular). The
        // internal registration shape uses `defaultSettings` (plural).
        // Without this mapping the GraphQL field resolves to null and
        // freshly-added widgets get `settings: {}` instead of the
        // registered defaults — the widget renders invisible.
        defaultSetting: row.defaultSettings,
        createWidgetUrl: buildUrl('widgetNew', { type: row.type })
      }));
    },
    widgetType: (_, { code }) => {
      const types = getEnabledWidgets();
      const type = types.find((row) => row.type === code);
      return type
        ? {
            code: type.type,
            name: type.name,
            description: type.description,
            category: type.category ?? null,
            settingComponent: type.settingComponent,
            component: type.component,
            defaultSetting: type.defaultSettings,
            createWidgetUrl: buildUrl('widgetNew', { type: type.type })
          }
        : null;
    },
    columnsWidget(_, { columnCount, gap }) {
      return {
        columnCount: Math.max(1, Math.min(4, Number(columnCount) || 2)),
        gap: Math.max(0, Math.min(80, Number(gap) ?? 16))
      };
    },
    textWidget(_, { text, className }) {
      // The storefront `TextBlock` component expects `text` to be a Row[]
      // (the EditorJS row/column/blocks tree). Settings stored by the
      // setting form are JSON-stringified arrays; defaults registered in
      // `bootstrap.ts` may also arrive as raw strings or already-parsed
      // arrays (JSONB column). Normalize all four cases here so the
      // component never has to defend.
      const wrapPlainText = (str) => [
        {
          size: 12,
          columns: [
            {
              size: 12,
              data: { blocks: [{ type: 'paragraph', data: { text: str } }] }
            }
          ]
        }
      ];
      if (Array.isArray(text)) {
        return { text, className };
      }
      if (typeof text === 'string') {
        const trimmed = text.trim();
        if (!trimmed) return { text: [], className };
        // Looks like JSON? Try to parse. Anything else is plain prose —
        // wrap it as a single-paragraph row so the user sees their default.
        const looksJson =
          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('{') && trimmed.endsWith('}'));
        if (looksJson) {
          try {
            const parsed = JSON.parse(trimmed);
            return {
              text: Array.isArray(parsed) ? parsed : wrapPlainText(text),
              className
            };
          } catch {
            // fall through to plain-text wrap
          }
        }
        return { text: wrapPlainText(text), className };
      }
      return { text: [], className };
    },
    bannerWidget(_, { src, alignment, width, height, alt }) {
      return { src, alignment, width, height, alt };
    },
    slideshowWidget(
      _,
      {
        slides,
        autoplay,
        autoplaySpeed,
        arrows,
        dots,
        fullWidth,
        widthValue,
        heightValue,
        heightType
      }
    ) {
      return {
        slides: slides || [],
        autoplay: autoplay !== undefined ? autoplay : true,
        autoplaySpeed: autoplaySpeed || 3000,
        arrows: arrows !== undefined ? arrows : true,
        dots: dots !== undefined ? dots : true,
        fullWidth: fullWidth !== undefined ? fullWidth : true,
        widthValue: widthValue || 1920,
        heightValue: heightValue || 800,
        heightType: heightType || 'auto'
      };
    },
    basicMenuWidget: async (_, { settings }, { pool }) => {
      const categories = [];
      const pages = [];
      const menus = settings?.menus || undefined;
      const isMain = [1, '1', 'true', true].includes(settings?.isMain) || false;
      if (!menus) {
        return { menus: [] };
      }

      for (const menu of menus) {
        if (menu.type === 'category') {
          categories.push(menu.uuid);
        }
        if (menu.type === 'page') {
          pages.push(menu.uuid);
        }
        menu.children.forEach((child) => {
          if (child.type === 'category') {
            categories.push(child.uuid);
          }
          if (child.type === 'page') {
            pages.push(child.uuid);
          }
        });
      }
      let urls = [];
      if (categories.length > 0) {
        const rewrites = await select()
          .from('url_rewrite')
          .where('entity_uuid', 'IN', categories)
          .execute(pool);
        urls = urls.concat(
          rewrites.map((r) => ({
            uuid: r.entity_uuid,
            url: r.request_path
          }))
        );
      }
      if (pages.length > 0) {
        const query = getCmsPagesBaseQuery();
        query.where('uuid', 'IN', pages);
        const cmsPages = await query.execute(pool);
        urls = urls.concat(
          cmsPages.map((p) => ({
            uuid: p.uuid,
            url: buildUrl('cmsPageView', { url_key: p.url_key })
          }))
        );
      }
      const items = menus.map((menu) => {
        const url = urls.find((u) => u.uuid === menu.uuid);
        return {
          ...menu,
          id: uniqid(),

          url: url ? url.url : menu.type === 'custom' ? menu.url : null,
          children: menu.children.map((child) => {
            const url = urls.find((u) => u.uuid === child.uuid);
            return {
              ...child,
              id: uniqid(),

              url: url ? url.url : child.type === 'custom' ? child.url : null
            };
          })
        };
      });
      return { menus: items, isMain, className: settings?.className };
    }
  },
  // Phase 2b — typed widget settings union. `__resolveType` reads the
  // `__typename` we attach in `Widget.settings` below. Widgets without a
  // graphql block resolve to `null` from `settings` (the field is nullable).
  WidgetSettings: {
    __resolveType: (obj) => obj && obj.__typename
  },

  Widget: {
    // Backward-compat alias (cms migration 1.3.0 renamed widget_id → widget_instance_id).
    widgetId: (widget) => widget.widgetInstanceId,

    // Phase 2b — typed settings. Returns the raw settings tagged with the
    // widget's `graphql.settingsType` as `__typename`, or null if the widget
    // type didn't register a graphql block.
    settings: (widget) => {
      const registration = getWidget(widget.type);
      if (!registration?.graphql?.settingsType) return null;
      const raw = widget.settings ?? {};
      return {
        __typename: registration.graphql.settingsType,
        ...raw
      };
    },

    // Backward-compat raw access during the migration window.
    rawSettings: (widget) => widget.settings ?? {},

    editUrl: ({ uuid }) => buildUrl('widgetEdit', { id: uuid }),
    updateApi: (widget) => buildUrl('updateWidget', { id: widget.uuid }),
    deleteApi: (widget) => buildUrl('deleteWidget', { id: widget.uuid }),

    placements: async (widget, _, { pool }) => {
      // Short-circuit when the parent resolver already supplied an
      // overlay-applied placements list (page-builder Layers query path).
      // Otherwise legacy queries fall through to source SQL.
      if (Array.isArray(widget._overlayPlacements)) {
        return widget._overlayPlacements;
      }
      const query = select().from('widget_placement');
      query.where('widget_instance_id', '=', widget.widgetInstanceId);
      query.orderBy('sort_order', 'asc');
      const rows = await query.execute(pool);
      return rows.map(camelCase);
    },

    columns: async (widget, _, { pool }) => {
      // Same short-circuit pattern as `placements` above.
      if (Array.isArray(widget._overlayColumns)) {
        return widget._overlayColumns;
      }
      // Container children: placements whose `area` is the synthetic
      // `columnsContainer_<this-uuid>_col_<index>` pattern. Parse the index
      // out of the area name and group. Non-containers return `[]` because
      // no placements match the prefix.
      const prefix = `columnsContainer_${widget.uuid}_col_`;
      const result = await pool.query(
        `SELECT wi.*, wp.area, wp.sort_order
         FROM widget_placement wp
         INNER JOIN widget_instance wi
                 ON wi.widget_instance_id = wp.widget_instance_id
         WHERE LEFT(wp.area, $1) = $2
         ORDER BY wp.sort_order ASC`,
        [prefix.length, prefix]
      );
      if (result.rows.length === 0) return [];
      const groups = new Map();
      for (const child of result.rows) {
        const suffix = child.area.slice(prefix.length);
        const idx = Number.parseInt(suffix, 10);
        if (!Number.isFinite(idx)) continue;
        if (!groups.has(idx)) groups.set(idx, []);
        groups.get(idx).push(camelCase(child));
      }
      return [...groups.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, widgets]) => ({ index, widgets }));
    },

    // Deprecated route/area/sortOrder — derived from placements during the
    // transition window. The admin UI still reads these for the widget
    // edit/grid screens until Phase 3c rewrites that surface to use
    // `placements` directly.
    route: async (widget, _, { pool }) => {
      const query = select('route').from('widget_placement');
      query.where('widget_instance_id', '=', widget.widgetInstanceId);
      const rows = await query.execute(pool);
      return [...new Set(rows.map((r) => r.route))];
    },

    area: async (widget, _, { pool }) => {
      const query = select('area').from('widget_placement');
      query.where('widget_instance_id', '=', widget.widgetInstanceId);
      const rows = await query.execute(pool);
      return [...new Set(rows.map((r) => r.area))];
    },

    sortOrder: async (widget, _, { pool }) => {
      const query = select('sort_order').from('widget_placement');
      query.where('widget_instance_id', '=', widget.widgetInstanceId);
      query.orderBy('sort_order', 'asc');
      const rows = await query.execute(pool);
      return rows[0]?.sort_order ?? 0;
    }
  }
};
