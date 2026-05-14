import Area from '@components/common/Area.js';
import {
  isPageBuilderActive,
  postToParent,
  useWidgetUid
} from '@components/common/page-builder/index.js';
import React, { useEffect, useState } from 'react';

interface ColumnsProps {
  columnsWidget: {
    columnCount: number;
    gap: number;
  };
}

/**
 * Container widget. Renders `columnCount` Areas, each with a synthetic id
 * `columnsContainer_<uid>_col_<index>`. `loadWidgetInstances` emits this
 * widget's children with matching `areaId` values, so child widgets render
 * inside their column via the standard Area mechanism.
 *
 * Outside the page builder, `useWidgetUid` returns the widget's uuid via
 * the `WidgetContextProvider` mounted by `WidgetChrome` for every widget
 * (also outside the iframe — chrome's outer branch always wraps in
 * provider, no DOM overhead).
 */
export default function Columns({
  columnsWidget: { columnCount, gap }
}: ColumnsProps) {
  const uid = useWidgetUid();
  // SSR-stable mode detection: first render passes through identically.
  const [inPb, setInPb] = useState(false);
  useEffect(() => {
    setInPb(isPageBuilderActive());
  }, []);

  const safeCount = Math.max(1, Math.min(4, columnCount || 2));
  const safeGap = typeof gap === 'number' ? Math.max(0, Math.min(80, gap)) : 16;

  if (!uid) return null;

  return (
    <div
      className="evershop-columns"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${safeCount}, 1fr)`,
        gap: `${safeGap}px`,
        width: '100%'
      }}
    >
      {Array.from({ length: safeCount }, (_, i) => (
        <div
          key={i}
          className="evershop-columns__column"
          data-evershop-pb-column-uid={uid}
          data-evershop-pb-column-index={i}
          style={{
            position: 'relative',
            // Visual outline only inside the page builder so children
            // know where to drop.
            ...(inPb
              ? {
                  minHeight: 80,
                  outline: '1px dashed rgba(0, 128, 95, 0.4)',
                  outlineOffset: -2,
                  padding: 8
                }
              : null)
          }}
        >
          <Area id={`columnsContainer_${uid}_col_${i}`} noOuter />
          {inPb && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                postToParent({
                  type: 'add-to-column',
                  parentUid: uid,
                  columnIndex: i
                });
              }}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 4,
                transform: 'translateX(-50%)',
                fontSize: 11,
                padding: '4px 10px',
                background: 'rgba(0, 128, 95, 0.9)',
                color: '#fff',
                border: 0,
                borderRadius: 4,
                cursor: 'pointer',
                opacity: 0.85
              }}
              aria-label={`Add widget to column ${i + 1}`}
            >
              + Add to Column {i + 1}
            </button>
          )}
        </div>
      ))}
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
