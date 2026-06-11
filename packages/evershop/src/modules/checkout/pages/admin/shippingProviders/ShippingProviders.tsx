import { SettingMenu } from '@components/admin/SettingMenu.js';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import React from 'react';
import { ProvidersList } from './shippingProviders/ProvidersList.js';

export default function ShippingProviders() {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Providers</CardTitle>
              <CardDescription>
                Manage shipping integrations. Each provider declares its own
                methods at checkout.
              </CardDescription>
            </CardHeader>
            <ProvidersList />
          </Card>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
