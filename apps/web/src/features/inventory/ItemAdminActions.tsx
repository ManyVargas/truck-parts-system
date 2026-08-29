import { useState } from 'react';

import type { ItemDetailView } from '../../api/contracts/inventory';
import { Button, Field, Info, Input, Modal, Select, Textarea } from '../../shared/ui';

type ItemAdminActionsProps = {
  detail: ItemDetailView;
  isMutating: boolean;
  onSetNoDesarmar: (enabled: boolean) => Promise<string | null>;
  onCorrectCost: (input: {
    acquisitionCostDop?: number;
    costProvenance?: string | null;
    reason: string;
  }) => Promise<string | null>;
  onCorrectBaseline: (input: {
    reason: string;
    markNotApplicable: string[];
  }) => Promise<string | null>;
  onCreateWorkOrder: (input: {
    type: 'DISMANTLING' | 'INSTALLATION';
    destinationParentId?: string;
    notes?: string;
  }) => Promise<string | null>;
};

export function ItemAdminActions({
  detail,
  isMutating,
  onSetNoDesarmar,
  onCorrectCost,
  onCorrectBaseline,
  onCreateWorkOrder,
}: ItemAdminActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [costOpen, setCostOpen] = useState(false);
  const [baselineOpen, setBaselineOpen] = useState(false);
  const [woOpen, setWoOpen] = useState(false);

  const flagOnThisItem = detail.protectedRootId === detail.id;

  return (
    <div className="flex flex-col gap-2">
      {error && !costOpen && !baselineOpen && !woOpen && (
        <Info tone="error" title="No se pudo completar la acción">
          {error}
        </Info>
      )}
      <div className="flex flex-wrap gap-2">
        {detail.isAssembly && (
          <Button
            variant="secondary"
            size="sm"
            disabled={isMutating}
            onClick={async () => {
              setError(await onSetNoDesarmar(!flagOnThisItem));
            }}
          >
            {flagOnThisItem ? 'Quitar No desarmar' : 'Aplicar No desarmar'}
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={isMutating}
          onClick={() => {
            setError(null);
            setWoOpen(true);
          }}
        >
          OT manual
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={isMutating}
          onClick={() => {
            setError(null);
            setCostOpen(true);
          }}
        >
          Corregir costo
        </Button>
        {detail.missingComponents.some((entry) => entry.origin === 'MISSING_AT_RECEIPT') && (
          <Button
            variant="secondary"
            size="sm"
            disabled={isMutating}
            onClick={() => {
              setError(null);
              setBaselineOpen(true);
            }}
          >
            Corregir baseline
          </Button>
        )}
      </div>

      <Modal
        open={costOpen}
        title="Corregir costo de adquisición"
        onClose={() => {
          setError(null);
          setCostOpen(false);
        }}
      >
        <div className="space-y-3">
          {error && (
            <Info tone="error" title="No se pudo corregir el costo">
              {error}
            </Info>
          )}
          <CostForm
            current={detail.acquisitionCostDop}
            provenance={detail.costProvenance}
            disabled={isMutating}
            onCancel={() => {
              setError(null);
              setCostOpen(false);
            }}
            onSubmit={async (input) => {
              const message = await onCorrectCost(input);
              if (message) {
                setError(message);
                return;
              }
              setError(null);
              setCostOpen(false);
            }}
          />
        </div>
      </Modal>

      <Modal
        open={baselineOpen}
        title="Corregir baseline de recepción"
        onClose={() => {
          setError(null);
          setBaselineOpen(false);
        }}
      >
        <div className="space-y-3">
          {error && (
            <Info tone="error" title="No se pudo corregir el baseline">
              {error}
            </Info>
          )}
          <BaselineForm
            missing={detail.missingComponents
              .filter((entry) => entry.origin === 'MISSING_AT_RECEIPT')
              .map((entry) => entry.expectedComponentName)}
            disabled={isMutating}
            onCancel={() => {
              setError(null);
              setBaselineOpen(false);
            }}
            onSubmit={async (input) => {
              const message = await onCorrectBaseline(input);
              if (message) {
                setError(message);
                return;
              }
              setError(null);
              setBaselineOpen(false);
            }}
          />
        </div>
      </Modal>

      <Modal
        open={woOpen}
        title="Crear orden de trabajo manual"
        onClose={() => {
          setError(null);
          setWoOpen(false);
        }}
      >
        <div className="space-y-3">
          {error && (
            <Info tone="error" title="No se pudo crear la orden de trabajo">
              {error}
            </Info>
          )}
          <WorkOrderForm
            pieceId={detail.id}
            relationship={detail.physicalRelationship}
            disabled={isMutating}
            onCancel={() => {
              setError(null);
              setWoOpen(false);
            }}
            onSubmit={async (input) => {
              const message = await onCreateWorkOrder(input);
              if (message) {
                setError(message);
                return;
              }
              setError(null);
              setWoOpen(false);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}

function CostForm({
  current,
  provenance,
  disabled,
  onCancel,
  onSubmit,
}: {
  current?: number;
  provenance?: string;
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    acquisitionCostDop?: number;
    costProvenance?: string | null;
    reason: string;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(current != null ? String(current) : '');
  const [unknown, setUnknown] = useState(current == null);
  const [costProvenance, setCostProvenance] = useState(provenance ?? '');
  const [reason, setReason] = useState('');

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          acquisitionCostDop: unknown || amount.trim() === '' ? undefined : Number(amount),
          costProvenance: costProvenance.trim() || null,
          reason,
        });
      }}
    >
      <label className="flex items-center gap-2 text-sm text-navy">
        <input
          type="checkbox"
          checked={unknown}
          onChange={(event) => setUnknown(event.target.checked)}
        />
        Costo desconocido
      </label>
      {!unknown && (
        <Field label="Costo DOP" htmlFor="cost-dop">
          <Input
            id="cost-dop"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
      )}
      <Field label="Procedencia" htmlFor="cost-provenance">
        <Input
          id="cost-provenance"
          value={costProvenance}
          onChange={(event) => setCostProvenance(event.target.value)}
        />
      </Field>
      <Field label="Motivo" htmlFor="cost-reason">
        <Textarea
          id="cost-reason"
          required
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          Guardar corrección
        </Button>
      </div>
    </form>
  );
}

function BaselineForm({
  missing,
  disabled,
  onCancel,
  onSubmit,
}: {
  missing: string[];
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (input: { reason: string; markNotApplicable: string[] }) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState('');

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({ reason, markNotApplicable: selected });
      }}
    >
      <p className="text-sm text-navy-400">
        Marque faltantes de recepción que en realidad no aplican a esta unidad. No registra piezas
        presentes (eso es WM6) ni sustituye una OT.
      </p>
      {missing.map((name) => (
        <label key={name} className="flex items-center gap-2 text-sm text-navy">
          <input
            type="checkbox"
            checked={selected.includes(name)}
            onChange={(event) => {
              setSelected((current) =>
                event.target.checked
                  ? [...current, name]
                  : current.filter((entry) => entry !== name),
              );
            }}
          />
          {name} → no aplica
        </label>
      ))}
      <Field label="Motivo" htmlFor="baseline-reason">
        <Textarea
          id="baseline-reason"
          required
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          Confirmar corrección
        </Button>
      </div>
    </form>
  );
}

