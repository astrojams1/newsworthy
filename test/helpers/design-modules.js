// The design system's own modules, passed to the renderers as they are: they
// are pure values and arithmetic, so a mock would only restate them and
// could drift from what the screens actually get.
import * as design from '../../apps/client/lib/design.js';
import * as layout from '../../apps/client/lib/layout.js';
import * as timeline from '../../apps/client/lib/timeline.js';

export const designModules = { '@/lib/design': design, '@/lib/layout': layout, '@/lib/timeline': timeline };
