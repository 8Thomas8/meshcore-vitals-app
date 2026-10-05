# Changelog

## [1.5.0](https://github.com/8Thomas8/meshcore-vitals-app/compare/v1.4.1...v1.5.0) (2026-10-05)


### Features

* add a generic toast for errors and warnings ([#44](https://github.com/8Thomas8/meshcore-vitals-app/issues/44)) ([9781a5e](https://github.com/8Thomas8/meshcore-vitals-app/commit/9781a5e2c954ba2d827fb9cf5c1d6c76859d8104))
* desktop layout, shared link readout and sheet, visual cleanups ([#46](https://github.com/8Thomas8/meshcore-vitals-app/issues/46)) ([74a54f7](https://github.com/8Thomas8/meshcore-vitals-app/commit/74a54f76ca67f3b828490e88c4ca0ff2b4bab16d))
* keep the page and reconnect when the Bluetooth link drops ([#40](https://github.com/8Thomas8/meshcore-vitals-app/issues/40)) ([4ee6387](https://github.com/8Thomas8/meshcore-vitals-app/commit/4ee63873d5dc90c50cfe563f242880c95fd0d0c1))


### Bug Fixes

* keep the screen on with auto scan and tell how long it was paused ([#41](https://github.com/8Thomas8/meshcore-vitals-app/issues/41)) ([801db14](https://github.com/8Thomas8/meshcore-vitals-app/commit/801db145597077a864559242dbe49e486ab3eb40))
* release the screen lock on disconnect and auto reload once the toasts are gone ([#47](https://github.com/8Thomas8/meshcore-vitals-app/issues/47)) ([d1887d9](https://github.com/8Thomas8/meshcore-vitals-app/commit/d1887d9da243dbd913b54d93a11737934c7c05c1))
* show errors as toasts ([#45](https://github.com/8Thomas8/meshcore-vitals-app/issues/45)) ([7553f60](https://github.com/8Thomas8/meshcore-vitals-app/commit/7553f600c0b49775074da7aef86c4dd760737ccd))
* show the switch and out of range explanations on touch screens ([#42](https://github.com/8Thomas8/meshcore-vitals-app/issues/42)) ([5e070c1](https://github.com/8Thomas8/meshcore-vitals-app/commit/5e070c1f718cb65c0366971a863f8cd1df0e45df))

## [1.4.1](https://github.com/8Thomas8/meshcore-vitals-app/compare/v1.4.0...v1.4.1) (2026-10-03)


### Bug Fixes

* keep the footer on two lines on phones and show it on history and the full screen list ([#37](https://github.com/8Thomas8/meshcore-vitals-app/issues/37)) ([981655d](https://github.com/8Thomas8/meshcore-vitals-app/commit/981655d7b82ef55dad5088c98d423825dd87816c))
* keep the session map attribution under the detail drawer header ([#39](https://github.com/8Thomas8/meshcore-vitals-app/issues/39)) ([567161e](https://github.com/8Thomas8/meshcore-vitals-app/commit/567161e99e967685e06d457cb6c349ae631e8fe1))

## [1.4.0](https://github.com/8Thomas8/meshcore-vitals-app/compare/v1.3.0...v1.4.0) (2026-10-01)


### Features

* add a full screen repeater list ([#33](https://github.com/8Thomas8/meshcore-vitals-app/issues/33)) ([3c6366f](https://github.com/8Thomas8/meshcore-vitals-app/commit/3c6366f8006efefde79cc56567f270f38129a77f))
* add a history of the last sessions ([#35](https://github.com/8Thomas8/meshcore-vitals-app/issues/35)) ([21bc5c5](https://github.com/8Thomas8/meshcore-vitals-app/commit/21bc5c5807df17d6fdf67df93209cfb78f206f31))

## [1.3.0](https://github.com/8Thomas8/meshcore-vitals-app/compare/v1.2.2...v1.3.0) (2026-10-01)


### Features

* mark repeaters relayed through an out of range one as out of range ([#30](https://github.com/8Thomas8/meshcore-vitals-app/issues/30)) ([434a8d5](https://github.com/8Thomas8/meshcore-vitals-app/commit/434a8d5fd3405c6fba63f534d8465791d377e42f))
* scan again every minute in auto mode ([#29](https://github.com/8Thomas8/meshcore-vitals-app/issues/29)) ([e214370](https://github.com/8Thomas8/meshcore-vitals-app/commit/e21437062b792a24d96fd16c9fd6211f277a8dca))


### Refactor

* extract full scan pruning and tighten out of range tests ([#32](https://github.com/8Thomas8/meshcore-vitals-app/issues/32)) ([dcb234a](https://github.com/8Thomas8/meshcore-vitals-app/commit/dcb234a59b460c1f31ffd9172d84169df88c8f46))

## [1.2.2](https://github.com/8Thomas8/meshcore-vitals-app/compare/v1.2.1...v1.2.2) (2026-09-30)


### Bug Fixes

* mark repeaters no longer heard directly as out of range ([#25](https://github.com/8Thomas8/meshcore-vitals-app/issues/25)) ([a92daa0](https://github.com/8Thomas8/meshcore-vitals-app/commit/a92daa0e7e3c7e0d16c7c7260dce317db7415a1f))

## [1.2.1](https://github.com/8Thomas8/meshcore-vitals-app/compare/v1.2.0...v1.2.1) (2026-09-29)


### Refactor

* replace Vuetify with Reka UI ([#21](https://github.com/8Thomas8/meshcore-vitals-app/issues/21)) ([a388904](https://github.com/8Thomas8/meshcore-vitals-app/commit/a3889049f3ca59c3205cc886d9bce220b9f94228))

## [1.2.0](https://github.com/8Thomas8/meshcore-vitals-app/compare/v1.1.0...v1.2.0) (2026-09-27)


### Features

* add Vercel Web Analytics ([#19](https://github.com/8Thomas8/meshcore-vitals-app/issues/19)) ([bf55efe](https://github.com/8Thomas8/meshcore-vitals-app/commit/bf55efea56f9c505c1f1ed8c6183035791a83f00))


### Bug Fixes

* show the GPS altitude above sea level ([#17](https://github.com/8Thomas8/meshcore-vitals-app/issues/17)) ([6b18063](https://github.com/8Thomas8/meshcore-vitals-app/commit/6b18063e5368e00b6261938be3a9f7cf8319c3c1))


### Refactor

* clearer code, fewer comments ([#16](https://github.com/8Thomas8/meshcore-vitals-app/issues/16)) ([3eb666f](https://github.com/8Thomas8/meshcore-vitals-app/commit/3eb666f4e84c34f3e5976a70330156725261d18d))

## [1.1.0](https://github.com/8Thomas8/meshcore-vitals-app/compare/v1.0.3...v1.1.0) (2026-09-27)


### Features

* show the terrain profile to a repeater ([#14](https://github.com/8Thomas8/meshcore-vitals-app/issues/14)) ([edc42d8](https://github.com/8Thomas8/meshcore-vitals-app/commit/edc42d8aa1ac87df8ea8b31a6ca9cff4e2f22f81))

## [1.0.3](https://github.com/8Thomas8/meshcore-vitals-app/compare/v1.0.2...v1.0.3) (2026-09-25)


### Bug Fixes

* keep the map after switching tabs during a scan ([#9](https://github.com/8Thomas8/meshcore-vitals-app/issues/9)) ([ff030c8](https://github.com/8Thomas8/meshcore-vitals-app/commit/ff030c887e7866e3b80f00a0834a2fbaf0c347e1))

## [1.0.2](https://github.com/8Thomas8/meshcore-vitals-app/compare/v1.0.1...v1.0.2) (2026-09-25)


### Bug Fixes

* keep the most accurate GPS fix at each scan ([#6](https://github.com/8Thomas8/meshcore-vitals-app/issues/6)) ([a2317fa](https://github.com/8Thomas8/meshcore-vitals-app/commit/a2317fae42543531907b1cc2aaf3e6b358c62532))

## [1.0.1](https://github.com/8Thomas8/meshcore-vitals-app/compare/v1.0.0...v1.0.1) (2026-09-24)


### Bug Fixes

* point the repository link to the renamed repo ([#3](https://github.com/8Thomas8/meshcore-vitals-app/issues/3)) ([848cf6c](https://github.com/8Thomas8/meshcore-vitals-app/commit/848cf6cf698176a3d62516cddae9d712449a1ccd))

## 1.0.0 (2026-09-24)


### Features

* initial release ([#1](https://github.com/8Thomas8/meshcore-vitals/issues/1)) ([2d2e721](https://github.com/8Thomas8/meshcore-vitals/commit/2d2e7214ed4dd56c416a0a2bf64968d83905b647))
