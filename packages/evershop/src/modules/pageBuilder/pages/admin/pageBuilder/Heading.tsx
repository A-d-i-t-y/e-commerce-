import { PageHeading } from '@components/admin/PageHeading.js';
import React from 'react';

export default function PageBuilderHomeHeading() {
  return <PageHeading heading="Page builder" />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
