const assert = require("assert");
const ck3oop = require("../main");
const os = require("node:os");
const sinon = require("sinon");
const testUtil = require("./testUtils");

describe('getDefaultModDir', () => {
    it("can resolve proper path", () => {
        withMocked(() => {
            assert.equal(
                ck3oop.getDefaultModDir(),
                'MOCKED\\Documents\\Paradox Interactive\\Crusader Kings III'
            );
        });
    })
});

describe('Config', () => {
    it("should correctly construct from example file", () => {
        withMocked(() => {
            let c = new ck3oop.Config(JSON.parse(testUtil.readFileInExampleDir("ck3oop.json")));
            assert.equal(c.rulesDir, testUtil.pathInExampleDir("rules"));
        });
    });
    it("should construct with defaults", () => {
        withMocked(() => {
            let c = new ck3oop.Config({
                gameDir: "MOCKED"
            });
            assert.equal(c.modDir, 'MOCKED\\Documents\\Paradox Interactive\\Crusader Kings III');
            assert.equal(c.rulesDir, testUtil.pathInExampleDir("rules"));
        });
    })
});

function withMockedOsHomeDir(callback) {
    const homedirStub = sinon.stub(os, 'homedir');
    homedirStub.returns('MOCKED');

    try {
        callback();
    } finally {
        homedirStub.restore();
    }
}

function withMockedProcessCWDDir(callback) {
    const cwdStub = sinon.stub(process, 'cwd');
    cwdStub.returns(testUtil.pathInExampleDir(""));

    try {
        callback();
    } finally {
        cwdStub.restore();
    }
}

function withMocked(callback) {
    withMockedOsHomeDir(() => {
        withMockedProcessCWDDir(() => {
            callback();
        });
    });
}
