import React from 'react';

/**
 * Stylized preview of the `columns` widget for the page-builder palette
 * hover card. Self-contained — renders rectangle/dashed-tile primitives
 * so it works without any runtime data or context.
 */
export default function ColumnsPreview(): React.ReactElement {
  return (
    <div
      style={{
        padding: 14,
        background: '#ffffff',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        height: 130
      }}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            border: '1px dashed #c9bca7',
            borderRadius: 4,
            background: '#faf6ee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 9,
            color: '#9b8e78',
            letterSpacing: '0.04em'
          }}
        >
          COLUMN {i + 1}
        </div>
      ))}
    </div>
  );
}
