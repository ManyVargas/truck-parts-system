import { useEffect, useState } from 'react';

import type { ItemCondition } from '../../api/contracts/entities';
import type { ItemDetailView, UpdateItemDetailsInput } from '../../api/contracts/inventory';
import { Button, Field, Info, Input, Modal, Select, Textarea } from '../../shared/ui';
import { ITEM_CONDITIONS } from './item-conditions';
import { PhotoEditor } from './PhotoEditor';
import { parseAttributeLines } from './registration-enrichment';

function attributesToText(attributes: Record<string, string> | undefined): string {
  return Object.entries(attributes ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

export function ItemDetailsEditor({
  detail,
  isMutating,
  onSave,
}: {
  detail: ItemDetailView;
  isMutating: boolean;
  onSave: (input: Omit<UpdateItemDetailsInput, 'itemId'>) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(detail.name);
  const [brand, setBrand] = useState(detail.brand ?? '');
  const [model, setModel] = useState(detail.model ?? '');
  const [serial, setSerial] = useState(detail.serial ?? '');
  const [partNumber, setPartNumber] = useState(detail.partNumber ?? '');
  const [condition, setCondition] = useState<ItemCondition>(detail.condition);
  const [location, setLocation] = useState(detail.ownLocation ?? '');
  const [notes, setNotes] = useState(detail.notes ?? '');
  const [attributesText, setAttributesText] = useState(attributesToText(detail.attributes));
  const [photos, setPhotos] = useState(detail.photos);
  const locationEditable = detail.physicalRelationship === 'INDEPENDENT';

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setName(detail.name);
    setBrand(detail.brand ?? '');
    setModel(detail.model ?? '');
    setSerial(detail.serial ?? '');
    setPartNumber(detail.partNumber ?? '');
    setCondition(detail.condition);
    setLocation(detail.ownLocation ?? '');
    setNotes(detail.notes ?? '');
    setAttributesText(attributesToText(detail.attributes));
    setPhotos(detail.photos);
  }, [open, detail]);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        disabled={isMutating}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Editar datos
      </Button>
      <Modal
        open={open}
        title={`Editar ${detail.id}`}
        onClose={() => {
          setError(null);
          setOpen(false);
        }}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              const message = await onSave({
                name,
                brand,
                model,
                serial,
                partNumber,
                condition,
                location: locationEditable ? location : undefined,
                notes,
                attributes: parseAttributeLines(attributesText) ?? {},
                photos,
              });
              if (message) {
                setError(message);
                return;
              }
              setError(null);
              setOpen(false);
            })();
          }}
        >
          {error && (
            <Info tone="error" title="No se pudieron guardar los datos">
              {error}
            </Info>
          )}
          <p className="text-sm text-navy-400">
            Corrige nombre, fotos, ubicación y otros datos descriptivos. El código interno, la
            categoría, el costo y la jerarquía no cambian por aquí y las facturas ya confirmadas
            conservan su descripción original.
          </p>
          <Field label="Nombre" htmlFor="edit-item-name">
            <Input
              id="edit-item-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Condición" htmlFor="edit-item-condition">
            <Select
              id="edit-item-condition"
              value={condition}
              onChange={(event) => setCondition(event.target.value as ItemCondition)}
            >
              {ITEM_CONDITIONS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Marca" htmlFor="edit-item-brand">
              <Input
                id="edit-item-brand"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
              />
            </Field>
            <Field label="Modelo" htmlFor="edit-item-model">
              <Input
                id="edit-item-model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              />
            </Field>
            <Field label="Serial" htmlFor="edit-item-serial">
              <Input
                id="edit-item-serial"
                value={serial}
                onChange={(event) => setSerial(event.target.value)}
              />
            </Field>
            <Field label="Número de parte" htmlFor="edit-item-part">
              <Input
                id="edit-item-part"
                value={partNumber}
                onChange={(event) => setPartNumber(event.target.value)}
              />
            </Field>
          </div>
          {locationEditable ? (
            <Field label="Ubicación" htmlFor="edit-item-location">
              <Input
                id="edit-item-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </Field>
          ) : (
            <p className="text-sm text-navy-400">
              Ubicación efectiva heredada: {detail.effectiveLocation ?? 'Pendiente'}. Edite la pieza
              independiente raíz para mover el conjunto.
            </p>
          )}
          <Field
            label="Atributos"
            htmlFor="edit-item-attributes"
            hint="Uno por línea, por ejemplo voltaje: 24V."
          >
            <Textarea
              id="edit-item-attributes"
              rows={3}
              value={attributesText}
              onChange={(event) => setAttributesText(event.target.value)}
            />
          </Field>
          <Field label="Notas" htmlFor="edit-item-notes">
            <Textarea
              id="edit-item-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          <PhotoEditor photos={photos} onChange={setPhotos} inputId="edit-item-photos" />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setError(null);
                setOpen(false);
              }}
              disabled={isMutating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isMutating}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
