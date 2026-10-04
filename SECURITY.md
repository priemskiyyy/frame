# Security

## Supported versions

Only the latest minor version of each package receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability. Report it privately through GitHub's [private vulnerability reporting](https://github.com/priemskiyyy/frame/security/advisories/new) for this repository, with what you found, the version affected and, if you can, a minimal way to reproduce it.

You can expect an acknowledgement within a few days. A fix is released as a patch version, and the advisory credits the reporter unless they prefer otherwise.

## What counts

Frame hands your data to widget providers and reads it back, so these are in scope:

- a value reaching a provider that the schema, the limits or a context change should have refused;
- one account's data reaching the next account's widget after a context change;
- diagnostics or an error carrying a value you published;
- a prototype pollution or injection through the data Frame captures or reads back.

Frame is not an authorization boundary and stores nothing. Data on a home screen widget is visible on the device, so do not publish what a lock screen should not show.
