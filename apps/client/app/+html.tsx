import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
export default function Html({ children }: PropsWithChildren) {
  return <html lang="en"><head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="description" content="World news, rated by significance." />
    <link rel="canonical" href="https://newsworthy-indol.vercel.app/" />
    <ScrollViewStyleReset />
    <link rel="stylesheet" href="/levels.css" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Newsworthy" />
<meta property="og:title" content="Newsworthy" />
<meta property="og:description" content="World news, rated by significance." />
<meta property="og:url" content="https://newsworthy-indol.vercel.app/" />
<meta property="og:image" content="https://newsworthy-indol.vercel.app/social-card.png?v=2" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Newsworthy wordmark and dash on a pale mint background." />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Newsworthy" />
<meta name="twitter:description" content="World news, rated by significance." />
<meta name="twitter:image" content="https://newsworthy-indol.vercel.app/social-card.png?v=2" />
<meta name="twitter:image:alt" content="Newsworthy wordmark and dash on a pale mint background." />

    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Newsworthy', url: 'https://newsworthy-indol.vercel.app/', description: 'World news, rated by significance.' }) }} />
  </head><body><main style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>{children}</main></body></html>;
}
