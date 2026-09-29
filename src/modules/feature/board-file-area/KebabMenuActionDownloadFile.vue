<template>
	<KebabMenuAction :icon="mdiTrayArrowDown" data-testid="kebab-menu-action-download-file" @click="emit('click')">
		{{ t("pages.boardFileArea.download") }}
	</KebabMenuAction>
</template>

<script setup lang="ts">
import { mdiTrayArrowDown } from "@icons/material";
import { KebabMenuAction } from "@ui-kebab-menu";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const emit = defineEmits(["click"]);
</script>
