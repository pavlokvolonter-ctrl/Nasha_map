'use client';

import dynamic from 'next/dynamic';

// WebGL і localStorage є лише в браузері, тому без серверного рендерингу
const App = dynamic(() => import('../src/App'), { ssr: false });

export default function Page() {
  return <App />;
}
