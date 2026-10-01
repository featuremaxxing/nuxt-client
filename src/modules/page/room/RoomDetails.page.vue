<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding :breadcrumbs="breadcrumbs" :fab-items="fabAction">
		<template #header>
			<div class="d-flex align-center">
				<h1 data-testid="room-title">{{ roomTitle }}</h1>
				<RoomMenu
					class="pt-1"
					:room-name="room.name"
					@room:edit="onEdit"
					@room:manage-members="onManageMembers"
					@room:copy="onCopy"
					@room:share="onShare"
					@room:delete="onDelete"
					@room:leave="onLeaveRoom"
				/>
				<RouterLink
					v-if="canSeeLearningPathOverview"
					:to="`/rooms/${room.id}/learning-paths`"
					class="ml-4 text-body-2"
					data-testid="room-learning-paths-link"
				>
					{{ t("pages.room.learningPaths.link") }}
				</RouterLink>
				<RouterLink
					v-if="isProgressEnabled && roomProgress && roomProgress.summary.total > 0"
					:to="`/rooms/${room.id}/progress`"
					class="ml-4 text-body-2"
					data-testid="room-progress-link"
				>
					{{ t("pages.roomDetails.progress.link") }}
				</RouterLink>
			</div>
		</template>
		<EmptyState
			v-if="visibleBoards.length === 0"
			data-testid="empty-state-room-details"
			:title="t('pages.roomDetails.emptyState')"
		>
			<template #media>
				<LearningContentEmptyStateSvg />
			</template>
		</EmptyState>
		<RoomBoardGrid
			:room-id="room.id"
			:boards="visibleBoards"
			:progress-by-board-id="progressByBoardId"
			@update:board-visibility="onUpdateBoardVisibility"
			@delete:board="onDeleteBoard"
			@duplicate:board="onDuplicateBoard"
			@enroll:path="onEnrollPath"
			@leave:path="onLeavePath"
		/>
		<SelectBoardLayoutDialog
			v-if="allowedOperations.editContent"
			v-model="boardLayoutDialogIsOpen"
			allow-room-layouts
			@select="onSelectLayout"
		/>
		<CreateBoardNameDialog
			v-if="allowedOperations.editContent"
			v-model="boardNameDialogIsOpen"
			:layout="newBoardLayout"
			:used-colors="usedPathColors"
			@confirm="onCreateBoard"
		/>
		<LeaveRoomProhibitedDialog v-model="isLeaveRoomProhibitedDialogOpen" />
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { BoardLayout } from "@/types/board/Board";
import { RoomDetails } from "@/types/room/Room";
import { ShareTokenParentType } from "@/types/sharing/Token";
import { askConfirmation } from "@/utils/confirmation-dialog.utils";
import { buildPageTitle } from "@/utils/pageTitle";
import { RoomBoardItemResponse } from "@api-server";
import { useAppStoreRefs } from "@data-app";
import { type LearningPathColor, useLearningPathApi } from "@data-board-learning-path";
import { ProgressSummary, RoomProgress, useBoardProgressApi } from "@data-board-progress";
import { useEnvConfig } from "@data-env";
import { useRoomAllowedOperations, useRoomDetailsStore, useRoomStore } from "@data-room";
import { useCopyFlow } from "@feature-copy";
import { RoomBoardGrid, RoomMenu } from "@feature-room";
import { useShareFlow } from "@feature-share";
import { mdiPlus } from "@icons/material";
import { EmptyState, LearningContentEmptyStateSvg } from "@ui-empty-state";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { CreateBoardNameDialog, LeaveRoomProhibitedDialog, SelectBoardLayoutDialog } from "@ui-room-details";
import { FabAction } from "@ui-speed-dial-menu";
import { useTitle } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { computed, ComputedRef, onMounted, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const props = defineProps<{ room: RoomDetails }>();
const room = toRef(props, "room");

const router = useRouter();
const { t } = useI18n();

const roomDetailsStore = useRoomDetailsStore();
const { leaveRoom, deleteRoom } = useRoomStore();

const { roomBoards } = storeToRefs(roomDetailsStore);
const { createBoard, updateBoardVisibility, deleteBoard, fetchRoomAndBoards } = roomDetailsStore;

const isLeaveRoomProhibitedDialogOpen = ref(false);

const pageTitle = computed(() => buildPageTitle(room.value.name, t("pages.roomDetails.title")));
useTitle(pageTitle);

const { allowedOperations } = useRoomAllowedOperations();

const visibleBoards = computed(() =>
	roomBoards.value?.filter((board) =>
		board.isVisible ? allowedOperations.value.viewContent : allowedOperations.value.viewDraftContent
	)
);

const roomTitle = computed(() => room.value.name);

const isProgressEnabled = computed(() => useEnvConfig().value.FEATURE_BOARD_PROGRESS_ENABLED);
const roomProgress = ref<RoomProgress>();
const progressByBoardId = computed<Record<string, ProgressSummary> | undefined>(() => {
	if (!roomProgress.value) return undefined;
	return Object.fromEntries(roomProgress.value.boards.map((board) => [board.boardId, board.summary]));
});
const refreshProgress = async () => {
	if (!isProgressEnabled.value) return;
	roomProgress.value = await useBoardProgressApi().getRoomProgress(room.value.id);
};
onMounted(refreshProgress);
watch(() => room.value.id, refreshProgress);

const boardLayoutDialogIsOpen = ref(false);

const breadcrumbs: ComputedRef<Breadcrumb[]> = computed(() => [
	{
		title: t("pages.rooms.title"),
		to: "/rooms",
	},
	{
		title: roomTitle.value,
		disabled: true,
	},
]);

const fabAction = computed<FabAction[] | undefined>(() =>
	allowedOperations.value.editContent
		? [
				{
					icon: mdiPlus,
					label: t("pages.roomDetails.fab.add.board"),
					dataTestId: "add-content-button",
					clickHandler: () => {
						boardLayoutDialogIsOpen.value = true;
					},
				},
			]
		: undefined
);

const onEdit = () => {
	router.push({
		name: "room-edit",
		params: {
			id: room.value.id,
		},
	});
};

const onManageMembers = () => {
	router.push({
		name: "room-members",
		params: {
			id: room.value.id,
		},
	});
};

const { executeCopyRoom } = useCopyFlow();

const onCopy = async () => {
	if (!allowedOperations.value.copyRoom) {
		return;
	}

	const { result: copyResult } = await executeCopyRoom(room.value.id);
	if (copyResult?.id) {
		await router.replace({ name: "room-details", params: { id: copyResult.id } });
	}
};

const { executeShare } = useShareFlow();

const onShare = () => {
	if (allowedOperations.value.shareRoom) {
		executeShare({
			id: room.value.id,
			type: ShareTokenParentType.ROOM,
		});
	}
};

const onDelete = async () => {
	if (!allowedOperations.value.deleteRoom) return;

	await deleteRoom(room.value.id);
	router.push({ name: "rooms" });
};

const { user } = useAppStoreRefs();

const onLeaveRoom = async () => {
	if (!allowedOperations.value.leaveRoom) {
		isLeaveRoomProhibitedDialogOpen.value = true;
		return;
	}

	const currentUserId = user.value?.id;
	if (!currentUserId) return;
	const roomId = room.value.id;

	const shouldLeave = await askConfirmation({
		title: t("pages.rooms.leaveRoom.confirmation", {
			roomName: room.value.name,
		}),
		confirmBtnKey: "common.actions.leave",
	});

	if (!shouldLeave) return;
	await leaveRoom(roomId);
	router.push("/rooms");
};

// a new board is named right away, so the room does not fill up with boards of the same default name
const boardNameDialogIsOpen = ref(false);
const newBoardLayout = ref<BoardLayout>(BoardLayout.COLUMNS);

const onSelectLayout = (layout: BoardLayout) => {
	newBoardLayout.value = layout;
	boardLayoutDialogIsOpen.value = false;
	boardNameDialogIsOpen.value = true;
};

const usedPathColors = computed(() =>
	(roomBoards.value ?? []).flatMap((board) => (board.learningPath?.color ? [board.learningPath.color] : []))
);

// teachers see who goes which learning path, as long as the room has one
const canSeeLearningPathOverview = computed(
	() =>
		allowedOperations.value.editContent &&
		(roomBoards.value ?? []).some((board) => board.layout === BoardLayout.LEARNING_PATH)
);

const onCreateBoard = async (name: string, color?: LearningPathColor) => {
	const boardId = await createBoard(room.value.id, newBoardLayout.value, name);
	// the server starts with the next free color, the teacher may have picked another one
	if (boardId && color) {
		await useLearningPathApi()
			.updateColor(boardId, color)
			.catch(() => undefined);
	}
	router.push(`/boards/${boardId}`);
};

// a student chooses the learning paths to go; the locks of the room depend on it
const onEnrollPath = async (board: RoomBoardItemResponse) => {
	await useLearningPathApi()
		.enroll(board.id)
		.catch(() => undefined);
	await fetchRoomAndBoards(props.room.id);
};

const onLeavePath = async (board: RoomBoardItemResponse) => {
	await useLearningPathApi()
		.unenroll(board.id)
		.catch(() => undefined);
	await fetchRoomAndBoards(props.room.id);
};

const onUpdateBoardVisibility = async (board: RoomBoardItemResponse, isVisible: boolean) => {
	if (!board.allowedOperations?.updateBoardVisibility) return;
	const { success } = await updateBoardVisibility(board.id, isVisible);

	if (success) await fetchRoomAndBoards(props.room.id);
};

const onDeleteBoard = async (board: RoomBoardItemResponse) => {
	if (!board.allowedOperations?.deleteBoard) return;

	const { success } = await deleteBoard(board.id, board.title);

	if (success) await fetchRoomAndBoards(props.room.id);
};

const { executeCopyBoard } = useCopyFlow();

const onDuplicateBoard = async (board: RoomBoardItemResponse) => {
	if (!board.allowedOperations?.copyBoard) return;
	const { result } = await executeCopyBoard(board.id);
	if (result?.id) {
		await roomDetailsStore.fetchRoomAndBoards(props.room.id);
	}
};
</script>
