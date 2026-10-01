<template>
	<div role="radiogroup" :aria-label="t('pages.learningPath.color.label')" class="lp-color-picker">
		<button
			v-for="color in LEARNING_PATH_COLORS"
			:key="color"
			type="button"
			role="radio"
			class="lp-color-picker__option"
			:class="{ 'lp-color-picker__option--selected': color === model, 'lp-color-picker__option--used': isUsed(color) }"
			:aria-checked="color === model"
			:aria-label="colorName(color)"
			:title="isUsed(color) ? t('pages.learningPath.color.used', { name: colorName(color) }) : colorName(color)"
			:style="{ '--lp-color': learningPathColorValue(color) }"
			:data-testid="`learning-path-color-${color}`"
			@click="model = color"
		>
			<VIcon v-if="color === model" :icon="mdiCheck" size="18" color="white" aria-hidden="true" />
		</button>
		<span class="text-body-2 ml-2" data-testid="learning-path-color-name">{{ model ? colorName(model) : "" }}</span>
	</div>
</template>

<script setup lang="ts">
import { LEARNING_PATH_COLORS, LearningPathColor, learningPathColorValue } from "@data-board-learning-path";
import { mdiCheck } from "@icons/material";
import { PropType } from "vue";
import { useI18n } from "vue-i18n";

// The colors other learning paths of the room already have are marked, but can still be chosen.
const props = defineProps({
	usedColors: { type: Array as PropType<LearningPathColor[]>, default: () => [] },
});

const model = defineModel<LearningPathColor | undefined>({ default: undefined });

const { t } = useI18n();

const colorName = (color: LearningPathColor) => t(`pages.learningPath.color.${color}`);
const isUsed = (color: LearningPathColor) => props.usedColors.includes(color) && color !== model.value;
</script>

<style scoped>
.lp-color-picker {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.lp-color-picker__option {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	border: 2px solid transparent;
	background: var(--lp-color);
	cursor: pointer;
}

.lp-color-picker__option--used {
	opacity: 0.45;
}

.lp-color-picker__option--selected {
	outline: 2px solid var(--lp-color);
	outline-offset: 2px;
}

.lp-color-picker__option:focus-visible {
	outline: 2px solid rgb(var(--v-theme-primary));
	outline-offset: 3px;
}
</style>
