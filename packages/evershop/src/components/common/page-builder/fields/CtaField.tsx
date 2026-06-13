import {
  drawerInputClass,
  Field,
  Segmented,
  Toggle
} from '@components/common/page-builder/drawer/index.js';
import { LinkKind, LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import React from 'react';

/**
 * Composite editor for a call-to-action: label, URL (via LinkPicker),
 * new-tab toggle, and an optional visual style. Used by every widget that
 * has CTA buttons (split feature, coupon block, bento tiles, brand story,
 * collection spotlight, etc.).
 *
 * The shape stored in widget settings is:
 *
 *   { label, url, kind?, newTab, style? }
 *
 * `kind` is admin-only — the storefront ignores it. Keeping it lets us
 * re-open the picker on the same tab the merchant used last.
 */

export interface CtaValue {
  label: string;
  url: string;
  kind?: LinkKind;
  newTab?: boolean;
  style?: CtaStyle;
}

export type CtaStyle = 'primary' | 'secondary' | 'ghost' | 'link';

const STYLE_OPTIONS: ReadonlyArray<{ value: CtaStyle; label: string }> = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'link', label: 'Link' }
];

export interface CtaFieldProps {
  value: CtaValue;
  onChange: (next: CtaValue) => void;
  /** When false, the visual-style segmented control is hidden. */
  showStyle?: boolean;
  /** Label placeholder, e.g. "Shop now". */
  labelPlaceholder?: string;
}

export function CtaField({
  value,
  onChange,
  showStyle = true,
  labelPlaceholder = 'Shop now'
}: CtaFieldProps) {
  const update = (patch: Partial<CtaValue>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-2.5">
      <Field label="Label">
        <input
          type="text"
          value={value.label || ''}
          onChange={(e) => update({ label: e.target.value })}
          placeholder={labelPlaceholder}
          className={drawerInputClass}
        />
      </Field>
      <Field label="Link">
        <LinkPicker
          value={value.url || ''}
          initialKind={value.kind ?? 'custom'}
          onChange={({ url, kind, label }) =>
            update({
              url,
              kind,
              // If the merchant hasn't typed a label yet, seed it with the
              // picked entity's name. Surprisingly often the merchant wants
              // exactly that label anyway.
              label: value.label || label || ''
            })
          }
        />
      </Field>
      <Toggle
        label="Open in new tab"
        description="Adds target=_blank rel=noopener noreferrer."
        checked={!!value.newTab}
        onChange={(v) => update({ newTab: v })}
      />
      {showStyle && (
        <Field label="Style">
          <Segmented<CtaStyle>
            value={value.style ?? 'primary'}
            options={STYLE_OPTIONS}
            onChange={(v) => update({ style: v })}
          />
        </Field>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Storefront helper — maps the saved `style` value to a shadcn Button
// variant. Centralised so every widget renders CTAs identically.
// ---------------------------------------------------------------------------

export function ctaButtonVariant(style: CtaStyle | undefined) {
  switch (style) {
    case 'secondary':
      return 'outline' as const;
    case 'ghost':
      return 'ghost' as const;
    case 'link':
      return 'link' as const;
    case 'primary':
    default:
      return 'default' as const;
  }
}
