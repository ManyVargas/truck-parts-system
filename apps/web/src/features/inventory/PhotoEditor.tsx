import { Field, Input } from '../../shared/ui';

type PhotoEditorProps = {
  photos: string[];
  onChange: (photos: string[]) => void;
};

export function PhotoEditor({ photos, onChange }: PhotoEditorProps) {
  return (
    <Field
      label="Fotos simuladas"
      htmlFor="registration-photos"
      hint="En este prototipo solo se conserva el nombre del archivo."
    >
      <Input
        id="registration-photos"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          const names = Array.from(event.target.files ?? []).map((file) => file.name);
          onChange(names);
        }}
      />
      {photos.length > 0 && (
        <ul className="mt-1 space-y-1 text-xs text-navy-400" aria-label="Fotos seleccionadas">
          {photos.map((photo) => (
            <li key={photo}>{photo}</li>
          ))}
        </ul>
      )}
    </Field>
  );
}
