import React from 'react';

const TILE_COLORS = ['#d8dfd0', '#c08a6f', '#efe6d4', '#9ca38a'];

/**
 * Stylized preview of the `collection_products` widget — a 4-up grid of
 * product tile mocks. Self-contained, no runtime dependencies.
 */
export default function CollectionProductsPreview(): React.ReactElement {
  return (
    <div
      style={{
        padding: 14,
        background: '#ffffff',
        height: 130,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6
      }}
    >
      {TILE_COLORS.map((color, i) => (
        <div
          key={i}
          style={{
            background: color,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: 5,
            gap: 3
          }}
        >
          <span
            style={{
              width: '70%',
              height: 4,
              borderRadius: 1,
              background: 'rgba(42,37,32,0.65)'
            }}
          />
          <span
            style={{
              width: '40%',
              height: 4,
              borderRadius: 1,
              background: 'rgba(42,37,32,0.45)'
            }}
          />
        </div>
      ))}
    </div>
  );
}
