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
