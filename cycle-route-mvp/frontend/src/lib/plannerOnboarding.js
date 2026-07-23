const STORAGE_KEY = 'cyw_planner_onboarding_done'

export function shouldShowPlannerOnboarding() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== '1'
  } catch {
    return true
  }
}

export function markPlannerOnboardingDone() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}
