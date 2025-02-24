const path = require("path");
const fs = require("fs");

function saveargsasjson(
    context,
    {
        enabledMods,
        enabledFiles,
        gameFiles,
    },
) {

    // Slice object to get only n elements
    // We don't want to flood the git repository with large files
    let sliceObject = (dict, n1, n2) => Object.fromEntries(Object.entries(dict).slice(n1, n2));

    // Sort enabled files by length of array
    let sortedEnabledFiles = Object.fromEntries(
        Object.entries(enabledFiles).sort((a, b) => b[1].length - a[1].length)
    );

    // Write files to disk but trim the output
    let files = [
        [
            "context.json", JSON.stringify(context, null, 4)
        ],
        [
            "enabledFiles.json", JSON.stringify(sliceObject(enabledFiles, 0, 10), null, 4)
        ],
        [
            "sortedEnabledFiles.json", JSON.stringify(sliceObject(sortedEnabledFiles, 0, 10), null, 4)
        ],
        [
            "enabledMods.json", JSON.stringify(enabledMods.slice(5, 6), null, 4)
        ],
        [
            "gameFiles.json", JSON.stringify(gameFiles.slice(0,10), null, 4)
        ],
    ].map(f => fs.writeFileSync(path.join(context.workDir, "rulesout", f[0]), f[1]));

    return context;
}

saveargsasjson.name = "saveLoadingOrder";
module.exports = saveargsasjson;
