<template>
	<DefaultWireframe max-width="full" :breadcrumbs="breadcrumbs">
		<template #header>
			<h1 data-testid="room-learning-paths-title">{{ pageTitle }}</h1>
		</template>

		<VProgressLinear v-if="isLoading" indeterminate />
		<EmptyState
			v-else-if="!overview || overview.paths.length === 0"
			:title="t('pages.room.learningPaths.empty')"
			data-testid="room-learning-paths-empty"
		>
			<template #media>
				<LearningContentEmptyStateSvg />
			</template>
		</EmptyState>
		<template v-else>
			<p class="text-body-2 text-medium-emphasis mb-4" data-testid="room-learning-paths-intro">
				{{ canAssign ? t("pages.room.learningPaths.intro") : t("pages.room.learningPaths.introSingle") }}
			</p>

			<div class="d-flex align-center flex-wrap ga-4 mb-4">
				<VSelect
					v-model="filter"
					:items="filterItems"
					:label="t('pages.room.learningPaths.filter.label')"
					density="compact"
					hide-details
					class="filter"
					data-testid="room-learning-paths-filter"
				/>
				<VSpacer />
				<VBtn
					variant="outlined"
					color="error"
					:prepend-icon="mdiRestore"
					data-testid="room-learning-paths-reset-all"
					@click="onResetAll"
				>
					{{ t("pages.room.learningPaths.reset.all") }}
				</VBtn>
			</div>

			<VTable class="overview" data-testid="room-learning-paths-table">
				<thead>
					<tr>
						<th scope="col">{{ t("pages.room.learningPaths.student") }}</th>
						<th v-for="path in overview.paths" :key="path.id" scope="col">
							<RouterLink :to="`/boards/${path.id}`" class="d-flex align-center ga-2 text-decoration-none">
								<LearningPathMarker :color="path.color" :size="16" />
								{{ path.title }}
							</RouterLink>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="student in visibleStudents"
						:key="student.userId"
						:data-testid="`learning-path-student-${student.userId}`"
					>
						<th scope="row" class="font-weight-bold">
							{{ fullName(student) }}
							<VChip
								v-if="student.paths.length === 0"
								size="x-small"
								class="ml-2"
								:data-testid="`learning-path-student-none-${student.userId}`"
							>
								{{ t("pages.room.learningPaths.none") }}
							</VChip>
							<VBtn
								size="x-small"
								variant="text"
								class="ml-2"
								:data-testid="`learning-path-reset-${student.userId}`"
								@click="onResetStudent(student)"
							>
								{{ t("pages.room.learningPaths.reset.student") }}
							</VBtn>
						</th>
						<td v-for="path in overview.paths" :key="path.id">
							<RoomLearningPathCell
								:user-id="student.userId"
								:path-id="path.id"
								:progress="progressOf(student, path.id)"
								:can-assign="canAssign"
								@assign="onAssign(student.userId, path.id)"
								@remove="onRemove(student.userId, path.id)"
							/>
						</td>
					</tr>
				</tbody>
			</VTable>
			<p v-if="visibleStudents.length === 0" class="mt-4" data-testid="room-learning-paths-no-students">
				{{ t("pages.room.learningPaths.noStudents") }}
			</p>
		</template>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import RoomLearningPathCell from "./RoomLearningPathCell.vue";
import { askConfirmation } from "@/utils/confirmation-dialog.utils";
import { buildPageTitle } from "@/utils/pageTitle";
import { type LearningPathOverview, useLearningPathApi } from "@data-board-learning-path";
import { useRoomDetailsStore } from "@data-room";
import { mdiRestore } from "@icons/material";
import { EmptyState, LearningContentEmptyStateSvg } from "@ui-empty-state";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { LearningPathMarker } from "@ui-room-details";
import { useTitle } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

type OverviewStudent = LearningPathOverview["students"][number];

const { t } = useI18n();
const route = useRoute();
const roomId = route.params.id as string;
const api = useLearningPathApi();

const roomDetailsStore = useRoomDetailsStore();
const { room } = storeToRefs(roomDetailsStore);

const overview = ref<LearningPathOverview>();
const isLoading = ref(true);

const load = async () => {
	try {
		overview.value = await api.fetchOverview(roomId);
	} catch {
		// a room without learning paths has nothing to show
		overview.value = undefined;
	}
	isLoading.value = false;
};

onMounted(async () => {
	if (!room.value || room.value.id !== roomId) {
		await roomDetailsStore.fetchRoom(roomId);
	}
	await load();
});

// with a single learning path everybody goes it, there is nothing to assign
const canAssign = computed(() => (overview.value?.paths.length ?? 0) > 1);

const filter = ref<string>("all");
const filterItems = computed(() => [
	{ title: t("pages.room.learningPaths.filter.all"), value: "all" },
	{ title: t("pages.room.learningPaths.filter.none"), value: "none" },
	...(overview.value?.paths ?? []).map((path) => ({ title: path.title, value: path.id })),
]);

const visibleStudents = computed(() =>
	(overview.value?.students ?? []).filter((student) => {
		if (filter.value === "all") return true;
		if (filter.value === "none") return student.paths.length === 0;
		return student.paths.some((progress) => progress.pathId === filter.value);
	})
);

const progressOf = (student: OverviewStudent, pathId: string) =>
	student.paths.find((progress) => progress.pathId === pathId);

const fullName = (student: OverviewStudent) => [student.firstName, student.lastName].filter(Boolean).join(" ");

const onAssign = async (userId: string, pathId: string) => {
	await api.enroll(pathId, userId).catch(() => undefined);
	await load();
};

const onRemove = async (userId: string, pathId: string) => {
	await api.unenroll(pathId, userId).catch(() => undefined);
	await load();
};

// Starting over removes stored completions and checkbox ticks; submissions, votes and the chosen
// learning paths stay. Nothing of it can be brought back, so it is asked for first.
const confirmReset = (title: string) =>
	askConfirmation({
		title,
		message: t("pages.room.learningPaths.reset.message"),
		messageType: "warning",
		confirmBtnKey: "pages.room.learningPaths.reset.confirm",
	});

const reset = async (userIds?: string[]) => {
	await api.resetProgress(roomId, userIds).catch(() => undefined);
	await load();
};

const onResetAll = async () => {
	if (await confirmReset(t("pages.room.learningPaths.reset.titleAll"))) await reset();
};

const onResetStudent = async (student: OverviewStudent) => {
	if (await confirmReset(t("pages.room.learningPaths.reset.titleStudent", { name: fullName(student) }))) {
		await reset([student.userId]);
	}
};

const pageTitle = computed(() => t("pages.room.learningPaths.title"));
useTitle(computed(() => buildPageTitle(pageTitle.value, room.value?.name)));

const breadcrumbs = computed<Breadcrumb[]>(() => [
	{ title: t("pages.rooms.title"), to: "/rooms" },
	{ title: room.value?.name ?? "", to: `/rooms/${roomId}` },
	{ title: pageTitle.value, disabled: true },
]);
</script>

<style scoped>
.filter {
	max-width: 20rem;
}

.dot {
	display: inline-block;
	flex: none;
	width: 12px;
	height: 12px;
	border-radius: 50%;
}
</style>
