import Area from '@components/common/Area.js';
import { useAppDispatch } from '@components/common/context/app.js';
import { WidgetSettingsScope } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Button } from '@components/common/ui/Button.js';
import { Check, Pin, PinOff, Share2, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'urql';
import { v4 as uuidv4 } from 'uuid';

// Per-widget default drawer widths. Spec § 7.5 — wider widgets get more
// breathing room. Falls back to DEFAULT for unmapped types.
const DRAWER_WIDTHS: Record<string, number> = {
  product_grid: 540,
  form_builder: 580,
  collection_products: 540
};
const DRAWER_WIDTH_DEFAULT = 400;
const DRAWER_WIDTH_MIN = 320;
const DRAWER_WIDTH_MAX = 900;
const WIDTH_STORAGE_PREFIX = 'pb_drawer_width_';

function readPersistedWidth(widgetType: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WIDTH_STORAGE_PREFIX + widgetType);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.min(DRAWER_WIDTH_MAX, Math.max(DRAWER_WIDTH_MIN, n));
  } catch {
    return null;
  }
}

function persistWidth(widgetType: string, width: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      WIDTH_STORAGE_PREFIX + widgetType,
      String(width)
    );
  } catch {
    // localStorage unavailable / quota — non-fatal.
  }
}

const WIDGET_PLACEMENTS_QUERY = `
  query WidgetPlacements($uuid: String!) {
    widgetByUuid(uuid: $uuid) {
      placements {
        uuid
        route
        area
        sortOrder
      }
    }
  }
`;

interface SelectedWidget {
  uid: string;
  type: string;
  settings: Record<string, unknown>;
}

interface SharableRoute {
  id: string;
  name: string;
  path?: string;
}

interface PlacementRow {
  uuid: string;
  route: string;
  area: string;
  sortOrder: number;
}

interface SettingsDrawerProps {
  widget: SelectedWidget;
  currentRouteId: string;
  shareableRoutes: SharableRoute[];
  pinned: boolean;
  onTogglePin: () => void;
  onAddPlacement: (route: string, placementUuid: string) => Promise<void>;
  onRemovePlacement: (placementUuid: string) => Promise<void>;
  onClose: () => void;
  /**
   * Optional ref forwarded to the drawer's outer `<aside>`. The Editor uses
   * this to detect outside-clicks (clicks anywhere outside the drawer
   * collapse the drawer when it's not pinned).
   */
  containerRef?: React.MutableRefObject<HTMLElement | null>;
}

