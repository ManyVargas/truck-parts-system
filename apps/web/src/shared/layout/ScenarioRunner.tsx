import { useState } from 'react';

import { DEMO_SCENARIOS, runDemoScenario } from '../../mocks/demo-controls';
import { Button } from '../ui';

type ScenarioRunnerProps = {
  disabled?: boolean;
  onRun: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
};

/**
 * Dev-only runner for the 12 walkthrough scenarios. Always resets seed and never logs the user in.
 */
export function ScenarioRunner({ disabled, onRun, onError }: ScenarioRunnerProps) {
  const [selectedId, setSelectedId] = useState(DEMO_SCENARIOS[0].id);
  const [isRunning, setIsRunning] = useState(false);

  async function handleRun() {
    setIsRunning(true);
    const result = runDemoScenario(selectedId);
    if (!result.ok) {
      onError(result.error.message);
      setIsRunning(false);
      return;
    }

    const scenario = result.value;
    await onRun(
      `${scenario.title}. Inicie sesión como ${scenario.suggestedUsername} / ${scenario.suggestedPassword}.`,
    );
    setIsRunning(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="demo-scenario">
        Escenario demo
      </label>
      <select
        id="demo-scenario"
        className="max-w-56 rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-xs text-navy"
        value={selectedId}
        disabled={disabled || isRunning}
        onChange={(event) => setSelectedId(Number(event.target.value))}
      >
        {DEMO_SCENARIOS.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.id}. {scenario.title}
          </option>
        ))}
      </select>
      <Button variant="secondary" size="sm" disabled={disabled || isRunning} onClick={() => void handleRun()}>
        {isRunning ? 'Cargando…' : 'Cargar escenario'}
      </Button>
    </div>
  );
}
