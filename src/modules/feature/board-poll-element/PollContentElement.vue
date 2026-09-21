<template>
	<VCard
		ref="pollContentElement"
		class="content-element-card mb-4"
		:class="{ 'content-element-card-edit-mode': isEditMode }"
		data-testid="board-poll-element"
		variant="outlined"
	>
		<ContentElementBar :icon="mdiPoll">
			<template #title>
				{{ element.content.title || t("components.cardElement.pollElement") }}
			</template>
			<template v-if="isEditMode" #menu>
				<BoardMenu
					:scope="BoardMenuScope.POLL_ELEMENT"
					has-background
					:data-testid="`element-menu-button-${columnIndex}-${rowIndex}-${elementIndex}`"
				>
					<KebabMenuActionMoveUp v-if="isNotFirstElement" @click="onMoveUp" />
					<KebabMenuActionMoveDown v-if="isNotLastElement" @click="onMoveDown" />
					<KebabMenuActionDelete @click="onDelete" />
				</BoardMenu>
			</template>
		</ContentElementBar>

		<PollElementEdit v-if="isEditMode" :element="element" :is-edit-mode="isEditMode" />

		<template v-else>
			<PollStatusBar
				:element="element"
				:is-editor="canManagePoll"
				:total-votes="pollState.totalVotes"
				:participant-count="pollState.participantCount"
				:results="pollState.results"
				:voters="pollState.voters"
				:can-open-analysis="canOpenAnalysis"
				@open:analysis="showAnalysis = true"
			/>

			<PollResults
				v-if="showResults"
				:element="element"
				:results="pollState.results"
				:voters="pollState.voters"
				:is-editor="canManagePoll"
			/>

			<PollAnalysisDialog v-if="canOpenAnalysis" v-model="showAnalysis" :element="element" :is-editor="canManagePoll" />

			<PollVoteForm v-else-if="showVoteForm" :element="element" :existing-answers="pollState.myVote" @voted="onVoted" />

			<VCardText v-else-if="hasVoted && !element.content.showResultsLive">
				<p>{{ t("components.cardElement.pollElement.voteRecorded") }}</p>
				<VBtn variant="text" data-testid="poll-change-vote" @click="isChangingVote = true">
					{{ t("components.cardElement.pollElement.changeVote") }}
				</VBtn>
			</VCardText>
		</template>
	</VCard>
</template>

<script setup lang="ts">
import PollAnalysisDialog from "./components/analysis/PollAnalysisDialog.vue";
import PollElementEdit from "./components/PollElementEdit.vue";
import PollResults from "./components/PollResults.vue";
import PollStatusBar from "./components/PollStatusBar.vue";
import PollVoteForm from "./components/PollVoteForm.vue";
import { usePollOpenState } from "./usePollOpenState.composable";
import { PollElement } from "@/types/board/ContentElement";
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { PollStatus } from "@api-server";
import { useBoardAllowedOperations, useBoardFocusHandler } from "@data-board";
import { usePollSocketApi, usePollsStore } from "@data-poll";
import { mdiPoll } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
import { computed, onMounted, ref, toRef } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: PollElement;
	isEditMode: boolean;
	isNotFirstElement?: boolean;
	isNotLastElement?: boolean;
	columnIndex: number;
	rowIndex: number;
	elementIndex: number;
}>();

const emit = defineEmits<{
	(e: "delete:element", elementId: string): void;
	(e: "move-down:edit"): void;
	(e: "move-up:edit"): void;
	(e: "move-keyboard:edit", event: KeyboardEvent): void;
}>();

const { t } = useI18n();
const { allowedOperations } = useBoardAllowedOperations();
const { getState, fetchPollResults } = usePollsStore();
// Registers the poll-vote-success/-failure socket listener for as long as this element is
// mounted - unlike PollVoteForm (which only exists while a student hasn't voted yet and is
// therefore gone for a teacher, or for a student once they've voted and switches to viewing
// results), this component stays mounted the whole time the poll is on the board. Without this,
// a teacher's results view - and a voted student's live results view - never updates again after
// the initial load; see PollSocketApi.composable.ts for what the listener actually does.
usePollSocketApi();

const element = toRef(props, "element");
const pollContentElement = ref(null);
useBoardFocusHandler(element.value.id, pollContentElement);

const canManagePoll = computed(() => allowedOperations.value.updateElement);
const pollState = computed(() => getState(element.value.id));
const hasVoted = computed(() => !!pollState.value.myVote);
const isChangingVote = ref(false);
const showAnalysis = ref(false);
const { isOpen: isPollOpen } = usePollOpenState(element);

// Teachers can always open the fullscreen analysis; students only once the poll is closed (see
// the plan's "Vollbild-Auswertung" section). This is UI-level gating only - the server already
// enforces the real visibility rule by never sending `voters` to non-managers.
const canOpenAnalysis = computed(() => canManagePoll.value || element.value.content.pollStatus === PollStatus.CLOSED);

// Teachers/editors always see the aggregate results (never the vote form for themselves).
// Students/voters see results only once they voted and either the poll shows live results or is
// closed (frozen snapshot); otherwise they get the vote form.
const showResults = computed(() => {
	if (canManagePoll.value) return true;
	if (element.value.content.pollStatus === PollStatus.CLOSED) return true;
	return hasVoted.value && element.value.content.showResultsLive && !isChangingVote.value;
});

const showVoteForm = computed(() => {
	if (canManagePoll.value) return false;
	// Mirrors the server's isOpen(now) check (see usePollOpenState) rather than just pollStatus:
	// a poll with a closesAt in the past is still nominally "open" status-wise until a teacher
	// closes it, but the server already rejects votes for it - the form must not invite a vote
	// that would just fail with a generic error.
	if (!isPollOpen.value) return false;
	return !hasVoted.value || isChangingVote.value;
});

const onVoted = () => {
	isChangingVote.value = false;
};

onMounted(async () => {
	if (!props.isEditMode) {
		await fetchPollResults(element.value.id);
	}
});

const onMoveUp = () => emit("move-up:edit");
const onMoveDown = () => emit("move-down:edit");

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("components.cardElement.pollElement");
	if (shouldDelete) {
		emit("delete:element", element.value.id);
	}
};
</script>
