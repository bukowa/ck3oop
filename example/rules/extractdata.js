const path = require("path");
const fs = require("fs");


function parsingRule(
    context,
    {
        parser,
        gameFiles,
        enabledMods,
        enabledFiles,
    },
) {

    // We want to save extra data to the context
    // This will be passed to the next rule
    context.parsingRule = {
        extra: true,
    };

    // We care are only about particular mod
    // (can be read from the context or filesystem)
    let mod = enabledMods.find(mod => mod.fileName === "mod/ugc_2507209632.mod");

    // Log mod to the console, but without files to cut the output
    console.log(({
        ...mod,
        files: null
    }));

    // We are only interested in files of this mod
    let modFiles = mod.files;

    // Maybe we are interested in files that are present in the base game only?
    let modGameFiles = modFiles.filter(modFile => gameFiles.find(gameFile => gameFile.path === modFile.path)).slice(0, 10);

    // No, let's just take files in '"\\common\\culture\\cultures\\'
    let modCultureFiles = modFiles.filter(modFile => modFile.dir === "\\common\\culture\\cultures");

    // We want to save them to file
    fs.writeFileSync(path.join(context.workDir, "rulesout", "modCultureFiles.json"), JSON.stringify(modCultureFiles, null, 4));

    // Log first file to the console
    console.log(({
        ...modCultureFiles[0],
        stats: null
    }))

    // Let's build a list of all cultures and traditions
    let cultures = [];
    let traditions = [];
    let logged = false;

    modCultureFiles.forEach(modCultureFile => {

        // Read file content
        let fileContent = fs.readFileSync(modCultureFile.fullPath, "utf-8");

        // Parse file content using Jomini
        let parsed = parser.parseText(fileContent);

        // Add cultures and traditions to the lists
        cultures.push(...Object.keys(parsed));
        traditions.push(...Object.values(parsed).map(culture => culture.traditions).flat());

        // Log first culture to the console
        if (!logged) {
            console.log(parsed);
            logged = true;
        }
    });

    // Save cultures and traditions to the context
    context.parsingRule.cultures = cultures;
    context.parsingRule.traditions = traditions;

    // And to file
    fs.writeFileSync(path.join(context.workDir, "rulesout", `cultures.json`), JSON.stringify(cultures, null, 4));
    fs.writeFileSync(path.join(context.workDir, "rulesout", `traditions.json`), JSON.stringify(traditions, null, 4));
    return context;
}

parsingRule.name = "parsingRule";
module.exports = parsingRule;
