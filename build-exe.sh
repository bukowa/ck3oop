#!/bin/bash
set -xe
# parcel
parcel build --target=winexe
# https://nodejs.org/api/single-executable-applications.html
node --experimental-sea-config sea-config.json
node -e "require('fs').copyFileSync(process.execPath, './dist/main.exe')"
signtool remove /s ./dist/main.exe
npx postject ./dist/main.exe NODE_SEA_BLOB ./dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
signtool sign /fd SHA256 ./dist/main.exe
echo "Size of the binary: $(du -h ./dist/main.exe | cut -f1)"
