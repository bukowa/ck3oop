const _ = require("lodash");
const ajv = require("ajv");
const {inspect} = require("util");

const RESERVED_MOD_KEYS = [
    "*" // wildcard for all mods
]

class RulesDefinitionError extends Error {
}

/**
 * Get dependencies that are not defined in the rules.
 * @param rules
 * @param modKey
 * @returns {string[]} - array of modKeys that are not defined in the rules.
 * */
function getNotDefinedDependencies(rules, modKey) {
    return _.difference(
        _.keys(rules['database'][modKey]['dependencies']),
        _.keys(rules['database'])
    );
}

/**
 * Get loadBefore dependencies that are not defined in the rules.
 * @param rules
 * @param modKey
 * @returns {string[]}  - array of modKeys that are not defined in the rules.
 */
function getNotDefinedLoadBefore(rules, modKey) {
    return _.difference(
        _.keys(rules['database'][modKey]['loadBefore']).filter(
            key => !RESERVED_MOD_KEYS.includes(key)
        ),
        _.keys(rules['database'])
    )
}

/**
 * Get loadAfter dependencies that are not defined in the rules.
 * @param rules
 * @param modKey
 * @returns {string[]}  - array of modKeys that are not defined in the rules.
 */
function getNotDefinedLoadAfter(rules, modKey) {
    return _.difference(
        _.keys(rules['database'][modKey]['loadAfter']).filter(
            key => !RESERVED_MOD_KEYS.includes(key)
        ),
        _.keys(rules['database'])
    )
}

const VALIDATE_HAS_NO_RESERVED_KEYS_ERRORS = {
    'database': new RulesDefinitionError(
        `'database' key contains any of reserved keys: ${RESERVED_MOD_KEYS}`,
    ),
    'dependencies': new RulesDefinitionError(
        `'dependencies' key contains any of reserved keys: ${RESERVED_MOD_KEYS}`,
    ),
}

/**
 * Validate that the rules do not contain reserved keys.
 * @param rules
 */
function validateHasNoReservedKeys(rules) {
    if (_.some(_.keys(rules['database']), key =>
        _.includes(RESERVED_MOD_KEYS, key))) {
        throw VALIDATE_HAS_NO_RESERVED_KEYS_ERRORS['database'];
    }

    if (_.keys(rules['database']).some(key =>
        _.some(_.keys(rules['database'][key]['dependencies']), key =>
            _.includes(RESERVED_MOD_KEYS, key)))) {
        throw VALIDATE_HAS_NO_RESERVED_KEYS_ERRORS['dependencies'];
    }
}


class RulesWithDuplicatedModNames extends RulesDefinitionError {
}

/**
 * Validate that the rules do not contain mods with duplicated names.
 * @param rules
 */
function validateModsHaveNoDuplicatedNames(rules) {
    const modNames = _.map(rules['database'], 'name');
    if (_.uniq(modNames).length !== modNames.length) {
        throw new RulesWithDuplicatedModNames(
            `Duplicated mod names: ${modNames.filter((name, index) => modNames.indexOf(name) !== index)}`
        );
    }
}

/**
 * Validate the rules object against a schema.
 * @param rules
 */
function validateRules(rules) {
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
    const valid = validate(rules);
    if (!valid) {
        throw new RulesDefinitionError(inspect(validate.errors));
    }
}

module.exports = {
    getNotDefinedDependencies,
    getNotDefinedLoadBefore,
    getNotDefinedLoadAfter,
    validateHasNoReservedKeys,
    VALIDATE_HAS_NO_RESERVED_KEYS_ERRORS,
    validateRules,
    validateModsHaveNoDuplicatedNames,
}
