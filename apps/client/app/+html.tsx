import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
export default function Html({ children }: PropsWithChildren) {
  return <html lang="en"><head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="description" content="A calm global status indicator. A number out of 10 and one sentence. No doomscrolling, subscriptions, in-app purchases or ads." />
    <link rel="canonical" href="https://newsworthy-indol.vercel.app/" />
    <ScrollViewStyleReset />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Newsworthy" />
<meta property="og:title" content="Newsworthy — A calm global status indicator" />
<meta property="og:description" content="A calm global status indicator. A number out of 10 and one sentence. No doomscrolling, subscriptions, in-app purchases or ads." />
<meta property="og:url" content="https://newsworthy-indol.vercel.app/" />
<meta property="og:image" content="https://newsworthy-indol.vercel.app/social-card.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Newsworthy. A calm global status indicator. Check in, then get on with your day." />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Newsworthy — A calm global status indicator" />
<meta name="twitter:description" content="A calm global status indicator. A number out of 10 and one sentence. No doomscrolling, subscriptions, in-app purchases or ads." />
<meta name="twitter:image" content="https://newsworthy-indol.vercel.app/social-card.png" />
<meta name="twitter:image:alt" content="Newsworthy. A calm global status indicator. Check in, then get on with your day." />

    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Newsworthy', url: 'https://newsworthy-indol.vercel.app/', description: 'A calm global status indicator: a number out of 10 and one sentence explaining why.' }) }} />
  </head><body><main style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>{children}</main></body></html>;
}
