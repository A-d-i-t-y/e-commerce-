// =============================================================================
// Widget schema (JSON Schema draft-07 subset, validated by AJV)
// =============================================================================

export interface BaseFieldSchema {
  title?: string;
  description?: string;
}

export interface StringFieldSchema extends BaseFieldSchema {
  type: 'string';
  default?: string;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  format?: 'uri' | 'email' | 'date' | 'date-time';
}

export interface NumberFieldSchema extends BaseFieldSchema {
  type: 'integer' | 'number';
  default?: number;
  minimum?: number;
  maximum?: number;
  enum?: number[];
}

export interface BooleanFieldSchema extends BaseFieldSchema {
  type: 'boolean';
  default?: boolean;
}

export interface ObjectFieldSchema extends BaseFieldSchema {
  type: 'object';
  properties: Record<string, AnyFieldSchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ArrayFieldSchema extends BaseFieldSchema {
  type: 'array';
  items: AnyFieldSchema;
  minItems?: number;
  maxItems?: number;
}

export type AnyFieldSchema =
  | StringFieldSchema
  | NumberFieldSchema
  | BooleanFieldSchema
  | ObjectFieldSchema
  | ArrayFieldSchema;

export interface WidgetSchemaDefinition {
  type: 'object';
  properties: Record<string, AnyFieldSchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface WidgetGraphQLBlock {
  /** SDL fragment declaring this widget's settings types. */
  typeDefs: string;
  /** Name of the type from `typeDefs` that becomes a member of the WidgetSettings union. */
  settingsType: string;
}

export type WidgetCategory =
  | 'content'
  | 'commerce'
  | 'navigation'
  | 'marketing'
  | 'layout';

// =============================================================================
// Widget registration shape
// =============================================================================

export interface Widget<T = any> {
  name: string;
  type: string;
  description?: string;
  category?: WidgetCategory;
  settingComponent: string;
  settingComponentKey?: string;
  component: string;
  componentKey?: string;
  enabled: boolean;
  defaultSettings: Record<string, T>;
  /**
   * JSON Schema (draft-07) describing the shape of `settings`. Validated by
   * AJV at registration (against `defaultSettings`) and on each save.
   *
   * Optional in v1 for backward compat with extensions that pre-date Phase 2b.
   * A widget without a schema logs a warning at registration but still works.
   */
  schema?: WidgetSchemaDefinition;
  /**
   * Optional GraphQL settings type. When present, `Widget.settings` resolves
   * as a member of the `WidgetSettings` union. When absent, `Widget.settings`
   * is null and clients should fall back to `Widget.rawSettings`.
   */
  graphql?: WidgetGraphQLBlock;
}

export interface WidgetInstance<T = any> extends Widget<T> {
  id: string;
  type: string;
  settings: Record<string, T>;
  props: Record<string, any>;
  areaId: string[];
  sortOrder: number;
  /** UUID for the source `widget_instance` row (page builder needs this). */
  uuid?: string;
}
