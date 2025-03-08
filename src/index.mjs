import { createApp } from "vue";
import App from './components/App.mjs';
import router from "./services/routes.mjs";
// import GameTable from "./components/GameTable.mjs";

const root = document.getElementById('root');
root.innerHTML = '';
const app = createApp(App);
app.use(router);
app.mount(root);

