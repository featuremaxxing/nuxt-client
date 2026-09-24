<template>
	<DefaultWireframe max-width="full" :breadcrumbs="breadcrumbs">
		<template #header>
			<h1 data-testid="room-progress-title">{{ pageTitle }}</h1>
		</template>
		<EmptyState
			v-if="!isLoading && (!progress || progress.summary.total === 0)"
			:title="t('pages.room.progress.empty')"
		>
			<template #media>
				<LearningContentEmptyStateSvg />
			</template>
		</EmptyState>
		<template v-else-if="progress">
			<ProgressBar :done="progress.summary.done" :total="progress.summary.total" :label="overallLabel" class="mb-6" />
			<VCard v-for="board in visibleBoards" :key="board.boardId" class="mb-4" variant="outlined">
				<VCardTitle>
					<RouterLink :to="`/boards/${board.boardId}`" class="text-decoration-none">{{ board.boardTitle }}</RouterLink>
				</VCardTitle>
				<VCardText>
					<ProgressBar
						:done="board.summary.done"
						:total="board.summary.total"
						:label="itemLabel(board.summary)"
						class="mb-4"
					/>
					<VList>
						<VListItem
							v-for="item in board.items"
							:key="item.elementId"
							:to="`/boards/${board.boardId}#card-${item.cardId}`"
							:data-testid="`progress-item-${item.elementId}`"
						>
							<template #prepend>
								<VIcon :icon="iconFor(item.type)" />
							</template>
							<VListItemTitle>{{ item.title }}</VListItemTitle>
							<VListItemSubtitle>{{ item.cardTitle }}</VListItemSubtitle>
							<template #append>
								<span v-if="board.isTeacherView" data-testid="progress-item-count">
									{{ item.doneCount }}/{{ item.eligibleCount }}
								</span>
								<VIcon v-else-if="item.done" :icon="mdiCheck" color="success" data-testid="progress-item-done" />
							</template>
						</VListItem>
					</VList>
				</VCardText>
			</VCard>
		</template>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { ProgressElementType, ProgressSummary, RoomProgress, useBoardProgressApi } from "@data-board-progress";
import { useRoomDetailsStore } from "@data-room";
import { ProgressBar } from "@feature-board-progress";
import { mdiCheck, mdiCheckboxOutline, mdiClipboardTextOutline, mdiPoll } from "@icons/material";
import { EmptyState, LearningContentEmptyStateSvg } from "@ui-empty-state";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const roomId = route.params.id as string;

const roomDetailsStore = useRoomDetailsStore();
const { room } = storeToRefs(roomDetailsStore);
const { fetchRoom } = roomDetailsStore;

const progress = ref<RoomProgress>();
const isLoading = ref(true);

onMounted(async () => {
	if (!room.value || room.value.id !== roomId) {
		await fetchRoom(roomId);
	}
	progress.value = await useBoardProgressApi().getRoomProgress(roomId, true);
	isLoading.value = false;
});

const visibleBoards = computed(() => progress.value?.boards.filter((board) => board.items.length > 0) ?? []);

const pageTitle = computed(() => t("pages.room.progress.title"));
useTitle(computed(() => buildPageTitle(pageTitle.value, room.value?.name)));

const breadcrumbs = computed<Breadcrumb[]>(() => [
	{ title: t("pages.rooms.title"), to: "/rooms" },
	{ title: room.value?.name ?? "", to: `/rooms/${roomId}` },
	{ title: pageTitle.value, disabled: true },
]);

const overallLabel = computed(() => {
	if (!progress.value) return undefined;
	const { done, total } = progress.value.summary;
	return t("pages.room.progress.doneOf", { done, total });
});

const itemLabel = (summary: ProgressSummary) =>
	t("pages.room.progress.doneOf", { done: summary.done, total: summary.total });

const iconFor = (type: ProgressElementType) => {
	switch (type) {
		case "checkbox":
			return mdiCheckboxOutline;
		case "assignment":
			return mdiClipboardTextOutline;
		default:
			return mdiPoll;
	}
};
</script>
