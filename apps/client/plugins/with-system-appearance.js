const { withMainActivity } = require('@expo/config-plugins');

// Android can recreate an Activity while retaining the React runtime after a
// font-size change. Re-read the Activity's configuration on resume so a cached
// JS appearance cannot keep the app light while the OS and widget are dark.
function updateMainActivity(source) {
  if (source.includes('// Newsworthy appearance on resume')) return source;
  if (source.includes('override fun onResume(')) {
    throw new Error('Review the existing MainActivity.onResume before adding appearance synchronization.');
  }
  const anchor = 'class MainActivity : ReactActivity() {';
  if (!source.includes(anchor)) throw new Error('MainActivity structure changed; appearance synchronization needs review.');
  return source.replace(anchor, `${anchor}
  // Newsworthy appearance on resume
  override fun onResume() {
    super.onResume()
    reactHost?.onConfigurationChanged(this)
  }
`);
}

module.exports = config => withMainActivity(config, mod => {
  mod.modResults.contents = updateMainActivity(mod.modResults.contents);
  return mod;
});
module.exports.updateMainActivity = updateMainActivity;
