import path from 'path';
import { JSONSchemaType } from 'ajv';
import config from 'config';
import { CONSTANTS } from '../../lib/helpers.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { merge } from '../../lib/util/merge.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerWidget } from '../../lib/widget/widgetManager.js';
import { registerDefaultPageCollectionFilters } from '../../modules/cms/services/registerDefaultPageCollectionFilters.js';
import { registerDefaultWidgetCollectionFilters } from '../../modules/cms/services/registerDefaultWidgetCollectionFilters.js';
import { Route } from '../../types/route.js';

export default () => {
  addProcessor('configurationSchema', (schema) => {
    merge(schema, {
      properties: {
        themeConfig: {
          type: 'object',
          properties: {
            logo: {
              type: 'object',
              properties: {
                alt: {
                  type: 'string'
                },
                src: {
                  type: 'string',
                  format: 'uri-reference'
                },
                width: {
                  type: 'integer'
                },
                height: {
                  type: 'integer'
                }
              }
            },
            headTags: {
              type: 'object',
              properties: {
                links: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      rel: {
                        type: 'string'
                      },
                      href: {
                        type: 'string',
                        format: 'uri-reference'
                      }
                    },
                    required: ['rel', 'href']
                  }
                },
                metas: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string'
                      },
                      content: {
                        type: 'string'
                      }
                    },
                    required: ['name', 'content']
                  }
                },
                scripts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      src: {
                        type: 'string',
                        format: 'uri-reference'
                      },
                      type: {
                        type: 'string'
                      },
                      async: {
                        type: 'boolean'
                      },
                      defer: {
                        type: 'boolean'
                      },
                      crossorigin: {
                        type: 'string'
                      },
                      integrity: {
                        type: 'string'
                      },
                      noModule: {
                        type: 'string'
                      },
                      nonce: {
                        type: 'string'
                      }
                    },
                    required: ['src']
                  }
                },
                bases: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      href: {
                        type: 'string',
                        format: 'uri-reference'
                      }
                    },
                    required: ['href']
                  }
                }
              }
            }
          }
        },
        system: {
          type: 'object',
          properties: {
            file_storage: {
              type: 'string',
              enum: ['local']
            }
          }
        }
      }
    });
    return schema;
  });

  const defaultThemeConfig = {
    logo: {
      alt: undefined,
      src: undefined,
      width: undefined,
      height: undefined
    },
    headTags: {
      links: [],
      metas: [],
      scripts: [],
      bases: []
    },
    copyRight: `© 2022 Evershop. All Rights Reserved.`
  };
  config.util.setModuleDefaults('themeConfig', defaultThemeConfig);

  // Set the default file storage to local
  config.util.setModuleDefaults('system', {
    file_storage: 'local'
  });

  registerWidget({
    type: 'columns',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/ColumnsSetting.js'
    ),
    component: path.resolve(CONSTANTS.MODULESPATH, 'cms/components/Columns.js'),
    name: 'Columns',
    description: 'Layout container with 1–4 columns for nesting widgets.',
    category: 'layout',
    defaultSettings: {
      columnCount: 2,
      gap: 16
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        columnCount: { type: 'integer', minimum: 1, maximum: 4 },
        gap: { type: 'integer', minimum: 0, maximum: 80 }
      }
    },
    graphql: {
      typeDefs: `
        type ColumnsSettings {
          columnCount: Int
          gap: Int
        }
      `,
      settingsType: 'ColumnsSettings'
    }
  });

  registerWidget({
    type: 'text_block',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/TextBlockSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/TextBlock.js'
    ),
    name: 'Text block',
    description: 'Add rich text content',
    category: 'content',
    defaultSettings: {
      className: 'page-width',
      text: '[{"id":"r__1a98475e-b5ad-409b-9fc0-67266b1ad3f1","size":1,"columns":[{"id":"c__d8a6109d-a446-48b1-9c19-00465eddc437","size":1,"data":{"time":1743828737838,"blocks":[{"id":"2emg5H3-8L","type":"paragraph","data":{"text":"aa"}}],"version":"2.30.6"}}]},{"id":"r__628fa8a7-6291-4898-bad6-f13ce52dda0c","size":1,"columns":[{"id":"c__28301f27-f200-427c-afd9-91c960d76823","size":1,"data":{"time":1753251768195,"blocks":[{"id":"qDg_SvTOVE","type":"paragraph","data":{"text":"sssss"}}],"version":"2.31.0-rc.7"}}]}]'
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        text: { type: 'string' },
        className: { type: 'string' }
      }
    },
    graphql: {
      typeDefs: `
        type TextBlockSettings {
          text: String
          className: String
        }
      `,
      settingsType: 'TextBlockSettings'
    }
  });

  registerWidget({
    type: 'basic_menu',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/BasicMenuSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/BasicMenu.js'
    ),
    name: 'Menu',
    description: 'Navigation links',
    category: 'navigation',
    defaultSettings: {},
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        // Menu items are deeply nested with a recursive shape; allow any
        // object payload and rely on the widget's own resolver to coerce.
        menus: { type: 'array', items: { type: 'object' } as any },
        isMain: { type: 'boolean' },
        className: { type: 'string' }
      }
    },
    graphql: {
      typeDefs: `
        type BasicMenuSettings {
          menus: JSON
          isMain: Boolean
          className: String
        }
      `,
      settingsType: 'BasicMenuSettings'
    }
  });

  registerWidget({
    type: 'banner',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/BannerSetting.js'
    ),
    component: path.resolve(CONSTANTS.MODULESPATH, 'cms/components/Banner.js'),
    defaultSettings: {},
    name: 'Banner',
    description: 'Image with call-to-action',
    category: 'marketing',
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        alt: { type: 'string' },
        src: { type: 'string' },
        link: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
        alignment: { type: 'string' }
      }
    },
    graphql: {
      typeDefs: `
        type BannerSettings {
          alt: String
          src: String
          link: String
          width: Float
          height: Float
          alignment: String
        }
      `,
      settingsType: 'BannerSettings'
    }
  });

  registerWidget({
    type: 'simple_slider',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/SlideshowSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/Slideshow.js'
    ),
    defaultSettings: {},
    name: 'Simple Slideshow',
    description: 'Rotating image carousel',
    category: 'marketing',
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        // Boolean flags are nullable in existing data — accept both.
        dots: { type: ['boolean', 'null'] } as any,
        arrows: { type: ['boolean', 'null'] } as any,
        autoplay: { type: ['boolean', 'null'] } as any,
        fullWidth: { type: ['boolean', 'null'] } as any,
        autoplaySpeed: { type: 'integer' },
        widthValue: { type: 'number' },
        heightValue: { type: 'number' },
        heightType: { type: 'string' },
        slides: { type: 'array', items: { type: 'object' } as any }
      }
    },
    graphql: {
      typeDefs: `
        type SimpleSliderSettings {
          dots: Boolean
          arrows: Boolean
          autoplay: Boolean
          autoplaySpeed: Int
          fullWidth: Boolean
          widthValue: Float
          heightValue: Float
          heightType: String
          slides: JSON
        }
      `,
      settingsType: 'SimpleSliderSettings'
    }
  });

  // Reigtering the default filters for cms page collection
  addProcessor(
    'cmsPageCollectionFilters',
    registerDefaultPageCollectionFilters,
    1
  );
  addProcessor<Array<any>>(
    'cmsPageCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Reigtering the default filters for widget collection
  addProcessor<Array<any>>(
    'widgetCollectionFilters',
    registerDefaultWidgetCollectionFilters,
    1
  );
  addProcessor<Array<any>>(
    'widgetCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  addProcessor('payloadSchema', function (schema: JSONSchemaType<any>) {
    const ctx = this as { route: Route };
    const route = ctx.route;
    if (route.id === 'createWidget' || route.id === 'updateWidget') {
      schema.properties.settings = {
        properties: {
          text: {
            type: 'string',
            skipEscape: true
          }
        }
      };
    }
    return schema;
  });
};
