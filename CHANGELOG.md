# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.5]

### Added

- feat: expand EIP155 RPC types and methods ([#69](https://github.com/MetaMask/multichain-api-client/pull/69))

### Fixed

- fix: enhance MetaMask extension ID detection with retry logic ([#70](https://github.com/MetaMask/multichain-api-client/pull/70))

## [0.6.4]

### Changed

- feat: custom error classes ([#58](https://github.com/MetaMask/multichain-api-client/pull/58))
- doc: add doc to extend RPC API and create custom transports ([#64](https://github.com/MetaMask/multichain-api-client/pull/64))

### Fixed

- fix: delay getSession to first request ([#67](https://github.com/MetaMask/multichain-api-client/pull/67))

## [0.6.3]

### Fixed

- fix: handle multichain api not responding on page load (issue [#16550](https://github.com/MetaMask/metamask-mobile/issues/16550)) ([#65](https://github.com/MetaMask/multichain-api-client/pull/65))

## [0.6.2]

### Fixed

- fix: avoid race conditions by using a pending port for chrome.runtime.connect ([#61](https://github.com/MetaMask/multichain-api-client/pull/61))

## [0.6.1]

### Changed

- fix: export transport getters from index.ts to bypass automatic detection ([#59](https://github.com/MetaMask/multichain-api-client/pull/59))
- fix: remove console.error/warn ([#57](https://github.com/MetaMask/multichain-api-client/pull/57))

## [0.6.0]

### Changed

- Make getMultichainClient synchronous ([#55](https://github.com/MetaMask/multichain-api-client/pull/55))

## [0.5.0]

### Changed

- feat: get extensionId using window.postMessage ([#51](https://github.com/MetaMask/multichain-api-client/pull/51))

## [0.4.0]

### Changed

- Bump `@metamask/providers` from `21.0.0` to `22.0.1` ([#48](https://github.com/MetaMask/multichain-api-client/pull/48))
- Add ability to unsubscribe from notifications ([#49](https://github.com/MetaMask/multichain-api-client/pull/49))

## [0.3.0]

### Changed

- Replace `caip-x` with `caip-348` for externally_connectable transport ([#40](https://github.com/MetaMask/multichain-api-client/pull/40))

## [0.2.0]

### Added

- Add Firefox window.postMessage transport ([#36](https://github.com/MetaMask/multichain-api-client/pull/36))

## [0.1.1]

### Fixed

- Bm/remove request timeout ([#31](https://github.com/MetaMask/multichain-api-client/pull/31))

## [0.1.0]

### Changed

- Initial release

[Unreleased]: https://github.com/MetaMask/multichain-api-client/compare/v0.6.5...HEAD
[0.6.5]: https://github.com/MetaMask/multichain-api-client/compare/v0.6.4...v0.6.5
[0.6.4]: https://github.com/MetaMask/multichain-api-client/compare/v0.6.3...v0.6.4
[0.6.3]: https://github.com/MetaMask/multichain-api-client/compare/v0.6.2...v0.6.3
[0.6.2]: https://github.com/MetaMask/multichain-api-client/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/MetaMask/multichain-api-client/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/MetaMask/multichain-api-client/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/MetaMask/multichain-api-client/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/MetaMask/multichain-api-client/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MetaMask/multichain-api-client/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MetaMask/multichain-api-client/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/MetaMask/multichain-api-client/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MetaMask/multichain-api-client/releases/tag/v0.1.0
