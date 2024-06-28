set shell := ["sh", "-c"]
set windows-shell := ["sh", "-c"]

export WEBKIT_DEBUG := "all"

exe := if os() == 'windows' { ".exe" } else { "" }

export PATH_BUILD_DIR := absolute_path(".build")
export PATH_BUILD_BIN := PATH_BUILD_DIR + / "bin"
export PATH_BUILD_TEMP := PATH_BUILD_DIR + / "temp"

export PATH := \
    absolute_path(".") + "/node_modules/.bin:" \
    + PATH_BUILD_BIN + ":" \
    + env_var('PATH')

export SOME_VAR := `echo ok`

export PATH_TAURI_DRIVER_BINARY := env('PATH_TAURI_DRIVER_BINARY', PATH_BUILD_BIN / "tauri-driver-fork" + exe)
# if we are on unix we need to get path to `WebKitWebDriver`
export PATH_WEBDRIVER_BINARY := env('PATH_WEBDRIVER_BINARY', \
    if os() == 'windows' \
    {PATH_BUILD_BIN + "/msedgedriver" + exe } \
    else { shell('which $1 || true', 'WebKitWebDriver')})

export PATH_TAURI_RELEASE_BINARY := env('PATH_TAURI_RELEASE_BINARY', \
    absolute_path(".") / "target/release/ck3oop-ui" + exe)

export PATH_TAURI_DEBUG_BINARY := env('PATH_TAURI_DEBUG_BINARY', \
    absolute_path(".") / "target/debug/ck3oop-ui" + exe)

# default target
_:
    @just --list

