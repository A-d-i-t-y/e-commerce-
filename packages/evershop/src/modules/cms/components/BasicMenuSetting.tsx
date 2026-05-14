import Spinner from '@components/admin/Spinner.js';
import { CheckboxField } from '@components/common/form/CheckboxField.js';
import { InputField } from '@components/common/form/InputField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle
} from '@components/common/ui/Dialog.js';
import { Input } from '@components/common/ui/Input.js';
import { Item, ItemContent } from '@components/common/ui/Item.js';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useEffect } from 'react';
import { useWidgetSettings } from '@components/common/page-builder/WidgetContext.js';
import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import CreatableSelect from 'react-select/creatable';
import uniqid from 'uniqid';
import { useQuery } from 'urql';
import './BasicMenuSetting.scss';

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

  const addChildren = (i) => {
    updateItem({
      ...item,
      children: [...item.children, i]
    });
  };

  const updateItemFunc = (i) => {
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
      className="flex justify-between py-2 px-2 bg-white border border-border rounded mb-2"
    >
      <div className="flex justify-start gap-3 items-center">
        <button
          type="button"
          className="cursor-move p-1"
          {...attributes}
          {...listeners}
        >
          <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="#949494"
            width={20}
            height={20}
          >
            <g>
              <path fill="none" d="M0 0h24v24H0z" />
              <path
                fillRule="nonzero"
                d="M14 6h2v2h5a1 1 0 0 1 1 1v7.5L16 13l.036 8.062 2.223-2.15L20.041 22H9a1 1 0 0 1-1-1v-5H6v-2h2V9a1 1 0 0 1 1-1h5V6zm8 11.338V21a1 1 0 0 1-.048.307l-1.96-3.394L22 17.338zM4 14v2H2v-2h2zm0-4v2H2v-2h2zm0-4v2H2V6h2zm0-4v2H2V2h2zm4 0v2H6V2h2zm4 0v2h-2V2h2zm4 0v2h-2V2h2z"
              />
            </g>
          </svg>
        </button>
        <div>{item.name}</div>
      </div>
      <div className="flex justify-end gap-3 items-center">
        <Button
          variant={'outline'}
          onClick={() => {
            setItemInEdit(item);
            setDialogOpen(true);
          }}
          size={'sm'}
        >
          Edit
        </Button>
        {!isChild && (
          <Button
            variant={'outline'}
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
            size={'sm'}
          >
            Add child
          </Button>
        )}
        <Button variant={'destructive'} onClick={() => deleteItem(item)}>
          Delete
        </Button>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`Edit Menu Item: ${itemInEdit.name}`}</DialogTitle>
          </DialogHeader>
          <MenuSettingPopup item={itemInEdit} updateItem={updateItemFunc} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

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
      <Item variant={'outline'}>
        <ItemContent>
          <Spinner width={25} height={25} />
        </ItemContent>
      </Item>
    );
  }
  if (error) {
    return (
      <Item variant={'outline'}>
        <ItemContent>
          <div className="text-destructive">{error.message}</div>
        </ItemContent>
      </Item>
    );
  }

  const groupOptions = [
    {
      label: 'Categories',
      options: data.categories.items.map((i) => ({
        ...i,
        label: i.path.map((p) => p.name).join(' > ')
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

  const handleCreate = (inputValue) => {
    setCurrentItem({
      ...item,
      uuid: inputValue,
      name: inputValue,
      url: inputValue,
      type: 'custom'
    });
  };

  return (
    <div className="grid grid-flow-row gap-5">
      <div>
        <Input
          id="menuName"
          type="text"
          value={currentItem.name}
          placeholder="Menu name"
          onChange={(e) =>
            setCurrentItem({
              ...currentItem,
              name: e.target.value
            })
          }
          className="w-full "
        />
      </div>
      <div>
        <CreatableSelect
          isClearable
          onChange={(newValue: {
            value: string;
            label: string;
            __typename?: string;
          }) => {
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
                : [...groupOptions[0].options, ...groupOptions[1].options].find(
                    (option) => option.value === currentItem.uuid
                  )?.label || ''
          }}
        />
      </div>
      {err && <div className="text-destructive">{err}</div>}
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
  const { register, setValue } = useScopedFormContext();
  const [items, setItems] = React.useState(menus);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleChildDragEnd = (event, parentId) => {
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

  const updateItem = (item) => {
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

  const deleteItem = (item) => {
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

  useEffect(() => {
    setValue('settings.menus', items);
  }, [items]);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((menu) => (
              <div key={menu.id}>
                <SortableMenuItem
                  item={menu}
                  updateItem={updateItem}
                  deleteItem={deleteItem}
                />
                {menu.children && menu.children.length > 0 && (
                  <div className="ml-5 mt-2">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleChildDragEnd(event, menu.id)}
                    >
                      <SortableContext
                        items={menu.children.map((child) => child.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1">
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

      <input
        type="hidden"
        {...register('settings.menus')}
        value={JSON.stringify(items)}
      />
      <div className="space-y-3">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button variant={'outline'} size={'sm'}>
              Add Menu Item
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Menu Item</DialogTitle>
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

        <div>
          <CheckboxField
            label="Is Main Menu?"
            name="settings.isMain"
            defaultValue={isMain}
          />
        </div>
        <div>
          <InputField
            label="Custom CSS classes"
            name="settings.className"
            defaultValue={className}
            helperText="Custom CSS classes for the menu"
          />
        </div>
      </div>
    </>
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
