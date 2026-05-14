import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@components/common/ui/Dialog.js';
import React, { useEffect, useMemo, useState } from 'react';

export interface RolloutPlanInput {
  name: string;
  startTime: string; // ISO
  endTime: string | null;
}

/**
 * Subset of `rollout_plan` columns needed for the client-side overlap check.
 * Caller should supply the same set the server's overlap query considers —
 * "active or upcoming" plans, i.e. `end_time IS NULL OR end_time > NOW()`.
 * Past plans should be filtered out by the caller so the overlap math stays
 * cheap.
 */
export interface ExistingRolloutPlan {
  rolloutPlanId: number;
  name: string;
  startTime: string;
  endTime: string | null;
}

interface RolloutDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (plan: RolloutPlanInput) => void;
  isBusy: boolean;
  /**
   * Active-or-upcoming rollout plans the new plan would have to coexist with.
   * Used for the live overlap check that mirrors spec § 5.9.1 — same
   * algorithm as the server's `createRolloutPlan` endpoint, so the user
   * sees the same verdict before submission.
   */
  existingPlans?: ReadonlyArray<ExistingRolloutPlan>;
}

interface FieldErrors {
  name?: string;
  startTime?: string;
  endTime?: string;
  overlap?: string;
}

function fmtRange(startAt: string, endAt: string): string {
  if (!startAt) return 'Draft — not scheduled';
  const fmt = (v: string) =>
    new Date(v).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  return `${fmt(startAt)} → ${endAt ? fmt(endAt) : 'open'}`;
}

/**
 * Pure validator. Returns the field-error map for the current field values.
 * Called on every render so the form stays in sync; cheap because the
 * existingPlans list is already small (active/upcoming only) and the check
 * is O(n).
 */
function validate(
  name: string,
  startAt: string,
  endAt: string,
  existingPlans: ReadonlyArray<ExistingRolloutPlan>
): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = 'Name is required.';
  }

  // Start time is required to actually schedule. Empty start = draft mode,
  // which is intentionally allowed by the dialog copy.
  let startMs: number | null = null;
  if (startAt) {
    const ms = new Date(startAt).getTime();
    if (Number.isNaN(ms)) {
      errors.startTime = 'Start time is invalid.';
    } else {
      startMs = ms;
    }
  } else {
    errors.startTime = 'Pick a start time to schedule this rollout.';
  }

  let endMs: number | null = null;
  if (endAt) {
    const ms = new Date(endAt).getTime();
    if (Number.isNaN(ms)) {
      errors.endTime = 'End time is invalid.';
    } else if (startMs != null && ms <= startMs) {
      errors.endTime = 'End time must be after start time.';
    } else {
      endMs = ms;
    }
  }

  // Overlap with existing active-or-upcoming plans (spec § 5.9.1). Skipped
  // when there's a more fundamental field error — no point checking the
  // overlap of an invalid range.
  if (startMs != null && !errors.endTime) {
    const proposedEnd = endMs ?? Number.POSITIVE_INFINITY;
    const conflicts: string[] = [];
    const now = Date.now();
    for (const p of existingPlans) {
      const eStartMs = new Date(p.startTime).getTime();
      if (Number.isNaN(eStartMs)) continue;
      const eEndMs = p.endTime
        ? new Date(p.endTime).getTime()
        : Number.POSITIVE_INFINITY;
      // Skip past plans defensively (caller should filter, but be safe).
      if (eEndMs <= now) continue;
      // [s1, e1) ∩ [s2, e2) non-empty iff s1 < e2 AND s2 < e1.
      if (eStartMs < proposedEnd && startMs < eEndMs) {
        conflicts.push(p.name);
      }
    }
    if (conflicts.length > 0) {
      errors.overlap = `Overlaps with existing rollout${
        conflicts.length === 1 ? '' : 's'
      }: ${conflicts.join(', ')}.`;
    }
  }

  return errors;
}

