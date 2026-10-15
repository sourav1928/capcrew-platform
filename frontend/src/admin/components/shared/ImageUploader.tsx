import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, X } from 'lucide-react';
import { adminApi, errorMessage } from '../../services';

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  /** 1 = a single picture (banner); more = a gallery where the first picture is the main one */
  max?: number;
  label?: string;
}

/** Upload pictures from the computer. The first picture is the main one. */
const ImageUploader: React.FC<Props> = ({ images, onChange, max = 8, label }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const single = max === 1;

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    setBusy(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, Math.max(0, max - (single ? 0 : images.length)))) {
        added.push(await adminApi.uploadImage(file));
      }
      onChange(single ? added.slice(0, 1) : [...images, ...added]);
    } catch (e) {
      setError(errorMessage(e, 'Could not upload that photo.'));
      if (added.length) onChange(single ? added.slice(0, 1) : [...images, ...added]);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const makeMain = (i: number) => onChange([images[i], ...images.filter((_, j) => j !== i)]);
  const remove = (i: number) => onChange(images.filter((_, j) => j !== i));

  return (
    <div>
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={url} className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            {!single && i === 0 && <span className="absolute left-1 top-1 text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">MAIN</span>}
            <button type="button" onClick={() => remove(i)} aria-label="Remove photo"
              className="absolute right-1 top-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5"><X className="w-3.5 h-3.5" /></button>
            {!single && i > 0 && (
              <button type="button" onClick={() => makeMain(i)} title="Make this the main photo"
                className="absolute left-1 bottom-1 bg-white/90 hover:bg-white text-gray-700 rounded px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <Star className="w-3 h-3" /> Main
              </button>
            )}
          </div>
        ))}
        {(single ? images.length === 0 : images.length < max) && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-500 flex flex-col items-center justify-center gap-1 text-xs font-medium disabled:opacity-60">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            {busy ? 'Uploading…' : single ? 'Add picture' : 'Add photos'}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={!single} className="hidden" onChange={(e) => pick(e.target.files)} />
      <p className="text-xs text-gray-400 mt-1">JPG, PNG or WebP, up to 5 MB each.{!single && ' The first photo is shown on the shop.'}</p>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};

export default ImageUploader;
