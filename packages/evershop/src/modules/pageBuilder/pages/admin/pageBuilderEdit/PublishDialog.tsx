import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@components/common/ui/Dialog.js';
import React, { useMemo } from 'react';

interface ChangesetOperation {
  entityUrn: string;
  oldPayload: Record<string, unknown> | null;
  newPayload: Record<string, unknown> | null;
}

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isBusy: boolean;
  operations: ChangesetOperation[];
}

interface OpSummary {
  insertWidget: number;
  updateWidget: number;
  deleteWidget: number;
  insertPlacement: number;
  updatePlacement: number;
  deletePlacement: number;
}

function summarize(ops: ChangesetOperation[]): OpSummary {
  const summary: OpSummary = {
    insertWidget: 0,
    updateWidget: 0,
    deleteWidget: 0,
    insertPlacement: 0,
    updatePlacement: 0,
    deletePlacement: 0
  };
  for (const op of ops) {
    const isWidget = op.entityUrn?.includes(':widget_instance:');
    const isPlacement = op.entityUrn?.includes(':widget_placement:');
    const isInsert = op.oldPayload == null && op.newPayload != null;
    const isDelete = op.oldPayload != null && op.newPayload == null;
    const isUpdate = op.oldPayload != null && op.newPayload != null;
    if (isWidget) {
      if (isInsert) summary.insertWidget++;
      else if (isUpdate) summary.updateWidget++;
      else if (isDelete) summary.deleteWidget++;
    } else if (isPlacement) {
      if (isInsert) summary.insertPlacement++;
      else if (isUpdate) summary.updatePlacement++;
      else if (isDelete) summary.deletePlacement++;
    }
  }
  return summary;
}

export function PublishDialog({
  open,
  onClose,
  onConfirm,
  isBusy,
  operations
}: PublishDialogProps): React.ReactElement {
  const summary = useMemo(() => summarize(operations || []), [operations]);
  const total = operations?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish changes</DialogTitle>
          <DialogDescription>
            These edits will be applied to the live storefront immediately.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {total === 0 ? (
          <p className="text-sm text-muted-foreground">
            This changeset has no operations to publish.
          </p>
        ) : (
          <div className="text-sm space-y-2 py-2">
            <div className="font-medium">
              {total} operation{total === 1 ? '' : 's'}:
            </div>
            <ul className="space-y-1 pl-4 list-disc text-muted-foreground">
              {summary.insertWidget > 0 && (
                <li>
                  <span className="text-foreground">{summary.insertWidget}</span>{' '}
                  widget{summary.insertWidget === 1 ? '' : 's'} added
                </li>
              )}
              {summary.updateWidget > 0 && (
                <li>
                  <span className="text-foreground">{summary.updateWidget}</span>{' '}
                  widget setting{summary.updateWidget === 1 ? '' : 's'} updated
                </li>
              )}
              {summary.deleteWidget > 0 && (
                <li>
                  <span className="text-foreground">{summary.deleteWidget}</span>{' '}
                  widget{summary.deleteWidget === 1 ? '' : 's'} removed
                </li>
              )}
              {summary.insertPlacement > 0 && (
                <li>
                  <span className="text-foreground">{summary.insertPlacement}</span>{' '}
                  placement{summary.insertPlacement === 1 ? '' : 's'} added
                </li>
              )}
              {summary.updatePlacement > 0 && (
                <li>
                  <span className="text-foreground">{summary.updatePlacement}</span>{' '}
                  placement{summary.updatePlacement === 1 ? '' : 's'} updated
                </li>
              )}
              {summary.deletePlacement > 0 && (
                <li>
                  <span className="text-foreground">{summary.deletePlacement}</span>{' '}
                  placement{summary.deletePlacement === 1 ? '' : 's'} removed
                </li>
              )}
            </ul>
          </div>
        )}

        <DialogFooter>
          <ButtonGroup>
            <Button variant="ghost" onClick={onClose} disabled={isBusy}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isBusy || total === 0}>
              {isBusy ? 'Publishing…' : 'Publish'}
            </Button>
          </ButtonGroup>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
