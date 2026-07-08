'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      {children}
    </div>,
    document.body
  );
}
