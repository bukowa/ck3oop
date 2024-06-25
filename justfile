set shell := ["sh", "-c"]
set windows-shell := ["sh", "-c"]

exe := if os() == 'windows' { ".exe" } else { "" }

export PATH_BUILD_DIR := absolute_path(".build")
export PATH_BUILD_BIN := PATH_BUILD_DIR + / "bin"
export PATH_BUILD_TEMP := PATH_BUILD_DIR + / "temp"

export PATH := \
    absolute_path(".") + "/node_modules/.bin:" \
    + PATH_BUILD_BIN + ":" \
    + env_var('PATH')

export SOME_VAR := `echo ok`

export PATH_TAURI_DRIVER_BINARY := PATH_BUILD_BIN / "tauri-driver-fork" + exe
# if we are on unix we need to get path to `WebKitWebDriver`
export PATH_WEBDRIVER_BINARY := \
    if os() == 'windows' \
    {PATH_BUILD_BIN + "/msedgedriver" + exe } \
    else { shell('which $1 || true', 'WebKitWebDriver')}

#export PATH_WEBDRIVER_BINARY := PATH_BUILD_BIN + "/msedgedriver" + exe
export PATH_TAURI_RELEASE_BINARY := absolute_path(".") / "target/release/ck3oop-ui" + exe

# default target
_:
    @just --list

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
[doc('build the tauri app for testing')]
tauri-b-for-tests:
    #!/bin/bash
    if [ -n "$VERBOSE" ]; then set -x; fi
    set -euo pipefail
    just tauri build --bundles=none
    test -f $PATH_TAURI_RELEASE_BINARY

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
    if [ -n "$VERBOSE" ]; then set -x; fi
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
    if [ -n "$VERBOSE" ]; then set -x; fi
    set -euo pipefail
    if [ -n "$PATH_WEBDRIVER_BINARY" ] && [ -f $PATH_WEBDRIVER_BINARY ]; then
        echo "Webdriver found at: '$PATH_WEBDRIVER_BINARY'"
        exit 0
    else
        error_message=$(cat <<EOF
    Error: Webdriver is not found at: '$PATH_WEBDRIVER_BINARY' (PATH_WEBDRIVER_BINARY).
    To download it, you can use the following commands:
      sudo apt update
      sudo apt install webkit2gtk-driver -y
    EOF
    )
          echo "$error_message"
          exit 1
    fi

[group('tests')]
[doc('run the e2e tests using ts-node and swc')]
test-e2e-fast:
    ts-node tests-e2e run

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
    npm run --workspace=tests-e2e run -- run

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
