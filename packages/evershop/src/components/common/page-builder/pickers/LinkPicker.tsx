 
import { drawerInputClass } from '@components/common/page-builder/drawer/index.js';
import { CategoryPicker } from '@components/common/page-builder/pickers/CategoryPicker.js';
import { CollectionPicker } from '@components/common/page-builder/pickers/CollectionPicker.js';
import { PagePicker } from '@components/common/page-builder/pickers/PagePicker.js';
import { ProductPicker } from '@components/common/page-builder/pickers/ProductPicker.js';
import React, { useState } from 'react';

/**
 * Composite "where does this link go?" picker for widget CTAs and tile
 * links. Tabs: Page · Category · Product · Collection · Custom URL. Each
 * tab presents its own search-and-pick UI; selecting from any tab fires
 * `onChange` with the resolved URL string. Custom URL is a free-text
 * input.
 *
 * `kind` is an admin-only hint that helps the picker re-open on the tab
 * the merchant last used. Storage is up to the caller — most callers
 * store the URL alone (kind is rebuilt on focus). Storing the kind too
 * is a nice-to-have for re-edit ergonomics.
 *
 * The `LinkPicker` does NOT resolve URLs at runtime — it just emits a
 * string. Linking to a category by uuid would require runtime resolution;
 * we're explicitly choosing to bake the URL at edit time so the storefront
 * render is a plain anchor without an extra query.
 */

export type LinkKind = 'page' | 'category' | 'product' | 'collection' | 'custom';

const TABS: { value: LinkKind; label: string }[] = [
  { value: 'page', label: 'Page' },
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product' },
  { value: 'collection', label: 'Collection' },
  { value: 'custom', label: 'Custom URL' }
];

export interface LinkPickerProps {
  value: string;
  onChange: (next: { url: string; kind: LinkKind; label?: string }) => void;
  /** Initial tab. Defaults to "custom" so the freeform path is the fastest. */
  initialKind?: LinkKind;
  /** When non-collection links are out of scope (e.g. a collection-only CTA),
   *  hide the other tabs. */
  allowedKinds?: LinkKind[];
}

export function LinkPicker({
  value,
  onChange,
  initialKind = 'custom',
  allowedKinds
}: LinkPickerProps) {
  const visibleTabs = allowedKinds
    ? TABS.filter((t) => allowedKinds.includes(t.value))
    : TABS;
  const [tab, setTab] = useState<LinkKind>(
    visibleTabs.find((t) => t.value === initialKind)?.value ??
      visibleTabs[0].value
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 border-b border-divider">
        {visibleTabs.map((t) => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`relative -mb-px border-b-2 px-2 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'page' && (
        <PagePicker
          selectedUrl={value}
          onPick={(r) => onChange({ url: r.url, kind: 'page', label: r.name })}
        />
      )}
      {tab === 'category' && (
        <CategoryPicker
          selectedUrl={value}
          onPick={(r) =>
            onChange({ url: r.url, kind: 'category', label: r.name })
          }
        />
      )}
      {tab === 'product' && (
        <ProductPicker
          selectedUrl={value}
          onPick={(r) =>
            onChange({ url: r.url, kind: 'product', label: r.name })
          }
        />
      )}
      {tab === 'collection' && (
        <CollectionPicker
          selectedCode={value}
          onPick={(r) =>
            onChange({ url: r.code, kind: 'collection', label: r.name })
          }
        />
      )}
      {tab === 'custom' && (
        <div className="space-y-1.5">
          <input
            type="text"
            value={value || ''}
            onChange={(e) =>
              onChange({ url: e.target.value, kind: 'custom' })
            }
            placeholder="/c/sale or https://example.com"
            className={drawerInputClass}
          />
          <div className="text-[11px] text-muted-foreground">
            Paste a URL or a relative path starting with <code>/</code>.
          </div>
        </div>
      )}
    </div>
  );
}
