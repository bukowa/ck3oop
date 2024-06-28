import {spawn, spawnSync} from "child_process";
import * as os from "node:os";
import {program, Option} from "commander";
import {Builder, Capabilities, ThenableWebDriver, WebDriver} from "selenium-webdriver";

const log4js = require("log4js");
const logger = log4js.getLogger();

logger.level = 'debug';

(() => {
    program.addOption(
        new Option(
            "-t, --tauri_app_binary <path>",
            "Path to the tauri app binary")
            .env("PATH_TAURI_RELEASE_BINARY")
    )

    program.addOption(
        new Option(
            "-d, --tauri_driver_binary <path>",
            "Path to the tauri driver binary")
            .env("PATH_TAURI_DRIVER_BINARY")
    )

    program.addOption(
        new Option(
            "-w, --webdriver_binary <path>",
            "Path to the webdriver binary")
            .env("PATH_WEBDRIVER_BINARY")
    )

    program.parse(process.argv);
})()


function waitForMessage(process: any, message: any) {

    return new Promise((resolve: any, reject) => {
        process.stdout.on('data', (data: any) => {
            const output = data.toString();
            logger.info(output);
            if (output.includes(message)) {
                resolve();
            }
        });

        process.stderr.on('data', (data: any) => {
            console.error(data.toString());
        });

        process.on('error', (err: any) => {
            console.error(err);
            reject(err);
        });

        process.on('exit', (code: any) => {
            if (code !== 0) {
                reject(new Error(`Process exited with code: ${code}`));
            }
        });
    });
}

let tauriDriver = spawn(
    program.opts()['tauri_driver_binary'],
    [
        "--native-host", "127.0.0.1",
        "--native-driver", program.opts()['webdriver_binary'],
        "--native-port", "7653",
        "--port", "7654"
    ],
    {
        stdio: [null, "pipe", "pipe"],
        detached: false
    }
)

// if on windows wait for message
if (os.platform() === 'win32') {
    waitForMessage(tauriDriver, 'Microsoft Edge WebDriver was started successfully.')
        .then(() => {
            logger.info('WebDriver started successfully.');
        })
        .catch((err) => {
            console.error('Failed to start WebDriver:', err);
            process.exit(1);
        });
}

const start = new Date().getTime();
// tests should finish in 10 seconds
// setTimeout(() => {
//     const end = new Date().getTime();
//     console.error(`Tests took too long to run: ${end - start}ms`);
//     process.exit(1);
// }, 25000)

import {after, before, describe, it} from "node:test";
import * as util from "node:util";

let driver: WebDriver;

describe('Tauri E2E tests', async () => {
    before(async () => {
        process.on('exit', (code) => {
          logger.info(`About to exit with code: ${code}`);
          try {
            logger.info("Closing driver")
            driver.quit();
          } catch (e) {
            logger.error("Error closing driver", e)
          }
          try {
            logger.info("Killing tauri driver")
            tauriDriver.kill()
          } catch (e) {
            logger.error("Error killing tauri driver", e)
          }
        })
        logger.info("running test.before")
        let application = program.opts()['tauri_app_binary'];
        const capabilities = new Capabilities()
        // webkitgtk:browserOptions
        capabilities.set('tauri:options', {
            application: application,
            // windows
            webviewOptions: {},
        })
        // linux
        capabilities.set('webkitgtk:browserOptions', {
            args:[
                '--automation'
            ]
        })
        capabilities.setBrowserName('wry')
        logger.info("Creating driver with", {capabilities: capabilities})

        driver = await new Builder()
            .withCapabilities(capabilities)
            .usingServer('http://127.0.0.1:7654')
            .build()

        logger.info("Driver created", {driver: driver})
    })

    after(async () => {
    });

    it('should send hello world', async()=>{
        logger.info("Running tests")
        logger.info(`this is driver: ${driver}`)
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await driver.findElement({
            css: 'input[id="greet-input"]'
        }).sendKeys('Hello World');
    })
});
