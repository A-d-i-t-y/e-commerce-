import Spinner from '@components/admin/Spinner.js';
import { useWidgetSettings } from '@components/common/page-builder/WidgetContext.js';
import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { Input } from '@components/common/ui/Input.js';
import { Switch } from '@components/common/ui/Switch.js';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  GripVertical,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import uniqid from 'uniqid';
import { useQuery } from 'urql';

// ---------------------------------------------------------------------------
// Drawer-style helpers (mirrored from SlideshowSetting so both widget
// drawers share typography). Kept local rather than promoted to a shared
// module — three call sites doesn't yet justify the module boundary.
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  children
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="text-[11px] font-semibold tracking-wide text-foreground/80">
          {label}
        </div>
      )}
      <div>{children}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Toggle({
  value,
  onChange,
  label,
  hint
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex w-full items-center justify-between rounded-md border border-divider bg-card px-3 py-2">
      <div className="flex flex-col min-w-0 mr-3">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {hint && (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        )}
      </div>
      <Switch
        size="sm"
        checked={value}
        onCheckedChange={(v: boolean) => onChange(Boolean(v))}
      />
    </div>
  );
}

function Section({
  title,
  children,
  rightSlot
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-md border border-divider bg-card">
      <div className="flex w-full items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          {title}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
              open ? '' : '-rotate-90'
            }`}
          />
        </button>
        {rightSlot}
      </div>
      {open && (
        <div className="space-y-3 border-t border-divider px-3 py-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data layer.
// ---------------------------------------------------------------------------

const menuQuery = `
  query Query ($filters: [FilterInput]) {
    categories (filters: $filters) {
      items {
        value: uuid,
        label: name
        path {
          name
        }
      }
    }
    cmsPages (filters: $filters) {
      items {
        value: uuid,
        label: name
      }
    }
  }
`;

interface MenuItem {
  id: string;
  name: string;
  url: string;
  type: string;
  uuid: string;
  children: MenuItem[];
}

// ---------------------------------------------------------------------------
// Sortable menu row. Compact layout that fits the 320–540px drawer column:
// drag-handle on the left, name, icon-only action buttons on the right.
// ---------------------------------------------------------------------------

interface SortableMenuItemProps {
  item: MenuItem;
  updateItem: (item: MenuItem) => void;
  deleteItem: (item: MenuItem) => void;
  isChild?: boolean;
}

const SortableMenuItem: React.FC<SortableMenuItemProps> = ({
  item,
  updateItem,
  deleteItem,
  isChild = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const [itemInEdit, setItemInEdit] = React.useState(item);

  const addChildren = (i: MenuItem) => {
    updateItem({
      ...item,
      children: [...item.children, i]
    });
  };

  const updateItemFunc = (i: MenuItem) => {
    if (i.id === item.id) {
      updateItem(i);
    } else {
      addChildren(i);
    }
    setDialogOpen(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-divider bg-card px-2 py-1.5"
    >
      <button
        type="button"
        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
        {item.name || (
          <span className="text-muted-foreground italic">Untitled</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setItemInEdit(item);
          setDialogOpen(true);
        }}
        aria-label="Edit menu item"
        title="Edit"
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {!isChild && (
        <button
          type="button"
          onClick={() => {
            setItemInEdit({
              id: uniqid(),
              name: '',
              url: '',
              type: 'category',
              uuid: '',
              children: []
            });
            setDialogOpen(true);
          }}
          aria-label="Add child menu item"
          title="Add child"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => deleteItem(item)}
        aria-label="Delete menu item"
        title="Delete"
        className="rounded p-1 text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              {item.id === itemInEdit.id
                ? `Edit menu item${item.name ? `: ${item.name}` : ''}`
                : 'Add child menu item'}
            </DialogTitle>
          </DialogHeader>
          <MenuSettingPopup item={itemInEdit} updateItem={updateItemFunc} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Edit-item dialog body. Lives in a Dialog overlay, not the drawer column —
// so we keep the form fields at the usual full-width admin density.
// ---------------------------------------------------------------------------

const MenuSettingPopup: React.FC<{
  item: MenuItem;
  updateItem: (item: MenuItem) => void;
}> = ({ item, updateItem }) => {
  const [currentItem, setCurrentItem] = React.useState(item);
  const [err, setErr] = React.useState<string | null>(null);

  const [result] = useQuery({
    query: menuQuery,
    variables: {
      filters: []
    }
  });
  const { data, fetching, error } = result;

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner width={25} height={25} />
      </div>
    );
  }
  if (error) {
    return <div className="py-4 text-sm text-destructive">{error.message}</div>;
  }

  const groupOptions = [
    {
      label: 'Categories',
      options: data.categories.items.map((i: any) => ({
        ...i,
        label: i.path.map((p: any) => p.name).join(' > ')
      }))
    },
    {
      label: 'CMS Pages',
      options: data.cmsPages.items
    },
    {
      label: 'Custom',
      options:
        currentItem.type === 'custom'
          ? [
              {
                value: currentItem.uuid,
                label: currentItem.uuid
              }
            ]
          : []
    }
  ];

  const handleCreate = (inputValue: string) => {
    setCurrentItem({
      ...item,
      uuid: inputValue,
      name: inputValue,
      url: inputValue,
      type: 'custom'
    });
  };

  return (
    <div className="grid grid-flow-row gap-4">
      <Field label="Display name">
        <Input
          id="menuName"
          type="text"
          value={currentItem.name}
          placeholder="e.g. Shop, About, Contact"
          onChange={(e) =>
            setCurrentItem({
              ...currentItem,
              name: e.target.value
            })
          }
          className="w-full"
        />
      </Field>
      <Field
        label="Target"
        hint="Pick an existing category or page, or type a custom URL."
      >
        <CreatableSelect
          isClearable
          onChange={(newValue: any) => {
            setCurrentItem({
              ...currentItem,
              uuid: newValue?.value || '',
              name: newValue?.label || '',
              type: newValue?.__typename === 'Category' ? 'category' : 'page'
            });
          }}
          onCreateOption={handleCreate}
          options={groupOptions}
          value={{
            value: currentItem.uuid,
            label:
              currentItem.type === 'custom'
                ? currentItem.uuid
                : [
                    ...groupOptions[0].options,
                    ...groupOptions[1].options
                  ].find((option: any) => option.value === currentItem.uuid)
                    ?.label || ''
          }}
        />
      </Field>
      {err && <div className="text-xs text-destructive">{err}</div>}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (currentItem.uuid === '') {
              setErr('Please select a menu item');
              return;
            }
            if (currentItem.name === '') {
              setErr('Please enter a name');
              return;
            }
            updateItem(currentItem);
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Drawer entry point.
// ---------------------------------------------------------------------------

interface BasicMenuSettingProps {
  // Optional: page-builder drawer mounts this without GraphQL props.
  basicMenuWidget?: {
    menus?: MenuItem[];
    isMain?: boolean;
    className?: string;
  };
}

export default function BasicMenuSetting({
  basicMenuWidget
}: BasicMenuSettingProps) {
  // The GraphQL prop is populated on the standalone widgetEdit page; in the
  // page-builder drawer it isn't (no per-widget query is merged there).
  // Fall through to the widget's persisted settings from WidgetContext —
  // both `<WidgetChrome>` and the storefront's `<WidgetContextProvider>`
  // expose them, so this is reliable in both contexts.
  const widgetSettings = useWidgetSettings();
  const menus: MenuItem[] =
    basicMenuWidget?.menus ??
    ((widgetSettings.menus as MenuItem[] | undefined) ?? []);
  const isMain: boolean =
    basicMenuWidget?.isMain ?? Boolean(widgetSettings.isMain ?? false);
  const className: string =
    basicMenuWidget?.className ??
    ((widgetSettings.className as string | undefined) ?? '');
  const { register, setValue, watch } = useScopedFormContext();
  const [items, setItems] = React.useState(menus);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const currentIsMain = Boolean(watch('settings.isMain', isMain));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleChildDragEnd = (event: any, parentId: string) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        return items.map((item) => {
          if (item.id === parentId) {
            const oldIndex = item.children.findIndex(
              (child) => child.id === active.id
            );
            const newIndex = item.children.findIndex(
              (child) => child.id === over.id
            );

            return {
              ...item,
              children: arrayMove(item.children, oldIndex, newIndex)
            };
          }
          return item;
        });
      });
    }
  };

  const updateItem = (item: MenuItem) => {
    setItems((prevItems) => {
      const newItems = prevItems.map((prevItem) => {
        if (prevItem.id === item.id) {
          return item;
        } else if (prevItem.children.length > 0) {
          return {
            ...prevItem,
            children: prevItem.children.map((child) => {
              if (child.id === item.id) {
                return item;
              }
              return child;
            })
          };
        }
        return prevItem;
      });
      return newItems;
    });
  };

  const deleteItem = (item: MenuItem) => {
    setItems((prevItems) => {
      const newItems = prevItems.filter((prevItem) => {
        if (prevItem.id === item.id) {
          return false;
        } else if (prevItem.children.length > 0) {
          prevItem.children = prevItem.children.filter(
            (child) => child.id !== item.id
          );
        }
        return true;
      });
      return newItems;
    });
  };

  // Mirror the local item tree into the form so the page-builder auto-save
  // picks it up. Skips the very first render to avoid emitting a no-op
  // save when the drawer mounts with the persisted value.
  const seededRef = React.useRef(false);
  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      return;
    }
    setValue('settings.menus', items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <div className="space-y-3">
      <Section
        title={`Menu items (${items.length})`}
        rightSlot={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm" type="button">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm font-medium">
                  Add menu item
                </DialogTitle>
              </DialogHeader>
              <MenuSettingPopup
                item={{
                  id: uniqid(),
                  name: '',
                  url: '',
                  type: 'category',
                  uuid: '',
                  children: []
                }}
                updateItem={(item) => {
                  setItems((prevItems) => [...prevItems, item]);
                  setDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      >
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-divider px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground mb-3">
              No menu items yet.
            </p>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add first item
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {items.map((menu) => (
                  <div key={menu.id}>
                    <SortableMenuItem
                      item={menu}
                      updateItem={updateItem}
                      deleteItem={deleteItem}
                    />
                    {menu.children && menu.children.length > 0 && (
                      <div className="ml-4 mt-1.5 border-l border-divider pl-2">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) =>
                            handleChildDragEnd(event, menu.id)
                          }
                        >
                          <SortableContext
                            items={menu.children.map((child) => child.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-1.5">
                              {menu.children.map((child) => (
                                <SortableMenuItem
                                  key={child.id}
                                  item={child}
                                  updateItem={updateItem}
                                  deleteItem={deleteItem}
                                  isChild={true}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        {/* Hidden field keeps the standalone widgetEdit form (no drawer
            auto-save) submitting the latest menus on Save. */}
        <input
          type="hidden"
          {...register('settings.menus')}
          value={JSON.stringify(items)}
        />
      </Section>

      <Section title="Options">
        <Toggle
          value={currentIsMain}
          onChange={(v) => setValue('settings.isMain', v)}
          label="Use as main menu"
          hint="Marks this menu as the primary site navigation."
        />
        <Field
          label="Custom CSS classes"
          hint="Applied to the rendered menu element."
        >
          <input
            type="text"
            {...register('settings.className')}
            defaultValue={className}
            placeholder="e.g. main-nav font-semibold"
            className="w-full rounded-md border border-divider bg-card px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
      </Section>
    </div>
  );
}

export const query = `
  query Query($settings: JSON) {
    basicMenuWidget(settings: $settings) {
      menus {
        id
        name
        url
        type
        uuid
        children {
          id
          name
          url
          type
          uuid
        }
      }
      isMain
      className
    }
  }
`;

export const variables = `{
  settings: getWidgetSetting()
}`;
