'use client';

import { useEffect } from 'react';

const SCRIPT = `(function(){try{if(window.__bannquetLoadEnter)return;window.__bannquetLoadEnter=1;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;var path=location.pathname;if(path==='/')return;document.documentElement.classList.add(path==='/map'?'load-enter-fade':'load-enter');}catch(e){}})();`;

export function clearLoadEntrance() {
  document.documentElement.classList.remove('load-enter', 'load-enter-fade');
}

export function LoadEntrance() {
  useEffect(() => {
    const timer = window.setTimeout(clearLoadEntrance, 320);
    return () => window.clearTimeout(timer);
  }, []);

  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
