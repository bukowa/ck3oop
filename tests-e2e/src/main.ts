import * as e2e from "@tauri-e2e/selenium"
import {default as log4js} from "log4js";
import {after, before, describe, it, TestContext} from "node:test";
import {until, WebDriver} from "selenium-webdriver";

const logger = log4js.getLogger();
logger.level = process.env.NODE_TEST_LOGLEVEL || 'info';
e2e.setLogger(logger)

await e2e.launch.spawnWebDriver({
    path: await e2e.install.PlatformDriver(),
})

await new Promise(r => setTimeout(r, 1000))

type SuiteContext = any; // Define this according to your actual SuiteContext type
type SuiteWrapperFn = (t: TestContext, driver: WebDriver) => void | Promise<void>;

function describeWithDriver(name: string, action: SuiteWrapperFn) {
    return describe(name, function (sctx: SuiteContext) {
        let driver: WebDriver;

        before(async () => {
            driver = new e2e.selenium.Builder().build();
            await driver.wait(until.elementLocated({tagName: 'body'}));
        });

        after(async () => {
            await e2e.selenium.cleanupSession(driver);
        });

        it('With fresh driver session', async function (tctx: TestContext) {
            await action(tctx, driver);
        });

    });
}

// Example usage
await describeWithDriver("Tauri E2E tests", async (tctx, driver) => {
    await tctx.test("should open the app", async () => {

    });
});
