export const APPS_TOUR_SEEN_KEY = 'appsTourSeen_v1'

/**
 * Builds guided tour steps for Apps page.
 *
 * @param {(key: string, params?: any, fallback?: string) => string} t
 * @param {Array<{id?: string, name?: string, description?: string}>} apps
 */
export function buildAppsTourSteps (t, apps = []) {
  const list = Array.isArray(apps) ? apps : []

  return list
    .filter(app => app && typeof app === 'object')
    .map((app, index) => {
      const id = String(app.id || index)
      return {
        id: `apps-${id}`,
        selector: `[data-tour="apps-app-${id}"]`,
        title: app.name || t('AppsTour.DefaultTitle', {}, 'App'),
        body: app.description || '',
        prefer: 'bottom',
      }
    })
    .filter(step => step.body)
}

