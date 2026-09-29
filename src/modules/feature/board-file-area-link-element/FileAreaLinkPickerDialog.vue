<template>
	<VDialog v-model="isOpen" max-width="1000" data-testid="file-area-link-picker">
		<VCard>
			<VCardTitle>{{ t("components.cardElement.fileAreaLinkElement.picker.title") }}</VCardTitle>
			<VCardText>
				<VAlert
					v-if="fileAreas && fileAreas.length === 0"
					type="info"
					variant="tonal"
					data-testid="picker-no-file-areas"
				>
					{{ t("components.cardElement.fileAreaLinkElement.picker.noFileAreas") }}
				</VAlert>
				<template v-else>
					<VSelect
						v-model="selectedFileAreaId"
						:items="fileAreaItems"
						:label="t('components.cardElement.fileAreaLinkElement.picker.fileArea')"
						density="compact"
						data-testid="picker-file-area-select"
					/>
					<VProgressLinear v-if="selectedFileAreaId && isLoading" indeterminate />
					<div v-else-if="selectedFileAreaId" class="picker-columns">
						<FileAreaColumn
							v-for="(column, index) in columns"
							:key="column.parentId"
							:column="column"
							:column-index="index"
							:title="columnTitle(column.parentId)"
							:open-folder-id="path[index]"
							:selected-file-id="selectedFile?.id"
							@open-folder="openFolder(index, $event)"
							@select-file="selectFile"
						/>
					</div>
				</template>
			</VCardText>
			<VCardActions>
				<VSpacer />
				<VBtn variant="text" data-testid="picker-cancel" @click="isOpen = false">
					{{ t("common.actions.cancel") }}
				</VBtn>
				<VBtn variant="outlined" :disabled="!currentFolder" data-testid="picker-link-folder" @click="onLinkFolder">
					{{ t("components.cardElement.fileAreaLinkElement.picker.linkFolder") }}
				</VBtn>
				<VBtn
					color="primary"
					variant="flat"
					:disabled="!selectedFile"
					data-testid="picker-link-file"
					@click="onLinkFile"
				>
					{{ t("components.cardElement.fileAreaLinkElement.picker.linkFile") }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { useFileAreaLinkApi } from "./file-area-link-api";
import { type FileArea, useFileAreaState } from "@data-board-file-area";
import { FileAreaColumn } from "@feature-board-file-area";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

export type FileAreaLinkTarget = {
	fileAreaId: string;
	targetType: "file" | "folder";
	targetId: string;
	title: string;
};

const props = defineProps({
	roomId: { type: String, required: true },
});

const isOpen = defineModel({ type: Boolean, default: false });

const emit = defineEmits<{ (e: "select", target: FileAreaLinkTarget): void }>();

const { t } = useI18n();
const { listFileAreasOfRoom } = useFileAreaLinkApi();

const fileAreas = ref<FileArea[]>();
const selectedFileAreaId = ref("");
const fileAreaItems = computed(() =>
	(fileAreas.value ?? []).map((area) => ({
		title: area.isVisible ? area.title : `${area.title} (${t("common.words.draft")})`,
		value: area.id,
	}))
);

const { columns, path, selectedFile, isLoading, folders, loadAll, restorePath, openFolder, selectFile } =
	useFileAreaState(selectedFileAreaId);

const currentFolder = computed(() => folders.value.find((folder) => folder.id === path.value[path.value.length - 1]));

const columnTitle = (parentId: string): string =>
	parentId === selectedFileAreaId.value
		? (fileAreas.value?.find((area) => area.id === parentId)?.title ?? "")
		: (folders.value.find((folder) => folder.id === parentId)?.title ?? "");

watch(isOpen, async (open) => {
	if (!open) return;
	fileAreas.value = await listFileAreasOfRoom(props.roomId);
	if (!selectedFileAreaId.value && fileAreas.value.length > 0) {
		selectedFileAreaId.value = fileAreas.value[0].id;
	}
});

watch(selectedFileAreaId, async (id) => {
	if (!id) return;
	restorePath([]);
	selectFile(undefined);
	await loadAll();
});

const onLinkFile = () => {
	if (!selectedFile.value) return;
	emit("select", {
		fileAreaId: selectedFileAreaId.value,
		targetType: "file",
		targetId: selectedFile.value.id,
		title: selectedFile.value.name,
	});
	isOpen.value = false;
};

const onLinkFolder = () => {
	if (!currentFolder.value) return;
	emit("select", {
		fileAreaId: selectedFileAreaId.value,
		targetType: "folder",
		targetId: currentFolder.value.id,
		title: currentFolder.value.title,
	});
	isOpen.value = false;
};
</script>

<style scoped>
.picker-columns {
	display: flex;
	min-height: 320px;
	overflow-x: auto;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-radius: 4px;
}
</style>
