#!/bin/sh
# Compatibility entry: the Node CLI owns the build.
set -eu
cd "$(dirname "$0")"
exec node tools/slide.mjs build "$@"
