// Fictional typesetting samples, never live readings or rating calibration.
export const samples = {
  standard: 'Negotiators have agreed to resume talks, while aid deliveries continue to reach communities affected by the flooding and transport links gradually reopen.',
  long: 'Negotiators have agreed to resume talks after several days of discussion, while aid deliveries continue to reach communities affected by flooding and transport links gradually reopen across the region.',
  short: 'Talks resume as aid deliveries continue.',
  empty: 'The latest rating will appear when a connection is available.',
};

export function previewReading(score, sentence, custom) {
  const available = sentence !== 'empty';
  const level = Number.isInteger(score) && score >= 1 && score <= 10 ? score : 3;
  return {
    level: available ? level : null,
    number: available ? String(level) : '–',
    label: available ? `${level} out of 10` : 'Rating unavailable',
    explanation: custom ?? samples[sentence] ?? samples.standard,
    timestamp: available ? 'Sep 17 · 09:41' : 'Waiting for a reading',
  };
}
