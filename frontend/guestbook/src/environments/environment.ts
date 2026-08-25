// Production environment configuration. `apiBaseUrl` points at the Front Door
// endpoint that fronts the multi-region guestbook API. No trailing slash — the
// API client composes paths as `${apiBaseUrl}/greet`.
export const environment = {
  production: true,
  apiBaseUrl: 'https://guestbook-q5wmb35uerjzy-grfyhjbkgegrfscm.z01.azurefd.net',
};
