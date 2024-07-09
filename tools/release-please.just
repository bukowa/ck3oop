export PATH_BUILD_DIR := absolute_path(".build")
export DIR_RELEASE_PLEASE := "release-please"
export PATH_RELEASE_PLEASE := PATH_BUILD_DIR / DIR_RELEASE_PLEASE

export RELEASE_PLEASE_REV := "ace2bd5dc778f83c33ad5dee6807db5d0afdba36"
export RELEASE_PLEASE_TOKEN := env_var_or_default('RELEASE_PLEASE_TOKEN', '')

_:
    just --list --list-submodules

init:
    mkdir -p "{{PATH_BUILD_DIR}}"

[group('release')]
[doc('cleans release-please dir')]
clean-release-please:
    rm -rf "{{PATH_RELEASE_PLEASE}}"

[group('release')]
[doc('pulls and builds release-please with patches')]
build-release-please: init
    #!/bin/bash
    set -euov pipefail
    cd "{{PATH_BUILD_DIR}}"
    # clone only if the directory doesn't exist
    [ -d "{{DIR_RELEASE_PLEASE}}" ] || git clone --depth 1 git@github.com:googleapis/release-please.git
    cd "{{DIR_RELEASE_PLEASE}}"
    git checkout $RELEASE_PLEASE_REV
    # apply patches only if they haven't been applied
    patch_files=$(ls ../../patches/release-please/**.patch)
    for patch_file in "${patch_files[@]}"; do
      if git apply --check $patch_file; then
        git apply $patch_file
      fi
    done
    npm install

[group('release')]
[doc('run PR with release-please')]
release-please-pr *ARGS:
    #!/bin/bash
    set -euov pipefail
    # if token is not set, then exit
    if [ -z "$RELEASE_PLEASE_TOKEN" ]; then
      echo "RELEASE_PLEASE_TOKEN is not set"
      exit 1
    fi
    cd "{{PATH_RELEASE_PLEASE}}"
    git checkout $RELEASE_PLEASE_REV
    node ./build/src/bin/release-please.js release-pr \
        --repo-url=https://github.com/bukowa/ck3oop \
        --config-file=.github/release-please-config.json \
        --manifest-file=.github/.release-please-manifest.json \
        --token=$RELEASE_PLEASE_TOKEN \
        --monorepo-tags \
        {{ARGS}}

[group('release')]
[doc('mark correct release as latest')]
release-mark-latest:
    #!/bin/bash
    release_id=$(
      gh release list \
        --exclude-drafts --exclude-pre-releases \
        -L 20 --json tagName | \
        jq '.[] | select(.tagName | startswith("ck3oop-ui-v")) | .[]' -r | head -n1)
    # ask for confirmation
    read -p "Mark release $release_id as latest? [y/N] " -n 1 -r
    gh release edit $release_id --latest

#[confirm]
#cleanup-release-please:
#    gh release list  --json tagName | jq '.[].tagName' --raw-output0 | \
#    xargs -0 -I {} gh release delete "{}" --cleanup-tag
#
#    gh pr list --label "autorelease: tagged" --state=all  --json url \
#    | jq '.[].url' --raw-output0 \
#    | xargs -I {} -0 gh pr close {}
#
#    gh pr list --label "autorelease: pending" --state=all  --json url \
#    | jq '.[].url' --raw-output0 \
#    | xargs -I {} -0 gh pr close {}
#
#    gh pr list --label "autorelease: tagged" --state=all  --json url \
#    | jq '.[].url' --raw-output0 \
#    | xargs -I {} -0 gh pr edit --remove-label "autorelease: tagged" {}
#
#    gh pr list --label "autorelease: pending" --state=all  --json url \
#    | jq '.[].url' --raw-output0 \
#    | xargs -I {} -0 gh pr edit --remove-label "autorelease: pending" {}
