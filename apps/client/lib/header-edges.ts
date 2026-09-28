// iOS 26 Safari in landscape keeps the page clear of the notch itself, painting
// a black strip there, yet still reports the notch as a safe-area inset. The
// navigator's header adds that inset as a margin, so the wordmark sat a second
// notch's width in from the strip while Share and Settings hugged the other
// edge. On the web the header keeps its own padding and nothing more; native
// apps do draw under the notch and keep the inset.
export const headerEdges = process.env.EXPO_OS === 'web'
  ? { headerLeftContainerStyle: { marginStart: 0 }, headerRightContainerStyle: { marginEnd: 0 } }
  : {};