function WorkOrderForm({
  pieceId,
  relationship,
  disabled,
  onCancel,
  onSubmit,
}: {
  pieceId: string;
  relationship: ItemDetailView['physicalRelationship'];
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    type: 'DISMANTLING' | 'INSTALLATION';
    destinationParentId?: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const defaultType = relationship === 'INSTALLED' ? 'DISMANTLING' : 'INSTALLATION';
  const [type, setType] = useState<'DISMANTLING' | 'INSTALLATION'>(defaultType);
  const [destinationParentId, setDestinationParentId] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          type,
          destinationParentId: destinationParentId.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }}
    >
      <p className="text-sm text-navy-400">
        La OT queda pendiente. El desarme no mueve la jerarquía hasta que el mecánico la complete
        (WM10). Pieza: {pieceId}
      </p>
      <Field label="Tipo" htmlFor="wo-type">
        <Select
          id="wo-type"
          value={type}
          onChange={(event) => setType(event.target.value as 'DISMANTLING' | 'INSTALLATION')}
        >
          <option value="DISMANTLING">Desarme</option>
          <option value="INSTALLATION">Instalación</option>
        </Select>
      </Field>
      {type === 'INSTALLATION' && (
        <Field label="Padre destino" htmlFor="wo-dest">
          <Input
            id="wo-dest"
            required
            placeholder="ENG-002"
            value={destinationParentId}
            onChange={(event) => setDestinationParentId(event.target.value)}
          />
        </Field>
      )}
      <Field label="Notas" htmlFor="wo-notes">
        <Textarea
          id="wo-notes"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          Crear OT
        </Button>
      </div>
    </form>
  );
}
