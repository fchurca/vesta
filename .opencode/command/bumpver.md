---
description: Bump the version in package.json. Argument: major, minor, or patch (default patch).
---

Read `package.json` from the project root, parse the current `"version"` field as semver (e.g. `"0.4.2"`), increment the segment matching the argument — `$1` should be `"major"`, `"minor"`, or `"patch"` (default to `"patch"` if no argument given or argument is unrecognized) — and write the bumped version back into `package.json`. Do not touch any other field.
