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
                      instructions: { type: 'string', description: 'The workflow, prompt included.' },
                    },
                  },
                },
              },
            },
            401: { description: 'Missing or wrong token.' },
          },
        },
      },
      '/api/judge-task': {
        get: {
          operationId: 'getJudgeTask',
          summary: 'Get the judge task, after scoring and writing',
          description:
            'Call this once the score and the final sentence are chosen, never before: the history it carries ' +
            'must not steer either. Returns the judge prompt with the developments recorded over 48 hours and the ' +
            'story names on record. The caller answers it about its own reading and sends the answer as judgement ' +
            'in submitReading. Read-only; nothing is stored.',
          responses: {
            200: { description: 'The judge task.', content: { 'application/json': { schema: {
              type: 'object', properties: {
                judge_version: { type: 'integer', description: 'Echoed in the judgement, so an answer to a retired task is refused.' },
                judge_task: { type: 'string', description: 'Which recorded development the caller\u2019s reading reports, or none.' },
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
            'Call this with the score, the final sentence and the answer to getJudgeTask. The job is not finished until this returns 201 — ' +
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
                      description: 'The answer to getJudgeTask about this reading. Optional: without one, or with an id the task did not list, or a retired judge_version, the reading stores unjudged — never a rejection.',
                      properties: {
                        judge_version: { type: 'integer', description: 'The judge_version getJudgeTask returned.' },
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
    },
    components: {
      securitySchemes: {
        callerToken: { type: 'apiKey', in: 'header', name: 'x-newsworthy-token' },
      },
    },
  };
}
