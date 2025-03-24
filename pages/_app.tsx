import type { AppProps } from 'next/app';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* Add global style to fix ScrollArea display issues */}
      <style jsx global>{`
        [data-radix-scroll-area-viewport] {
          display: block !important;
          min-width: auto !important;
          width: 100% !important;
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
} 