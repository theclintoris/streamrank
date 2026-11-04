import assert from 'node:assert/strict';

const response = await fetch('http://127.0.0.1:7100/');
assert.equal(response.status, 200);
const html = await response.text();

const jsonMatch = /<script type="application\/json" id="streamrank-data">([\s\S]*?)<\/script>/.exec(html);
assert.ok(jsonMatch, 'inline DATA JSON is missing');
const data = JSON.parse(jsonMatch[1]);
assert.equal(data.services.length, 7);
assert.equal(data.genres.length, 19);
assert.match(data.baseUrl, /^http:\/\/127\.0\.0\.1:7100$/);

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1);
new Function(scripts[0][1]);

for (const id of ['builder-form', 'manifest-url', 'install', 'hero-install', 'preview-chips']) {
  assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
}
assert.ok(html.includes('Netflix'), 'service names missing');
assert.ok(html.includes('Custom board ready'), 'builder status text missing');

console.log(
  JSON.stringify(
    {
      bytes: html.length,
      services: data.services.length,
      genres: data.genres.length,
      inlineScriptBytes: scripts[0][1].length,
      builder: 'syntax ok',
    },
    null,
    2,
  ),
);
