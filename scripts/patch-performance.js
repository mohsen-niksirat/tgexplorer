// Performance pass for the Explore grid.
//
// 1) Fewer cards in the first page: the initial render cost ~1.1 s of
//    main-thread time for 24 cards, and every card pulls an image from
//    Telegram's CDN, so they all compete for the throttled connection.
// 2) The first card's image is the LCP element - it gets fetchpriority so
//    it is fetched before the other images.
// 3) The Telegram WebApp script is loaded dynamically after the app is
//    interactive: it is only needed inside Telegram, and on a slow
//    connection it competes with the data files for the connections.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

const REPLACEMENTS = [
  // 1) a smaller first page
  ['const EXPLORE_PAGE=24;', 'const EXPLORE_PAGE=12;'],

  // 2) the first card's image becomes the priority image
  [
    "    const imgHtml=img?`<img src=\"${img}\" alt=\"\" loading=\"lazy\" onerror=\"this.style.display='none'\">`",
    "    const imgHtml=img?`<img src=\"${img}\" alt=\"\" loading=\"lazy\" decoding=\"async\"${i===0?' fetchpriority=\"high\"':''} onerror=\"this.style.display='none'\">`",
  ],

  // 3) the Telegram WebApp script without blocking the first render
  [
    "    <script src=\"https://telegram.org/js/telegram-web-app.js\" defer></script>",
    "    <!-- The Telegram WebApp SDK is only needed inside Telegram, so it is\n" +
    "         loaded once the app is interactive instead of competing with the\n" +
    "         data files for the connection. -->\n" +
    "    <script>\n" +
    "    window.addEventListener('load',function(){\n" +
    "      var s=document.createElement('script');\n" +
    "      s.src='https://telegram.org/js/telegram-web-app.js';\n" +
    "      s.defer=true;\n" +
    "      document.body.appendChild(s);\n" +
    "    });\n" +
    "    </script>",
  ],
];

let applied = 0;
for (const [from, to] of REPLACEMENTS) {
  if (!s.includes(from)) { console.log('skip (not found): ' + from.slice(0, 70)); continue; }
  s = s.replace(from, to);
  applied++;
}

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('applied ' + applied + ' of ' + REPLACEMENTS.length + ' replacements');
for (const c of ['EXPLORE_PAGE=12', 'fetchpriority="high"', 'telegram-web-app.js']) {
  console.log((s.includes(c) ? 'OK   ' : 'MISS ') + c);
}
