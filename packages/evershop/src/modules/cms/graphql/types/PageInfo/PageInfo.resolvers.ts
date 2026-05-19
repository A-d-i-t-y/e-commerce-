import { access } from 'fs/promises';
import path from 'path';
import { select } from '@evershop/postgres-query-builder';
import { CONSTANTS } from '../../../../../lib/helpers.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';
import { get } from '../../../../../lib/util/get.js';
import { getBaseUrl } from '../../../../../lib/util/getBaseUrl.js';
import { getConfig } from '../../../../../lib/util/getConfig.js';
import { getValueSync } from '../../../../../lib/util/registry.js';
import { OgInfo } from '../../../../../types/pageMeta.js';
import { getSetting } from '../../../../setting/services/setting.js';

export default {
  Query: {
    pageInfo: async (root, args, context) => ({
      url: get(context, 'currentUrl'),
      title: get(
        context,
        'pageInfo.title',
        await getSetting('storeName', 'Evershop')
      ),
      description: get(context, 'pageInfo.description', ''),
      keywords: get(context, 'pageInfo.keywords', []),
      canonicalUrl: get(
        context,
        'pageInfo.canonicalUrl',
        get(context, 'currentUrl')
      ),
      favicon: async () => {
        // Check if a file named favicon.ico exists in the public folder
        try {
          await access(path.resolve(CONSTANTS.PUBLICPATH, 'favicon.ico'));
          return getBaseUrl() + '/assets/favicon.ico';
        } catch (error) {
          return null;
        }
      }
    })
  },
  PageInfo: {
    breadcrumbs: async (root, args, context) => {
      // Strip query string first — in page-builder preview the URL carries
      // `?changeset=…&ajax=true`, so `originalUrl === '/'` would never match
      // and the homepage would render a breadcrumb that production doesn't.
      const urlPath = (context.originalUrl ?? '').split('?')[0];
      // Check if the current page is home page
      if (urlPath === '/' || urlPath === '') {
        return [];
      }
      // Get the current path
      const path = urlPath.replace(/^\/|\/$/g, '').replace(/\./g, '');

      // Check if the path is existed in the url_rewrite table
      const rewriteRule = await select()
        .from('url_rewrite')
        .where('request_path', '=', `/${path}`)
        .load(context.pool);
      if (!rewriteRule) {
        return [
          {
            title: translate('Home'),
            url: '/'
          },
          {
            title: get(context, 'pageInfo.title', ''),
            url: get(context, 'currentUrl')
          }
        ];
      } else {
        // Split the target path and remove the last element
        const paths = rewriteRule.request_path.split('/');
        paths.pop();
        // Each element is represented for a category (url_key)
        // Build the breadrumbs
        const breadcrumbs = [
          {
            title: translate('Home'),
            url: '/'
          }
        ];
        for (let i = 0; i < paths.length; i += 1) {
          if (paths[i] === '') {
            continue;
          }
          const urlKey = paths[i];
          const categoryQuery = select().from('category');
          categoryQuery
            .leftJoin('category_description')
            .on(
              'category_description.category_description_category_id',
              '=',
              'category.category_id'
            );
          categoryQuery.where('category_description.url_key', '=', urlKey);
          const category = await categoryQuery.load(context.pool);
          if (category) {
            breadcrumbs.push({
              title: category.name,
              url: `${paths.slice(0, i + 1).join('/')}`
            });
          } else {
            continue;
          }
        }

        breadcrumbs.push({
          title: get(context, 'pageInfo.title', ''),
          url: get(context, 'currentUrl')
        });

        return breadcrumbs;
      }
    },
    ogInfo: async (root, args, context): Promise<OgInfo> => {
      let logo = getConfig('themeConfig.logo.src');
      const baseUrl = getBaseUrl();
      // Check if logo is a full URL
      // If logo is not set, use default /images/logo.png
      if (logo && !logo.startsWith('http')) {
        // If logo is a relative path, convert to absolute URL
        logo = `${baseUrl}${logo}`;
      }
      const image = get(
        context,
        'pageInfo.ogInfo.image',
        logo ? `${baseUrl}/images?src=${logo}&w=1200&q=80&h=675&f=png` : ''
      );

      return getValueSync<OgInfo>(
        'ogInfo',
        {
          title: get(context, 'pageInfo.ogTitle', root.title),
          description: get(
            context,
            'pageInfo.ogInfo.description',
            root.description
          ),
          image: get(
            context,
            'pageInfo.ogInfo.image',
            image ? image : root.image
          ),
          url: get(context, 'pageInfo.ogInfo.url', root.url),
          siteName: get(context, 'pageInfo.ogInfo.siteName', root.siteName),
          type: get(context, 'pageInfo.ogInfo.type', 'website'),
          locale: get(context, 'pageInfo.ogInfo.locale', root.locale),
          twitterCard: get(context, 'pageInfo.ogInfo.twitterCard', 'summary'),
          twitterSite: get(
            context,
            'pageInfo.ogInfo.twitterSite',
            await getSetting('storeName', 'Evershop')
          ),
          twitterCreator: get(
            context,
            'pageInfo.ogInfo.twitterCreator',
            await getSetting('storeName', 'Evershop')
          ),
          twitterImage: get(context, 'pageInfo.ogInfo.twitterImage', image)
        },
        context
      );
    }
  }
};
