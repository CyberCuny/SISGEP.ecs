import { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', resolve: null });

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ open: true, message, resolve });
    });
  }, []);

  const handleAnswer = (answer) => {
    state.resolve(answer);
    setState({ open: false, message: '', resolve: null });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="modal-overlay" onClick={() => handleAnswer(false)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Confirmar</h3></div>
            <div className="modal-body" style={{ padding: '1rem 0' }}>{state.message}</div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => handleAnswer(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => handleAnswer(true)}>Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}