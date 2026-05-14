import { getRoutes } from '../../../../../lib/router/Router.js';

export default {
  Query: {
    routes: () => {
      const routes = getRoutes();
      return routes.filter((route) => route.name);
    },
    route: (_, { id }) => {
      const routes = getRoutes();
      return routes.find((route) => route.id === id) || null;
    }
  },
  Route: {
    methods: (route) => route?.method ?? [],
    // Default to false so programmatically-registered routes (which skip
    // `parseRoute` and never see the `route.json` `editable` field) still
    // satisfy the non-nullable schema field.
    editableInPageBuilder: (route) => route?.editable === true,
    // Populated by per-module resolvers (e.g. cms) for routes whose
    // URL pattern resolves to a single entity. Default null.
    assignedEntity: () => null
  }
};
