 
import { Image } from '@components/common/Image.js';
import { ProductList } from '@components/frontStore/catalog/ProductList.js';
import React from 'react';
import { renderInlineMarkdown } from '../../../lib/util/markdownInline.js';

/**
 * Collection spotlight — a big cover image on one side, an editorial copy
 * panel + 2x2 (or 1x2) product preview grid on the other. Bridges
 * brand storytelling and commerce in one block.
 */

export interface CollectionSpotlightProps {
  collectionSpotlightWidget: {
    collection: string | null;
    image: string | null;
    imageAlt: string;
    imagePosition: 'left' | 'right';
    /** Natural intrinsic width of the cover image, captured at pick time. */
    imageWidth: number | null;
    /** Natural intrinsic height. */
    imageHeight: number | null;
    eyebrow: string | null;
    heading: string;
    body: string | null;
    previewCount: 2 | 4;
    showPrice: boolean;
    previewProducts: any[];
    totalProducts: number;
    collectionName: string | null;
  };
}

export default function CollectionSpotlight({
  collectionSpotlightWidget
}: CollectionSpotlightProps) {
  const {
    image,
    imageAlt,
    imagePosition,
    imageWidth,
    imageHeight,
    eyebrow,
    heading,
    body,
    previewCount,
    showPrice,
    previewProducts = [],
    totalProducts,
    collectionName,
    collection
  } = collectionSpotlightWidget;
  const intrinsicWidth = imageWidth && imageWidth > 0 ? imageWidth : 1200;
  const intrinsicHeight = imageHeight && imageHeight > 0 ? imageHeight : 1500;

  if (!heading && !collectionName) return null;
  const reverse = imagePosition === 'right';
  const cols = previewCount === 2 ? 2 : 2; // 2 cols for both — 2 = 1x2, 4 = 2x2

  const viewAllLabel =
    totalProducts > 0 ? `View all ${totalProducts} →` : 'View all →';
  const viewAllUrl = collection ? `/collections/${collection}` : null;

  const imagePanel = (
    <div className="overflow-hidden bg-muted/30">
      {image ? (
        <Image
          src={image}
          alt={imageAlt || ''}
          width={intrinsicWidth}
          height={intrinsicHeight}
          sizes="(max-width: 768px) 100vw, 42vw"
          className="block w-full"
        />
      ) : (
        <div className="flex aspect-[4/5] items-center justify-center text-sm text-muted-foreground">
          Collection cover
        </div>
      )}
    </div>
  );

  const copyPanel = (
    <div className="flex flex-col gap-4 p-6 md:p-8">
      {eyebrow && (
        <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70">
          {eyebrow}
        </div>
      )}
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {heading || collectionName}
      </h2>
      {body && (
        <p className="text-sm text-foreground/80 md:text-base">
          {renderInlineMarkdown(body)}
        </p>
      )}
      <ProductList
        products={previewProducts}
        gridColumns={cols}
        layout="grid"
        showAddToCart={false}
        customAddToCartRenderer={showPrice ? undefined : () => null}
      />
      {viewAllUrl && (
        <a
          href={viewAllUrl}
          aria-label={`View all products in ${heading || collectionName}`}
          className="text-sm font-medium underline underline-offset-2 hover:opacity-80"
        >
          {viewAllLabel}
        </a>
      )}
    </div>
  );

  return (
    <div className="evershop-collection-spotlight grid grid-cols-1 md:grid-cols-12">
      {!reverse && (
        <>
          <div className="md:col-span-5">{imagePanel}</div>
          <div className="md:col-span-7">{copyPanel}</div>
        </>
      )}
      {reverse && (
        <>
          <div className="order-2 md:order-1 md:col-span-7">{copyPanel}</div>
          <div className="order-1 md:order-2 md:col-span-5">{imagePanel}</div>
        </>
      )}
    </div>
  );
}

export const query = `
  query Query(
    $collection: String
    $image: String
    $imageAlt: String
    $imagePosition: String
    $imageWidth: Float
    $imageHeight: Float
    $eyebrow: String
    $heading: String
    $body: String
    $previewCount: Float
    $showPrice: Boolean
  ) {
    collectionSpotlightWidget(
      collection: $collection
      image: $image
      imageAlt: $imageAlt
      imagePosition: $imagePosition
      imageWidth: $imageWidth
      imageHeight: $imageHeight
      eyebrow: $eyebrow
      heading: $heading
      body: $body
      previewCount: $previewCount
      showPrice: $showPrice
    ) {
      collection
      image
      imageAlt
      imagePosition
      imageWidth
      imageHeight
      eyebrow
      heading
      body
      previewCount
      showPrice
      totalProducts
      collectionName
      previewProducts {
        ...Product
      }
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
  image: getWidgetSetting("image"),
  imageAlt: getWidgetSetting("imageAlt"),
  imagePosition: getWidgetSetting("imagePosition", "left"),
  imageWidth: getWidgetSetting("imageWidth"),
  imageHeight: getWidgetSetting("imageHeight"),
  eyebrow: getWidgetSetting("eyebrow", "COLLECTION"),
  heading: getWidgetSetting("heading"),
  body: getWidgetSetting("body"),
  previewCount: getWidgetSetting("previewCount", 4),
  showPrice: getWidgetSetting("showPrice", true)
}`;