export function SettingsDrawer({
  widget,
  currentRouteId,
  shareableRoutes,
  pinned,
  onTogglePin,
  onAddPlacement,
  onRemovePlacement,
  onClose,
  containerRef
}: SettingsDrawerProps): React.ReactElement {
  const { setData } = useAppDispatch();

  const [placementsResult, refetchPlacements] = useQuery({
    query: WIDGET_PLACEMENTS_QUERY,
    variables: { uuid: widget.uid }
  });
  const serverPlacements: PlacementRow[] =
    (placementsResult.data as any)?.widgetByUuid?.placements ?? [];

  // Optimistic placement state. The GraphQL `widgetByUuid.placements`
  // resolver reads from the published `widget_placement` table directly
  // — it does NOT apply the changeset overlay — so toggling a route would
  // appear to do nothing until publish. We keep a local Map keyed by
  // routeId, seeded from the server response and mutated immediately on
  // toggle so the UI reflects the user's intent right away.
  //
  // Each entry holds the placement uuid we're tracking for that route — for
  // server-known placements that's the DB uuid; for locally-added ones we
  // generate a fresh uuid here so we can target it with a DELETE op if the
  // user toggles the route off again. Without this, an ON → OFF → ON
  // sequence would emit two INSERT ops with different uuids for the same
  // (widget, route, area) triple and trip widget_placement_unique on
  // publish.
  const [routeMap, setRouteMap] = useState<Map<string, PlacementRow>>(
    new Map()
  );
  // Seed/refresh the local map whenever the server payload changes. New
  // server entries are merged in; locally-added entries are preserved
  // (their uuids are valid changeset uuids and survive publish).
  useEffect(() => {
    setRouteMap((prev) => {
      const next = new Map(prev);
      for (const p of serverPlacements) {
        if (!p.area || p.area === 'widget_setting_form') continue;
        // Server data is authoritative when it appears. Locally-added entries
        // not yet visible to the server stay as-is.
        next.set(p.route, p);
      }
      return next;
    });
  }, [placementsResult.data]);

  const handleToggleRoute = useCallback(
    async (routeId: string, checked: boolean) => {
      if (checked) {
        // No-op if already placed (defensive; UI prevents this path).
        if (routeMap.has(routeId)) return;
        const newUuid = uuidv4();
        const optimisticRow: PlacementRow = {
          uuid: newUuid,
          route: routeId,
          area: 'content',
          sortOrder: 100
        };
        setRouteMap((prev) => {
          const next = new Map(prev);
          next.set(routeId, optimisticRow);
          return next;
        });
        await onAddPlacement(routeId, newUuid);
      } else {
        const existing = routeMap.get(routeId);
        if (!existing) return;
        // Optimistically remove first so the checkbox flips instantly.
        setRouteMap((prev) => {
          const next = new Map(prev);
          next.delete(routeId);
          return next;
        });
        await onRemovePlacement(existing.uuid);
      }
      refetchPlacements({ requestPolicy: 'network-only' });
    },
    [onAddPlacement, onRemovePlacement, refetchPlacements, routeMap]
  );

  // Inject the selected widget into the editor's React-side context.widgets
  // map. This is what `<Area id="widget_setting_form">` reads to find which
  // widget's admin component to render. We restore the empty list on
  // unmount so future drawer mounts don't see stale widgets.
  useEffect(() => {
    setData((prev: any) => ({
      ...prev,
      widgets: [
        {
          id: `e${widget.uid.replace(/-/g, '')}`,
          areaId: ['widget_setting_form'],
          type: widget.type,
          sortOrder: 0,
          uuid: widget.uid,
          settings: widget.settings
        }
      ]
    }));
    return () => {
      setData((prev: any) => ({ ...prev, widgets: [] }));
    };
  }, [widget.uid, widget.type, widget.settings, setData]);

  // The page-level form (mounted by Editor via FormProvider) holds this
  // widget's settings under `block.<uid>.settings.*`. Auto-save is wired
  // up there (one useWatch per widget UID with a per-uid debounce). The
  // drawer just mounts the scope so field components participate.

  // ESC to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const widgetTitle = useMemo(
    () => widget.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    [widget.type]
  );

  // Names of other routes (besides the current one) where this widget is
  // also placed. Used for the header chip and the "Settings change applies
  // to N routes" dynamic warning.
  const otherPlacedRouteNames = useMemo(() => {
    const others: string[] = [];
    for (const r of shareableRoutes) {
      if (r.id === currentRouteId) continue;
      if (routeMap.has(r.id)) others.push(r.name);
    }
    return others;
  }, [shareableRoutes, currentRouteId, routeMap]);
  const sharedRouteCount = otherPlacedRouteNames.length + 1; // +1 for current
  const sharedSummary = useMemo(() => {
    if (otherPlacedRouteNames.length === 0) return null;
    if (otherPlacedRouteNames.length <= 2) {
      return `Also shown on ${otherPlacedRouteNames.join(', ')}`;
    }
    const head = otherPlacedRouteNames.slice(0, 2).join(', ');
    return `Also shown on ${head} +${otherPlacedRouteNames.length - 2}`;
  }, [otherPlacedRouteNames]);

  // Share dropdown — toggle open/close + outside-click dismissal.
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!shareOpen) return;
    const onDown = (e: MouseEvent) => {
      const node = shareRef.current;
      if (!node) return;
      if (!node.contains(e.target as Node)) setShareOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [shareOpen]);

  // Width: persisted per widget type, falls back to per-type default, then
  // DEFAULT. Resize via drag on the left edge clamped to MIN..MAX.
  const [width, setWidth] = useState<number>(() => {
    const persisted = readPersistedWidth(widget.type);
    if (persisted !== null) return persisted;
    return DRAWER_WIDTHS[widget.type] ?? DRAWER_WIDTH_DEFAULT;
  });
  useEffect(() => {
    const persisted = readPersistedWidth(widget.type);
    setWidth(
      persisted ?? (DRAWER_WIDTHS[widget.type] ?? DRAWER_WIDTH_DEFAULT)
    );
  }, [widget.type]);

  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null
  );
  const handleResizeStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragStateRef.current = { startX: e.clientX, startWidth: width };

      // The iframe to the left of the drawer is a separate document; once
      // the cursor crosses into it, the parent window stops receiving
      // mousemove (the iframe captures them) and the drag thread dies.
      // That's why making the drawer BIGGER (dragging leftward, into the
      // iframe) lost focus while making it smaller worked fine. Disable
      // pointer events on the iframes for the duration of the drag and
      // restore them on mouseup. We also disable text selection on the
      // body so the cursor doesn't flicker between col-resize and the
      // text I-beam as it travels across the page.
      const iframes = Array.from(
        document.querySelectorAll<HTMLIFrameElement>('iframe')
      );
      const previousPointerEvents = iframes.map((f) => f.style.pointerEvents);
      iframes.forEach((f) => {
        f.style.pointerEvents = 'none';
      });
      const previousBodyUserSelect = document.body.style.userSelect;
      const previousBodyCursor = document.body.style.cursor;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const onMove = (ev: MouseEvent) => {
        const state = dragStateRef.current;
        if (!state) return;
        // Drawer is anchored right; dragging the left edge leftwards
        // increases width.
        const delta = state.startX - ev.clientX;
        const next = Math.min(
          DRAWER_WIDTH_MAX,
          Math.max(DRAWER_WIDTH_MIN, state.startWidth + delta)
        );
        setWidth(next);
      };
      const onUp = () => {
        dragStateRef.current = null;
        iframes.forEach((f, i) => {
          f.style.pointerEvents = previousPointerEvents[i] ?? '';
        });
        document.body.style.userSelect = previousBodyUserSelect;
        document.body.style.cursor = previousBodyCursor;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [width]
  );
  // Persist on width change after the drag settles. Throttled by React's
  // batching; only the last value within a tick lands in localStorage.
  useEffect(() => {
    persistWidth(widget.type, width);
  }, [widget.type, width]);

  return (
    <aside
      ref={containerRef}
      className="absolute top-0 right-0 h-full bg-card border-l border-divider shadow-lg flex flex-col"
      style={{ width: `${width}px` }}
      aria-label={`${widgetTitle} settings`}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize settings drawer"
        title="Drag to resize"
        onMouseDown={handleResizeStart}
        className="absolute top-0 left-0 h-full w-1 cursor-col-resize hover:bg-primary/30 transition-colors"
        style={{ touchAction: 'none' }}
      />
      <header className="flex items-center justify-between gap-2 px-4 h-[52px] border-b border-divider">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold truncate">{widgetTitle}</div>
            {sharedSummary && (
              <span
                className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20"
                title={`Placed on: ${[
                  shareableRoutes.find((r) => r.id === currentRouteId)?.name ??
                    'current page',
                  ...otherPlacedRouteNames
                ].join(', ')}`}
              >
                {sharedSummary}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">Auto-saves while you edit</div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePin}
            aria-label={pinned ? 'Unpin drawer' : 'Pin drawer open'}
            aria-pressed={pinned}
            title={
              pinned
                ? 'Unpin — drawer will close when you click empty canvas'
                : 'Pin — keep drawer open across canvas clicks'
            }
          >
            {pinned ? (
              <Pin className="h-4 w-4 text-primary" />
            ) : (
              <PinOff className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <WidgetSettingsScope uid={widget.uid}>
          <Area id="widget_setting_form" />
        </WidgetSettingsScope>
      </div>

      {shareableRoutes.length > 0 && (
        <footer className="border-t border-divider p-3">
          <div ref={shareRef} className="relative">
            <button
              type="button"
              onClick={() => setShareOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={shareOpen}
              className={`w-full flex items-center justify-between gap-2 px-3 h-9 rounded-md border text-sm font-medium transition-colors ${
                shareOpen
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-divider bg-card text-foreground hover:bg-muted/40'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Share2 className="h-3.5 w-3.5" />
                Share
              </span>
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                  shareOpen
                    ? 'bg-card text-muted-foreground'
                    : 'bg-muted/50 text-muted-foreground'
                }`}
                aria-label={`${sharedRouteCount} routes`}
              >
                {sharedRouteCount}
              </span>
            </button>
            {shareOpen && (
              <div
                className="absolute left-0 right-0 bottom-[calc(100%+8px)] z-30 bg-card border border-divider rounded-md shadow-lg p-1.5 max-h-[60vh] overflow-y-auto"
                role="menu"
              >
                <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Show on routes
                </div>
                {shareableRoutes.map((r) => {
                  const isCurrent = r.id === currentRouteId;
                  const isPlaced = isCurrent || routeMap.has(r.id);
                  // Lock the current route's checkbox if it's the only
                  // route this widget is on — must always live somewhere.
                  const lockCurrent =
                    isCurrent &&
                    sharedRouteCount === 1;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={isPlaced}
                      disabled={lockCurrent}
                      onClick={() => {
                        if (isCurrent) return; // current row is informational
                        handleToggleRoute(r.id, !isPlaced);
                      }}
                      className={`w-full text-left flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors ${
                        isPlaced ? 'bg-primary/10' : 'hover:bg-muted/40'
                      } ${
                        lockCurrent
                          ? 'cursor-not-allowed'
                          : 'cursor-pointer'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          isPlaced
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-card border-input'
                        }`}
                        aria-hidden="true"
                      >
                        {isPlaced && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-foreground truncate">
                            {r.name}
                          </span>
                          {isCurrent && (
                            <span className="shrink-0 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                              Current
                            </span>
                          )}
                        </span>
                        {r.path && (
                          <span className="block text-[11px] font-mono text-muted-foreground truncate">
                            {r.path}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                <div className="border-t border-divider mt-1.5 pt-2 px-2 pb-1 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <Share2 className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    Edits to a shared widget update every route it appears on.
                  </span>
                </div>
              </div>
            )}
          </div>
        </footer>
      )}
    </aside>
  );
}
