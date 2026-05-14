import { Button } from '@components/common/ui/Button.js';
import { AlertTriangle, X } from 'lucide-react';
import React, { useEffect } from 'react';

interface ExitConfirmDialogProps {
  pendingCount: number;
  onStay: () => void;
  onLeave: () => void;
  onSaveAsRollout: () => void;
}

/**
 * Spec § 7.8 — exit-confirm dialog. Shown when in-app navigation is
 * attempted while saves are still in flight. Three options:
 *  - Stay: cancel the navigation.
 *  - Leave: navigate anyway, dropping any in-flight typing.
 *  - Save as rollout plan and leave: open the rollout-schedule flow; on
 *    success the editor navigates to the rollout list URL.
 *
 * Browser-tab close uses the native `beforeunload` prompt instead — the
 * platform doesn't allow custom UI for that path.
 */
export function ExitConfirmDialog({
  pendingCount,
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
            <h2 id="exit-confirm-title" className="font-semibold text-sm">
              Unsaved changes
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
          <p>
            {pendingCount === 1
              ? 'You have an in-flight save.'
              : `You have ${pendingCount} in-flight saves.`}{' '}
            Leaving now may drop changes that haven't reached the server yet.
          </p>
          <p className="text-muted-foreground text-xs">
            Your already-saved draft is safe — only the most recent typing is at
            risk.
          </p>
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
