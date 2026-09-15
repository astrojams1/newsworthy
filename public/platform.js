// Browser implementation; mobile builds bundle the native implementation.
export const readSaved = async (key) => localStorage.getItem(key);
export const writeSaved = async (key, value) => localStorage.setItem(key, value);
export const onResume = async () => {};
export const onBack = async () => {};
export const canShare = async () => Boolean(navigator.share);
export const share = async (options) => navigator.share(options);
