import Spinner from '@components/admin/Spinner.jsx';
import { Button } from '@components/common/ui/Button.js';
import axios from 'axios';
import React from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import type { ShippingZone } from './Zone.js';

const ProvidersQuery = `
  query AttachableProviders {
    shippingProviders {
      code
      name
      description
      zoneConfigSchema
    }
  }
`;

interface JsonSchemaProperty {
  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
}

interface ZoneConfigSchema {
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

interface ProviderRow {
  code: string;
  name: string;
  description?: string | null;
  zoneConfigSchema: ZoneConfigSchema | null;
}

interface AttachProviderDialogProps {
  zone: ShippingZone;
  alreadyAttached: string[];
  onSaved: () => void;
}

/**
 * Attach a provider to a zone. Renders the provider's `zoneConfigSchema` as
 * a flat form (string/number/integer). For providers with no schema (e.g.,
 * Core), shows an informational note instead.
 *
 * The "configure existing attachment" flow is symmetric — phase 8 (or a
 * polish pass) can extract a reusable EditAttachmentDialog. For phase 7 the
 * Detach button is sufficient.
 */
export function AttachProviderDialog({
  zone,
  alreadyAttached,
  onSaved
}: AttachProviderDialogProps) {
  const form = useForm({ defaultValues: { provider_code: '', config: {} } });
  const [{ data, fetching, error }] = useQuery({
    query: ProvidersQuery,
    requestPolicy: 'network-only'
  });

  if (fetching) return <Spinner width={20} height={20} />;
  if (error)
    return <div className="text-destructive">Error loading providers</div>;
  if (!data) return null;

  // Registry-only model: installed = enabled, so the only condition to
  // exclude a provider is "already attached to this zone". The old
  // `p.isEnabled` gate read a field that no longer exists on the
  // ShippingProvider GraphQL type — silently filtered every provider out
  // and surfaced the misleading "all already attached" empty state.
  const availableProviders: ProviderRow[] = (
    data.shippingProviders ?? []
  ).filter((p: ProviderRow) => !alreadyAttached.includes(p.code));

  if (availableProviders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All registered providers are already attached to this zone.
      </p>
    );
  }

  return (
    <FormProvider {...form}>
      <AttachForm
        zone={zone}
        availableProviders={availableProviders}
        onSaved={onSaved}
      />
    </FormProvider>
  );
}

function AttachForm({
  zone,
  availableProviders,
  onSaved
}: {
  zone: ShippingZone;
  availableProviders: ProviderRow[];
  onSaved: () => void;
}) {
  const { watch, register, trigger, getValues, setValue } = useFormContext();
  const selectedCode = watch('provider_code') as string;
  const selected =
    availableProviders.find((p) => p.code === selectedCode) ?? null;

  const attach = async () => {
    if (!selected) {
      toast.error('Select a provider first');
      return;
    }
    const valid = await trigger();
    if (!valid) return;
    const values = getValues();
    try {
      await axios.post(`/api/shippingZones/${zone.uuid}/providers`, {
        provider_code: selected.code,
        config: values.config ?? {}
      });
      toast.success(`${selected.name} attached to ${zone.name}`);
      onSaved();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Failed to attach provider';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium block mb-1">Provider</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={selectedCode || ''}
          onChange={(e) => {
            setValue('provider_code', e.target.value);
            setValue('config', {});
          }}
        >
          <option value="">Select a provider…</option>
          {availableProviders.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
        <input type="hidden" {...register('provider_code')} />
      </div>

      {selected && (
        <div className="border-t pt-3 space-y-3 border-border">
          <div>
            <h3 className="font-semibold">
              {selected.name} configuration for this zone
            </h3>
            {selected.description && (
              <p className="text-xs text-muted-foreground">
                {selected.description}
              </p>
            )}
          </div>
          <ZoneConfigFields schema={selected.zoneConfigSchema} />
        </div>
      )}

      <div className="flex justify-end pt-3">
        <Button type="button" variant="default" onClick={attach}>
          Attach
        </Button>
      </div>
    </div>
  );
}

function ZoneConfigFields({ schema }: { schema: ZoneConfigSchema | null }) {
  const { register } = useFormContext();
  if (
    !schema ||
    !schema.properties ||
    Object.keys(schema.properties).length === 0
  ) {
    return (
      <p className="text-sm text-muted-foreground italic">
        This provider has no per-zone configuration. Methods and per-zone rates
        are managed in the provider&apos;s own admin area.
      </p>
    );
  }
  const entries = Object.entries(schema.properties);
  return (
    <div className="space-y-3">
      {entries.map(([key, prop]) => {
        const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
        const label = prop.title ?? key;
        const defaultValue = prop.default ?? '';
        if (type === 'number' || type === 'integer') {
          return (
            <div key={key}>
              <label className="text-sm font-medium block mb-1">{label}</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                defaultValue={Number(defaultValue as number) || 0}
                {...register(`config.${key}`, { valueAsNumber: true })}
              />
              {prop.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {prop.description}
                </p>
              )}
            </div>
          );
        }
        return (
          <div key={key}>
            <label className="text-sm font-medium block mb-1">{label}</label>
            <input
              className="w-full border rounded px-2 py-1"
              defaultValue={String(defaultValue ?? '')}
              {...register(`config.${key}`)}
            />
            {prop.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {prop.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