export function RolloutDialog({
  open,
  onClose,
  onSubmit,
  isBusy,
  existingPlans = []
}: RolloutDialogProps): React.ReactElement {
  const [name, setName] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  // Per-field "user has interacted" flags so we don't yell at the user about
  // an empty form they just opened. Errors render once a field is touched
  // OR after the user attempts to submit.
  const [touched, setTouched] = useState<{
    name: boolean;
    startTime: boolean;
    endTime: boolean;
  }>({ name: false, startTime: false, endTime: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Reset when re-opening so the dialog always starts clean.
  useEffect(() => {
    if (!open) return;
    setName('');
    setStartAt('');
    setEndAt('');
    setTouched({ name: false, startTime: false, endTime: false });
    setSubmitAttempted(false);
  }, [open]);

  const errors = useMemo(
    () => validate(name, startAt, endAt, existingPlans),
    [name, startAt, endAt, existingPlans]
  );
  const isValid = Object.keys(errors).length === 0;

  const showError = (key: keyof FieldErrors): string | undefined => {
    // Overlap is a cross-field/form-level error. The user has clearly
    // entered enough data to evaluate a conflict; gating it on `touched`
    // hides the most useful message for the wrong reason. Surface as soon
    // as it's detected.
    if (key === 'overlap') return errors.overlap;
    if (submitAttempted) return errors[key];
    if (key === 'name' && touched.name) return errors.name;
    if (key === 'startTime' && touched.startTime) return errors.startTime;
    if (key === 'endTime' && touched.endTime) return errors.endTime;
    return undefined;
  };

  const willBeDraft = !startAt;

  const handleSave = () => {
    setSubmitAttempted(true);
    if (!isValid) return; // Defensive — button should be disabled in this case.
    const startMs = new Date(startAt).getTime();
    const endIso = endAt ? new Date(new Date(endAt).getTime()).toISOString() : null;
    onSubmit({
      name: name.trim(),
      startTime: new Date(startMs).toISOString(),
      endTime: endIso
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Save as rollout plan</DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
          A rollout plan saves your current edits as a snapshot and applies
          them automatically during a scheduled window.
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-foreground/80 tracking-wide">
            Name
          </label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="e.g. Summer Sale 2026"
            aria-invalid={!!showError('name')}
            className={`w-full bg-card border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 ${
              showError('name')
                ? 'border-destructive focus:ring-destructive'
                : 'border-divider focus:ring-primary'
            }`}
          />
          {showError('name') && (
            <p className="text-xs text-destructive" role="alert">
              {showError('name')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-foreground/80 tracking-wide">
              Start
            </label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, startTime: true }))}
              aria-invalid={!!showError('startTime')}
              className={`w-full bg-card border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                showError('startTime')
                  ? 'border-destructive focus:ring-destructive'
                  : 'border-divider focus:ring-primary'
              }`}
            />
            {showError('startTime') && (
              <p className="text-xs text-destructive" role="alert">
                {showError('startTime')}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-foreground/80 tracking-wide">
              End{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, endTime: true }))}
              disabled={!startAt}
              aria-invalid={!!showError('endTime')}
              className={`w-full bg-card border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 disabled:opacity-50 ${
                showError('endTime')
                  ? 'border-destructive focus:ring-destructive'
                  : 'border-divider focus:ring-primary'
              }`}
            />
            {showError('endTime') && (
              <p className="text-xs text-destructive" role="alert">
                {showError('endTime')}
              </p>
            )}
          </div>
        </div>

        {showError('overlap') && (
          <div
            className="text-xs text-destructive bg-destructive/5 border border-destructive/30 rounded-md px-3 py-2"
            role="alert"
          >
            {showError('overlap')}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {willBeDraft ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted/50 text-muted-foreground">
              Pending start time
            </span>
          ) : (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                isValid
                  ? 'bg-primary/15 text-primary'
                  : 'bg-destructive/15 text-destructive'
              }`}
            >
              {isValid ? 'Scheduled' : 'Has conflicts'}
            </span>
          )}
          <span>
            {willBeDraft
              ? 'Set a start time to schedule.'
              : `Will roll out automatically: ${fmtRange(startAt, endAt)}`}
          </span>
        </div>

        <DialogFooter>
          <ButtonGroup>
            <Button variant="ghost" onClick={onClose} disabled={isBusy}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isBusy || !isValid}>
              {isBusy ? 'Saving…' : 'Create rollout plan'}
            </Button>
          </ButtonGroup>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
