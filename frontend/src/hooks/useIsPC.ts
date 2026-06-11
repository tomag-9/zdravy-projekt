import { useEffect, useState } from 'react';

export function useIsPC(): boolean {
  const [isPC, setIsPC] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsPC(e.matches);
    mq.addEventListener('change', handler);
    setIsPC(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isPC;
}
