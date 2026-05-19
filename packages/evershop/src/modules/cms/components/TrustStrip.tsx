import { Image } from '@components/common/Image.js';
import React from 'react';

/**
 * Trust strip — a row of value-prop items (free shipping, easy returns,
 * etc.) shown below the hero or above the footer. Pure presentation; no
 * data fetch. Items with a `link` become clickable cells; the rest are
 * static.
 */

export type TrustAlignment = 'left' | 'center';
export type TrustIconSize = 'sm' | 'md' | 'lg';

export interface TrustItem {
  id: string;
  icon: string | null;
  /** Natural intrinsic width of the icon. Falls back to the rendered
   *  iconSize when missing. */
  iconWidth?: number | null;
  iconHeight?: number | null;
  title: string;
  description: string | null;
  link: { url: string; newTab: boolean } | null;
}

export interface TrustStripProps {
  trustStripWidget: {
    items: TrustItem[];
    columns: number | null;
    showIcons: boolean | null;
    iconSize: TrustIconSize | null;
    alignment: TrustAlignment | null;
    divider: boolean | null;
  };
}

const ICON_PX: Record<TrustIconSize, number> = { sm: 24, md: 32, lg: 44 };

function effectiveColumns(items: TrustItem[], columns: number | null): number {
  if (columns && columns >= 2) return Math.min(columns, 6);
  // Auto: match the item count, capped at 4 to keep cells readable.
  return Math.min(Math.max(items.length, 1), 4);
}

export default function TrustStrip({ trustStripWidget }: TrustStripProps) {
  const {
    items = [],
    columns,
    showIcons,
    iconSize,
    alignment,
    divider
  } = trustStripWidget;

  const visibleItems = items.filter(Boolean);
  if (visibleItems.length === 0) return null;

  const cols = effectiveColumns(visibleItems, columns);
  const align: TrustAlignment = alignment ?? 'center';
  const showIconsResolved = showIcons ?? true;
  const iconSizeResolved: TrustIconSize = iconSize ?? 'md';
  const showDivider = divider ?? false;

  const alignClass =
    align === 'center' ? 'items-center text-center' : 'items-start text-left';

  return (
    <div
      className="evershop-trust-strip grid gap-4 sm:gap-6"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
      }}
    >
      {visibleItems.map((item, i) => {
        const Tag: React.ElementType = item.link ? 'a' : 'div';
        const linkAttrs = item.link
          ? {
              href: item.link.url,
              target: item.link.newTab ? '_blank' : undefined,
              rel: item.link.newTab ? 'noopener noreferrer' : undefined
            }
          : {};
        const showIcon = showIconsResolved && item.icon;
        const showRightDivider = showDivider && i < visibleItems.length - 1;
        return (
          <Tag
            key={item.id}
            {...linkAttrs}
            className={`flex flex-col gap-1 ${alignClass} ${
              item.link ? 'transition-colors hover:text-primary' : ''
            } ${showRightDivider ? 'sm:border-r sm:border-divider sm:pr-4' : ''}`}
          >
            {showIcon && (
              <Image
                src={item.icon as string}
                alt=""
                aria-hidden="true"
                // Use natural dimensions when captured; otherwise fall
                // back to the rendered icon-size box (24/32/44 px).
                width={
                  item.iconWidth && item.iconWidth > 0
                    ? item.iconWidth
                    : ICON_PX[iconSizeResolved]
                }
                height={
                  item.iconHeight && item.iconHeight > 0
                    ? item.iconHeight
                    : ICON_PX[iconSizeResolved]
                }
                objectFit="contain"
                sizes={`${ICON_PX[iconSizeResolved]}px`}
                style={{
                  width: ICON_PX[iconSizeResolved],
                  height: ICON_PX[iconSizeResolved],
                  aspectRatio: 'auto'
                }}
              />
            )}
            <div className="text-sm font-semibold">{item.title}</div>
            {item.description && (
              <div className="text-xs text-muted-foreground">
                {item.description}
              </div>
            )}
          </Tag>
        );
      })}
    </div>
  );
}

export const query = `
  query Query(
    $items: [TrustItemInput]
    $columns: Float
    $showIcons: Boolean
    $iconSize: String
    $alignment: String
    $divider: Boolean
  ) {
    trustStripWidget(
      items: $items
      columns: $columns
      showIcons: $showIcons
      iconSize: $iconSize
      alignment: $alignment
      divider: $divider
    ) {
      items {
        id
        icon
        iconWidth
        iconHeight
        title
        description
        link {
          url
          newTab
        }
      }
      columns
      showIcons
      iconSize
      alignment
      divider
    }
  }
`;

export const variables = `{
  items: getWidgetSetting("items", []),
  columns: getWidgetSetting("columns"),
  showIcons: getWidgetSetting("showIcons", true),
  iconSize: getWidgetSetting("iconSize", "md"),
  alignment: getWidgetSetting("alignment", "center"),
  divider: getWidgetSetting("divider", false)
}`;
