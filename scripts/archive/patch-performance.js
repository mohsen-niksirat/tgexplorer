// The performance pass, applied in one go:
//
// 1) The Telegram WebApp SDK is only needed inside Telegram. It is loaded
//    once the app is interactive instead of blocking the first render.
// 2) The Cloudflare Web Analytics beacon is injected after the load event.
//    As a module script it still cost 5.6 s of main-thread time on a
//    phone, because it competed with the data files for the connection.
// 3) The data files are downloaded in parallel with the HTML instead of
//    after it: as <script defer> tags at the end of the body they were
//    only discovered once the whole 240 KB index.html had been parsed.
//    Deferred scripts and module scripts always execute in document order,
//    so moving them into the head keeps posts.js -> channels.js ->
//    avatars.js -> app module.
// 4) The Explore grid renders 12 cards at a time instead of all of them,
//    and the first card's image gets fetchpriority (it is the LCP element).
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

function replace(from, to, label) {
  if (!s.includes(from)) { console.log('skip (not found): ' + label); return false; }
  s = s.replace(from, to);
  console.log('applied: ' + label);
  return true;
}

// --- 1) the Telegram SDK ----------------------------------------------------
replace(
  '    <script src="https://telegram.org/js/telegram-web-app.js"></script>',
  '    <!-- The Telegram WebApp SDK is only needed inside Telegram, so it is\n' +
  '         loaded once the app is interactive instead of blocking the first\n' +
  '         render. -->\n' +
  '    <script>\n' +
  '    window.addEventListener(\'load\',function(){\n' +
  '      var s=document.createElement(\'script\');\n' +
  '      s.src=\'https://telegram.org/js/telegram-web-app.js\';\n' +
  '      s.defer=true;\n' +
  '      document.body.appendChild(s);\n' +
  '    });\n' +
  '    </script>',
  'the Telegram SDK is loaded after load');

// --- 2) the Cloudflare beacon ----------------------------------------------
replace(
  "<!-- Cloudflare Web Analytics -->\n<script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{\"token\": \"ed5603fcf9b64b4abe5e3ac1c82c0069\"}'></script>\n<!-- End Cloudflare Web Analytics -->",
  "<!-- Cloudflare Web Analytics - injected after the load event, so the\n" +
  "     third-party script can never block the first render. -->\n" +
  "<script>\n" +
  "(function(){\n" +
  "  window.addEventListener('load',function(){\n" +
  "    var s=document.createElement('script');\n" +
  "    s.src='https://static.cloudflareinsights.com/beacon.min.js';\n" +
  "    s.setAttribute('data-cf-beacon','{\"token\": \"ed5603fcf9b64b4abe5e3ac1c82c0069\"}');\n" +
  "    s.defer=true;\n" +
  "    document.body.appendChild(s);\n" +
  "  });\n" +
  "})();\n" +
  "</script>",
  'the Cloudflare beacon is injected after load');

// --- 4) a smaller first page + the priority image --------------------------
replace('const EXPLORE_PAGE=24;', 'const EXPLORE_PAGE=12;', 'a smaller first page');
replace(
  "    const imgHtml=img?`<img src=\"${img}\" alt=\"\" loading=\"lazy\" onerror=\"this.style.display='none'\">`",
  "    const imgHtml=img?`<img src=\"${img}\" alt=\"\" loading=\"lazy\" decoding=\"async\"${i===0?' fetchpriority=\"high\"':''} onerror=\"this.style.display='none'\">`",
  'fetchpriority on the first card image');

// --- 3) the data scripts and the app module into the head -------------------
const DATA = `<script src="posts.js" defer></script>
<script src="channels.js" defer></script>
<script src="avatars.js" defer></script>
`;
const DATA_PLAIN = `<script src="posts.js"></script>
<script src="channels.js"></script>
<script src="avatars.js"></script>
`;
let dataFound = true;
if (s.includes(DATA)) {
  s = s.replace(DATA, '');
} else if (s.includes(DATA_PLAIN)) {
  s = s.replace(DATA_PLAIN, '');
} else {
  console.log('skip (not found): the data scripts');
  dataFound = false;
}
if (dataFound) {
  const MODULE_START = '<script type="module">';
  const moduleStart = s.indexOf(MODULE_START);
  const moduleEnd = s.indexOf('</script>', moduleStart);
  const moduleBlock = s.slice(moduleStart, moduleEnd + '</script>'.length);
  s = s.slice(0, moduleStart) + s.slice(moduleEnd + '</script>'.length);
  const headEnd = s.indexOf('</head>');
  s = s.slice(0, headEnd) + DATA + moduleBlock + '\n' + s.slice(headEnd);
  console.log('applied: the data scripts and the app module moved into the head');
}

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('done');
