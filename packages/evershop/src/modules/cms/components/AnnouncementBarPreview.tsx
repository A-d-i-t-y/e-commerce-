import React from 'react';

/** Palette preview for the announcement bar widget. */
export default function AnnouncementBarPreview(): React.ReactElement {
  return (
    <div
      style={{
        padding: 14,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: 130
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          color: '#ffffff',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 10,
          padding: '6px 10px',
          textAlign: 'center'
        }}
      >
        Free shipping on orders over $50 · Shop now →
      </div>
      <div
        style={{
          flex: 1,
          background:
            'repeating-linear-gradient(135deg, #f5efe2 0 4px, #ebe5d8 4px 8px)',
          borderRadius: 4
        }}
      />
    </div>
  );
}
