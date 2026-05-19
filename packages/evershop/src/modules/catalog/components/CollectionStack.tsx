import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import React from 'react';

/**
 * Collection stack — 1–3 stacked collection rows, each with a heading,
 * optional "View all" link, and a strip of products. Uses the shared
 * ProductList so card visuals match the category grid page.
 */

export interface CollectionStackRow {
  id: string;
  title: string;
  source?: string | null;
  viewAllLink?: string | null;
  viewAllLabel?: string | null;
  products: any[];
}

export interface CollectionStackProps {
  collectionStackWidget: {
    rows: CollectionStackRow[];
    productCount: number;
    showPrice: boolean;
    divider: boolean;
  };
}

export default function CollectionStack({
  collectionStackWidget
}: CollectionStackProps) {
  const { rows = [], productCount, showPrice, divider } = collectionStackWidget;
  if (!rows.length) return null;

  return (
    <div className="evershop-collection-stack space-y-10 px-4 py-6">
      {rows.map((row, i) => (
        <div key={row.id}>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              {row.title}
            </h2>
            {row.viewAllLink && (
              <a
                href={row.viewAllLink}
                aria-label={`View all ${row.title}`}
                className="text-sm font-medium underline underline-offset-2 hover:opacity-80"
              >
                {row.viewAllLabel || 'View all →'}
              </a>
            )}
          </div>
          <ProductList
            products={row.products}
            gridColumns={productCount}
            layout="grid"
            showAddToCart={false}
            customAddToCartRenderer={
              showPrice ? undefined : () => null
            }
          />
          {divider && i < rows.length - 1 && (
            <hr className="mt-10 border-divider" />
          )}
        </div>
      ))}
    </div>
  );
}

export const query = `
  query Query(
    $collections: JSON
    $productCount: Float
    $showPrice: Boolean
    $divider: Boolean
  ) {
    collectionStackWidget(
      collections: $collections
      productCount: $productCount
      showPrice: $showPrice
      divider: $divider
    ) {
      rows {
        id
        title
        source
        viewAllLink
        viewAllLabel
        products {
          ...Product
        }
      }
      productCount
      showPrice
      divider
    }
  }
`;

export const fragments = `
  fragment Product on Product {
    productId
    name
    sku
    price {
      regular {
        value
        text
      }
      special {
        value
        text
      }
    }
    inventory {
      isInStock
    }
    image {
      alt
      url
    }
    url
  }
`;

export const variables = `{
  collections: getWidgetSetting("collections", []),
  productCount: getWidgetSetting("productCount", 4),
  showPrice: getWidgetSetting("showPrice", true),
  divider: getWidgetSetting("divider", true)
}`;