[group('setup')]
[doc('print info about prerequisites for the project to
as a shortcut you can run: . <(just prerequisites)')]
[unix]
prerequisites:
    #!/bin/bash
    set -euo pipefail
    echo $(cat <<EOF
    sudo apt update &&
    sudo apt install libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
    xvfb \
    webkit2gtk-driver
    EOF
    )

[group('setup')]
[doc('initialize the build tool')]
init:
    mkdir -p $PATH_BUILD_DIR
    mkdir -p $PATH_BUILD_BIN
    mkdir -p $PATH_BUILD_TEMP

[group('tauri')]
[doc('run the tauri cli')]
tauri *ARGS:
    npm run --workspace=ck3oop-ui tauri -- {{ARGS}}

[group('tauri')]
[doc('build the tauri app for testing in release mode')]
tauri-b-for-tests:
    #!/bin/bash
    if [ -n "$TRACE" ]; then set -x; fi
    set -euov pipefail
    just tauri build --no-bundle
    test -f $PATH_TAURI_RELEASE_BINARY

[group('tauri')]
[doc('build the tauri app for testing in debug mode')]
tauri-b-for-tests-debug:
    #!/bin/bash
    if [ -n "$TRACE" ]; then set -x; fi
    set -euov pipefail
    just tauri build --debug --no-bundle
    test -f $PATH_TAURI_DEBUG_BINARY

[group('webview')]
[doc('downloads the tauri driver')]
tauri-driver-download:
    cargo install tauri-driver-fork@0.1.5 --root=$PATH_BUILD_DIR
    test -f $PATH_TAURI_DRIVER_BINARY

[group('webview')]
[doc('get microsoftege version')]
[windows]
browser-version:
    REG QUERY "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{56EB18F8-B008-4CBD-B6D2-8C97FE7E9062}" | grep pv | awk '{print $3}'

[group('webview')]
[doc('get the webdriver url')]
[windows]
webdriver-url:
    #!/bin/bash
    echo "https://msedgedriver.azureedge.net/$(just browser-version)/edgedriver_win64.zip"

[group('webview')]
[doc('downloads the webdriver')]
[windows]
webdriver-download: init
    #!/bin/bash
    if [ -n "$TRACE" ]; then set -x; fi
    set -euo pipefail

    version=$(just browser-version)

    zip_file=$PATH_BUILD_TEMP/webdriver.zip
    unzip_dir=$PATH_BUILD_TEMP/webdriver
    unzip_file=$PATH_WEBDRIVER_BINARY
    unzip_file_compares=$unzip_dir/msedgedriver.$version.exe

    # if there's unzip_file and unzip_file_compares
    # compare their sha, if they are the same, then
    # we don't need to download the webdriver
    if [ -f $unzip_file ] && [ -f $unzip_file_compares ]; then
        sha1sum $unzip_file $unzip_file_compares | awk '{print $1}' | uniq | wc -l | grep -q 1
        if [ $? -eq 0 ]; then
            echo "Webdriver found at: '$unzip_file'"
            exit 0
        fi
    fi

    curl -L $(just webdriver-url) -o $zip_file
    unzip -o $zip_file -d $unzip_dir
    cp $unzip_dir/msedgedriver.exe $unzip_file
    cp $unzip_dir/msedgedriver.exe $unzip_file_compares
    test -f $PATH_WEBDRIVER_BINARY

[group('webview')]
[doc('downloads the webdriver')]
[unix]
webdriver-download:
    #!/bin/bash
    if [ -n "$TRACE" ]; then set -x; fi
    set -euo pipefail
    if [ -n "$PATH_WEBDRIVER_BINARY" ] && [ -f $PATH_WEBDRIVER_BINARY ]; then
        echo "Webdriver found at: '$PATH_WEBDRIVER_BINARY'"
        exit 0
    else
        error_message=$(cat <<EOF
    Error: Webdriver is not found at: '$PATH_WEBDRIVER_BINARY' (PATH_WEBDRIVER_BINARY).
    To download it, you can use the following commands:
      sudo apt update
      sudo apt install webkit2gtk-driver xvfb -y
    EOF
    )
          echo "$error_message"
          exit 1
    fi


export NODE_TEST_TIMEOUT := env('NODE_TEST_TIMEOUT', '20000')

[group('tests')]
[doc('run the e2e tests using ts-node and swc')]
test-e2e-fast:
    node \
      --test --test-force-exit --test-timeout=$NODE_TEST_TIMEOUT \
      --require ts-node/register \
      tests-e2e

[group('tests')]
[doc('builds ts projects with --incremental flag and runs e2e tests using ts-node and swc')]
test-e2e-fast-build:
    npm run build-incremental
    just tauri-b-for-tests
    just test-e2e-fast

[group('tests')]
[doc('run the e2e tests')]
test-e2e: webdriver-download tauri-driver-download
    npm install
    npm run build
    just tauri-b-for-tests
    npm run --workspace=tests-e2e build
    node --test --test-force-exit --test-timeout=$NODE_TEST_TIMEOUT tests-e2e/dist/main.js

[group('tests')]
[doc('run tauri app')]
run-tauri target="release":
    #!/bin/bash
    echo "Usage: just run-tauri <debug|release>"
    if [ -n "$TRACE" ]; then set -x; fi
    set -euo pipefail
    if [ {{target}} == "release" ]; then
        $PATH_TAURI_RELEASE_BINARY &
    elif [ {{target}} == "debug" ]; then
        $PATH_TAURI_DEBUG_BINARY &
    else
        echo "Unknown target: $target"
        exit 1
    fi

npm-install:
    npm install --silent

npm-build:
    npm run build --silent

clippy:
    cargo clippy -- -D warnings

clippy-fix extra="":
    cargo clippy --fix {{extra}} -- -D warnings

fmt:
    cargo fmt --

export RELEASE_PLEASE_REV := "ace2bd5dc778f83c33ad5dee6807db5d0afdba36"
export RELEASE_PLEASE_TOKEN := env_var_or_default('RELEASE_PLEASE_TOKEN', '')

[group('release')]
[doc('cleans release-please dir')]
[confirm]
clean-release-please:
    rm -rf .github/release-please

[group('release')]
[doc('pulls and builds release-please with patches')]
build-release-please:
    #!/bin/bash
    if [ -n "$TRACE" ]; then set -x; fi
    set -euov pipefail
    cd .github/
    # clone only if the directory doesn't exist
    [ -d release-please ] || git clone git@github.com:googleapis/release-please.git
    cd release-please
    git checkout $RELEASE_PLEASE_REV
    # apply patches only if they haven't been applied
    patch_files=$(ls ../patches/release-please/**.patch)
    for patch_file in "${patch_files[@]}"; do
      if git apply --check $patch_file; then
        git apply $patch_file
      fi
    done
    npm install

[group('release')]
[doc('run PR with release-please')]
release-please-pr:
    #!/bin/bash
    set -euov pipefail
    # if token is not set, then exit
    if [ -z "$RELEASE_PLEASE_TOKEN" ]; then
      echo "RELEASE_PLEASE_TOKEN is not set"
      exit 1
    fi
    cd .github/release-please
    git checkout $RELEASE_PLEASE_REV
    node ./build/src/bin/release-please.js release-pr \
        --repo-url=https://github.com/bukowa/ck3oop \
        --config-file=.github/release-please-config.json \
        --manifest-file=.github/.release-please-manifest.json \
        --token=$RELEASE_PLEASE_TOKEN \
        --monorepo-tags

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

[group('debug')]
[windows]
wsl-restart:
    wsl -d Ubuntu-22.04 --shutdown

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
