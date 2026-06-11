import Spinner from '@components/admin/Spinner.jsx';
import { Button } from '@components/common/ui/Button.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import React from 'react';
import { useQuery } from 'urql';

const ProvidersQuery = `
  query Providers {
    shippingProviders {
      code
      name
      description
    }
  }
`;

interface ProviderRow {
  code: string;
  name: string;
  description?: string | null;
}

/**
 * Registry-only provider list. Installed = enabled — there is no global
 * toggle to flip and no global config form to open (per-zone state lives
 * under each zone's attachment; secrets read from `process.env` inside
 * the extension). Core gets a "Manage →" link to its method-list page.
 */
export function ProvidersList() {
  const [{ data, fetching, error }] = useQuery({
    query: ProvidersQuery,
    requestPolicy: 'network-only'
  });

  if (fetching) return <Spinner width={'2rem'} height={'2rem'} />;
  if (error)
    return <div className="text-destructive">Error loading providers</div>;
  if (!data || !data.shippingProviders) return <div>No providers registered</div>;

  return (
    <div className="px-5 pb-5">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.shippingProviders.map((p: ProviderRow) => (
            <TableRow key={p.code}>
              <TableCell className="font-semibold">{p.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {p.description}
              </TableCell>
              <TableCell>
                {/*
                  `flex justify-end` (NOT `text-right`): `Button` is
                  `inline-flex`, which `text-right` doesn't push to the
                  right — that property only affects regular inline text.
                  The header's "Actions" text aligned right correctly via
                  `text-right` because it's plain inline text; the body
                  buttons need a flex container instead.
                */}
                <div className="flex justify-end gap-2">
                  {p.code === 'core' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        window.location.href =
                          '/admin/setting/shippingProviders/core';
                      }}
                    >
                      Manage →
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground mt-4">
        Installed providers are always available — there is no global enable
        toggle. To stop offering a provider in a specific zone, detach it
        from that zone under Settings → Shipping → Zones.
      </p>
    </div>
  );
}
