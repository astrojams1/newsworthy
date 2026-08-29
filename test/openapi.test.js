import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openapiDocument } from '../src/openapi.js';

const doc = () => openapiDocument({ baseUrl: 'https://example.test' });

test('describes the two calls a caller has to make, and nothing else', () => {
  // ChatGPT cannot submit through browsing: its interpreter has no network and
  // its browser refuses a model-assembled URL. A Custom GPT Action is the
  // supported route, and an Action is exactly this schema plus a key.
  const ops = Object.values(doc().paths).flatMap((p) => Object.values(p).map((o) => o.operationId));
  assert.deepEqual(ops.sort(), ['getInstructions', 'submitReading']);
});

test('auth is a header, which is the whole point of going through an Action', () => {
  const scheme = doc().components.securitySchemes.callerToken;
  assert.deepEqual(scheme, { type: 'apiKey', in: 'header', name: 'x-newsworthy-token' });
  assert.deepEqual(doc().security, [{ callerToken: [] }]);
});

test('the base URL comes from the request, like the instructions do', () => {
  assert.equal(doc().servers[0].url, 'https://example.test');
  assert.equal(openapiDocument({ baseUrl: 'http://localhost:3000' }).servers[0].url, 'http://localhost:3000');
});

test('score is bounded in the schema, so the model is told the range up front', () => {
  const props = doc().paths['/api/readings'].post.requestBody.content['application/json'].schema;
  assert.deepEqual(props.required, ['score', 'explanation']);
  assert.equal(props.properties.score.minimum, 1);
  assert.equal(props.properties.score.maximum, 10);
});

test('submitReading carries the finish-line rule, since a GPT may never read the prose', () => {
  // An Action-driven caller acts on operation descriptions, not on the
  // instructions page. The rule that stopped the first two callers — a score
  // is not a finished job — has to survive into the schema.
  const description = doc().paths['/api/readings'].post.description;
  assert.match(description, /not finished until this returns 201/);
  assert.match(description, /submit nothing at all/);
});

test('every operation declares a 4XX, so a failed call is not read as success', () => {
  for (const item of Object.values(doc().paths)) {
    for (const op of Object.values(item)) {
      const codes = Object.keys(op.responses);
      assert.ok(codes.some((c) => c.startsWith('4')), `${op.operationId} documents a failure`);
    }
  }
});

test('the schema asks for nothing the app cannot verify', () => {
  // A Custom GPT builds its request from these properties, so leaving model or
  // usage in the schema would keep ChatGPT sending figures nobody measured.
  // The line is verifiability, not field count: model, caller name and token
  // counts went because they were self-reported claims stored as fact, while
  // prompt_sha256 is checked against the bytes this server sent — a proof, and
  // the only evidence there is that a prompt edit ever reached the rater. It
  // stays optional, because a missing or mismatched digest is never a
  // rejection.
  const body = doc().paths['/api/readings'].post.requestBody.content['application/json'].schema;
  assert.deepEqual(Object.keys(body.properties).sort(), ['explanation', 'prompt_sha256', 'score']);
  assert.deepEqual(body.required, ['score', 'explanation']);
  assert.equal(body.properties.prompt_sha256.type, 'string');
  assert.equal(body.properties.prompt_sha256.pattern, '^[0-9a-f]{64}$');
});

test('nothing in the document tells the caller to send a version back', () => {
  // Two readings arrived stamped v3 in the hours after v4 went live, each
  // carrying an explicit prompt_version: a caller that can name a version can
  // name the wrong one. The version is stamped server-side now, and this
  // schema is the only text an Action-driven caller reads — it said "Pass this
  // back as prompt_version" long after the server stopped honouring it.
  const serialised = JSON.stringify(doc());
  assert.ok(!/[Pp]ass this back/.test(serialised), 'no property is described as something to pass back');
  assert.ok(!/version number to report back/.test(serialised), 'no operation promises a version to report back');
  assert.ok(!/report back|send (?:it |this )?back/i.test(serialised), 'nothing is described as reported back');
});

test('the 201 schema names prompt_verified, so a caller learns whether it verified', () => {
  // The response has always carried it; the schema listed only id, created_at,
  // score and source, so an Action-driven caller could send a digest and never
  // find out whether it matched.
  const ok = doc().paths['/api/readings'].post.responses[201]
    .content['application/json'].schema.properties;
  assert.ok(ok.prompt_verified, 'prompt_verified is documented');
  assert.deepEqual(ok.prompt_verified.type, ['boolean', 'null']);
  assert.ok(ok.ok && ok.stored, 'the ok/stored pair a soft-error caller branches on is documented');
});
