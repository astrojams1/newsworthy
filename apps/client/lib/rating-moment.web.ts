// The website has no store to rate in: a share there never asks (see rating-moment.ts).
export async function ratingAfterShare(): Promise<boolean> {
  return false;
}
