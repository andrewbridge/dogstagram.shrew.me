import { shallowReactive, watchEffect } from "vue"

const modals = shallowReactive(new Set());

// TODO: Build this out so you can close this modal and also watch for this modal closing
export const spawnModal = (component, props) => {
    modals.add({ component, props });
}

export default {
    name: 'ProgrammaticModals',
    data: () => ({ modals }),
    template: `<component v-for="modal in modals" :is="modal.component" v-bind="modal.props" :show="true" @update:show="() => modals.delete(modal)" />`,
}