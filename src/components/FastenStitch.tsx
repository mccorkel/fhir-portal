'use client';

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'fasten-stitch': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'public-id': string;
        },
        HTMLElement
      >;
    }
  }
}

export function FastenStitch() {
  useEffect(() => {
    // Add the CSS link to the head
    const link = document.createElement('link');
    link.href = 'https://cdn.fastenhealth.com/connect/v1/fasten-stitch.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      // Cleanup on unmount
      document.head.removeChild(link);
    };
  }, []);

  return (
    <>
      <Script
        src="https://cdn.fastenhealth.com/connect/v1/fasten-stitch.js"
        type="module"
        strategy="afterInteractive"
      />
      <fasten-stitch
        public-id={process.env.NEXT_PUBLIC_FASTEN_PUBLIC_KEY || ''}
      />
    </>
  );
} 