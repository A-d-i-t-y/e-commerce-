 
import { Image } from '@components/common/Image.js';
import { ctaButtonVariant } from '@components/common/page-builder/fields/CtaField.js';
import type { CtaValue } from '@components/common/page-builder/fields/CtaField.js';
import { buttonVariants } from '@components/common/ui/Button.js';
import React from 'react';
import { renderInlineMarkdown } from '../../../lib/util/markdownInline.js';

/**
 * Split feature — a 50/50 promo block: image on one side, copy panel on
 * the other. Configurable image position, vertical alignment, image-fit,
 * and CTA style. On mobile, image stacks above copy regardless of side.
 *
 * `imagePosition: right` reverses the DOM order (not just visual order)
 * so screen-reader flow stays sensible.
 */

export type SplitImagePosition = 'left' | 'right';
export type SplitVerticalAlign = 'top' | 'center' | 'bottom';
export type SplitImageFit = 'cover' | 'contain';

export interface SplitFeatureProps {
  splitFeatureWidget: {
    image: string;
    imageAlt: string;
    imagePosition: SplitImagePosition;
    /** Natural intrinsic width of `image`, captured at pick time. Drives
     *  the responsive srcSet. Falls back to a hero-scale default for
     *  widgets saved before dimension capture landed. */
    width: number | null;
    /** Natural intrinsic height. */
    height: number | null;
    eyebrow: string | null;
    heading: string;
    body: string | null;
    cta: CtaValue | null;
    verticalAlign: SplitVerticalAlign;
    imageFit: SplitImageFit;
    minHeight: number;
  };
}

const ALIGN_CLASS: Record<SplitVerticalAlign, string> = {
  top: 'justify-start',
  center: 'justify-center',
  bottom: 'justify-end'
};

export default function SplitFeature({ splitFeatureWidget }: SplitFeatureProps) {
  const {
    image,
    imageAlt,
    imagePosition,
    width,
    height,
    eyebrow,
    heading,
    body,
    cta,
    verticalAlign,
    imageFit,
    minHeight
  } = splitFeatureWidget;

  if (!image || !heading) return null;
  const reverse = imagePosition === 'right';
  const verticalClass = ALIGN_CLASS[verticalAlign ?? 'center'];
  // Fall back to a hero-scale 4:3 for widgets saved before dimension
  // capture — the srcSet still works, the aspect just won't match the
  // source exactly until the merchant re-picks.
  const intrinsicWidth = width && width > 0 ? width : 1600;
  const intrinsicHeight = height && height > 0 ? height : 1200;

  const imagePanel = (
    <div
      className="relative w-full overflow-hidden bg-muted/30"
      style={{ minHeight }}
    >
      <Image
        src={image}
        alt={imageAlt || ''}
        width={intrinsicWidth}
        height={intrinsicHeight}
        objectFit={imageFit === 'contain' ? 'contain' : 'cover'}
        sizes="(max-width: 768px) 100vw, 50vw"
        className="absolute inset-0 h-full w-full"
        style={{ aspectRatio: 'auto' }}
      />
    </div>
  );

  const copyPanel = (
    <div
      className={`flex w-full flex-col gap-3 p-8 md:p-12 ${verticalClass}`}
      style={{ minHeight }}
    >
      {eyebrow && (
        <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70">
          {eyebrow}
        </div>
      )}
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {heading}
      </h2>
      {body && (
        <p className="text-sm text-foreground/80 md:text-base">
          {renderInlineMarkdown(body)}
        </p>
      )}
      {cta && cta.label && cta.url && (
        <div className="mt-2">
          <a
            href={cta.url}
            target={cta.newTab ? '_blank' : undefined}
            rel={cta.newTab ? 'noopener noreferrer' : undefined}
            className={buttonVariants({
              variant: ctaButtonVariant(cta.style),
              size: 'lg'
            })}
          >
            {cta.label}
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`evershop-split-feature grid grid-cols-1 md:grid-cols-2 ${
        reverse ? 'md:[direction:rtl]' : ''
      }`}
    >
      {/* DOM order: image-then-copy for left, copy-then-image for right.
          On mobile, both render in the source order (image above copy).
          Desktop column order follows the same DOM order so reading order
          is preserved. */}
      {!reverse && (
        <>
          <div className="md:[direction:ltr]">{imagePanel}</div>
          <div className="md:[direction:ltr]">{copyPanel}</div>
        </>
      )}
      {reverse && (
        <>
          <div className="md:[direction:ltr] order-first md:order-none">
            {imagePanel}
          </div>
          <div className="md:[direction:ltr]">{copyPanel}</div>
        </>
      )}
    </div>
  );
}

export const query = `
  query Query(
    $image: String
    $imageAlt: String
    $imagePosition: String
    $width: Float
    $height: Float
    $eyebrow: String
    $heading: String
    $body: String
    $cta: JSON
    $verticalAlign: String
    $imageFit: String
    $minHeight: Float
  ) {
    splitFeatureWidget(
      image: $image
      imageAlt: $imageAlt
      imagePosition: $imagePosition
      width: $width
      height: $height
      eyebrow: $eyebrow
      heading: $heading
      body: $body
      cta: $cta
      verticalAlign: $verticalAlign
      imageFit: $imageFit
      minHeight: $minHeight
    ) {
      image
      imageAlt
      imagePosition
      width
      height
      eyebrow
      heading
      body
      cta
      verticalAlign
      imageFit
      minHeight
    }
  }
`;

export const variables = `{
  image: getWidgetSetting("image"),
  imageAlt: getWidgetSetting("imageAlt"),
  imagePosition: getWidgetSetting("imagePosition", "left"),
  width: getWidgetSetting("width"),
  height: getWidgetSetting("height"),
  eyebrow: getWidgetSetting("eyebrow"),
  heading: getWidgetSetting("heading"),
  body: getWidgetSetting("body"),
  cta: getWidgetSetting("cta"),
  verticalAlign: getWidgetSetting("verticalAlign", "center"),
  imageFit: getWidgetSetting("imageFit", "cover"),
  minHeight: getWidgetSetting("minHeight", 480)
}`;
