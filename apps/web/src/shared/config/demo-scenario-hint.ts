export const LAST_DEMO_SCENARIO_KEY = 'solocamiones.demo.lastScenario';

export type DemoScenarioHint = {
  title: string;
  suggestedUsername: string;
  suggestedPassword: string;
  nextSteps: string;
};

export function readLastDemoScenarioHint(): DemoScenarioHint | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const raw = sessionStorage.getItem(LAST_DEMO_SCENARIO_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as DemoScenarioHint;
    if (!parsed.title || !parsed.suggestedUsername) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastDemoScenarioHint(hint: DemoScenarioHint): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(LAST_DEMO_SCENARIO_KEY, JSON.stringify(hint));
}

export function clearLastDemoScenarioHint(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(LAST_DEMO_SCENARIO_KEY);
}
