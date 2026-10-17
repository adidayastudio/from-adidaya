import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML layout for Expo Web exports.
 * Provides the initial <head> and favicon link tags for static SSR and browser indexing.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        
        {/* Favicon, Apple Touch Icons, and Web App Manifest */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Mobile PWA Standalone Configuration */}
        <meta name="theme-color" content="#007AFF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Forma" />
        <meta name="application-name" content="Forma" />

        {/* CSS Reset */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackgroundStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackgroundStyles = `
body {
  background-color: #000000;
}
input, textarea, [contenteditable="true"], [contenteditable] {
  user-select: text !important;
  -webkit-user-select: text !important;
  -webkit-touch-callout: default !important;
}
/* Prevent iOS Safari / Android auto-zoom on input focus when keyboard appears */
@media screen and (max-width: 768px) {
  input, select, textarea {
    font-size: 16px !important;
  }
}
@media (prefers-color-scheme: light) {
  body {
    background-color: #F2F2F7;
  }
}
`;
