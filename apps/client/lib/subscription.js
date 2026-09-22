// The device's notification registration, as one serialised conversation
// with the server. Every request that touches the server's row runs through
// one queue and reads the newest stored state when its turn comes, so a
// threshold change can never land after the switch-off that followed it.
//
// The queue must outlive the settings screen: a screen that owned its own
// queue could be closed with a request in flight and reopened with an empty
// one, and the old request would finish after the new screen's DELETE. So the
// provider — which lives as long as the app — owns one controller, and every
// screen instance talks to that.

/** @typedef {{ enabled: boolean, threshold: number, token: string | null }} State */
/** @typedef {{ ok: true } | { ok: false, reason: 'denied' | 'unavailable' | 'offline' }} Outcome */

/**
 * @param {object} deps
 * @param {() => State} deps.read the newest stored state
 * @param {(update: Partial<State>) => void} deps.write store a change
 * @param {(pending: boolean) => void} [deps.onPendingChange] includes queued requests and survives screen navigation
 * @param {{ enablePush(threshold: number): Promise<{ ok: true, token: string } | { ok: false, reason: 'denied' | 'unavailable' | 'offline' }>,
 *           disablePush(token: string): Promise<boolean>,
 *           updatePushThreshold(token: string, threshold: number): Promise<boolean> }} deps.api
 */
export function createSubscriptionController({ read, write, api, onPendingChange = () => {} }) {
  let queue = Promise.resolve();
  let pending = 0;
  /** @template T @param {() => Promise<T>} task @returns {Promise<T>} */
  const serialize = (task) => {
    if (++pending === 1) onPendingChange(true);
    const run = queue.then(task, task).finally(() => {
      if (--pending === 0) onPendingChange(false);
    });
    queue = run.then(() => {}, () => {});
    return run;
  };
  return {
    /** Ask for permission, register the device at the stored score. @returns {Promise<Outcome>} */
    enable: () => serialize(async () => {
      const result = await api.enablePush(read().threshold);
      if (!result.ok) return result;
      write({ enabled: true, token: result.token });
      return { ok: true };
    }),
    /** Remove the device. A failed removal leaves the switch on, truthfully. @returns {Promise<Outcome>} */
    disable: () => serialize(async () => {
      const { token } = read();
      if (token && !(await api.disablePush(token))) return { ok: false, reason: 'offline' };
      write({ enabled: false, token: null });
      return { ok: true };
    }),
    /** Store a score; re-register only a device the server holds. @returns {Promise<Outcome>} */
    choose: (/** @type {number} */ next) => serialize(async () => {
      const before = read();
      if (next === before.threshold) return { ok: true };
      write({ threshold: next });
      const now = read();
      if (now.enabled && now.token && !(await api.updatePushThreshold(now.token, next))) {
        write({ threshold: before.threshold });
        return { ok: false, reason: 'offline' };
      }
      return { ok: true };
    }),
  };
}
