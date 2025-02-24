const path = require("path");
const fs = require("fs");

function powerSet(arr, includeEmptySet = false) {
    const newArr = [];

    const numOfCombinations = Math.pow(2, arr.length);
    for (let i = 0; i < numOfCombinations; i++) {
        let combination = [];
        for (let j = 0; j < arr.length; j++) {
            if (i & (1 << j)) {
                combination.push(arr[j]);
            }
        }
        newArr.push(combination);
    }
    if (!includeEmptySet && newArr.length > 0) {
        newArr.shift();
    }
    return newArr;
}

function buildInPath(context, fileName) {
    return path.join(context.workDir, fileName)
}

function buildOutPath(context, fileName) {
    return path.join(context.workDir, "rulesOut", fileName);
}

function readJsonFile(filePath) {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);

}

function writeJsonFile(filePath, data) {
    const jsonData = JSON.stringify(data, null, 4);
    fs.writeFileSync(filePath, jsonData);
}

function tryParse(parser, filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        return parser.parseText(fileContent);
    } catch (e) {
        console.error(`Error parsing file: ${filePath}`);
        console.error(e);
        throw e;
    }
}

ctx = (context) => {
    return {
        buildInPath: (fileName) => buildInPath(context, fileName),
        buildOutPath: (fileName) => buildOutPath(context, fileName),
        readJsonFile: (filePath) => readJsonFile(filePath),
        writeJsonFile: (filePath, data) => writeJsonFile(filePath, data),
    }
}

module.exports = {
    powerSet,
    ctx,
    tryParse,
    writeJsonFile,
    readJsonFile,
}
