const _ = require('lodash');
const fs = require("fs");
const utils = require('./../utils');
const path = require("path");

// Assume that redefining character key overwrites it completely
// Exposes getMod() method to get the mod that the character belongs to
// Exposes getFile() method to get the file that the character was defined in
function setCharacters(
    context,
    {
        parser,
        gameFiles,
        enabledMods,
    },
) {

    context['game_characters'] = parseCharacters(gameFiles, parser);
    context['mods_characters'] = _.map(enabledMods, mod=>parseCharacters(mod.files, parser))
    context['play_characters'] = {
        ...context['game_characters'],
        ...context['mods_characters'].reduce((acc, curr) => ({...acc, ...curr}), {})
    }

    context['mods_characters'].forEach((characters, index) => {
        characters.getMod = () => enabledMods[index];
    });

    saveCharacters(context, 'mods_characters')
    return context;
}

function parseCharacters(files, parser) {
    let characters = {};
    files.filter(file => file.dir === "\\history\\characters").map(file => {
        const fileContent = fs.readFileSync(file.fullPath, "utf-8");
        let parsed = parser.parseText(fileContent);
        _.keys(parsed).map(key => {
            characters[key] = {
                ...parsed[key],
                getKey: function() {
                    return key;
                },
                getFile: function() {
                    return file;
                }
            }
        })
    });
    return characters;
}

function saveCharacters(context, key){
    utils.writeJsonFile(
        path.join(context.workDir, "rulesout", "characters", `${key}.json`),
        context[key]
    )
}

module.exports = setCharacters;
