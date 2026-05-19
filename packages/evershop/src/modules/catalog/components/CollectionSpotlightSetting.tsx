import {
  drawerInputClass,
  Field,
  ImagePickerField,
  MarkdownBodyField,
  Section,
  Segmented,
  Toggle,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { CollectionPicker } from '@components/common/page-builder/pickers/CollectionPicker.js';
import React from 'react';

interface CollectionSpotlightSettingProps {
  collectionSpotlightWidget?: {
    collection?: string | null;
    image?: string | null;
    imageAlt?: string;
    imagePosition?: 'left' | 'right';
    imageWidth?: number | null;
    imageHeight?: number | null;
    eyebrow?: string | null;
    heading?: string;
    body?: string | null;
    previewCount?: 2 | 4;
    showPrice?: boolean;
    collectionName?: string | null;
  };
}

export default function CollectionSpotlightSetting({
  collectionSpotlightWidget
}: CollectionSpotlightSettingProps) {
  const {
    collection,
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
    collectionName
  } = collectionSpotlightWidget ?? {};

  const { register, setValue, watch } = useScopedFormContext();

  const collectionV =
    (watch('settings.collection') as string) ?? collection ?? '';
  const imageV = (watch('settings.image') as string) ?? image ?? '';
  const imageAltV = (watch('settings.imageAlt') as string) ?? imageAlt ?? '';
  const imagePositionV =
    ((watch('settings.imagePosition') as string) ??
      imagePosition ??
      'left') as 'left' | 'right';
  const eyebrowV =
    (watch('settings.eyebrow') as string) ?? eyebrow ?? 'COLLECTION';
  const headingV = (watch('settings.heading') as string) ?? heading ?? '';
  const bodyV = (watch('settings.body') as string) ?? body ?? '';
  const previewCountV =
    ((watch('settings.previewCount') as number) ?? previewCount ?? 4) as 2 | 4;
  const showPriceV =
    (watch('settings.showPrice') as boolean | null) ?? showPrice ?? true;

  // The picker callback updates `_pickedName` so we can show the
  // collection name as a placeholder for the heading override.
  const pickedName = (watch('_pickedName') as string) ?? collectionName ?? '';

  return (
    <div className="space-y-3">
      <Section title="Collection">
        <CollectionPicker
          selectedCode={collectionV || null}
          onPick={({ code, name }) => {
            setValue('settings.collection', code, { shouldDirty: true });
            setValue('_pickedName', name);
            // Seed heading with the collection name when the merchant
            // hasn't typed one — keeps the spotlight useful out of the box.
            if (!headingV) {
              setValue('settings.heading', name, { shouldDirty: true });
            }
          }}
        />
      </Section>

      <Section title="Cover image">
        <Field label={imageV ? 'Selected image' : 'No image selected'}>
          <ImagePickerField
            value={imageV}
            onChange={(v) => {
              setValue('settings.image', v || null, { shouldDirty: true });
              if (!v) {
                setValue('settings.imageWidth', null, { shouldDirty: true });
                setValue('settings.imageHeight', null, { shouldDirty: true });
              }
            }}
            onLoadDimensions={({ width: w, height: h }) => {
              setValue('settings.imageWidth', w, { shouldDirty: true });
              setValue('settings.imageHeight', h, { shouldDirty: true });
            }}
          />
        </Field>
        <Field label="Alt text">
          <input
            type="text"
            value={imageAltV}
            onChange={(e) =>
              setValue('settings.imageAlt', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder="Describe the image"
            className={drawerInputClass}
          />
        </Field>
      </Section>

      <Section title="Copy">
        <Field label="Eyebrow">
          <input
            type="text"
            value={eyebrowV}
            onChange={(e) =>
              setValue('settings.eyebrow', e.target.value || null, {
                shouldDirty: true
              })
            }
            placeholder="COLLECTION"
            className={drawerInputClass}
          />
        </Field>
        <Field
          label="Heading"
          hint={
            pickedName
              ? `Defaults to "${pickedName}".`
              : 'Defaults to the picked collection name.'
          }
        >
          <input
            type="text"
            value={headingV}
            onChange={(e) =>
              setValue('settings.heading', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={pickedName || 'Collection name'}
            className={drawerInputClass}
          />
        </Field>
        <Field
          label="Body"
          hint="Optional. One or two sentences of editorial copy."
        >
          <MarkdownBodyField
            value={bodyV}
            onChange={(v) =>
              setValue('settings.body', v || null, { shouldDirty: true })
            }
            placeholder="Linen, cotton, easy stuff."
            rows={3}
            softLimit={240}
          />
        </Field>
      </Section>

      <Section title="Layout">
        <Field label="Image position">
          <Segmented<'left' | 'right'>
            value={imagePositionV}
            options={[
              { value: 'left', label: 'Image left' },
              { value: 'right', label: 'Image right' }
            ]}
            onChange={(v) =>
              setValue('settings.imagePosition', v, { shouldDirty: true })
            }
          />
        </Field>
        <Field label="Preview product count">
          <Segmented<2 | 4>
            value={previewCountV}
            options={[
              { value: 2, label: '2 (1×2)' },
              { value: 4, label: '4 (2×2)' }
            ]}
            onChange={(v) =>
              setValue('settings.previewCount', v, { shouldDirty: true })
            }
          />
        </Field>
        <Toggle
          label="Show price under product name"
          checked={showPriceV}
          onChange={(v) =>
            setValue('settings.showPrice', v, { shouldDirty: true })
          }
        />
      </Section>

      <input
        type="hidden"
        {...register('settings.collection', {
          required: 'Please pick a collection'
        })}
        defaultValue={collection ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.previewCount', { valueAsNumber: true })}
        defaultValue={previewCount ?? 4}
      />
      <input
        type="hidden"
        {...register('settings.imageWidth', { valueAsNumber: true })}
        defaultValue={imageWidth ?? 0}
      />
      <input
        type="hidden"
        {...register('settings.imageHeight', { valueAsNumber: true })}
        defaultValue={imageHeight ?? 0}
      />
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
      collectionName
    }
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
