import { Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useGameStore } from '../../stores/useGameStore';

/** Aviso breve que aparece arriba al centro y se oculta solo. */
export function ToastMessage() {
  const toast = useGameStore((s) => s.toast);
  const dismiss = useGameStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => dismiss(toast.id), 3800);
    return () => window.clearTimeout(id);
  }, [toast, dismiss]);

  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      <Sparkles size={16} aria-hidden />
      <div>
        <strong>{toast.title}</strong>
        {toast.text && <span>{toast.text}</span>}
      </div>
    </div>
  );
}
