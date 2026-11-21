// Rewrite the parsing step of the suggestion workflow to use the parser
// script (it understands both the app's issue body and the issue form).
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', '.github', 'workflows', 'suggestions.yml');
let s = fs.readFileSync(p, 'utf8');

const start = s.indexOf('      - name: Check the channel against t.me');
const endMarker = '          " "$USERNAME"';
const end = s.indexOf(endMarker, start);
if (start === -1 || end === -1) { console.error('the step was not found'); process.exit(1); }

const NEW = `      - name: Read the suggestion
        id: check
        env:
          BODY: ${{ github.event.issue.body }}
        run: |
          set -e
          # The body can come from the app's "Suggest a channel" dialog or
          # from the issue template - the parser understands both.
          node scripts/parse-suggestion.js "$BODY" > suggestion.json
          cat suggestion.json
          node -e "
            const s = require('./suggestion.json');
            const fs = require('fs');
            const out = [];
            for (const [k, v] of Object.entries(s)) {
              out.push(k + '<<EOF');
              out.push(v || '');
              out.push('EOF');
            }
            fs.appendFileSync(process.env.GITHUB_OUTPUT, out.join('\\n') + '\\n');
          "

          if [ -z "${{ steps.check.outputs.username }}" ]; then
            echo "::error::No username found in the issue body"
            exit 1
          fi

          node -e "
            const { check } = require('./verify_channels.js');
            const username = process.argv[1];
            check({ username }).then(r => {
              console.log('status: ' + r.status + ' — ' + r.reason);
              if (r.status !== 'OK') {
                console.error('::error::@' + username + ' is not a public channel (' + r.status + ')');
                process.exit(1);
              }
            }).catch(e => { console.error('::error::' + e.message); process.exit(1); });
          " "${{ steps.check.outputs.username }}"`;

s = s.slice(0, start) + NEW + s.slice(end + endMarker.length);
fs.writeFileSync(p, s, 'utf8');
console.log('patched the suggestion workflow');
console.log('uses the parser: ' + s.includes('parse-suggestion.js'));
