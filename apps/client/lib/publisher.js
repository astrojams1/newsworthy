// Who publishes Newsworthy, shown on Settings > Publisher and read by tests.
// Google Play's News policy asks news apps to name their publisher and editors
// and give a way to make contact; the names match the store listing's
// copyright line (store/listing.json) and the contact address is the support
// page's.
export const PUBLISHER = {
  name: 'James Thompson',
  trading: 'AstroJams',
  email: 'astrojams1@gmail.com',
};

export const PUBLISHER_COPY = {
  published: `Newsworthy is published and edited by ${PUBLISHER.name}, who operates as ${PUBLISHER.trading}.`,
  readings: 'Each reading is written by Newsworthy: a score, one sentence and the time it was updated. Newsworthy does not republish articles or other publishers’ content, so a reading has no separate author or outlet.',
  contact: 'Questions, corrections and feedback are welcome by email.',
};
