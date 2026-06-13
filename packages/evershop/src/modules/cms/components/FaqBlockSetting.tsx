import { Editor, Row } from '@components/common/form/Editor.js';
import {
  drawerInputClass,
  drawerTextareaClass,
  Field,
  RepeatableAccordion,
  Section,
  Segmented,
  Toggle,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { Button } from '@components/common/ui/Button.js';
import { FileText, Plus, Trash2 } from 'lucide-react';
import React from 'react';
import type { FaqMaxWidth, FaqSection_ } from './FaqBlock.js';

/**
 * FAQ block drawer form. Owns a `sections` array (discriminated by
 * `type: 'prose' | 'faq'`) plus a heading and width toggle. Prose sections
 * delegate authoring to the shared `Editor` (EditorJS Row[]). FAQ
 * sections are nested repeatable items (q+a). Both shapes coexist in
 * one list so the merchant can interleave prose and accordions.
 */

interface FaqBlockSettingProps {
  faqBlockWidget?: {
    heading?: string | null;
    sections?: FaqSection_[];
    maxWidth?: FaqMaxWidth | null;
    allowMultipleOpen?: boolean | null;
  };
}

const WIDTH_OPTIONS: ReadonlyArray<{ value: FaqMaxWidth; label: string }> = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' }
];

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeBlankProse(): FaqSection_ {
  return {
    id: makeId(),
    type: 'prose',
    content: '[]'
  };
}

function makeBlankFaqGroup(): FaqSection_ {
  return {
    id: makeId(),
    type: 'faq',
    heading: null,
    items: [
      {
        id: makeId(),
        question: 'New question',
        answer: ''
      }
    ]
  };
}

