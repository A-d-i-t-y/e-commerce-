import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@components/common/ui/AlertDialog.js';
import React, { useEffect, useState } from 'react';

export type DiscardMode = 'all' | 'route';

export interface DiscardConfirmDialogProps {
  open: boolean;
  /**
   * The route the user is currently viewing — drives the label of the
   * "this page only" option and the route filter sent on confirm.
   */
  currentRouteId: string;
  currentRouteName?: string;
  /**
   * Op count for the current route, when known. Renders as a small hint.
   * Pass `undefined` to omit; pass `0` to hide the "this page only" option
   * entirely (nothing to discard on this page).
   */
  currentRouteOpCount: number | undefined;
  /**
   * Per-route breakdown for the "all" option's hint text. Sorted by count
   * descending by the caller. Pass `[]` if unknown.
   */
  routeBreakdown: ReadonlyArray<{ route: string; count: number }>;
  totalOpCount: number;
  busy?: boolean;
  onConfirm: (mode: DiscardMode) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Two-mode discard dialog (spec § 7.6 / § 7.8). The default is to discard
 * the whole draft (legacy behavior). Users editing across multiple routes
 * can opt into a route-scoped discard that leaves their other-route work
 * intact.
 */
export function DiscardConfirmDialog({
  open,
  currentRouteId,
  currentRouteName,
  currentRouteOpCount,
  routeBreakdown,
  totalOpCount,
  busy = false,
  onConfirm,
  onCancel
}: DiscardConfirmDialogProps): React.ReactElement {
  const [mode, setMode] = useState<DiscardMode>('all');

  // Re-seed default to 'all' every time the dialog re-opens, so the safer
  // default doesn't carry over a previous session's choice.
  useEffect(() => {
    if (open) setMode('all');
  }, [open]);

  const hasRouteOps =
    typeof currentRouteOpCount === 'number' && currentRouteOpCount > 0;
  const breakdownLabel =
    routeBreakdown.length > 0
      ? routeBreakdown
          .map((r) => `${r.count} on ${r.route}`)
          .join(', ')
      : null;
  const routeLabel = currentRouteName || currentRouteId;

  return (
    <AlertDialog open={open} onOpenChange={(o) => (!o ? onCancel() : null)}>
      <AlertDialogContent className="z-[1300]">
        <AlertDialogHeader>
          <AlertDialogTitle>Discard pending changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Choose how much of your unpublished work to discard. The published
            storefront is not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 px-1 py-2 text-sm">
          <label
            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
              mode === 'all'
                ? 'border-primary bg-primary/5'
                : 'border-divider hover:bg-muted/40'
            }`}
          >
            <input
              type="radio"
              name="discard-mode"
              value="all"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              disabled={busy}
              className="mt-1 accent-primary"
            />
            <span className="flex-1">
              <span className="block font-medium">
                Discard everything in this draft
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {totalOpCount > 0
                  ? `${totalOpCount} op${totalOpCount === 1 ? '' : 's'} total${
                      breakdownLabel ? ` — ${breakdownLabel}` : ''
                    }. The draft itself is deleted.`
                  : 'The draft is deleted.'}
              </span>
            </span>
          </label>

          {hasRouteOps && (
            <label
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                mode === 'route'
                  ? 'border-primary bg-primary/5'
                  : 'border-divider hover:bg-muted/40'
              }`}
            >
              <input
                type="radio"
                name="discard-mode"
                value="route"
                checked={mode === 'route'}
                onChange={() => setMode('route')}
                disabled={busy}
                className="mt-1 accent-primary"
              />
              <span className="flex-1">
                <span className="block font-medium">
                  Discard changes on this page only
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {currentRouteOpCount} op
                  {currentRouteOpCount === 1 ? '' : 's'} on{' '}
                  <strong>{routeLabel}</strong>. Your edits on other pages
                  stay in the draft.
                </span>
              </span>
            </label>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            variant="destructive"
            onClick={() => {
              void onConfirm(mode);
            }}
          >
            {busy
              ? 'Discarding…'
              : mode === 'all'
                ? 'Discard everything'
                : 'Discard this page'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
