const path = require("path");
const fs = require("fs");
const _ = require('lodash');
const utils = require('./utils');

function conflictOnAction(
    context,
    {
        parser,
        gameFiles,
        enabledMods,
        enabledFiles,
    },
) {

    // Requires gameFiles
    if (gameFiles.length === 0) {
        throw new Error(`gameFiles is required and must contain at least one file`);
    }

    // Unimportant setup
    const outputDir = path.join(context.workDir, "rulesout", "conflict_on_action");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {recursive: true});
    }

    // Directory where on_action files are located
    const onActionDir = "\\common\\on_action";

    // We want to find all on_actions files in the base game
    const vanillaOnActionFiles = gameFiles.filter(gameFile => gameFile.dir === onActionDir);

    // Get all on_action events in the base game
    let vanillaOnActionEvents = vanillaOnActionFiles.map((f) => {
        let fileContent = fs.readFileSync(f.fullPath, "utf-8");
        let parsed = parser.parseText(fileContent);
        return Object.keys(parsed);
    }).flat();

    // Save them to file
    utils.writeJsonFile(path.join(outputDir, "vanilla_on_action.json"), vanillaOnActionEvents);

    // For each mods check if any of its on_actions conflict with the base game
    // That mean that it has the same key and overwrites "trigger" or "effect"
    enabledMods.forEach((mod) => {

        // Get all on_action files in the mod
        let modOnActionFiles = mod.files.filter(file => file.dir === onActionDir);

        // Loop through all on_action files
        let modOnActions = [];
        modOnActionFiles.forEach(onActionFile => {

            // Parse and push all keys to the list
            let parsed = utils.tryParse(parser, onActionFile.fullPath);
            modOnActions.push(...Object.keys(parsed));

            // Iterate through all keys in the on_action file
            Object.keys(parsed).forEach((key)=>{

                // If the key is in the base game, check if it conflicts
                if(vanillaOnActionEvents.includes(key)) {
                    if (parsed[key].effect !== undefined) {
                        console.log(`Conflict in ${mod.name} on_action: ${key} has an effect in ${onActionFile.file}`)
                    }
                    if (parsed[key].trigger !== undefined) {
                        console.log((`Conflict in ${mod.name} on_action: ${key} has a trigger in ${onActionFile.file}`))
                    }
                    // Log that it's correct
                    // console.log(`No conflict in ${mod.name} on_action: ${key} file: ${onActionFile.file}`);
                }
            })
        })

        // Write to file
        utils.writeJsonFile(path.join(outputDir, `${mod.name}_on_action.json`), modOnActions);

    })

    return context;
}

module.exports = conflictOnAction;
