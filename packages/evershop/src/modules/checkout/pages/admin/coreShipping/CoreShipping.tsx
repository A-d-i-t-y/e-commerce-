import { SettingMenu } from '@components/admin/SettingMenu.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { ChevronLeft } from 'lucide-react';
import React from 'react';
import { MethodsList } from './coreShipping/MethodsList.js';

export default function CoreShipping() {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    window.location.href = '/admin/setting/shippingProviders';
                  }}
                  aria-label="Back to providers"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle>Core Shipping</CardTitle>
                  <CardDescription>
                    Built-in shipping methods with per-zone rates. Attach Core
                    to a zone first under Settings → Shipping; then add methods
                    here and configure their rates per zone.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <MethodsList />
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
