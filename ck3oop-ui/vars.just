export TAURI_BIN_NAME := "ck3oop-ui"

exe := if os() == 'windows' { ".exe" } else { "" }

export PATH_DEBUG_BINARY := env('PATH_DEBUG_BINARY', \
    absolute_path(source_directory() + "/..") / "target/debug"     / TAURI_BIN_NAME + exe)

export PATH_RELEASE_BINARY := env('PATH_RELEASE_BINARY', \
    absolute_path(source_directory() + "/..") / "target/release"   / TAURI_BIN_NAME + exe)
