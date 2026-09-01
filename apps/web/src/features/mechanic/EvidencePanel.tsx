import type { MechanicEvidenceKind } from '../../api/contracts/work-orders';
import { Field, Input, Mono, SectionTitle } from '../../shared/ui';

export type EvidencePanelProps = {
  beforePhotos: string[];
  afterPhotos: string[];
  canAdd: boolean;
  disabled?: boolean;
  onAdd: (kind: MechanicEvidenceKind, fileName: string) => void;
};

function PhotoList({ photos }: { photos: string[] }) {
  if (photos.length === 0) {
    return <p className="text-sm text-navy-400">Sin fotos todavía</p>;
  }

  return (
    <ul className="space-y-1 text-sm">
      {photos.map((photo, index) => (
        <li key={`${photo}-${index}`}>
          <Mono>{photo}</Mono>
        </li>
      ))}
    </ul>
  );
}

function EvidenceField({
  kind,
  label,
  photos,
  canAdd,
  disabled,
  onAdd,
}: {
  kind: MechanicEvidenceKind;
  label: string;
  photos: string[];
  canAdd: boolean;
  disabled?: boolean;
  onAdd: (kind: MechanicEvidenceKind, fileName: string) => void;
}) {
  const fieldId = `evidence-${kind.toLowerCase()}`;

  return (
    <div className="space-y-2">
      <Field
        label={label}
        htmlFor={fieldId}
        hint={canAdd ? 'En este prototipo se conserva el nombre del archivo.' : undefined}
      >
        {canAdd ? (
          <Input
            id={fieldId}
            type="file"
            accept="image/*"
            disabled={disabled}
            className="min-h-12"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onAdd(kind, file.name);
                event.target.value = '';
              }
            }}
          />
        ) : (
          <p className="text-xs text-navy-400">Solo el mecánico asignado puede cargar evidencia.</p>
        )}
      </Field>
      <PhotoList photos={photos} />
    </div>
  );
}

export function EvidencePanel({
  beforePhotos,
  afterPhotos,
  canAdd,
  disabled,
  onAdd,
}: EvidencePanelProps) {
  return (
    <section className="space-y-4">
      <SectionTitle
        title="Evidencia"
        subtitle="Completar exige al menos una foto BEFORE y una AFTER"
      />
      <EvidenceField
        kind="BEFORE"
        label="BEFORE"
        photos={beforePhotos}
        canAdd={canAdd}
        disabled={disabled}
        onAdd={onAdd}
      />
      <EvidenceField
        kind="AFTER"
        label="AFTER"
        photos={afterPhotos}
        canAdd={canAdd}
        disabled={disabled}
        onAdd={onAdd}
      />
    </section>
  );
}
