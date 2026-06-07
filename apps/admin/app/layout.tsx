import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rydalux Admin',
  description: 'Operations dashboard for Rydalux'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  // Catch runtime errors
                  window.addEventListener('error', function(event) {
                    if (
                      event.message && (
                        event.message.indexOf('addListener') !== -1 ||
                        event.message.indexOf('Cannot read properties of undefined') !== -1
                      )
                    ) {
                      console.warn('Suppressed third-party/extension runtime error:', event.message);
                      event.stopImmediatePropagation();
                      event.preventDefault();
                    }
                  }, true);

                  // Catch unhandled promise rejections
                  window.addEventListener('unhandledrejection', function(event) {
                    if (
                      event.reason &&
                      event.reason.message &&
                      event.reason.message.indexOf('addListener') !== -1
                    ) {
                      console.warn('Suppressed third-party/extension promise rejection:', event.reason.message);
                      event.stopImmediatePropagation();
                      event.preventDefault();
                    }
                  }, true);
                }
              })();
            `
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
