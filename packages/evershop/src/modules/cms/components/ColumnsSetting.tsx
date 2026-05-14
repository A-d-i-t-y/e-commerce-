import { InputField } from '@components/common/form/InputField.js';
import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import React from 'react';

interface ColumnsSettingProps {
  // Optional: page-builder drawer mounts this without GraphQL props.
  columnsWidget?: {
    columnCount?: number;
    gap?: number;
  };
}

export default function ColumnsSetting({
  columnsWidget
}: ColumnsSettingProps) {
  const { columnCount = 2, gap = 16 } = columnsWidget ?? {};
  // Scope-aware form context: when mounted inside a WidgetSettingsScope
  // (page-builder drawer), every register/watch/setValue call below is
  // auto-prefixed with `block.<uid>.`. Outside a scope (standalone
  // widgetEdit page) it behaves like a plain useFormContext.
  const { register, watch, setValue } = useScopedFormContext();

  // Bind hidden integer fields so the form's settings carries numbers, not
  // strings (the schema validator + storefront component want integers).
  const watchedCount = watch('settings.columnCount');
  const watchedGap = watch('settings.gap');

  React.useEffect(() => {
    if (typeof watchedCount === 'string') {
      setValue('settings.columnCount', Number(watchedCount));
    }
  }, [watchedCount, setValue]);
  React.useEffect(() => {
    if (typeof watchedGap === 'string') {
      setValue('settings.gap', Number(watchedGap));
    }
  }, [watchedGap, setValue]);

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="block mb-1">Number of columns</span>
        <select
          {...register('settings.columnCount', { valueAsNumber: true })}
          defaultValue={columnCount}
          className="w-full bg-card border border-divider rounded-md px-2 py-1.5 text-sm"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </label>
      <InputField
        label="Gap (pixels)"
        name="settings.gap"
        type="number"
        defaultValue={gap}
        helperText="Spacing between columns, 0–80px"
      />
    </div>
  );
}

export const query = `
  query Query($columnCount: Int, $gap: Int) {
    columnsWidget(columnCount: $columnCount, gap: $gap) {
      columnCount
      gap
    }
  }
`;

export const variables = `{
  columnCount: getWidgetSetting("columnCount", 2),
  gap: getWidgetSetting("gap", 16)
}`;
