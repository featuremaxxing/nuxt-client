<template>
	<VBtn
		variant="text"
		:data-testid="isPinned ? 'unpin-card-btn' : 'pin-card-btn'"
		:ripple="false"
		class="bg-white"
		icon
		size="36"
		@click.stop.prevent="onTogglePin"
		@dblclick.stop.prevent="() => {}"
		@keyup.enter.space.stop
		@keydown.enter.space.stop
		@keydown.left.right.up.down.stop="() => {}"
	>
		<VIcon :color="isPinned ? 'primary' : undefined" data-testid="pin-card-icon">
			{{ isPinned ? mdiPin : mdiPinOutline }}
		</VIcon>
		<span class="d-sr-only">
			{{ isPinned ? t("components.board.action.unpinCard") : t("components.board.action.pinCard") }}
		</span>
		<VTooltip activator="parent" location="bottom">
			{{ isPinned ? t("components.board.action.unpinCard") : t("components.board.action.pinCard") }}
		</VTooltip>
	</VBtn>
</template>

<script setup lang="ts">
import { mdiPin, mdiPinOutline } from "@icons/material";
import { useI18n } from "vue-i18n";

defineProps<{ isPinned: boolean }>();

const emit = defineEmits(["toggle-pin"]);
const { t } = useI18n();

const onTogglePin = () => {
	emit("toggle-pin");
};
</script>
