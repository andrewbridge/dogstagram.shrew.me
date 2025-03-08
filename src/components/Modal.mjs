export default {
    props: ['show', 'title', 'close'],
    emits: ['update:show'],
    watch: {
        show(isShown) {
            if (isShown) {
                document.body.classList.add('modal-open');
                document.body.style.overflow = 'hidden';
                document.body.style.paddingRight = '8px';
                return;
            }
            document.body.classList.remove('modal-open');
            document.body.style.overflow = null;
            document.body.style.paddingRight = null;
        }
    },
    unmounted() {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = null;
        document.body.style.paddingRight = null;
    },
    template: `
    <Teleport to="#teleport-root">
        <div class="modal modal-blur fade" :class="{ show }" :style="{ display: show ? 'block' : 'none' }" tabindex="-1" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <slot name="header">
                            <h5 class="modal-title">{{title}}</h5>
                        </slot>
                        <button v-if="close !== false" type="button" class="btn-close" @click="$emit('update:show', false)" aria-label="Close"></button>
                    </div>
                    <slot />
                </div>
            </div>
        </div>
    </Teleport>`,
}