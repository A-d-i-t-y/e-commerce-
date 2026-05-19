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
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/ColumnsPreview.js'
    ),
    name: 'Columns',
    description: 'Layout container with 1–4 columns for nesting widgets.',
    category: 'layout',
    icon: 'Columns',
    defaultSettings: {
      // `ratio` is the authoritative layout descriptor; `columnCount` is
      // derived from it and retained for back-compat with widgets stored
      // before the ratio field landed.
      columnCount: 2,
      gap: 16,
      ratio: '1-1',
      background: null,
      padding: 'none',
      contentPosition: 'mc'
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        columnCount: { type: 'integer', minimum: 1, maximum: 4 },
        gap: { type: 'integer', minimum: 0, maximum: 80 },
        // Ratio: dash-separated positive ints, 1–4 parts (e.g. "1-2-1").
        ratio: {
          type: ['string', 'null'],
          pattern: '^[1-6](-[1-6]){0,3}$'
        } as any,
        // Background: a CSS color string or null/empty. Validate loosely —
        // a finer check happens on the storefront when it's applied as a
        // `backgroundColor`.
        background: { type: ['string', 'null'] } as any,
        padding: { type: 'string', enum: ['none', 'sm', 'md', 'lg', 'xl'] },
        contentPosition: {
          type: 'string',
          enum: ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br']
        }
      }
    },
    graphql: {
      typeDefs: `
        type ColumnsSettings {
          columnCount: Int
          gap: Int
          ratio: String
          background: String
          padding: String
          contentPosition: String
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
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/TextBlockPreview.js'
    ),
    name: 'Text block',
    description: 'Add rich text content',
    category: 'content',
    icon: 'Type',
    defaultSettings: {
      className: 'page-width',
      // Empty rows array. Rendering an empty `text-block-widget` div is fine —
      // the user opens Settings on the newly-added widget and authors the
      // first row themselves via the EditorJS form. The previous default was
      // throwaway test data ("aa" / "sssss" inside two pre-built rows) that
      // surfaced verbatim on every freshly-dropped widget.
      text: '[]'
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
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/BasicMenuPreview.js'
    ),
    name: 'Menu',
    description: 'Navigation links',
    category: 'navigation',
    icon: 'Menu',
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
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/BannerPreview.js'
    ),
    defaultSettings: {},
    name: 'Banner',
    description: 'Image with call-to-action',
    category: 'marketing',
    icon: 'Megaphone',
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
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/SlideshowPreview.js'
    ),
    defaultSettings: {},
    name: 'Simple Slideshow',
    description: 'Rotating image carousel',
    category: 'marketing',
    icon: 'Images',
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

  registerWidget({
    type: 'brand_story',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/BrandStorySetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/BrandStory.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/BrandStoryPreview.js'
    ),
    name: 'Brand story',
    description:
      'Editorial block combining an image and long-form brand narrative. Four layout variants.',
    category: 'content',
    icon: 'BookOpen',
    defaultSettings: {
      layout: 'image-left',
      image: null,
      imageAlt: '',
      imageWidth: null,
      imageHeight: null,
      eyebrow: 'OUR STORY',
      heading: 'Made by hand, in small batches',
      body:
        'Three or four sentences of brand narrative — origin, materials, point of view.',
      bodySecondary: 'A second short paragraph if the story needs it.',
      link: { label: 'Read more', url: '/about', newTab: false },
      pullQuote: null,
      imageSize: 50
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        layout: {
          type: 'string',
          enum: ['image-left', 'image-right', 'centered', 'pull-quote']
        },
        image: { type: ['string', 'null'] } as any,
        imageAlt: { type: ['string', 'null'] } as any,
        imageWidth: { type: ['integer', 'null'] } as any,
        imageHeight: { type: ['integer', 'null'] } as any,
        eyebrow: { type: ['string', 'null'] } as any,
        heading: { type: 'string' },
        body: { type: 'string' },
        bodySecondary: { type: ['string', 'null'] } as any,
        link: { type: ['object', 'null'] } as any,
        pullQuote: { type: ['string', 'null'] } as any,
        imageSize: { type: 'integer', enum: [40, 50, 60] }
      }
    },
    graphql: {
      typeDefs: `
        type BrandStorySettings {
          layout: String
          image: String
          imageAlt: String
          imageWidth: Int
          imageHeight: Int
          eyebrow: String
          heading: String
          body: String
          bodySecondary: String
          link: JSON
          pullQuote: String
          imageSize: Int
        }
      `,
      settingsType: 'BrandStorySettings'
    }
  });

  registerWidget({
    type: 'category_mosaic',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/CategoryMosaicSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/CategoryMosaic.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/CategoryMosaicPreview.js'
    ),
    name: 'Category mosaic',
    description:
      'A grid of 3–6 category tiles for the primary "Shop by category" entry point.',
    category: 'commerce',
    icon: 'LayoutGrid',
    defaultSettings: {
      heading: 'Shop by category',
      tiles: [
        {
          id: 'cm-1',
          image: '',
          imageAlt: '',
          imageWidth: null,
          imageHeight: null,
          label: 'Women',
          link: '/',
          newTab: false
        },
        {
          id: 'cm-2',
          image: '',
          imageAlt: '',
          imageWidth: null,
          imageHeight: null,
          label: 'Men',
          link: '/',
          newTab: false
        },
        {
          id: 'cm-3',
          image: '',
          imageAlt: '',
          imageWidth: null,
          imageHeight: null,
          label: 'Accessories',
          link: '/',
          newTab: false
        }
      ],
      columns: null,
      aspect: 'square',
      layout: 'uniform',
      labelPosition: 'overlay'
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        heading: { type: ['string', 'null'] } as any,
        tiles: { type: 'array', items: { type: 'object' } as any },
        columns: { type: ['integer', 'null'] } as any,
        aspect: { type: 'string', enum: ['square', 'portrait', 'landscape'] },
        layout: { type: 'string', enum: ['uniform', 'asymmetric'] },
        labelPosition: { type: 'string', enum: ['overlay', 'below'] }
      }
    },
    graphql: {
      typeDefs: `
        type CategoryMosaicSettings {
          heading: String
          tiles: JSON
          columns: Int
          aspect: String
          layout: String
          labelPosition: String
        }
      `,
      settingsType: 'CategoryMosaicSettings'
    }
  });

  registerWidget({
    type: 'tiered_categories',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/TieredCategoriesSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/TieredCategories.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/TieredCategoriesPreview.js'
    ),
    name: 'Tiered categories',
    description:
      'A two-level nav block: parent category image plus a row of sub-category chips.',
    category: 'commerce',
    icon: 'ListTree',
    defaultSettings: {
      groups: [
        {
          id: 'g-1',
          image: '',
          imageAlt: '',
          imageWidth: null,
          imageHeight: null,
          parent: { label: 'Women', url: '/' },
          subs: [
            { id: 's-1', label: 'Dresses', url: '/' },
            { id: 's-2', label: 'Tops', url: '/' },
            { id: 's-3', label: 'Shop all →', url: '/' }
          ]
        },
        {
          id: 'g-2',
          image: '',
          imageAlt: '',
          imageWidth: null,
          imageHeight: null,
          parent: { label: 'Men', url: '/' },
          subs: [
            { id: 's-4', label: 'Shirts', url: '/' },
            { id: 's-5', label: 'Pants', url: '/' },
            { id: 's-6', label: 'Shop all →', url: '/' }
          ]
        }
      ],
      columns: null,
      imageAspect: 'landscape',
      showParentLink: true
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        groups: { type: 'array', items: { type: 'object' } as any },
        columns: { type: ['integer', 'null'] } as any,
        imageAspect: {
          type: 'string',
          enum: ['square', 'portrait', 'landscape']
        },
        showParentLink: { type: ['boolean', 'null'] } as any
      }
    },
    graphql: {
      typeDefs: `
        type TieredCategoriesSettings {
          groups: JSON
          columns: Int
          imageAspect: String
          showParentLink: Boolean
        }
      `,
      settingsType: 'TieredCategoriesSettings'
    }
  });

  registerWidget({
    type: 'bento_grid',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/BentoGridSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/BentoGrid.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/BentoGridPreview.js'
    ),
    name: 'Bento grid',
    description:
      'An asymmetric mosaic of CTA tiles — one large hero plus 1–4 supporting tiles.',
    category: 'marketing',
    icon: 'LayoutDashboard',
    defaultSettings: {
      tiles: [
        {
          id: 'bt-1',
          size: 'lg',
          image: null,
          imageAlt: '',
          imageWidth: null,
          imageHeight: null,
          backgroundColor: '#d6cebc',
          eyebrow: null,
          heading: 'The Summer Edit',
          body: 'Big card — the headline of the grid.',
          link: { label: 'Shop the edit', url: '/', newTab: false },
          textColor: 'light'
        },
        {
          id: 'bt-2',
          size: 'sm',
          image: null,
          imageAlt: '',
          imageWidth: null,
          imageHeight: null,
          backgroundColor: '#f4f4f4',
          eyebrow: null,
          heading: 'New Arrivals',
          body: null,
          link: { label: 'Shop', url: '/', newTab: false },
          textColor: 'dark'
        },
        {
          id: 'bt-3',
          size: 'sm',
          image: null,
          imageAlt: '',
          imageWidth: null,
          imageHeight: null,
          backgroundColor: '#f4f4f4',
          eyebrow: null,
          heading: 'Best Sellers',
          body: null,
          link: { label: 'Shop', url: '/', newTab: false },
          textColor: 'dark'
        },
        {
          id: 'bt-4',
          size: 'sm',
          image: null,
          imageAlt: '',
          imageWidth: null,
          imageHeight: null,
          backgroundColor: '#f4f4f4',
          eyebrow: null,
          heading: 'Sale',
          body: null,
          link: { label: 'Shop', url: '/', newTab: false },
          textColor: 'dark'
        },
        {
          id: 'bt-5',
          size: 'sm',
          image: null,
          imageAlt: '',
          imageWidth: null,
          imageHeight: null,
          backgroundColor: '#f4f4f4',
          eyebrow: null,
          heading: 'Gift Cards',
          body: null,
          link: { label: 'Buy', url: '/', newTab: false },
          textColor: 'dark'
        }
      ],
      gap: 'md',
      minHeight: 360
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        tiles: { type: 'array', items: { type: 'object' } as any },
        gap: { type: 'string', enum: ['sm', 'md', 'lg'] },
        minHeight: { type: 'integer', minimum: 240, maximum: 640 }
      }
    },
    graphql: {
      typeDefs: `
        type BentoGridSettings {
          tiles: JSON
          gap: String
          minHeight: Int
        }
      `,
      settingsType: 'BentoGridSettings'
    }
  });

  registerWidget({
    type: 'split_feature',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/SplitFeatureSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/SplitFeature.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/SplitFeaturePreview.js'
    ),
    name: 'Split feature',
    description:
      'A 50/50 image + copy promo block with optional CTA. The canonical promo moment widget.',
    category: 'marketing',
    icon: 'PanelsLeftRight',
    defaultSettings: {
      image: '',
      imageAlt: '',
      imagePosition: 'left',
      width: null,
      height: null,
      eyebrow: 'LIMITED EDITION',
      heading: 'Promo headline — one strong line',
      body: 'Two lines of supporting copy describing the promo, drop, or seasonal story.',
      cta: {
        label: 'Shop the drop',
        url: '/',
        kind: 'custom',
        newTab: false,
        style: 'primary'
      },
      verticalAlign: 'center',
      imageFit: 'cover',
      minHeight: 480
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        image: { type: 'string' },
        imageAlt: { type: ['string', 'null'] } as any,
        imagePosition: { type: 'string', enum: ['left', 'right'] },
        // Image dimensions captured at pick time via ImagePickerField's
        // onLoadDimensions. Nullable for back-compat with widgets saved
        // before this field existed.
        width: { type: ['integer', 'null'] } as any,
        height: { type: ['integer', 'null'] } as any,
        eyebrow: { type: ['string', 'null'] } as any,
        heading: { type: 'string' },
        body: { type: ['string', 'null'] } as any,
        cta: { type: ['object', 'null'] } as any,
        verticalAlign: { type: 'string', enum: ['top', 'center', 'bottom'] },
        imageFit: { type: 'string', enum: ['cover', 'contain'] },
        minHeight: { type: 'integer', minimum: 200, maximum: 800 }
      }
    },
    graphql: {
      typeDefs: `
        type SplitFeatureSettings {
          image: String
          imageAlt: String
          imagePosition: String
          width: Int
          height: Int
          eyebrow: String
          heading: String
          body: String
          cta: JSON
          verticalAlign: String
          imageFit: String
          minHeight: Int
        }
      `,
      settingsType: 'SplitFeatureSettings'
    }
  });

  registerWidget({
    type: 'announcement_bar',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/AnnouncementBarSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/AnnouncementBar.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/AnnouncementBarPreview.js'
    ),
    name: 'Announcement bar',
    description:
      'A thin top-of-page bar with one or more rotating announcements.',
    category: 'marketing',
    // Distinct from the `banner` widget which already owns `Megaphone`.
    // `PanelTop` reads as a thin top-of-page bar at palette size.
    icon: 'PanelTop',
    defaultSettings: {
      backgroundColor: '#000000',
      textColor: '#ffffff',
      delay: 4000,
      announcements: [
        {
          id: 'a-1',
          content: 'Free shipping on orders over $50',
          link: null
        }
      ]
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        backgroundColor: { type: 'string' },
        textColor: { type: 'string' },
        delay: { type: 'integer', minimum: 1000 },
        announcements: { type: 'array', items: { type: 'object' } as any }
      }
    },
    graphql: {
      typeDefs: `
        type AnnouncementBarSettings {
          backgroundColor: String
          textColor: String
          delay: Int
          announcements: JSON
        }
      `,
      settingsType: 'AnnouncementBarSettings'
    }
  });

  registerWidget({
    type: 'coupon_block',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/CouponBlockSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/CouponBlock.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/CouponBlockPreview.js'
    ),
    name: 'Coupon block',
    description: 'A promo panel with a copyable discount code and CTA.',
    category: 'marketing',
    icon: 'TicketPercent',
    defaultSettings: {
      eyebrow: 'LIMITED · ENDS SOON',
      heading: 'Take 20% off your order',
      body: 'Use code at checkout',
      code: 'SAVE20',
      ctaLabel: 'Shop now →',
      ctaLink: '/',
      ctaNewTab: false,
      expires: null,
      borderStyle: 'dashed',
      backgroundColor: null
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        eyebrow: { type: ['string', 'null'] } as any,
        heading: { type: 'string', minLength: 1 },
        body: { type: ['string', 'null'] } as any,
        code: { type: 'string', minLength: 1 },
        ctaLabel: { type: ['string', 'null'] } as any,
        ctaLink: { type: 'string' },
        ctaNewTab: { type: ['boolean', 'null'] } as any,
        expires: { type: ['string', 'null'] } as any,
        borderStyle: { type: 'string', enum: ['solid', 'dashed', 'none'] },
        backgroundColor: { type: ['string', 'null'] } as any
      }
    },
    graphql: {
      typeDefs: `
        type CouponBlockSettings {
          eyebrow: String
          heading: String
          body: String
          code: String
          ctaLabel: String
          ctaLink: String
          ctaNewTab: Boolean
          expires: String
          borderStyle: String
          backgroundColor: String
        }
      `,
      settingsType: 'CouponBlockSettings'
    }
  });

  registerWidget({
    type: 'faq_block',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/FaqBlockSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/FaqBlock.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/FaqBlockPreview.js'
    ),
    name: 'FAQ block',
    description:
      'Flexible content block mixing prose sections and accordion FAQ groups.',
    category: 'content',
    icon: 'CircleHelp',
    defaultSettings: {
      heading: 'Frequently asked',
      sections: [
        {
          id: 'sec-1',
          type: 'faq',
          heading: null,
          items: [
            {
              id: 'q-1',
              question: 'How long does shipping take?',
              answer: 'Orders ship within 24 hours.'
            }
          ]
        }
      ],
      maxWidth: 'normal',
      allowMultipleOpen: false
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        heading: { type: ['string', 'null'] } as any,
        sections: { type: 'array', items: { type: 'object' } as any },
        maxWidth: { type: 'string', enum: ['narrow', 'normal', 'wide'] },
        allowMultipleOpen: { type: ['boolean', 'null'] } as any
      }
    },
    graphql: {
      typeDefs: `
        type FaqBlockSettings {
          heading: String
          sections: JSON
          maxWidth: String
          allowMultipleOpen: Boolean
        }
      `,
      settingsType: 'FaqBlockSettings'
    }
  });

  registerWidget({
    type: 'trust_strip',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/TrustStripSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/TrustStrip.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'cms/components/TrustStripPreview.js'
    ),
    name: 'Trust strip',
    description:
      'A row of value-prop items (free shipping, easy returns, etc.) for below-the-hero or above-the-footer reinforcement.',
    category: 'marketing',
    icon: 'BadgeCheck',
    defaultSettings: {
      items: [
        {
          id: 'shipping',
          icon: null,
          title: 'Free shipping',
          description: 'On orders over $50',
          link: null
        },
        {
          id: 'returns',
          icon: null,
          title: 'Easy returns',
          description: '30-day, no questions',
          link: null
        },
        {
          id: 'support',
          icon: null,
          title: '24/7 support',
          description: 'Real humans, anytime',
          link: null
        }
      ],
      columns: null,
      showIcons: true,
      iconSize: 'md',
      alignment: 'center',
      divider: false
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        items: { type: 'array', items: { type: 'object' } as any },
        columns: { type: ['integer', 'null'] } as any,
        showIcons: { type: ['boolean', 'null'] } as any,
        iconSize: { type: 'string', enum: ['sm', 'md', 'lg'] },
        alignment: { type: 'string', enum: ['left', 'center'] },
        divider: { type: ['boolean', 'null'] } as any
      }
    },
    graphql: {
      typeDefs: `
        type TrustStripSettings {
          items: JSON
          columns: Int
          showIcons: Boolean
          iconSize: String
          alignment: String
          divider: Boolean
        }
      `,
      settingsType: 'TrustStripSettings'
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
