# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com), and the project follows [Semantic Versioning](https://semver.org).

## [Unreleased]

## [0.1.0] - 2026-10-30

Initial preview. The API may change before 1.0. See the documented native verification limits before choosing an adapter.

### Added

- `@priemskiyyy/frame`: `widget()` definitions, `Frame` with an ordered list of adapters, typed handles with `publish`, `reset`, `publishTimeline`, `reload` and `readback`, eleven outcomes with named evidence, frozen validated snapshots, ordering and coalescing, deduplication, write domains with a deadline, contexts, diagnostics and an injectable clock. The `./adapter` subpath carries the adapter contract as types, `./mock` the mock adapter and test clock, and `./testing` the conformance suite.
- `@priemskiyyy/frame-react`: `FrameProvider`, `Register`, `useFrame`, `useFrameDiagnostics`, `useWidget`, `useWidgetData` and `useWidgetStatus`.
- `@priemskiyyy/frame-expo`: iOS home screen widgets over `expo-widgets`, with timeline, reload and readback.
- `@priemskiyyy/frame-voltra-ios`: iOS home screen widgets over Voltra's payload mode, with timeline and reload.
- `@priemskiyyy/frame-android-widget`: Android home screen widgets over `react-native-android-widget`.
- `examples/expo`: Frame Studio, a showcase app over a real widget and over the mock.
- Native smoke checks for all three adapters, including rendered home screen widgets on iOS 26.5 and Android API 36; the verification limits record the operations and native setup corrections.

[Unreleased]: https://github.com/priemskiyyy/frame/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/priemskiyyy/frame/releases/tag/v0.1.0
