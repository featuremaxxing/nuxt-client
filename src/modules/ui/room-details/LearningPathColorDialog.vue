<template>
	<SvsDialog
		v-model="isOpen"
		:title="t('pages.learningPath.color.title')"
		:confirm-btn-disabled="!selected"
		data-testid="learning-path-color-dialog"
		@confirm="onConfirm"
	>
		<template #content>
			<LearningPathColorPicker v-model="selected" :used-colors="usedColors" />
		</template>
	</SvsDialog>
</template>

<script setup lang="ts">
import LearningPathColorPicker from "./LearningPathColorPicker.vue";
import { LearningPathColor } from "@data-board-learning-path";
import { SvsDialog } from "@ui-dialog";
import { PropType, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	color: { type: String as PropType<LearningPathColor>, default: undefined },
	usedColors: { type: Array as PropType<LearningPathColor[]>, default: () => [] },
});

const isOpen = defineModel({ type: Boolean, required: true });

const emit = defineEmits<{
	(e: "confirm", color: LearningPathColor): void;
}>();

const { t } = useI18n();

const selected = ref<LearningPathColor>();

// start from the current color every time the dialog opens
watch(isOpen, (open) => {
	if (open) selected.value = props.color;
});

const onConfirm = () => {
	if (selected.value) emit("confirm", selected.value);
};
</script>
