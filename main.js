const fs = require("fs");
const path = require("path");
const jomini = require("jomini");
const os = require("os");
const ini = require("ini");
const ajv = require('ajv');
function main() {

    // working directory as first argument
    if (process.argv.length > 2) {
        process.chdir(process.argv[2]);
    }

    // set the working directory
    const workDir = process.cwd();
    console.log(`Working in directory: ${workDir}`)

    // set the config file
    const configFile = path.join(workDir, 'ck3oop.json');
    console.log(`Using config file: ${configFile}`)

    // if the config file is not found, throw error
    if (!fs.existsSync(configFile)) {
        throw new Error(`Config file not found: ${configFile}`);
    }

    // load the config file
    const configData = fs.readFileSync(configFile, 'utf-8');
    const configJson = JSON.parse(configData);
    validateConfigJsonSchema(configJson);
    const CFG = new Config(configJson);
    console.log("Mod directory:", CFG.modDir);


    // read dlc_load.json
    console.log("Reading dlc_load.json...")
    const dlcLoadFile = path.join(workDir, "dlc_load.json");
    const DLC_LOAD = JSON.parse(fs.readFileSync(dlcLoadFile, 'utf-8'));
    console.log(DLC_LOAD['enabled_mods']);


    // build the mod list
    console.log("Creating enabled mods...")
    let ENABLED_MODS = [];
    DLC_LOAD['enabled_mods'].forEach(fileName => {
        let mod = new Mod(path.join(CFG.modDir, fileName), fileName);
        mod.resolvedPath = resolveModDir(mod.path, CFG.modDir);
        ENABLED_MODS.push(mod);
    });
    console.log(ENABLED_MODS.map(mod => mod.name));

    // read enabled rules
    console.log("Reading enabled rules...")
    let ENABLED_RULES = [];
    CFG.rules = CFG.rules.map(rule => {
        let rulePath = path.join(CFG.rulesDir, rule);
        if (!fs.existsSync(rulePath)) {
            throw new Error(`Rule file not found: ${rulePath}`);
        }
        let ruleFunc = require(rulePath);
        ENABLED_RULES.push(ruleFunc);
    });
    console.log(ENABLED_RULES.map(rule => rule.name));

    // read all files of the enabled_mods
    ENABLED_MODS.forEach(mod => {
        console.log(`Reading files of mod: ${mod.name}`);
        mod['files'] = [];
        iterateFiles(mod.resolvedPath, function (dirPath, filePath, stats) {
            let dir = dirPath.replace(mod.resolvedPath, "");
            let file = {
                "fullPath": path.join(mod.resolvedPath, dir, filePath),
                "path": path.join(dir, filePath),
                "dir": dir,
                "file": filePath,
                "stats": stats
            };
            mod.files.push(file);
        }, true);
    });

    let BASE_GAME_FILES = [];
    // read all files of the base game
    if (CFG.getGameDir() !== null && CFG.parseGameDir) {
        console.log(`Reading files of the base game...`)
        iterateFiles(CFG.getGameDir(), function (dirPath, filePath, stats) {
            let dir = dirPath.replace(CFG.getGameDir(), "");
            BASE_GAME_FILES.push({
                "fullPath": path.join(CFG.getGameDir(), dir, filePath),
                "path": path.join(dir, filePath),
                "file": filePath,
                "dir": dir,
                "stats": stats
            });
        }, true);
    }

    // create files load resolution order
    console.log("Creating load resolution order...")
    let ENABLED_FILES = {};

    // mod files
    ENABLED_MODS.forEach(mod => {
        mod.files.forEach(file => {
            if (!ENABLED_FILES[file.path]) {
                ENABLED_FILES[file.path] = [
                    {
                        "modName": mod.name,
                        "modPath": mod.path,
                        "fullPath": path.join(mod.resolvedPath, file.path),
                    }
                ];
            } else {
                ENABLED_FILES[file.path].push(
                    {
                        "modName": mod.name,
                        "modPath": mod.path,
                        "fullPath": path.join(mod.resolvedPath, file.path),
                    }
                );
            }
        });
    });

    // declare the context
    let CONTEXT = {
        "workDir": workDir,
        "config": CFG,
        "rules": ENABLED_RULES.map(rule => rule.name),
    };

    // function used to build args for each rule
    const runRule = (rule, parser) => {
        return rule(CONTEXT, {
            "parser": parser,
            "gameFiles": BASE_GAME_FILES,
            "enabledMods": ENABLED_MODS,
            "enabledFiles": ENABLED_FILES,
        });
    }

    // run the rules
    jomini.Jomini.initialize().then((parser) => {

        console.log("Running rules...")
        ENABLED_RULES.forEach(rule => {
            console.log(`Running rule: ${rule.name}`);
            CONTEXT = runRule(rule, parser);
            if (!CONTEXT) {
                throw new Error(`Rule ${rule.name} did not return a context.`);
            }
        });
    });
}



