import * as path from "node:path";
import {spawn, spawnSync} from "child_process";
import * as os from "node:os";
import {program, Option} from "commander";


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

program.command("run")
    .description("Run the e2e tests")
    .action(() => {
        console.log("Running e2e tests")
        console.log(program.opts())
    })

program.parse(process.argv);


function waitForMessage(process: any, message: any) {

    return new Promise((resolve: any, reject) => {
        process.stdout.on('data', (data: any) => {
            const output = data.toString();
            console.log(output);
            if (output.includes(message)) {
                resolve();
            }
        });

        process.stderr.on('data', (data: any) => {
            console.error(data.toString());
        });

        process.on('error', (err: any) => {
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
    ["--native-driver", program.opts()['webdriver_binary'], "--native-port", "4566"],
    {
        stdio: [null, "pipe", "pipe"],
        detached: false
    }
)

process.on('exit', () => {
    tauriDriver.kill();
});

// if on windows wait for message
if (os.platform() === 'win32') {
    waitForMessage(tauriDriver, 'Microsoft Edge WebDriver was started successfully.')
        .then(() => {
            console.log('WebDriver started successfully.');
        })
        .catch((err) => {
            console.error('Failed to start WebDriver:', err);
            process.exit(1);
        });
}
// exit process after 5seconds
setTimeout(() => {
    console.log("Timeout");
    process.exit();
}, 5000);
