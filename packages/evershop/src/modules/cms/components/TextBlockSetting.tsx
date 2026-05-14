import { Editor, Row } from '@components/common/form/Editor.js';
import { InputField } from '@components/common/form/InputField.js';
import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import React from 'react';

interface TextBlockSettingProps {
  // Optional: in the page-builder drawer this component is mounted via
  // <Area id="widget_setting_form"> without the per-widget GraphQL props
  // that the standalone widgetEdit page provides. Default to empty so the
  // component still mounts; the form's auto-save drives the real values.
  textWidget?: {
    text?: Row[] | string;
    className?: string;
  };
}
export default function TextBlockSetting({
  textWidget
}: TextBlockSettingProps) {
  const { text = '', className = '' } = textWidget ?? {};
  const { register, watch, setValue } = useScopedFormContext();

  const editorValue = watch('temp_editor_text');

  React.useEffect(() => {
    if (editorValue) {
      setValue('settings.text', JSON.stringify(editorValue));
    }
  }, [editorValue, setValue]);

  // The Editor expects Row[]. `text` may arrive as a JSON-stringified array
  // (form-stored value), a real array (a default registered as a JS array),
  // or a plain string (a default registered as prose). Normalize defensively
  // so we never call JSON.parse on a non-JSON string and crash the panel.
  const editorRows: Row[] = (() => {
    if (Array.isArray(text)) return text as Row[];
    if (typeof text !== 'string' || !text.trim()) return [];
    const trimmed = text.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? (parsed as Row[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  })();
  const hiddenTextDefault =
    typeof text === 'string' ? text : JSON.stringify(text);

  return (
    <div className="space-y-3">
      <InputField
        label="Custom CSS classes"
        name="settings.className"
        defaultValue={className}
        helperText="Custom CSS classes for the text block"
      />
      <input
        type="hidden"
        {...register('settings.text')}
        defaultValue={hiddenTextDefault}
      />
      <Editor
        name="temp_editor_text"
        label="Content"
        value={editorRows}
      />
    </div>
  );
}

export const query = `
  query Query($text: String, $className: String) {
    textWidget(text: $text, className: $className) {
      text
      className
    }
  }
`;

export const variables = `{
  text: getWidgetSetting("text"),
  className: getWidgetSetting("className")
}`;
