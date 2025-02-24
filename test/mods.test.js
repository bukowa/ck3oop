const testUtil = require('./testUtils');
const ck3oop = require("../main");
const assert = require('assert');
const path = require("path");

describe('Mod', () => {
    let modPath = testUtil.pathInTestDir("mod/ugc_2291024373.mod");
    it('should construct from example file', () => {
        let mod = new ck3oop.Mod(modPath);
        assert.equal("C:/Program Files (x86)/Steam/steamapps/workshop/content/1158310/2291024373", mod.path);
        assert.equal("LotR: Realms in Exile", mod.name);
        assert.equal("1.12.*", mod.supported_version);
        assert.equal("2291024373", mod.remote_file_id);
    });

});

describe('resolveModDir', () => {
    it('should resolve absolute path', () => {
        let modPath = "C:\\Program Files (x86)\\Steam\\steamapps\\workshop\\content\\1158310\\2291024373";
        let modsDir = "C:/mods/";
        let resolved = ck3oop.resolveModDir(modPath, modsDir);
        assert.equal(modPath, resolved);
    });
    it('should resolve relative path', () => {
        let modPath = "2291024373";
        let modsDir = "C:/mods/";
        let resolved = ck3oop.resolveModDir(modPath, modsDir);
        assert.equal(path.join(modsDir, modPath), resolved);
    });
});