function validateConfigJsonSchema(config) {
    const schema = {
        "type": "object",
        "properties": {
            "gameDir": { "type": "string" },
            "parseGameDir": { "type": "boolean" },
            "modDir": { "type": "string" },
            "rulesDir": { "type": "string" },
            "rules": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            }
        },
        "required": ["gameDir", "parseGameDir", "rulesDir", "rules"],
    }
    const validate = new ajv().compile(schema);
    const valid = validate(config);
    if (!valid) {
        console.log(validate.errors);
        throw new Error("Invalid config file");
    }

}


//**
// * Config class representing `ck3oop.json` configuration file.
// * @param {Object} obj - Configuration object
// * @param {string} obj.modDir - Path to the mod directory
// * @param {string} obj.rulesDir - Path to the rules directory
// */
class Config {

    constructor(obj) {
        this.gameDir = obj.gameDir;
        this.parseGameDir = obj.parseGameDir;
        this.modDir = obj.modDir || getDefaultModDir();
        this.rulesDir = obj.rulesDir || path.join(process.cwd(), "rules");

        if (this.modDir.startsWith(".")) {
            this.modDir = path.join(process.cwd(), this.modDir);
        }

        if (this.rulesDir.startsWith(".")) {
            this.rulesDir = path.join(process.cwd(), this.rulesDir);
        }

        if (this.gameDir !== undefined && this.gameDir.startsWith(".")) {
            this.gameDir = path.join(process.cwd(), this._gameDir);
        }

        this.rules = obj.rules || [];
    }

    getGameDir() {
        switch (this.gameDir) {
            case undefined:
                return null;
            case null:
                return null;
            default:
                return path.join(this.gameDir, "game").normalize();
        }
    }
}

//**
// * Get the default mod directory
// * @returns {string} - Default mod directory
// */
function getDefaultModDir() {
    return path.join(...[
        os.homedir(),
        "Documents",
        "Paradox Interactive",
        "Crusader Kings III",
    ])
}


//**
// * Iterate over files in a directory.
// * @param {string} dirPath - Path to the directory
// * @param {function} fileCallback - Callback function to call for each file
// * @param {boolean} recursively - Whether to iterate over files recursively
// */
function iterateFiles(dirPath, fileCallback, recursively = false) {
    try {
        const files = fs.readdirSync(dirPath);
        files.forEach((file) => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                fileCallback(dirPath, file, stats);
            } else if (recursively && stats.isDirectory()) {
                iterateFiles(filePath, fileCallback, recursively);
            }
        });
    } catch (err) {
        throw new Error(`Unable to iterate directory: ${dirPath}` + err);
    }
}


//**
// * Mod class representing a mod file.
// * @param {string} filePath - Path to the mod file
// */
class Mod {
    constructor(filePath, fileName) {

        this.filePath = filePath;
        this.fileName = fileName;

        const data = fs.readFileSync(filePath, "utf-8");
        if (!data) {
            throw new Error("Error reading file");
        }
        const parsedData = ini.parse(data);

        this.version = parsedData.version || null;
        this.name = parsedData.name || null;
        this.picture = parsedData.picture || null;
        this.supported_version = parsedData.supported_version || null;
        this.path = parsedData.path || null;
        this.remote_file_id = parsedData.remote_file_id || null;
        this.resolvedPath = null;
    }
}

//**
// * Get the mod directory
// * @param {string} modDir - path to the mod directory
// * @param {string} modsDir - path to the mods directory
function resolveModDir(modPath, modsDir) {

    // If mod path is absolute it's probably in the
    // Program Files (x86)/Steam/steamapps/workshop/content/1158310 directory
    if (path.isAbsolute(modPath)) {
        return path.normalize(modPath);
    }

        // Otherwise it's probably in the
    // Documents/Paradox Interactive/Crusader Kings III/mods directory
    else {
        return path.join(modsDir, modPath);
    }
}

// as a script node /main.js
if (require.main === module) {
    main();
}
// built as node/dist/main.js or ./dist/main.exe
else if (require.main === undefined) {
    main();
}

module.exports = {
    Config,
    getDefaultModDir,
    iterateFiles,
    Mod,
    resolveModDir
}
