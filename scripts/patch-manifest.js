// Complete the PWA manifest:
//  - relative start_url / scope / id, so the app works under any path
//    (a fork on a different domain or under a sub-path)
//  - the screenshots that the README shows
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'manifest.json');
const m = JSON.parse(fs.readFileSync(p, 'utf8'));

m.id = './';
m.start_url = './';
m.scope = './';
m.description = 'Search and discover public Telegram channels and groups — browse them like Instagram Explore, filter by topic and language, and read the posts.';
m.prefer_related_applications = false;
m.display_override = ['window-controls-overlay', 'standalone', 'browser'];

m.screenshots = [
  {
    src: 'docs/mobile.png',
    sizes: '412x823',
    type: 'image/png',
    form_factor: 'narrow',
    label: 'The Explore grid on a phone',
  },
  {
    src: 'docs/grid.png',
    sizes: '1280x900',
    type: 'image/png',
    form_factor: 'wide',
    label: 'The Explore grid',
  },
  {
    src: 'docs/channel.png',
    sizes: '1280x900',
    type: 'image/png',
    form_factor: 'wide',
    label: 'A channel profile with the activity chart',
  },
];

// The shortcuts have to point at the app itself.
m.shortcuts = (m.shortcuts || []).map(s => ({
  ...s,
  url: s.url.replace('/tgexplorer/', './'),
}));

fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n', 'utf8');
console.log('manifest.json updated');
console.log(JSON.stringify({ id: m.id, start_url: m.start_url, scope: m.scope, screenshots: m.screenshots.length, shortcuts: m.shortcuts.map(s => s.url) }, null, 2));
