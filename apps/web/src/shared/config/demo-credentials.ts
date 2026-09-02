import type { Role } from '../../api/contracts/entities';

/** Visible login reference — mirrors seed users in mocks/data/seed.ts (not imported here). */
export type DemoCredential = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  active: boolean;
  note?: string;
};

export const DEMO_CREDENTIALS: readonly DemoCredential[] = [
  {
    id: 'U-ADMIN',
    name: 'Administrador Demo',
    username: 'admin',
    password: 'demo1234',
    role: 'ADMINISTRATOR',
    active: true,
    note: 'Menú comercial completo',
  },
  {
    id: 'U-LAURA',
    name: 'Laura Pérez',
    username: 'laura',
    password: 'demo1234',
    role: 'SELLER',
    active: true,
    note: 'Inicio, Inventario, Ventas, Clientes',
  },
  {
    id: 'U-CARLOS',
    name: 'Carlos Méndez',
    username: 'carlos',
    password: 'demo1234',
    role: 'MECHANIC',
    active: true,
    note: 'App móvil mecánico',
  },
  {
    id: 'U-PEDRO',
    name: 'Pedro Santana',
    username: 'pedro',
    password: 'demo1234',
    role: 'MECHANIC',
    active: true,
    note: 'Orden de trabajo de demostración OD-DEMO-060 asignada',
  },
] as const;
