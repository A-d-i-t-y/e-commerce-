export default {
  Query: {
    collectionProductsWidget: async (
      root,
      { collection, count, countPerRow, heading, subText }
    ) => ({
      collection,
      count: count ? parseInt(count, 10) : 5,
      countPerRow: countPerRow ? parseInt(countPerRow, 10) : 4,
      // Pass overrides through verbatim. The storefront component falls
      // back to `collection.name` / `collection.description` when these
      // are null or empty strings.
      heading: typeof heading === 'string' ? heading : null,
      subText: typeof subText === 'string' ? subText : null
    })
  }
};
