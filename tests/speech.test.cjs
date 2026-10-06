const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(status = 200) {
  const audios = [], utterances = [], revoked = [];
  const context = {
    exports: {},
    fetch: async () => ({ ok: status === 200, status, blob: async () => ({}) }),
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: (url) => revoked.push(url) },
    Audio: class { constructor() { audios.push(this); } play() { return Promise.resolve(); } pause() { this.paused = true; } },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    window: { speechSynthesis: { speak: (u) => utterances.push(u), cancel() {} } },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/speech.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return { api: context.exports, audios, utterances, revoked, context };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('speech remains active until audio ends, then releases the blob', async () => {
  const s = setup(); let done = false;
  const speaking = s.api.speak('Your balance is M500.', 'en').then(() => { done = true; });
  await flush();
  assert.equal(done, false);
  s.audios[0].onended(); await speaking;
  assert.equal(done, true); assert.deepEqual(s.revoked, ['blob:test']);
});
test('missing voice backend produces browser speech and waits for completion', async () => {
  const s = setup(501); let done = false;
  const speaking = s.api.speak('Hello', 'st').then(() => { done = true; });
  await flush();
  assert.equal(s.utterances[0].lang, 'st-ZA'); assert.equal(done, false);
  s.utterances[0].onend(); await speaking; assert.equal(done, true);
});
test('interrupting audio stops playback, settles speech and releases resources', async () => {
  const s = setup(); const speaking = s.api.speak('Hello', 'en'); await flush();
  s.api.stopSpeaking(); await speaking;
  assert.equal(s.audios[0].paused, true); assert.deepEqual(s.revoked, ['blob:test']);
});
test('a cancelled pending request cannot start a stale reply', async () => {
  const s = setup(); let respond;
  s.context.fetch = () => new Promise((resolve) => { respond = resolve; });
  const speaking = s.api.speak('Old reply', 'en'); s.api.stopSpeaking();
  respond({ ok: true, status: 200, blob: async () => ({}) }); await speaking;
  assert.equal(s.audios.length, 0); assert.equal(s.utterances.length, 0);
});
