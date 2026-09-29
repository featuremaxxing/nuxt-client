<template>
	<VCard
		ref="cardRef"
		class="content-element-card mb-4"
		:class="{ 'content-element-card-edit-mode': isEditMode }"
		variant="outlined"
		data-testid="board-file-area-link-element"
	>
		<ContentElementBar :icon="barIcon">
			<template #title>
				<RouterLink
					v-if="canOpenFileArea"
					class="location"
					:title="locationTitle"
					:to="fileAreaRoute"
					data-testid="file-area-link-location"
				>
					{{ locationTitle }}
				</RouterLink>
				<span v-else class="location" :title="locationTitle" data-testid="file-area-link-location">
					{{ locationTitle }}
				</span>
			</template>
			<template v-if="isEditMode" #menu>
				<BoardMenu :scope="BoardMenuScope.FILE_AREA_LINK_ELEMENT" has-background>
					<KebabMenuActionMoveUp v-if="isNotFirstElement" @click="emit('move-up:edit')" />
					<KebabMenuActionMoveDown v-if="isNotLastElement" @click="emit('move-down:edit')" />
					<KebabMenuActionEdit
						v-if="roomId"
						:text="t('components.cardElement.fileAreaLinkElement.changeTarget')"
						@click="isPickerOpen = true"
					/>
					<KebabMenuActionDelete @click="onDelete" />
				</BoardMenu>
			</template>
		</ContentElementBar>

		<VCardText>
			<!-- nothing linked yet -->
			<template v-if="!hasTarget">
				<VBtn
					v-if="isEditMode && roomId"
					variant="outlined"
					:prepend-icon="mdiFolderMultipleOutline"
					data-testid="file-area-link-pick"
					@click="isPickerOpen = true"
				>
					{{ t("components.cardElement.fileAreaLinkElement.pick") }}
				</VBtn>
				<p v-else class="text-body-2 mb-0" data-testid="file-area-link-empty">
					{{ t("components.cardElement.fileAreaLinkElement.noTarget") }}
				</p>
			</template>

			<VProgressLinear v-else-if="isLoading" indeterminate />

			<VAlert
				v-else-if="loadState === 'missing'"
				type="warning"
				variant="tonal"
				density="compact"
				data-testid="file-area-link-missing"
			>
				{{ t("components.cardElement.fileAreaLinkElement.missing", { name: element.content.title }) }}
			</VAlert>

			<VAlert
				v-else-if="loadState === 'forbidden'"
				type="info"
				variant="tonal"
				density="compact"
				data-testid="file-area-link-forbidden"
			>
				{{ t("components.cardElement.fileAreaLinkElement.forbidden") }}
			</VAlert>

			<!-- a single file -->
			<div v-else-if="file" class="d-flex align-center ga-3" data-testid="file-area-link-file">
				<button
					type="button"
					class="file-open d-flex align-center ga-3 flex-1-1 overflow-hidden"
					:aria-label="t('components.cardElement.fileAreaLinkElement.openFile', { name: file.name })"
					data-testid="file-area-link-open-file"
					@click="openFilePreview(file)"
				>
					<VImg
						v-if="isPreviewPossible(file.previewStatus)"
						:src="convertDownloadToPreviewUrl(file.url, PreviewWidth._150)"
						:alt="file.name"
						max-width="96"
						max-height="96"
						cover
					/>
					<VIcon v-else :icon="mdiFileDocumentOutline" size="40" aria-hidden="true" />
					<div class="flex-1-1 overflow-hidden">
						<div class="text-subtitle-2 file-name" :title="file.name" data-testid="file-area-link-file-name">
							{{ file.name }}
						</div>
						<div class="text-caption">{{ formattedSize }}</div>
					</div>
				</button>
				<VBtn
					:icon="mdiTrayArrowDown"
					variant="text"
					:aria-label="t('components.board.action.download')"
					data-testid="file-area-link-download"
					@click="downloadFile(file.url, file.name)"
				/>
			</div>

			<!-- a folder -->
			<template v-else-if="isFolder && folders && element.content.targetId">
				<VAlert
					v-if="!treeCheck.fits"
					type="error"
					variant="tonal"
					density="compact"
					data-testid="file-area-link-too-large"
				>
					{{ t("components.cardElement.fileAreaLinkElement.tooManySubfolders") }}
				</VAlert>
				<FileAreaLinkFolderTree v-else :folders="folders" :parent-id="element.content.targetId" />
				<VBtn
					class="mt-2"
					variant="text"
					size="small"
					:to="fileAreaRoute"
					:prepend-icon="mdiOpenInNew"
					data-testid="file-area-link-open"
				>
					{{ t("components.cardElement.fileAreaLinkElement.openInFileArea") }}
				</VBtn>
			</template>
		</VCardText>

		<FileAreaLinkPickerDialog v-if="roomId" v-model="isPickerOpen" :room-id="roomId" @select="onSelect" />
	</VCard>
</template>

