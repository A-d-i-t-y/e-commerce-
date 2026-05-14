import { NavigationItemGroup } from '@components/admin/NavigationItemGroup.js';
import { LayoutDashboard } from 'lucide-react';
import React from 'react';

interface StorefrontMenuGroupProps {
  pageBuilder: string;
}

export default function StorefrontMenuGroup({
  pageBuilder
}: StorefrontMenuGroupProps) {
  return (
    <NavigationItemGroup
      id="storefrontMenuGroup"
      name="Storefront"
      items={[
        {
          Icon: LayoutDashboard,
          url: pageBuilder,
          title: 'Page builder'
        }
      ]}
    />
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 65
};

export const query = `
  query Query {
    pageBuilder: url(routeId:"pageBuilder")
  }
`;
