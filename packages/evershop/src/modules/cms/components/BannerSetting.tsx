/* eslint-disable jsx-a11y/img-redundant-alt */
import { FileBrowser } from '@components/admin/FileBrowser.js';
import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Button } from '@components/common/ui/Button.js';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ImagePlus
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Drawer-style helpers — same vocabulary as the Slideshow / Menu drawers
// (compact Field with 11px label, collapsible Section card). Kept local for
// now; promote to a shared module once a fourth drawer pulls them in.
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  children
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="text-[11px] font-semibold tracking-wide text-foreground/80">
          {label}
        </div>
      )}
      <div>{children}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Section({
  title,
  children,
  rightSlot
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-md border border-divider bg-card">
      <div className="flex w-full items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          {title}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
              open ? '' : '-rotate-90'
            }`}
          />
        </button>
        {rightSlot}
      </div>
      {open && (
        <div className="space-y-3 border-t border-divider px-3 py-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Banner setting form.
//
// Same structure as before — image picker, alignment, alt text, link — but
// styled to match the page-builder drawer density (Slideshow / Menu).
// ---------------------------------------------------------------------------

type AlignmentType = 'left' | 'center' | 'right';

interface BannerSettingProps {
  // Optional: page-builder drawer mounts this without GraphQL props.
  bannerWidget?: {
    src?: string;
    alignment?: AlignmentType;
    width?: number;
    height?: number;
    alt?: string;
    link?: string;
  };
}

const ALIGNMENT_OPTIONS: ReadonlyArray<{
  value: AlignmentType;
  icon: React.ReactNode;
  label: string;
}> = [
  { value: 'left', icon: <AlignLeft className="h-3.5 w-3.5" />, label: 'Left' },
  {
    value: 'center',
    icon: <AlignCenter className="h-3.5 w-3.5" />,
    label: 'Center'
  },
  {
    value: 'right',
    icon: <AlignRight className="h-3.5 w-3.5" />,
    label: 'Right'
  }
];

export default function BannerSetting({ bannerWidget }: BannerSettingProps) {
  const {
    src = '',
    alignment = 'left',
    width = 0,
    height = 0,
    alt = '',
    link = undefined
  } = bannerWidget ?? {};

  const { register, setValue, watch } = useScopedFormContext();
  const image = watch('settings.src', src) as string;
  const currentAlignment = (watch('settings.alignment', alignment) ??
    alignment) as AlignmentType;

  const [openFileBrowser, setOpenFileBrowser] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    width: width || 0,
    height: height || 0
  });

  const getImageDimensions = (imageUrl: string) => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      const newWidth = img.naturalWidth;
      const newHeight = img.naturalHeight;
      setImageDimensions({ width: newWidth, height: newHeight });
      setValue('settings.width', newWidth);
      setValue('settings.height', newHeight);
    };
    img.src = imageUrl;
  };

  useEffect(() => {
    if (image) {
      getImageDimensions(image);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  return (
    <div className="banner-widget space-y-3">
      {openFileBrowser && (
        <div className="max-h-96">
          <FileBrowser
            isMultiple={false}
            onInsert={(file) => {
              // Defensive normalization — older FileBrowser builds emitted
              // `/assets//file.jpg` for media-root images.
              const normalized = (file || '').replace(/\/{2,}/g, '/');
              setValue('settings.src', normalized);
              setOpenFileBrowser(false);
            }}
            close={() => setOpenFileBrowser(false)}
          />
        </div>
      )}

      {/* Image */}
      <Section title="Image">
        <Field label={image ? 'Selected image' : 'No image selected'}>
          <div className="flex items-center gap-2">
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded border border-divider bg-muted/40 flex items-center justify-center">
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setOpenFileBrowser(true);
              }}
            >
              {image ? 'Replace' : 'Select'}
            </Button>
            {image && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setValue('settings.src', '');
                  setImageDimensions({ width: 0, height: 0 });
                  setValue('settings.width', 0);
                  setValue('settings.height', 0);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </Field>

        {image && (
          <>
            <Field label="Preview" hint="Reflects the alignment below.">
              <div className="relative h-32 w-full overflow-hidden rounded border border-divider bg-muted/30">
                {/* Subtle grid so alignment changes read clearly even when
                    the image is white/transparent. */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CiAgPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZjFmMWYxIj48L3JlY3Q+CiAgPHBhdGggZD0iTTAgMGgyMHYyMEgwVjB6IiBmaWxsPSJub25lIiBzdHJva2U9IiNlNWU1ZTUiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8L3N2Zz4=')] opacity-60" />
                <div
                  className={`relative flex h-full w-full items-center p-2 ${
                    currentAlignment === 'center'
                      ? 'justify-center'
                      : currentAlignment === 'right'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <img
                    src={image}
                    alt="Banner Image"
                    style={{ maxWidth: '60%' }}
                    className="max-h-full rounded object-contain shadow-sm"
                    onLoad={(e) => {
                      // Backup dimension capture if the useEffect path missed
                      // (e.g. cached image fires onload before effect runs).
                      const img = e.target as HTMLImageElement;
                      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        if (
                          imageDimensions.width !== img.naturalWidth ||
                          imageDimensions.height !== img.naturalHeight
                        ) {
                          setImageDimensions({
                            width: img.naturalWidth,
                            height: img.naturalHeight
                          });
                          setValue('settings.width', img.naturalWidth);
                          setValue('settings.height', img.naturalHeight);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </Field>
            {imageDimensions.width > 0 && (
              <div className="text-[11px] text-muted-foreground">
                {imageDimensions.width} × {imageDimensions.height} px
              </div>
            )}
          </>
        )}
      </Section>

      {/* Layout */}
      <Section title="Layout">
        <Field label="Alignment">
          <div
            className="inline-flex w-full rounded-md border border-divider bg-muted/30 p-0.5"
            role="radiogroup"
          >
            {ALIGNMENT_OPTIONS.map((opt) => {
              const active = currentAlignment === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={opt.label}
                  onClick={() => setValue('settings.alignment', opt.value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Field>
      </Section>

      {/* Details */}
      <Section title="Details">
        <Field
          label="Alt text"
          hint="Describes the banner for screen readers and SEO."
        >
          <input
            type="text"
            {...register('settings.alt')}
            defaultValue={alt}
            placeholder='e.g. "Summer sale promotional banner"'
            className="w-full rounded-md border border-divider bg-card px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field
          label="Banner link"
          hint="Optional. Clicking the banner navigates here."
        >
          <input
            type="text"
            {...register('settings.link')}
            defaultValue={link ?? ''}
            placeholder="/c/sale or https://example.com"
            className="w-full rounded-md border border-divider bg-card px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
      </Section>

      {/* Hidden mirrors so the standalone widgetEdit form posts these
          values. The drawer's auto-save reads from form state directly.
          `valueAsNumber` on width/height is critical — without it the DOM
          string "0" reaches the storefront, and GraphQL's `Float` scalar
          rejects strings ("Float cannot represent non numeric value"). */}
      <input
        type="hidden"
        {...register('settings.src')}
        defaultValue={image || ''}
      />
      <input
        type="hidden"
        {...register('settings.width', { valueAsNumber: true })}
        defaultValue={width || imageDimensions.width || 0}
      />
      <input
        type="hidden"
        {...register('settings.height', { valueAsNumber: true })}
        defaultValue={height || imageDimensions.height || 0}
      />
    </div>
  );
}

export const query = `
  query Query($src: String, $alignment: String, $width: Float, $height: Float, $alt: String) {
    bannerWidget(src: $src, alignment: $alignment, width: $width, height: $height, alt: $alt) {
      src
      alignment
      width
      height
      alt
    }
  }
`;

export const variables = `{
  src: getWidgetSetting("src"),
  alignment: getWidgetSetting("alignment"),
  width: getWidgetSetting("width"),
  height: getWidgetSetting("height"),
  alt: getWidgetSetting("alt")
}`;
