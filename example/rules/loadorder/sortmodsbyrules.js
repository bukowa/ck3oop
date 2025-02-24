const _ = require('lodash');
const fs = require("fs");
const utils = require('./../utils');
const path = require("path");
const ajv = require('ajv');

function sortModsByRules(
    context,
    {
        parser,
        gameFiles,
        enabledFiles,
        enabledMods,
    },
) {
    let sortingRules = JSON.parse(fs.readFileSync(path.join(__dirname, 'sorting_rules.json'), 'utf8'));
    validateLoadOrderFile(sortingRules);

    let expandedSortingRules = _.reduce(sortingRules.database, (acc, mod) => ({
        ...acc,
        [mod.name]: {
            "after": _.map(mod.loadAfter, (value, key) => {
                if (key === "*") {
                    return _.map(sortingRules.database, (value, key) => value.name);
                }
                return sortingRules.database[key].name;
            }),
            "before": _.map(mod.loadBefore, (value, key) => {
                if (key === "*") {
                    return _.map(sortingRules.database, (value, key) => value.name);
                }
                return sortingRules.database[key].name;
            }),
        },
    }), {});

    let cleanedSortingRules = _.reduce(expandedSortingRules, (acc, value, key) => ({
        ...acc,
        [key]: {
            "after": _.uniq(_.flatten(value.after)).filter(name => name !== key),
            "before": _.uniq(_.flatten(value.before)).filter(name => name !== key),
        },
    }), {});

    function parseDependencies(data) {
        const dependencies = {};

        for (const module in data) {
            dependencies[module] = data[module].after;
        }

        for (const module in data) {
            for (const dependency of data[module].before.reverse()) {
                if (!dependencies[dependency]) {
                    dependencies[dependency] = [];
                }
                if (!dependencies[dependency].includes(module)) {
                    dependencies[dependency].unshift(module);
                }
            }
        }
        return dependencies;
    }

    function topologicalSortUtil(module, dependencies, visited, stack) {
        visited.add(module);
        for (const dependency of dependencies[module]) {
            if (!visited.has(dependency)) {
                topologicalSortUtil(dependency, dependencies, visited, stack);
            }
        }
        stack.push(module);
    }

    function topologicalSort(dependencies) {
        const visited = new Set();
        const stack = [];
        for (const module in dependencies) {
            if (!visited.has(module)) {
                topologicalSortUtil(module, dependencies, visited, stack);
            }
        }
        return stack.reverse();
    }

    function sortModules(data) {
        const dependencies = parseDependencies(data);
        return topologicalSort(dependencies);
    }

    const modsToSort = _.map(enabledMods, mod => mod.name);
    const sortedModules = sortModules(sortObjectProperties(cleanedSortingRules)).reverse();
    let modsWithoutRules = _.difference(modsToSort, sortedModules);
    let modsToSortWithRules = _.intersection(modsToSort, sortedModules);

    let sortedMods = sortedModules.filter(mod => _.includes(modsToSortWithRules, mod));
    sortedMods = sortedMods.concat(modsWithoutRules);

    console.log("Mods to sort:", modsToSort);
    console.log("Sorted modules:", sortedModules);
    console.log("Sorted mod list:", sortedMods);

    context["sortedModNames"] = sortedMods;
    context["sortedModules"] = sortedModules;
    context["cleanedSortingRules"] = cleanedSortingRules;
    context["expandedSortingRules"] = expandedSortingRules;
    // Load order has changed - sort the enabled files
    context["enabledFiles"] = {};

    for (const [file, mod] of Object.entries(enabledFiles)) {
        context["enabledFiles"][file] = mod.sort((a, b) => {
            return sortedMods.indexOf(a.modName) - sortedMods.indexOf(b.modName);
        });
    }

    context['sortedFiles'] =
        _.chain(enabledFiles)
            .pickBy((mods) => mods.length >= 2)
            .toPairs()
            .sortBy(([file, mods]) =>
                [file, _.sortBy(mods, mod => context["sortedModules"].indexOf(mod.modName))])
            .fromPairs()
            .value()


    let sortedDlcLoad = {
        "enabled_mods": [],
        "disabled_dlcs": [],
    }

    let sourtedPlayeset = {
        game: "ck3",
        name: "sorted_playset",
        mods: []
    }

    _.map(sortedMods, function(m, i){
        let mod = enabledMods.find(mod => mod.name === m)
        sortedDlcLoad.enabled_mods.push(mod.fileName)
        sourtedPlayeset.mods.push({
            "displayName": mod.name,
            "enabled": true,
            "position": i,
            "steamId": mod.remote_file_id,
            // position
        })
    })


    // save sorted mods to file
    utils.writeJsonFile(path.join(context.workDir, "sorted_mods.json"), sortedDlcLoad);
    utils.writeJsonFile(path.join(context.workDir, "sorted_playset.json"), sourtedPlayeset);

    return context
}

function validateLoadOrderFile(loadOrder) {
    const schema = {
        type: "object",
        required: ["database"],
        additionalProperties: false,
        properties: {
            "database": {
                type: "object",
                additionalProperties: {
                    required: ["name"],
                    type: "object",
                    properties: {
                        "name": {type: "string"},
                        "loadBefore": {
                            type: "object",
                            additionalProperties: {
                                type: "object",
                                properties: {
                                    "stable": {type: "string"},
                                },
                            }
                        },
                        "loadAfter": {
                            type: "object",
                            additionalProperties: {
                                type: "object",
                            }
                        },
                    },
                }
            }
        },
    }
    const validate = new ajv().compile(schema);
    const valid = validate(loadOrder);
    if (!valid) {
        console.log("Invalid load order file json schema")
        console.log(validate.errors)
        process.exit(1)
    }
}

function sortObjectProperties(obj) {
    const keys = Object.keys(obj);

    const sortedKeys = _.sortBy(keys);

    const sortedObj = {};
    sortedKeys.forEach(key => {
        sortedObj[key] = obj[key];
    });

    return sortedObj;
}

function shuffleObjectProperties(obj) {
    const keys = Object.keys(obj);

    const shuffledKeys = _.shuffle(keys);

    const shuffledObj = {};
    shuffledKeys.forEach(key => {
        shuffledObj[key] = obj[key];
    });

    return shuffledObj;
}

module.exports = sortModsByRules;
