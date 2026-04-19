import React from 'react';

export const Skeleton = ({ height = 20, width = '100%', style = {} }) => (
  <div className="skeleton" style={{ height, width, ...style }} />
);

export const CardSkeleton = () => (
  <div className="card">
    <Skeleton height={16} width="40%" style={{ marginBottom: 12 }} />
    <Skeleton height={32} width="60%" style={{ marginBottom: 8 }} />
    <Skeleton height={12} width="30%" />
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
        <Skeleton height={14} width="15%" />
        <Skeleton height={14} width="20%" />
        <Skeleton height={14} width="15%" />
        <Skeleton height={14} width="20%" />
        <Skeleton height={14} width="15%" />
      </div>
    ))}
  </div>
);
