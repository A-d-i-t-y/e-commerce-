import { Button } from '@components/common/ui/Button.js';
import { AlertTriangle, X } from 'lucide-react';
import React, { useEffect } from 'react';

interface ExitConfirmDialogProps {
  /** In-flight `addChangesetOperation` POSTs that haven't returned yet. */
  pendingCount: number;
  /** Saved-but-unpublished operations in the current draft changeset. */
  unpublishedCount?: number;
  onStay: () => void;
  onLeave: () => void;
  onSaveAsRollout: () => void;
}

/**
 * Spec § 7.8 — exit-confirm dialog. Shown when in-app navigation is
 * attempted while:
 *   - In-flight saves haven't reached the server, OR
 *   - The draft has saved-but-unpublished operations.
 *
 * Three options:
 *  - Stay: cancel the navigation.
 *  - Leave: navigate anyway. In-flight typing is dropped; the unpublished
 *    draft remains on the server and the user can resume it later.
 *  - Save as rollout plan and leave: open the rollout-schedule flow; on
 *    success the editor navigates to the original destination URL.
 *
 * Browser-tab close uses the native `beforeunload` prompt instead — the
 * platform doesn't allow custom UI for that path.
 */
export function ExitConfirmDialog({
  pendingCount,
  unpublishedCount = 0,
  onStay,
  onLeave,
  onSaveAsRollout
}: ExitConfirmDialogProps): React.ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onStay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStay]);

  const hasInFlight = pendingCount > 0;
  const hasUnpublished = unpublishedCount > 0;

  const titleText = hasInFlight
    ? 'Unsaved changes'
    : 'Unpublished changes';

  const primaryMessage = hasInFlight
    ? pendingCount === 1
      ? 'You have 1 change still saving.'
      : `You have ${pendingCount} changes still saving.`
    : unpublishedCount === 1
    ? 'You have 1 change in this draft that hasn’t been published yet.'
    : `You have ${unpublishedCount} changes in this draft that haven’t been published yet.`;

  const secondaryMessage = hasInFlight
    ? 'Leaving now may drop the most recent edits that haven’t reached the server yet.'
    : 'Your draft is safe on the server — you can come back and publish it any time.';

  return (
    <div
      className="fixed inset-0 z-[1200] bg-black/40 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-confirm-title"
    >
      <div className="bg-card text-foreground border border-divider rounded-lg shadow-xl w-full max-w-md mx-4">
        <header className="flex items-center justify-between px-4 h-[52px] border-b border-divider">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 id="exit-confirm-title" className="font-medium text-sm">
              {titleText}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onStay}
            aria-label="Stay on this page"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="p-4 space-y-2 text-sm">
          <p>{primaryMessage}</p>
          <p className="text-muted-foreground text-xs">{secondaryMessage}</p>
          {hasInFlight && hasUnpublished && (
            <p className="text-muted-foreground text-xs">
              The draft holds {unpublishedCount} saved change
              {unpublishedCount === 1 ? '' : 's'} you can publish later.
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 px-4 py-3 border-t border-divider">
          <Button variant="ghost" onClick={onStay}>
            Stay
          </Button>
          <Button variant="ghost" onClick={onSaveAsRollout}>
            Save as rollout plan and leave
          </Button>
          <Button variant="destructive" onClick={onLeave}>
            Leave
          </Button>
        </footer>
      </div>
    </div>
  );
}
