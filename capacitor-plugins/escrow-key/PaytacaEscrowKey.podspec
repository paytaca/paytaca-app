Pod::Spec.new do |s|
  s.name = 'PaytacaEscrowKey'
  s.version = '1.0.0'
  s.summary = 'Portable escrow storage (iCloud Keychain) for Paytaca seed vaults'
  s.license = 'MIT'
  s.homepage = 'https://paytaca.com'
  s.author = 'Paytaca'
  s.source = { :git => 'https://github.com/paytaca/paytaca-app.git', :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '13.0'
  s.dependency 'Capacitor'
end
