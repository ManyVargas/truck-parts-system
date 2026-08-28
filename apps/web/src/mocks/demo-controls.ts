import { err, ok, type Result } from '../shared/auth/types';
import { clearSession } from './session';
import { resetMockState } from './state';

/** Demo scenario metadata — full runner logic ships in WM12. */
export type DemoScenario = {
  id: number;
  slug: string;
  title: string;
  description: string;
  suggestedUsername: string;
};

/**
 * Twelve walkthrough scenarios documented in plan WM12.
 * Reset + apply logic is added when recovery and POS flows exist.
 */
export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: 1,
    slug: 'installed-piece-sale',
    title: 'Venta de pieza instalada',
    description: 'Confirmar venta con pieza instalada y OT de desarme automática.',
    suggestedUsername: 'laura',
  },
  {
    id: 2,
    slug: 'manual-dismantling',
    title: 'Desarme manual',
    description: 'Crear OT de desarme sin venta (admin).',
    suggestedUsername: 'admin',
  },
  {
    id: 3,
    slug: 'installation',
    title: 'Instalación de pieza',
    description: 'OT de instalación y jerarquía física.',
    suggestedUsername: 'admin',
  },
  {
    id: 4,
    slug: 'initial-motor-registration',
    title: 'Registro inicial de motor',
    description: 'Alta de ensamblaje con baseline de componentes.',
    suggestedUsername: 'admin',
  },
  {
    id: 5,
    slug: 'full-assembly-sale',
    title: 'Venta de ensamblaje completo',
    description: 'Vender un ensamblaje completo desde POS.',
    suggestedUsername: 'laura',
  },
  {
    id: 6,
    slug: 'no-desarmar-blocked',
    title: 'Venta bloqueada por No desarmar',
    description: 'Intento de línea suelta bajo ENG-003.',
    suggestedUsername: 'laura',
  },
  {
    id: 7,
    slug: 'partial-payments',
    title: 'Pago parcial y múltiple',
    description: 'Registrar pagos parciales en factura confirmada.',
    suggestedUsername: 'laura',
  },
  {
    id: 8,
    slug: 'cancel-pending-wo',
    title: 'Cancelación con OT Pending',
    description: 'Cancelar factura con OT aún pendiente.',
    suggestedUsername: 'admin',
  },
  {
    id: 9,
    slug: 'cancel-in-progress-wo',
    title: 'Cancelación con OT In Progress',
    description: 'Cancelar factura con OT en proceso.',
    suggestedUsername: 'admin',
  },
  {
    id: 10,
    slug: 'cancel-after-dismantling',
    title: 'Cancelación después de desarme Completed',
    description: 'Rama de cancelación post-desarme.',
    suggestedUsername: 'admin',
  },
  {
    id: 11,
    slug: 'usd-profitability-pending',
    title: 'Venta USD con rentabilidad pendiente',
    description: 'FAC-000096 hasta toggle FX y reintento.',
    suggestedUsername: 'admin',
  },
  {
    id: 12,
    slug: 'admin-recovery',
    title: 'Recuperación administrativa',
    description: 'Liberar reservas y reintentar cálculos.',
    suggestedUsername: 'admin',
  },
] as const;

const DEV_ONLY_MESSAGE = 'Los controles demo solo están disponibles en modo desarrollo.';

function isDemoControlsEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_CONTROLS === 'true';
}

/** Restores seed data and clears the mock session. Does not bypass login. */
export function resetDemoData(): Result<void> {
  if (!isDemoControlsEnabled()) {
    return err({ code: 'FORBIDDEN', message: DEV_ONLY_MESSAGE });
  }

  resetMockState();
  clearSession();
  return ok(undefined);
}

/** Placeholder for WM12 scenario runner — resets data only for now. */
export function runDemoScenario(scenarioId: number): Result<DemoScenario> {
  if (!isDemoControlsEnabled()) {
    return err({ code: 'FORBIDDEN', message: DEV_ONLY_MESSAGE });
  }

  const scenario = DEMO_SCENARIOS.find((entry) => entry.id === scenarioId);

  if (!scenario) {
    return err({ code: 'NOT_FOUND', message: 'Escenario demo no encontrado' });
  }

  const resetResult = resetDemoData();
  if (!resetResult.ok) {
    return resetResult;
  }

  return ok(scenario);
}
