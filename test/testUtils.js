const path = require("path");
const fs = require("fs");

let pathInExampleDir = (f) => path.join(__dirname, "..", "example", f);
let pathInTestDir = (f) => path.join(__dirname, f);
let readFileInExampleDir = (f) => fs.readFileSync(pathInExampleDir(f), "utf-8");

module.exports = {
    pathInExampleDir,
    readFileInExampleDir,
    pathInTestDir
}
