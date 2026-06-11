import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request) => {
  setPageMetaInfo(request, {
    title: 'Core Shipping Methods',
    description: 'Manage Core provider methods and per-zone rates'
  });
};
