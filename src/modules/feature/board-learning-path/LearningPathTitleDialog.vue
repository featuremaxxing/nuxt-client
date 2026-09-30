<template>
	<SvsDialog
		v-model="isDialogOpen"
		:title="t('pages.learningPath.rename')"
		:confirm-btn-disabled="!isNameValid"
		data-testid="learning-path-title-dialog"
		@confirm="onConfirm"
		@cancel="isDialogOpen = false"
	>
		<template #content>
			<VTextField
				v-model="nameRef"
				data-testid="learning-path-title-input"
				density="compact"
				flat
				autofocus
				:aria-label="t('common.labels.name.new')"
				:label="t('common.labels.name.new')"
				:rules="[validateOnOpeningTag]"
				@keydown.enter.prevent="onConfirm"
			/>
		</template>
	</SvsDialog>
</template>

<script setup lang="ts">
import { SvsDialog } from "@ui-dialog";
import { useOpeningTagValidator } from "@util-validators";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	name: { type: String, default: "" },
});

const isDialogOpen = defineModel("is-dialog-open", { type: Boolean, default: false });

const emit = defineEmits<{
	(e: "confirm", name: string): void;
}>();

const { t } = useI18n();
const { validateOnOpeningTag } = useOpeningTagValidator();

const nameRef = ref("");

// start from the current name every time the dialog opens
watch(isDialogOpen, (isOpen) => {
	if (isOpen) nameRef.value = props.name;
});

const isNameValid = computed(() => nameRef.value.trim().length > 0 && validateOnOpeningTag(nameRef.value) === true);

const onConfirm = () => {
	if (isNameValid.value) emit("confirm", nameRef.value.trim());
};
</script>
