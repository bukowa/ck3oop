import {createApp} from "vue";
import App from "./App.vue";
import {getCurrent} from "@tauri-apps/api/window";
import {helloWorld} from "ck3oop-core-js";

helloWorld("ck3oop-ui")
const app = createApp(App);

app.mount("#app");

setTimeout(() => {
    getCurrent().show().then(() => {});
}, 300);
