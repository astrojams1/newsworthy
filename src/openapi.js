/**
 * An OpenAPI description of the caller-facing API, served from
 * /api/openapi.json.
 *
 * Why this exists: ChatGPT cannot submit a reading through browsing. Its
 * interpreter has no network, and its browser refuses to fetch a URL the model
 * assembled — a model-built URL carrying a token is the exfiltration shape that
 * guard exists to block, so no wording defeats it. Both limits were observed in
 * a real caller's trace.
 *
 * The supported path there is a Custom GPT Action, which takes a schema like
 * this one plus an API key, and issues real POSTs with a real header. So the
 * same calls a Claude-side caller makes with curl are described here for an
 * agent that can only reach the network through a declared tool.
 *
 * Served unauthenticated on purpose: it describes a token-gated API without
 * containing a token, and the schema importer that fetches it has no way to
 * present one. The prompt itself stays behind /api/instructions.
 */
export function openapiDocument({ baseUrl }) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Newsworthy',
      description:
        'Newsworthy is a calm global status indicator: a number out of 10 and one sentence explaining why. ' +
        'Rate how worthwhile the current news is, 1-10, and submit the reading. ' +
        'Fetch the instructions first: they carry the rating prompt and the scale.',
      version: '1.0.0',
    },
    servers: [{ url: baseUrl }],
    security: [{ callerToken: [] }],
    paths: {
      '/api/instructions': {
        get: {
          operationId: 'getInstructions',
          summary: 'Get the rating prompt and the workflow',
          description:
            'Call this first. Returns the rating prompt to run with web search enabled. ' +
            'The version and hash identify what this response served; neither is a field ' +
            'a caller sends. The version is stamped by the server at submission time.',
          parameters: [
            {
              name: 'format',
              in: 'query',
              required: true,
              schema: { type: 'string', enum: ['json'] },
              description: 'Always "json".',
            },
          ],
          responses: {
            200: {
              description: 'The prompt and workflow.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      version: {
                        type: 'integer',
                        description: 'Which prompt version this response served. Not a field a caller sends.',
                      },
                      hash: {
                        type: 'string',
                        description:
                          'The first 16 characters of the prompt’s SHA-256. An identifier for ' +
                          'this text, not the digest a submission carries.',
                      },
                      judge_version: { type: 'integer', description: 'The judge prompt version, sent back in judgement.' },
                      instructions: { type: 'string', description: 'The workflow, rating and judge prompts included.' },
                    },
                  },
                },
              },
            },
            401: { description: 'Missing or wrong token.' },
          },
        },
      },
      '/api/developments': {
        get: {
          operationId: 'getDevelopments',
          summary: 'Get the record to judge against, after scoring and writing',
          description:
            'Call this once the score and the final sentence are chosen, never before: the history it carries ' +
            'must not steer either. Returns the story names on record and the developments recorded over 48 hours, ' +
            'each with an id. The caller answers the judge prompt in the instructions against it and sends the answer ' +
            'as judgement in submitReading. Read-only; nothing is stored.',
          responses: {
            200: { description: 'The record.', content: { 'application/json': { schema: {
              type: 'object', properties: {
                record: { type: 'string', description: 'Story names on record, then recorded developments as [id] story, first seen, readings, sentences.' },
              },
            } } } },
            401: { description: 'Missing or wrong token.' },
          },
        },
      },
      '/api/readings': {
        post: {
          operationId: 'submitReading',
          summary: 'Submit a reading',
          description:
            'Call this with the score, the final sentence and the judgement made against getDevelopments. The job is not finished until this returns 201 — ' +
            'producing a score without submitting it accomplishes nothing. ' +
            'If web search failed or returned nothing, submit nothing at all. ' +
            'The score and the sentence are the reading; prompt_sha256 reports which ' +
            'text this caller received and is sent whenever the caller can hash. The ' +
            'prompt version is stamped by the server and is not sent: a caller that can ' +
            'name a version can pin one. No model name, caller name or token count is ' +
            'asked for either, since this app cannot verify any of it.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['score', 'explanation'],
                  properties: {
                    score: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 10,
                      description: 'How worthwhile the news is right now, on the prompt\u2019s harsh scale.',
                    },
                    explanation: {
                      type: 'string',
                      description: 'Full display: at most 140 characters including spaces and punctuation AND the "New: " label. Submit only the sentence body, at most 135 characters; the app supplies the label.',
                    },
                    judgement: {
                      type: 'object',
                      description: 'The answer to the judge prompt in the instructions, made against getDevelopments. Optional: without one, or with an id the record did not list, or a retired judge_version, the reading stores unjudged — never a rejection.',
                      properties: {
                        judge_version: { type: 'integer', description: 'The judge prompt version printed in the instructions.' },
                        development_of: { type: ['integer', 'null'], description: 'Id of the recorded development this reports, or null for a new one.' },
                        story: { type: 'string', description: 'Story slug, reused verbatim when on record.' },
                        note: { type: 'string', description: 'At most 12 words on what makes it same or new.' },
                      },
                    },
                    // Optional, and never a rejection: a mismatch stores a
                    // reading flagged unverified rather than refusing one.
                    // This is the one caller-supplied field the server checks
                    // instead of trusting, which is why it survived when the
                    // model name and token counts were removed.
                    prompt_sha256: {
                      type: 'string',
                      pattern: '^[0-9a-f]{64}$',
                      description:
                        'Optional. The SHA-256 of the rating prompt’s exact text as this ' +
                        'caller received it: all 64 characters, lowercase hex, computed with a ' +
                        'tool rather than by hand. The instructions define the exact bytes. The ' +
                        '16-character hash printed there is a prefix of that digest, not the ' +
                        'answer — a caller returning it, or any prefix, is recorded ' +
                        'unverified. A mismatch is never a rejection.',
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Stored. The job is done.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      // The pair a client that cannot read a status line
                      // branches on.
                      ok: { type: 'boolean' },
                      stored: { type: 'boolean', description: 'True when the reading was written.' },
                      id: { type: 'integer' },
                      created_at: { type: 'string' },
                      score: { type: 'integer' },
                      source: { type: 'string', description: "'external' for every caller submission." },
                      prompt_verified: {
                        type: ['boolean', 'null'],
                        description:
                          'Three states: true, the digest sent matched the text this server ' +
                          'served; false, it did not; null, no digest was sent. Without this a ' +
                          'caller never learns whether it verified.',
                      },
                      development: { type: 'string', enum: ['new', 'same', 'unjudged'], description: 'What the judgement placed it as; unjudged carries judge_note saying why.' },
                      story: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
            401: { description: 'Missing or wrong token.' },
            422: { description: 'Rejected. The message says which field is wrong; fix it rather than retrying unchanged.' },
          },
        },
      },
      '/api/runs': {
        post: {
          operationId: 'postRunReport',
          summary: 'Report on the run, once per run',
          description:
            'The last call of every run, including a run that submitted nothing. The report is the caller\u2019s own ' +
            'account: searches and sources, the stories weighed, why the score and the judgement, and anything that ' +
            'failed. Stored as written, never checked; not a reading.',
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object', required: ['report'], properties: {
              reading: { type: 'integer', description: 'The id submitReading returned; omitted when nothing was submitted.' },
              report: { type: 'string', description: 'Plain text, at most 4,000 characters; longer is cut, never refused.' },
            },
          } } } },
          responses: {
            201: { description: 'Stored.' },
            401: { description: 'Missing or wrong token.' },
            422: { description: 'No report text.' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        callerToken: { type: 'apiKey', in: 'header', name: 'x-newsworthy-token' },
      },
    },
  };
}
