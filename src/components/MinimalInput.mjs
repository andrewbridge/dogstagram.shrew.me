import { css } from "goober";

const styles = css`
    & {
        display: block;
        margin: 10px 0;
        text-align: center;
        width: 100%;
    }

    & input {
        width: calc(100% - 20px);
        padding: 10px;
        font-size: 16px;
        border: none;
        border-bottom: 3px solid #3e3e3e;
        background: transparent;
        text-align: center;
        font-family: "Press Start 2P", cursive;
    }
`;

export default {
    name: 'MinimalInput',
    props: ['label', 'modelValue', 'type'],
    emits: ['update:modelValue'],
    template: /* html */`
    <label class="${styles}">
        {{ label }}
        <input :type="type" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
    </label>
    `
}