<script setup lang="ts">
import { useFileAreaLinkApi } from "./file-area-link-api";
import { openFilePreview } from "./file-preview";
import FileAreaLinkFolderTree from "./FileAreaLinkFolderTree.vue";
import FileAreaLinkPickerDialog, { type FileAreaLinkTarget } from "./FileAreaLinkPickerDialog.vue";
import { checkFolderTree, pathTo } from "./folder-tree";
import { FileAreaLinkElement } from "@/types/board/ContentElement";
import { FileRecord } from "@/types/file/File";
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { convertDownloadToPreviewUrl, downloadFile, isPreviewPossible } from "@/utils/fileHelper";
import { PreviewWidth } from "@api-file-storage";
import { FileAreaLinkTargetType } from "@api-server";
import { useBoardFocusHandler, useContentElementState, useSharedBoardPageInformation } from "@data-board";
import type { FileAreaFolder } from "@data-board-file-area";
import { type FileArea } from "@data-board-file-area";
import {
	mdiFileDocumentOutline,
	mdiFolderMultipleOutline,
	mdiFolderOutline,
	mdiOpenInNew,
	mdiTrayArrowDown,
} from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import {
	KebabMenuActionDelete,
	KebabMenuActionEdit,
	KebabMenuActionMoveDown,
	KebabMenuActionMoveUp,
} from "@ui-kebab-menu";
import { computed, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: FileAreaLinkElement;
	isEditMode: boolean;
	isNotFirstElement?: boolean;
	isNotLastElement?: boolean;
}>();

const emit = defineEmits<{
	(e: "delete:element", id: string): void;
	(e: "move-up:edit"): void;
	(e: "move-down:edit"): void;
}>();

const { t } = useI18n();
const cardRef = ref(null);
const element = toRef(props, "element");
useBoardFocusHandler(element.value.id, cardRef);

const { modelValue } = useContentElementState(props, { autoSaveDebounce: 0 });
const { roomId } = useSharedBoardPageInformation();
const api = useFileAreaLinkApi();

const isPickerOpen = ref(false);
const isLoading = ref(false);
const loadState = ref<"ok" | "missing" | "forbidden">("ok");
const file = ref<FileRecord>();
const folders = ref<FileAreaFolder[]>();

const fileArea = ref<FileArea>();

// The header says where the target lives: file area › folder › subfolder. For a folder that is
// the folder itself, for a file the folder it is in. The file name itself is shown below.
const locationTitle = computed(() => {
	const fallback = element.value.content.title || t("components.cardElement.fileAreaLinkElement");
	// a missing or hidden target keeps the name it had when it was linked
	if (!fileArea.value || loadState.value !== "ok") return fallback;

	const { targetId } = element.value.content;
	const folderId = isFolder.value ? targetId : file.value?.parentId;
	const folderNames =
		folders.value && folderId
			? pathTo(folders.value, folderId).map((id) => folders.value?.find((folder) => folder.id === id)?.title ?? "")
			: [];

	return [fileArea.value.title, ...folderNames].join(" › ");
});

const hasTarget = computed(() => !!element.value.content.fileAreaId && !!element.value.content.targetId);
const isFolder = computed(() => element.value.content.targetType === FileAreaLinkTargetType.FOLDER);
const barIcon = computed(() => (isFolder.value ? mdiFolderOutline : mdiFolderMultipleOutline));

const treeCheck = computed(() =>
	folders.value && element.value.content.targetId
		? checkFolderTree(folders.value, element.value.content.targetId)
		: ({ fits: true } as const)
);

const canOpenFileArea = computed(() => !!fileArea.value && loadState.value === "ok");

// opens the file area at the linked folder, or at the folder the linked file is in
const fileAreaRoute = computed(() => {
	const { fileAreaId, targetId } = element.value.content;
	const folderId = isFolder.value ? targetId : file.value?.parentId;
	const path = folders.value && folderId ? pathTo(folders.value, folderId) : [];

	return { path: `/boards/${fileAreaId}`, query: path.length ? { path: path.join(",") } : {} };
});

const formattedSize = computed(() => {
	const size = file.value?.size ?? 0;
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
});

const loadTarget = async () => {
	file.value = undefined;
	folders.value = undefined;
	fileArea.value = undefined;
	loadState.value = "ok";
	const { fileAreaId, targetId } = element.value.content;
	if (!fileAreaId || !targetId) return;

	isLoading.value = true;
	try {
		if (roomId.value) {
			const areas = await api.listFileAreasOfRoom(roomId.value).catch(() => []);
			fileArea.value = areas.find((area) => area.id === fileAreaId);
		}
		if (isFolder.value) {
			const result = await api.loadFolders(fileAreaId);
			if (result.status !== "ok") {
				loadState.value = result.status;
			} else if (!result.value.some((folder) => folder.id === targetId)) {
				loadState.value = "missing";
			} else {
				folders.value = result.value;
			}
		} else {
			const result = await api.loadFile(targetId);
			if (result.status === "ok") {
				file.value = result.value;
				const folderResult = await api.loadFolders(fileAreaId);
				if (folderResult.status === "ok") folders.value = folderResult.value;
			} else {
				loadState.value = result.status;
			}
		}
	} finally {
		isLoading.value = false;
	}
};

watch(
	// the room is known once the board page information is loaded
	() => [
		element.value.content.fileAreaId,
		element.value.content.targetType,
		element.value.content.targetId,
		roomId.value,
	],
	loadTarget,
	{ immediate: true }
);

const onSelect = (target: FileAreaLinkTarget) => {
	modelValue.value.fileAreaId = target.fileAreaId;
	modelValue.value.targetType = target.targetType as FileAreaLinkTargetType;
	modelValue.value.targetId = target.targetId;
	modelValue.value.title = target.title;
};

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("components.cardElement.fileAreaLinkElement");
	if (shouldDelete) emit("delete:element", element.value.id);
};
</script>

<style scoped>
.location {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* long names without spaces (e.g. generated ones) must wrap instead of pushing the card wider */
.file-open {
	text-align: left;
	background: none;
	border: none;
	cursor: pointer;
}

.file-open:hover .file-name {
	text-decoration: underline;
}

.file-name {
	overflow-wrap: anywhere;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
</style>
