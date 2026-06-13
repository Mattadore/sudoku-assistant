import { Html, Head, Main, NextScript } from 'next/document'
import { THEMES, themeToCSSVars } from '../themes'

// Pre-compute CSS var maps for all themes at build time.
const THEME_VARS: Record<string, Record<string, string>> = {}
for (const [id, theme] of Object.entries(THEMES)) {
  THEME_VARS[id] = themeToCSSVars(theme)
}

// Runs synchronously before React hydrates (and before first paint) to prevent
// a flash of Classic theme when a different theme was saved in localStorage.
// Sets --sudoku-* CSS custom properties on <html> so they cascade everywhere.
const INIT_SCRIPT = `(function(){try{
var id=localStorage.themeId||'classic';
var T=${JSON.stringify(THEME_VARS)};
var t=T[id];if(!t)return;
var s=document.documentElement.style;
for(var k in t)s.setProperty(k,t[k]);
}catch(e){}})()`

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
