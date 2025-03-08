import Route from "route-parser";
import { ref, markRaw, reactive, watchEffect } from "vue";
import Home from "../pages/Home.mjs";
import Setup from "../pages/Setup.mjs";
import SplashScreen from "../pages/SplashScreen.mjs";
import Feed from "../pages/Feed.mjs";

const defaultRoute = '/';
const defaultPath = '#' + defaultRoute;
export const routes = {
    '/': SplashScreen,
    '/setup': Setup,
    '/home': Home,
    '/feed': Feed,
};

const compiledRoutes = Object.entries(routes).map(([spec, component]) => ({ route: new Route(spec), spec, component }));

const activeHash = ref(null);
const activeRoute = ref(null);
const routeParams = ref({});

const redirectToDefault = () => window.location.hash = defaultPath;

const selectRoute = () => {
    const currentPath = window.location.hash.slice(1);
    if (currentPath === '') return redirectToDefault();
    let params;
    const matchedRoute = compiledRoutes.find(({ route }) => params = route.match(currentPath));
    if (!matchedRoute) return redirectToDefault();
    activeHash.value = matchedRoute.spec;
    activeRoute.value = markRaw(matchedRoute.component);
    routeParams.value = params;
};

selectRoute();

window.addEventListener('hashchange', selectRoute);

const getPath = (component, params = {}) => {
    const componentName = typeof component === 'string' ? component : component.name;
    const routeConfiguration = compiledRoutes.find(({ component: routeComponent }) => componentName === routeComponent.name);
    if (!routeConfiguration) return '#' + defaultRoute;
    return '#' + routeConfiguration.route.reverse(params);
}

const goTo = (component, params = {}) => {
    window.location.hash = getPath(component, params);
}

export default {
    install: (app, options) => {
        const stateObject = reactive({});
        watchEffect(() => {
            stateObject.activeRoute = activeRoute.value;
            stateObject.activeHash = activeHash.value;
            stateObject.routeParams = routeParams.value;
        });
        app.provide('router', {
            getPath,
            goTo,
            defaultRoute,
            defaultPath,
            state: stateObject
        });
    }
}