export default function FaqBlockSetting({ faqBlockWidget }: FaqBlockSettingProps) {
  const {
    heading = '',
    sections: initialSections = [],
    maxWidth,
    allowMultipleOpen
  } = faqBlockWidget ?? {};
  const { register, setValue, watch } = useScopedFormContext();

  const sections =
    (watch('settings.sections') as FaqSection_[] | undefined) ?? initialSections;
  const widthState =
    ((watch('settings.maxWidth') as string | null) ??
      maxWidth ??
      'normal') as FaqMaxWidth;
  const allowMultiple =
    (watch('settings.allowMultipleOpen') as boolean | null) ??
    allowMultipleOpen ??
    false;

  // EditorJS interaction: the Editor binds to `name`, writes to that path on
  // every change. We need one form path per prose section because two
  // mounted editors can't share a path. Use `temp_editor_<id>` paths and
  // sync the value back to `settings.sections[N].content` via watch.
  const sectionWatches = sections.map((s, i) =>
    s.type === 'prose'
      ? watch(`temp_editor_${s.id}`)
      : undefined
  );

  React.useEffect(() => {
    let dirty = false;
    const next = sections.map((s, i) => {
      if (s.type !== 'prose') return s;
      const w = sectionWatches[i];
      if (w !== undefined && JSON.stringify(w) !== s.content) {
        dirty = true;
        return { ...s, content: w as Row[] };
      }
      return s;
    });
    if (dirty) {
      setValue('settings.sections', next, { shouldDirty: true });
    }
  }, [JSON.stringify(sectionWatches)]);

  const updateSection = (index: number, patch: Partial<FaqSection_>) => {
    const next = sections.map((s, i) =>
      i === index ? ({ ...s, ...patch } as FaqSection_) : s
    );
    setValue('settings.sections', next, { shouldDirty: true });
  };

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const next = sections.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setValue('settings.sections', next, { shouldDirty: true });
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    setValue(
      'settings.sections',
      sections.filter((_, i) => i !== index),
      { shouldDirty: true }
    );
  };

  const addProse = () =>
    setValue('settings.sections', [...sections, makeBlankProse()], {
      shouldDirty: true
    });
  const addFaq = () =>
    setValue('settings.sections', [...sections, makeBlankFaqGroup()], {
      shouldDirty: true
    });

  const updateFaqItem = (
    sectionIndex: number,
    itemIndex: number,
    patch: Partial<{ question: string; answer: string }>
  ) => {
    const section = sections[sectionIndex];
    if (section.type !== 'faq') return;
    const nextItems = section.items.map((it, i) =>
      i === itemIndex ? { ...it, ...patch } : it
    );
    updateSection(sectionIndex, { items: nextItems });
  };

  const moveFaqItem = (
    sectionIndex: number,
    from: number,
    to: number
  ) => {
    const section = sections[sectionIndex];
    if (section.type !== 'faq') return;
    if (to < 0 || to >= section.items.length) return;
    const nextItems = section.items.slice();
    const [moved] = nextItems.splice(from, 1);
    nextItems.splice(to, 0, moved);
    updateSection(sectionIndex, { items: nextItems });
  };

  const removeFaqItem = (sectionIndex: number, itemIndex: number) => {
    const section = sections[sectionIndex];
    if (section.type !== 'faq') return;
    if (section.items.length <= 1) return;
    updateSection(sectionIndex, {
      items: section.items.filter((_, i) => i !== itemIndex)
    });
  };

  const addFaqItem = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    if (section.type !== 'faq') return;
    updateSection(sectionIndex, {
      items: [
        ...section.items,
        { id: makeId(), question: 'New question', answer: '' }
      ]
    });
  };

  return (
    <div className="space-y-3">
      <Section title="Heading">
        <Field label="Section heading" hint="Shown above all content. Optional.">
          <input
            type="text"
            value={(watch('settings.heading') as string) ?? heading ?? ''}
            onChange={(e) =>
              setValue('settings.heading', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder="e.g. Frequently asked"
            className={drawerInputClass}
          />
        </Field>
      </Section>

      <Section title="Content">
        <RepeatableAccordion<FaqSection_>
          items={sections}
          onRemove={removeSection}
          onMove={moveSection}
          minItems={1}
          renderHeader={({ item }) => {
            if (item.type === 'prose') {
              return (
                <span className="flex items-center gap-2">
                  <FileText className="h-3 w-3" /> Prose
                </span>
              );
            }
            return `FAQ group · ${item.items?.length ?? 0} items`;
          }}
          renderItem={({ item, index }) => {
            if (item.type === 'prose') {
              const rows: Row[] = (() => {
                if (Array.isArray(item.content)) return item.content as Row[];
                if (typeof item.content !== 'string') return [];
                const trimmed = item.content.trim();
                if (!trimmed.startsWith('[')) return [];
                try {
                  const p = JSON.parse(trimmed);
                  return Array.isArray(p) ? (p as Row[]) : [];
                } catch {
                  return [];
                }
              })();
              return (
                <Editor
                  name={`temp_editor_${item.id}`}
                  label="Content"
                  value={rows}
                />
              );
            }
            return (
              <>
                <Field label="Group heading" hint="Optional sub-heading.">
                  <input
                    type="text"
                    value={item.heading ?? ''}
                    onChange={(e) =>
                      updateSection(index, {
                        heading: e.target.value || null
                      })
                    }
                    placeholder="e.g. Shipping"
                    className={drawerInputClass}
                  />
                </Field>
                <Field label="Items">
                  <RepeatableAccordion
                    items={item.items}
                    onRemove={(i) => removeFaqItem(index, i)}
                    onMove={(f, t) => moveFaqItem(index, f, t)}
                    onAdd={() => addFaqItem(index)}
                    addLabel="Add question"
                    minItems={1}
                    renderHeader={({ item: it }) => it.question || 'Untitled'}
                    renderItem={({ item: it, index: itIdx }) => (
                      <>
                        <Field label="Question">
                          <input
                            type="text"
                            value={it.question || ''}
                            onChange={(e) =>
                              updateFaqItem(index, itIdx, {
                                question: e.target.value
                              })
                            }
                            placeholder="e.g. How long does shipping take?"
                            className={drawerInputClass}
                          />
                        </Field>
                        <Field
                          label="Answer"
                          hint="Supports **bold**, _italic_, and line breaks."
                        >
                          <textarea
                            value={it.answer || ''}
                            onChange={(e) =>
                              updateFaqItem(index, itIdx, {
                                answer: e.target.value
                              })
                            }
                            placeholder="e.g. Orders ship within 24 hours…"
                            rows={3}
                            className={drawerTextareaClass}
                          />
                        </Field>
                      </>
                    )}
                  />
                </Field>
              </>
            );
          }}
        />
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={addProse}
            className="flex-1 justify-center"
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add prose
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={addFaq}
            className="flex-1 justify-center"
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add FAQ group
          </Button>
        </div>
      </Section>

      <Section title="Layout">
        <Field label="Max width" hint="Content column width.">
          <Segmented<FaqMaxWidth>
            value={widthState}
            options={WIDTH_OPTIONS}
            onChange={(v) =>
              setValue('settings.maxWidth', v, { shouldDirty: true })
            }
          />
        </Field>
        <Toggle
          label="Allow multiple open"
          description="When off, opening one FAQ item closes the others in the same group."
          checked={allowMultiple}
          onChange={(v) =>
            setValue('settings.allowMultipleOpen', v, { shouldDirty: true })
          }
        />
      </Section>

      <input
        type="hidden"
        {...register('settings.sections')}
        defaultValue={JSON.stringify(initialSections)}
      />
    </div>
  );
}

export const query = `
  query Query(
    $heading: String
    $sections: JSON
    $maxWidth: String
    $allowMultipleOpen: Boolean
  ) {
    faqBlockWidget(
      heading: $heading
      sections: $sections
      maxWidth: $maxWidth
      allowMultipleOpen: $allowMultipleOpen
    ) {
      heading
      sections
      maxWidth
      allowMultipleOpen
    }
  }
`;

export const variables = `{
  heading: getWidgetSetting("heading"),
  sections: getWidgetSetting("sections", []),
  maxWidth: getWidgetSetting("maxWidth", "normal"),
  allowMultipleOpen: getWidgetSetting("allowMultipleOpen", false)
}`;
