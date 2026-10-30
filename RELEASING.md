# Releasing

Frame's packages are versioned together and published together. Nothing is published from a developer machine once the first release is out.

1. Start from a clean `main`, and run `pnpm install --frozen-lockfile`.
2. Run `pnpm check:release`. It builds, type-checks, lints, proves the lint rules, runs the unit tests with coverage and the mutation probes, installs the packed tarballs into an empty project and type-checks a consumer, checks the documentation and checks the release metadata.
3. Set the new version in every `package.json` under `packages/`, and in each adapter's and the React package's `@priemskiyyy/frame` peer range, which follows the minor version (`>=0.2.0 <0.3` for 0.2.x). Move the entries of [CHANGELOG.md](CHANGELOG.md) under the new heading and replace `Unreleased` with the date. Replace the `Nothing is published yet` sentence in the README's Status section.
4. Run `pnpm check:release` again, because it checks that the versions, the peer ranges and the changelog agree, and that the README and the changelog agree on whether the version is published.
5. Commit, tag `vX.Y.Z` and push the tag.
6. Publish a GitHub release for the tag. The `publish` workflow verifies the tag against the manifests, runs `pnpm check:release`, packs every package once, checks the checksums and publishes the tarballs with provenance, the core first. A release marked as a prerelease publishes under the `next` tag.
7. Check that each package is on the registry with its provenance attestation.

## The first release

The `publish` workflow publishes through npm trusted publishing, which is configured per existing package, so the first version of each package is published by hand. Log in with `npm login`, then publish the verified tarballs in dependency order: `@priemskiyyy/frame`, then `-react`, `-expo`, `-voltra-ios` and `-android-widget`, each with `npm publish <archive>.tgz --access public --tag next`. Then add the trusted publisher on npmjs.com for each package: the repository `priemskiyyy/frame`, the workflow `publish.yml` and the environment `npm`. The repository must be public first, because provenance names it.

The initial 0.1.0 packages are previews. Inspect the resulting dist-tags and keep their verification limits in the package READMEs. The first publication can also acquire a `latest` alias, so the tag alone does not communicate preview status. Do not create a GitHub release for a version already bootstrapped by hand: its workflow would attempt to publish that immutable version again.

## A device run

A device run is separate evidence and is never replaced by the checks above. Before a release that changes an adapter, run the example app on the platform it covers, and update the adapter's README with what ran and what did not.
