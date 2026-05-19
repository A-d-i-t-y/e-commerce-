import { Editor } from '@components/common/Editor.js';
import { Row } from '@components/common/form/Editor.js';
import { Editable } from '@components/common/page-builder/index.js';
import { isInPageBuilderIframe } from '@components/common/page-builder/index.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import React, { useEffect, useState } from 'react';

interface CollectionProductsProps {
  collection: {
    collectionId: number;
    name: string;
    description?: Row[];
    products: {
      items: Array<React.ComponentProps<typeof ProductList>['products'][0]>;
    };
  } | null;
  collectionProductsWidget?: {
    countPerRow?: number;
    heading?: string | null;
    subText?: string | null;
  };
}
export default function CollectionProducts({
  collection,
  collectionProductsWidget: { countPerRow, heading, subText } = {}
}: CollectionProductsProps) {
  // Defer iframe detection until after hydration so the first render is
  // SSR-stable (matches the production output of `null`).
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!collection) {
    if (isClient && isInPageBuilderIframe()) {
      return (
        <div
          className="pt-7 collection__products__widget"
          data-evershop-pb-empty="collection_products"
        >
          <div className="page-width">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-700">
                Collection products
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Pick a collection in the settings panel to display its
                products here.
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }
  // Title falls back to the collection's own name. Editing the rendered
  // headline inline in the page-builder writes to `settings.heading`, which
  // becomes the override on subsequent renders.
  const displayHeading =
    (typeof heading === 'string' && heading.length > 0
      ? heading
      : collection?.name) ?? '';
  // Sub-text override is a plain string. When unset we fall through to the
  // rich-text `description` (rendered via `Editor`). Once the user types
  // any override (form or inline), the plain `<p>` takes over.
  const hasSubTextOverride = typeof subText === 'string' && subText.length > 0;

  return (
    <div className="pt-7 collection__products__widget">
      <div className="page-width">
        {displayHeading && (
          <Editable
            as="h3"
            fieldPath="settings.heading"
            className="text-center uppercase h5 tracking-widest"
          >
            {displayHeading}
          </Editable>
        )}
        <div className="flex justify-center">
          {hasSubTextOverride ? (
            <Editable
              as="p"
              fieldPath="settings.subText"
              multiline
              className="text-center max-w-2xl text-muted-foreground"
            >
              {subText as string}
            </Editable>
          ) : collection?.description ? (
            <Editor rows={collection.description} />
          ) : null}
        </div>
        <div className="mt-3">
          <ProductList
            products={collection?.products?.items}
            gridColumns={countPerRow}
          />
        </div>
      </div>
    </div>
  );
}

export const query = `
  query Query(
    $collection: String
    $count: Int
    $countPerRow: Int
    $heading: String
    $subText: String
  ) {
    collection (code: $collection) {
      collectionId
      name
      description
      products (filters: [{key: "limit", operation: eq, value: $count}]) {
        items {
          ...Product
        }
      }
    }
    collectionProductsWidget(
      collection: $collection
      count: $count
      countPerRow: $countPerRow
      heading: $heading
      subText: $subText
    ) {
      countPerRow
      heading
      subText
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
  collection: getWidgetSetting("collection"),
  count: getWidgetSetting("count"),
  countPerRow: getWidgetSetting("countPerRow", 4),
  heading: getWidgetSetting("heading"),
  subText: getWidgetSetting("subText")
}`;
