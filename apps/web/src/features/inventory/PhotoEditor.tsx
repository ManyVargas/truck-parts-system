import { Field, Input } from '../../shared/ui';

type PhotoEditorProps = {
  photos: string[];
  onChange: (photos: string[]) => void;
  inputId?: string;
};

export function PhotoEditor({ photos, onChange, inputId = 'item-photos' }: PhotoEditorProps) {
  return (
    <Field
      label="Fotos (opcional)"
      htmlFor={inputId}
      hint="En este prototipo se guarda el nombre del archivo. La primera foto es la principal."
    >
      <Input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          const names = Array.from(event.target.files ?? []).map((file) => file.name);
          onChange([...photos, ...names]);
          event.target.value = '';
        }}
      />
      {photos.length > 0 && (
        <ul className="mt-1 space-y-1 text-xs text-navy-400" aria-label="Fotos seleccionadas">
          {photos.map((photo, index) => (
            <li key={`${photo}-${index}`} className="flex items-center justify-between gap-2">
              <span>
                {index === 0 ? 'Principal · ' : ''}
                {photo}
              </span>
              <button
                type="button"
                className="text-brand hover:underline"
                onClick={() => onChange(photos.filter((_, photoIndex) => photoIndex !== index))}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
