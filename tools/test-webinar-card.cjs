const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/dashboard.js', 'utf8');
const start = source.indexOf('  function webinarCard() {');
const end = source.indexOf('  function communityPulseCard() {', start);
assert(start >= 0 && end > start, 'Webinar card source exists');
const fn = source.slice(start, end);
const webinar = {
  topic: 'Živý webinář Kenji Academy',
  at: '2026-09-16T18:00:00Z',
  youtube: 'https://youtube.com/live/KjxMlOyCQHY?feature=share',
  info: ''
};
function card(member, item, now) {
  class TestDate extends Date {
    constructor(value) { super(value === undefined ? now : value); }
    static now() { return now; }
  }
  const context = {
    WEBINAR: item,
    isAcademyMember: () => member,
    Date: TestDate,
    URL,
    esc: value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  };
  return vm.runInNewContext(fn + '\nwebinarCard()', context);
}
const before = Date.parse('2026-09-16T17:30:00Z');
assert.equal(card(false, webinar, before), '', 'Free user does not see the card or URL');
assert.equal(card(true, null, before), '', 'No webinar means no stale fallback');
assert.match(card(true, webinar, before), /Otevřít odkaz na webinář/);
assert.match(card(true, webinar, before), /KjxMlOyCQHY/);
assert.match(card(true, webinar, Date.parse('2026-09-16T18:30:00Z')), /Spustit stream/);
assert.doesNotMatch(card(true, { ...webinar, youtube: 'javascript:alert(1)' }, before), /href="javascript:/);
console.log('Webinar card: Free hidden, Academy link before/during live, unsafe URL rejected.');
