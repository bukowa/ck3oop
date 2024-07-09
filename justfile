export JUST_UNSTABLE := "1"

set shell := ["sh", "-c"]
set windows-shell := ["sh", "-c"]

export PATH := \
    absolute_path(".") + "/node_modules/.bin:" \
    + env_var('PATH')

mod tools './tools/justfile'
mod ck3oop-ui './ck3oop-ui/justfile'
mod tests-e2e './tests-e2e/justfile'

DEFAULT:
    @just --list --list-submodules

deps:
    npm install
    just ck3oop-ui::deps

test:
    cargo test
    just deps
    npm run build
    just tests-e2e::run

prepare: deps
    npm run build --workspaces --if-present
