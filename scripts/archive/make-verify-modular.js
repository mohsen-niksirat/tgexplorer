// Turn verify_channels.js into a module that can be required as well as
// run: the suggestion workflow verifies a single channel with it.
//
//   node verify_channels.js          -> the CLI (unchanged)
//   require('./verify_channels.js')   -> { check, fetchTme, parseMembers }
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'verify_channels.js');
let src = fs.readFileSync(file, 'utf8');

// The IIFE at the end becomes a named function that only runs when the
// file is executed directly.
const IIFE = '(async () => {';
if (!src.includes(IIFE)) { console.error('the main block was not found'); process.exit(1); }
src = src.replace(IIFE, 'async function main() {');
// The IIFE ended with "})();" — the function definition ends with "}".
src = src.replace(/\n\}\)\(\);\s*$/, '\n}\n');

// Export the parts the workflow needs, and run main() when executed directly.
src += `
module.exports = { check, fetchTme, parseMembers, profileKind, extractMemberCount };

if (require.main === module) {
  main();
}
`;

fs.writeFileSync(file, src, 'utf8');
console.log('verify_channels.js is now a module');
