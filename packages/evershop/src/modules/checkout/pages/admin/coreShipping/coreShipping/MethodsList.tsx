import Spinner from '@components/admin/Spinner.jsx';
import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import { MethodForm } from './MethodForm.js';

const MethodsQuery = `
  query CoreMethods {
    coreShippingMethods {
      coreShippingMethodId
      uuid
      name
      isEnabled
      sortOrder
      defaultCarrierCode
      defaultServiceCode
      rates {
        coreShippingMethodRateId
        uuid
        zoneId
        zone {
          shippingZoneId
          uuid
          name
        }
        isEnabled
        cost {
          value
          text
        }
        conditionType
        min
        max
        updateApi
        deleteApi
      }
      addRateApi
    }
    shippingZones {
      shippingZoneId
      uuid
      name
      providers {
        provider {
          code
        }
      }
    }
    carriers {
      code
      name
    }
  }
`;

interface CoreMethod {
  coreShippingMethodId: number;
  uuid: string;
  name: string;
  isEnabled: boolean;
  sortOrder: number;
  defaultCarrierCode: string | null;
  defaultServiceCode: string | null;
  rates: Array<{
    coreShippingMethodRateId: number;
    uuid: string;
    zoneId: number;
    zone: { shippingZoneId: number; uuid: string; name: string } | null;
    isEnabled: boolean;
    cost: { value: number; text: string } | null;
    conditionType: string | null;
    min: number | null;
    max: number | null;
    updateApi: string;
    deleteApi: string;
  }>;
  addRateApi: string;
}

interface Zone {
  shippingZoneId: number;
  uuid: string;
  name: string;
  providers: Array<{ provider: { code: string } | null }>;
}

export function MethodsList() {
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({
    query: MethodsQuery,
    requestPolicy: 'network-only'
  });
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CoreMethod | null>(null);

  if (fetching) return <Spinner width={'2rem'} height={'2rem'} />;
  if (error)
    return <div className="text-destructive">Error loading methods</div>;
  if (!data) return null;

  const reload = () => reexecuteQuery({ requestPolicy: 'network-only' });

  // Zones where Core is currently attached — the only zones the admin can
  // configure rates for.
  const coreZones = (data.shippingZones ?? []).filter((z: Zone) =>
    (z.providers ?? []).some((p) => p?.provider?.code === 'core')
  );
  // Registered carriers available as default-carrier choices for new/edited
  // methods. Empty list is fine — the form falls back to "No default".
  const carriers = (data.carriers ?? []) as Array<{
    code: string;
    name: string;
  }>;

  const deleteMethod = async (uuid: string, name: string) => {
    if (!confirm(`Delete method "${name}"? Its rates will be removed too.`))
      return;
    try {
      await axios.delete(`/api/shippingProviders/core/methods/${uuid}`);
      toast.success(`Deleted ${name}`);
      reload();
    } catch (e) {
      toast.error(`Failed to delete ${name}`);
    }
  };

  return (
    <div className="px-5 space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Zones served</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.coreShippingMethods?.length ? (
            data.coreShippingMethods.map((m: CoreMethod) => (
              <TableRow key={m.uuid}>
                <TableCell className="font-semibold">{m.name}</TableCell>
                <TableCell>
                  {m.isEnabled ? (
                    <span className="text-green-700">● Enabled</span>
                  ) : (
                    <span className="text-muted-foreground">○ Disabled</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {m.rates.length > 0
                    ? m.rates.map((r) => r.zone?.name ?? '—').join(', ')
                    : 'No zones'}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(m)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMethod(m.uuid, m.name)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                No methods yet — add one to start offering Core shipping.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger>
            <Button>+ Add Method</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Shipping Method</DialogTitle>
            </DialogHeader>
            <MethodForm
              coreZones={coreZones}
              carriers={carriers}
              onSaved={() => {
                setAddOpen(false);
                reload();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <MethodForm
              method={editing}
              coreZones={coreZones}
              carriers={carriers}
              onSaved={() => {
                setEditing(null);
                reload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
