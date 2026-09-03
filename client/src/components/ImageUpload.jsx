import { useRef, useState } from 'react';
import { UploadCloud, AlertTriangle } from 'lucide-react';
import { api, uploadToCloudinary } from '../api.js';

const MAX_MB = 10;

/**
 * Uploader Cloudinary : le serveur signe la requête, le navigateur envoie le
 * fichier directement à Cloudinary, puis on enregistre l'URL en base.
 */
export default function ImageUpload({ section = 'galerie', onUploaded, label = 'Ajouter une image' }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  async function handleFiles(files) {
    const list = Array.from(files || []).filter(f => f.type.startsWith('image/'));
    if (!list.length) {
      setError('Choisissez un fichier image (JPG, PNG, WebP…)');
      return;
    }
    setError('');
    for (const file of list) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`${file.name} dépasse ${MAX_MB} Mo`);
        continue;
      }
      try {
        setProgress(0);
        const sign = await api.signUpload(section);
        const result = await uploadToCloudinary(file, sign, setProgress);
        const saved = await api.saveMedia({
          public_id: result.public_id,
          secure_url: result.secure_url,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          section,
          alt: file.name.replace(/\.[^.]+$/, '')
        });
        onUploaded?.(saved);
      } catch (err) {
        setError(err.message);
      } finally {
        setProgress(null);
      }
    }
  }

  return (
    <div>
      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      >
        <div className="ic"><UploadCloud size={30} /></div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div className="muted" style={{ fontSize: '.83rem', marginTop: 4 }}>
          Glissez un fichier ici ou cliquez — JPG, PNG, WebP, {MAX_MB} Mo max
        </div>
        {progress !== null && (
          <div className="upload-bar"><span style={{ width: `${progress}%` }} /></div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />

      {error && (
        <div className="alert alert-error" style={{ marginTop: '.8rem', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertTriangle size={17} /> {error}
        </div>
      )}
    </div>
  );
}
