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
 * same two calls a Claude-side caller makes with curl are described here for an
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
            'Call this first. Returns the rating prompt to run with web search enabled, ' +
            'and the version number to report back when submitting.',
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
                      version: { type: 'integer', description: 'Pass this back as prompt_version.' },
                      hash: { type: 'string' },
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
      '/api/readings': {
        post: {
          operationId: 'submitReading',
          summary: 'Submit a reading',
          description:
            'Call this after rating. The job is not finished until this returns 201 — ' +
            'producing a score without submitting it accomplishes nothing. ' +
            'If web search failed or returned nothing, submit nothing at all.',
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
                      description: 'How worthwhile the news is right now, on the prompt’s harsh scale.',
                    },
                    explanation: {
                      type: 'string',
                      description: 'One sentence, at most 25 words, reporting what happened.',
                    },
                    prompt_version: {
                      type: 'integer',
                      description: 'The version returned by getInstructions.',
                    },
                    model: { type: 'string', description: 'The model you used, e.g. gpt-5.' },
                    caller: { type: 'string', description: 'A short name for yourself, e.g. chatgpt.' },
                    usage: {
                      type: 'object',
                      description: 'Your token and search usage, so this app can price your run.',
                      properties: {
                        input_tokens: { type: 'integer' },
                        output_tokens: { type: 'integer' },
                        web_search_requests: { type: 'integer' },
                      },
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
                      id: { type: 'integer' },
                      created_at: { type: 'string' },
                      score: { type: 'integer' },
                      source: { type: 'string' },
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
