import { useState, useEffect, useRef } from 'react';

/**
 * Debounced auto-save hook.
 *
 * @param {*}        value     – the value to watch
 * @param {Function} saveFn    – called with `value` when the debounce fires
 * @param {number}   delay     – ms to wait after last change (default 800)
 * @param {boolean}  skip      – set true to disable (e.g. on initial load)
 *
 * Returns: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
 */
const useAutoSave = (value, saveFn, delay = 800, skip = false) => {
  const [saveState, setSaveState] = useState('idle');
  const isFirstRender = useRef(true);
  const timerRef = useRef(null);

  // Keep a ref to the latest value so the unmount flush can access it
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; });

  // Flush pending save on unmount
  const saveFnRef = useRef(saveFn);
  useEffect(() => { saveFnRef.current = saveFn; });
  const pendingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        try { saveFnRef.current(valueRef.current); } catch { /* ignore */ }
      }
    };
  }, []); // intentionally empty — runs only on unmount

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (skip) return;

    setSaveState('pending');
    pendingRef.current = true;
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      pendingRef.current = false;
      setSaveState('saving');
      try {
        await saveFn(value);
        setSaveState('saved');
        // Reset to idle after 2 s so the indicator fades out
        setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setSaveState('error');
      }
    }, delay);

    return () => clearTimeout(timerRef.current);
  }, [value]); // intentionally omitting saveFn/delay/skip from deps to avoid re-triggering

  return saveState;
};

export default useAutoSave;
