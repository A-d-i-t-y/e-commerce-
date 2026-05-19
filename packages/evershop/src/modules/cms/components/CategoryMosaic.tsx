 
import { Image } from '@components/common/Image.js';
import React from 'react';

/**
 * Category mosaic — a grid of category tiles, each with a full-bleed image
 * and label. Tile shape (square/portrait/landscape) is uniform. Layout is
 * either uniform (equal columns) or asymmetric (first tile spans 2 cols).
 *
 * No data fetch — spec stores image URLs and link URLs as free text. The
 * admin form uses the CategoryPicker to autofill URLs from real category
 * records, but storage and rendering treat them as plain strings.
 */

export type MosaicAspect = 'square' | 'portrait' | 'landscape';
export type MosaicLayout = 'uniform' | 'asymmetric';
export type MosaicLabelPosition = 'overlay' | 'below';

export interface MosaicTile {
  id: string;
  image: string;
  imageAlt: string;
  /** Natural intrinsic width of the tile image. Captured at pick time;
   *  drives the responsive srcSet. Falls back to a square-ish default. */
  imageWidth?: number | null;
  imageHeight?: number | null;
  label: string;
  link: string;
  newTab: boolean;
}

export interface CategoryMosaicProps {
  categoryMosaicWidget: {
    heading: string | null;
    tiles: MosaicTile[];
    columns: number | null;
    aspect: MosaicAspect;
    layout: MosaicLayout;
    labelPosition: MosaicLabelPosition;
  };
}

const ASPECT_PADDING: Record<MosaicAspect, string> = {
  square: '100%',
  portrait: '125%',
  landscape: '66.66%'
};

function effectiveColumns(
  tiles: MosaicTile[],
  columns: number | null
): number {
  if (columns && columns >= 2) return Math.min(columns, 6);
  return Math.min(Math.max(tiles.length, 1), 4);
}

export default function CategoryMosaic({
  categoryMosaicWidget
}: CategoryMosaicProps) {
  const { heading, tiles = [], columns, aspect, layout, labelPosition } =
    categoryMosaicWidget;
  const visible = tiles.filter((t) => t && t.image && t.label);
  if (visible.length === 0) return null;

  const cols = effectiveColumns(visible, columns);
  const asymmetric = layout === 'asymmetric' && (cols === 3 || cols === 4);
  const aspectPadding = ASPECT_PADDING[aspect ?? 'square'];

  return (
    <div className="evershop-category-mosaic px-4 py-6">
      {heading && (
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">
          {heading}
        </h2>
      )}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
        }}
      >
        {visible.map((tile, i) => {
          const span = asymmetric && i === 0 ? 2 : 1;
          return (
            <a
              key={tile.id}
              href={tile.link}
              target={tile.newTab ? '_blank' : undefined}
              rel={tile.newTab ? 'noopener noreferrer' : undefined}
              aria-label={`Shop ${tile.label}`}
              className="group block overflow-hidden"
              style={{ gridColumn: `span ${span}` }}
            >
              <div
                className="relative overflow-hidden bg-muted/30"
                style={{ paddingTop: aspectPadding }}
              >
                <Image
                  src={tile.image}
                  alt={tile.imageAlt || ''}
                  width={
                    tile.imageWidth && tile.imageWidth > 0
                      ? tile.imageWidth
                      : 800
                  }
                  height={
                    tile.imageHeight && tile.imageHeight > 0
                      ? tile.imageHeight
                      : 800
                  }
                  objectFit="cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="absolute inset-0 h-full w-full transition-transform duration-200 group-hover:scale-[1.03]"
                  style={{ aspectRatio: 'auto' }}
                />
                {labelPosition === 'overlay' && (
                  <>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
                    />
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-4 text-white">
                      <span className="text-base font-semibold">
                        {tile.label}
                      </span>
                      <span aria-hidden="true" className="text-base">
                        →
                      </span>
                    </div>
                  </>
                )}
              </div>
              {labelPosition === 'below' && (
                <div className="mt-2 flex items-center justify-between text-foreground">
                  <span className="text-sm font-semibold">{tile.label}</span>
                  <span aria-hidden="true">→</span>
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export const query = `
  query Query(
    $heading: String
    $tiles: JSON
    $columns: Float
    $aspect: String
    $layout: String
    $labelPosition: String
  ) {
    categoryMosaicWidget(
      heading: $heading
      tiles: $tiles
      columns: $columns
      aspect: $aspect
      layout: $layout
      labelPosition: $labelPosition
    ) {
      heading
      tiles
      columns
      aspect
      layout
      labelPosition
    }
  }
`;

export const variables = `{
  heading: getWidgetSetting("heading"),
  tiles: getWidgetSetting("tiles", []),
  columns: getWidgetSetting("columns"),
  aspect: getWidgetSetting("aspect", "square"),
  layout: getWidgetSetting("layout", "uniform"),
  labelPosition: getWidgetSetting("labelPosition", "overlay")
}`;
