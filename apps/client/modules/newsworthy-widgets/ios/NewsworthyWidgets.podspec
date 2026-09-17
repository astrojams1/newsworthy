Pod::Spec.new do |s|
  s.name           = 'NewsworthyWidgets'
  s.version        = '1.0.0'
  s.summary        = 'Newsworthy widget reading handoff'
  s.description    = 'Shares public app readings with the WidgetKit extension.'
  s.author         = 'Newsworthy'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: 'https://github.com/astrojams1/newsworthy.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WidgetKit'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
