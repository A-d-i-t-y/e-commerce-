import { Editor } from '@components/common/Editor.js';
import { Row } from '@components/common/form/Editor.js';
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
  };
}
export default function CollectionProducts({
  collection,
  collectionProductsWidget: { countPerRow } = {}
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
  return (
    <div className="pt-7 collection__products__widget">
      <div className="page-width">
        <h3 className="text-center uppercase h5 tracking-widest">
          {collection?.name}
        </h3>
        <div className="flex justify-center">
          {collection?.description && <Editor rows={collection?.description} />}
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
  query Query($collection: String, $count: Int, $countPerRow: Int) {
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
    collectionProductsWidget(collection: $collection, count: $count, countPerRow: $countPerRow) {
      countPerRow
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
  countPerRow: getWidgetSetting("countPerRow", 4)
}`;
