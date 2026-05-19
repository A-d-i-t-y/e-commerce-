 
import { Image } from '@components/common/Image.js';
import React from 'react';

/**
 * Tiered categories — a row of parent-category groups, each with an
 * image + parent label + a chip row of sub-category links. The fast-path
 * navigation block for shoppers who already know what they want.
 */

export type TieredImageAspect = 'square' | 'landscape' | 'portrait';

export interface TieredSubItem {
  id: string;
  label: string;
  url: string;
}

export interface TieredGroup {
  id: string;
  image: string;
  imageAlt: string;
  /** Natural intrinsic dimensions of the parent image, captured at pick
   *  time. */
  imageWidth?: number | null;
  imageHeight?: number | null;
  parent: { label: string; url: string };
  subs: TieredSubItem[];
}

export interface TieredCategoriesProps {
  tieredCategoriesWidget: {
    groups: TieredGroup[];
    columns: number | null;
    imageAspect: TieredImageAspect;
    showParentLink: boolean;
  };
}

const ASPECT_PADDING: Record<TieredImageAspect, string> = {
  square: '100%',
  portrait: '125%',
  landscape: '66.66%'
};

export default function TieredCategories({
  tieredCategoriesWidget
}: TieredCategoriesProps) {
  const { groups = [], columns, imageAspect, showParentLink } =
    tieredCategoriesWidget;
  const visible = groups.filter((g) => g && g.parent?.label);
  if (visible.length === 0) return null;
  const cols =
    columns && columns >= 2
      ? Math.min(columns, 4)
      : Math.min(Math.max(visible.length, 1), 4);
  const aspectPadding = ASPECT_PADDING[imageAspect ?? 'landscape'];

  return (
    <>
      <style
         
        dangerouslySetInnerHTML={{
          __html: `@media (min-width: 1024px) { .evershop-tiered-grid { grid-template-columns: repeat(var(--evershop-tiered-cols, 3), minmax(0, 1fr)); } }`
        }}
      />
    <div
      className="evershop-tiered-categories evershop-tiered-grid grid grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-2 md:gap-6"
      // Custom property drives the desktop `repeat(N, …)`. The matching
      // media-query rule below sets `grid-template-columns` at ≥1024px so
      // the columns setting only kicks in above the tablet breakpoint
      // (per spec: tablet is always 2 columns).
      style={{ ['--evershop-tiered-cols' as string]: cols } as React.CSSProperties}
    >
      {visible.map((group) => {
        const ParentTag: React.ElementType =
          showParentLink && group.parent.url ? 'a' : 'div';
        return (
          <div key={group.id} className="space-y-3">
            <ParentTag
              href={showParentLink ? group.parent.url : undefined}
              aria-label={showParentLink ? `Shop ${group.parent.label}` : undefined}
              className={`group block overflow-hidden ${
                showParentLink ? 'transition-opacity hover:opacity-90' : ''
              }`}
            >
              <div
                className="relative overflow-hidden bg-muted/30"
                style={{ paddingTop: aspectPadding }}
              >
                {group.image && (
                  <Image
                    src={group.image}
                    alt={group.imageAlt || ''}
                    width={
                      group.imageWidth && group.imageWidth > 0
                        ? group.imageWidth
                        : 1200
                    }
                    height={
                      group.imageHeight && group.imageHeight > 0
                        ? group.imageHeight
                        : 800
                    }
                    objectFit="cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="absolute inset-0 h-full w-full transition-[filter] duration-200 group-hover:brightness-90"
                    style={{ aspectRatio: 'auto' }}
                  />
                )}
              </div>
            </ParentTag>
            <div>
              <div className="text-base font-semibold">
                {group.parent.label}
              </div>
              <ul className="flex flex-wrap items-baseline gap-x-1 gap-y-1 text-sm">
                {(group.subs ?? [])
                  .filter((s) => s && s.label && s.url)
                  .map((sub, i, arr) => (
                    <li key={sub.id} className="flex items-baseline">
                      <a
                        href={sub.url}
                        className="text-foreground/80 hover:underline"
                      >
                        {sub.label}
                      </a>
                      {i < arr.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="mx-1.5 text-foreground/40"
                        >
                          ·
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}

export const query = `
  query Query(
    $groups: JSON
    $columns: Float
    $imageAspect: String
    $showParentLink: Boolean
  ) {
    tieredCategoriesWidget(
      groups: $groups
      columns: $columns
      imageAspect: $imageAspect
      showParentLink: $showParentLink
    ) {
      groups
      columns
      imageAspect
      showParentLink
    }
  }
`;

export const variables = `{
  groups: getWidgetSetting("groups", []),
  columns: getWidgetSetting("columns"),
  imageAspect: getWidgetSetting("imageAspect", "landscape"),
  showParentLink: getWidgetSetting("showParentLink", true)
}`;
