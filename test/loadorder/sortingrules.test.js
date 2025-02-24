const assert = require("assert");
const _unit = require("../../example/rules/loadorder/sortingrules");


function createRules(rules) {
    _unit.validateRules(rules);
    return rules;
}

describe('getNotDefinedDependencies', () => {
    it("should return an array of dependencies that are not defined", () => {
        let rules = createRules(
            {
                "database": {
                    "mod1": {
                        "name": "",
                        "dependencies": {
                            "mod2": {},
                            "mod3": {}
                        }
                    },
                    "mod2": {
                        "name": "",
                        "dependencies": {
                            "mod1": {},
                            "mod2": {}
                        }
                    },
                    "mod3": {
                        "name": "",
                        "dependencies": {
                            "mod1": {},
                            "mod4": {},
                            "mod5": {}
                        }
                    }
                }
            }
        )
        assert.deepEqual(_unit.getNotDefinedDependencies(rules, "mod1"), []);
        assert.deepEqual(_unit.getNotDefinedDependencies(rules, "mod2"), []);
        assert.deepEqual(_unit.getNotDefinedDependencies(rules, "mod3"), ["mod4", "mod5"]);
    });
});

describe('getNotDefinedLoadBefore', () => {
    it("should return an array of loadBefore dependencies that are not defined", () => {
        let rules = createRules({
                "database": {
                    "mod1": {
                        "name": "",
                        "loadBefore": {
                            "mod2": {},
                            "mod3": {}
                        }
                    },
                    "mod2": {
                        "name": "",
                        "loadBefore": {
                            "mod1": {},
                            "mod2": {}
                        }
                    },
                    "mod3": {
                        "name": "",
                        "loadBefore": {
                            "mod1": {},
                            "mod4": {},
                            "mod5": {},
                        }
                    }
                }
            }
        )
        assert.deepEqual(_unit.getNotDefinedLoadBefore(rules, "mod1"), []);
        assert.deepEqual(_unit.getNotDefinedLoadBefore(rules, "mod2"), []);
        assert.deepEqual(_unit.getNotDefinedLoadBefore(rules, "mod3"), ["mod4", "mod5"]);
    });
});

describe('getNotDefinedLoadAfter', () => {
    it("should return an array of loadAfter dependencies that are not defined", () => {
        let rules = createRules({
            "database": {
                "mod1": {
                    "name": "",
                    "loadAfter": {
                        "mod2": {},
                        "mod3": {}
                    }
                },
                "mod2": {
                    "name": "",
                    "loadAfter": {
                        "mod1": {},
                        "mod2": {}
                    }
                },
                "mod3": {
                    "name": "",
                    "loadAfter": {
                        "mod1": {},
                        "mod4": {},
                        "mod5": {},
                    }
                }
            }
        })
        assert.deepEqual(_unit.getNotDefinedLoadAfter(rules, "mod1"), []);
        assert.deepEqual(_unit.getNotDefinedLoadAfter(rules, "mod2"), []);
        assert.deepEqual(_unit.getNotDefinedLoadAfter(rules, "mod3"), ["mod4", "mod5"]);
    });
});

describe('validateHasNoReservedKeys', () => {

    it("should not throw an error if no reserved keys are found", () => {
            let rules = createRules({
                "database": {
                    "mod1": {
                        "name": "",
                        "loadBefore": {
                            "mod2": {},
                            "mod3": {}
                        }
                    },
                    "mod2": {
                        "name": "",
                        "loadBefore": {
                            "mod1": {},
                            "mod2": {}
                        }
                    },
                    "mod3": {
                        "name": "",
                        "loadBefore": {
                            "mod1": {},
                            "mod4": {},
                            "mod5": {},
                        }
                    }
                }
            })
            assert.doesNotThrow(() => _unit.validateHasNoReservedKeys(rules));
        }
    )

    it("should throw an error if reserved keys are found in database", () => {
        let rules = createRules({
            "database": {
                "*": {
                    "name": "",
                    "loadBefore": {
                        "mod1": {},
                        "mod2": {}
                    }
                },
            }
        })
        assert.throws(() => _unit.validateHasNoReservedKeys(rules),
            _unit.VALIDATE_HAS_NO_RESERVED_KEYS_ERRORS['database']);
    });

    it("should throw an error if reserved keys are found in dependencies", () => {
        let rules = createRules({
            "database": {
                "mod1": {
                    "name": "",
                    "dependencies": {
                        "*": {},
                        "mod2": {}
                    }
                },
            }
        })
        assert.throws(() => _unit.validateHasNoReservedKeys(rules),
            _unit.VALIDATE_HAS_NO_RESERVED_KEYS_ERRORS['dependencies']);
    });

})


describe('validateModsHaveNoDuplicatedNames', () => {
    it("should not throw an error if no duplicated names are found", () => {
        let rules = createRules({
            "database": {
                "mod1": {
                    "name": "mod1",
                    "loadBefore": {
                        "mod2": {},
                        "mod3": {}
                    }
                },
                "mod2": {
                    "name": "mod2",
                    "loadBefore": {
                        "mod1": {},
                        "mod2": {}
                    }
                },
                "mod3": {
                    "name": "mod3",
                    "loadBefore": {
                        "mod1": {},
                        "mod4": {},
                        "mod5": {},
                    }
                }
            }
        })
        assert.doesNotThrow(() => _unit.validateModsHaveNoDuplicatedNames(rules));
    });

    it("should throw an error if duplicated names are found", () => {
        let rules = createRules({
            "database": {
                "mod1": {
                    "name": "mod1",
                    "loadBefore": {
                        "mod2": {},
                        "mod3": {}
                    }
                },
                "mod2": {
                    "name": "mod1",
                    "loadBefore": {
                        "mod1": {},
                        "mod2": {}
                    }
                },
                "mod3": {
                    "name": "mod3",
                    "loadBefore": {
                        "mod1": {},
                        "mod4": {},
                        "mod5": {},
                    }
                }
            }
        })
        try {
            _unit.validateModsHaveNoDuplicatedNames(rules);
        }   catch (e) {
            assert(e, typeof _unit.RulesWithDuplicatedModNames);
            assert.strictEqual(e.message, "Duplicated mod names: mod1");
        }
    });
});
