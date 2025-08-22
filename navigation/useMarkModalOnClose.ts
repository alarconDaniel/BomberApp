// navigation/useMarkModalOnClose.ts
import { useEffect } from 'react';
import { markModalClosed } from './ModalTracker';

export function useMarkModalOnClose() {
    useEffect(() => {
        return () => {
            // Se ejecuta al desmontar el modal: gestos, back nativo, etc.
            markModalClosed();
        };
    }, []);
}
