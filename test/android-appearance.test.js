import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../apps/client/plugins/with-system-appearance.js';

test('Android resume refreshes the existing React runtime from the current Activity configuration', () => {
  const input = 'class MainActivity : ReactActivity() {\n  override fun getMainComponentName(): String = "main"\n}';
  const output = plugin.updateMainActivity(input);
  assert.match(output, /override fun onResume\(\)\s*\{\s*super\.onResume\(\)\s*reactHost\?\.onConfigurationChanged\(this\)/);
  assert.ok(output.includes('override fun getMainComponentName(): String = "main"'));
  assert.equal(plugin.updateMainActivity(output), output, 'prebuild is idempotent');
});

test('appearance plugin stops for a changed Activity or existing lifecycle override', () => {
  assert.throws(() => plugin.updateMainActivity('class DifferentActivity {}'), /structure changed/);
  assert.throws(() => plugin.updateMainActivity('class MainActivity : ReactActivity() { override fun onResume() {} }'), /existing MainActivity.onResume/);
});
