<template>
	<VCardText class="assignment-edit">
		<VTextField
			:model-value="modelValue.title"
			:label="t('components.cardElement.assignmentElement.title')"
			data-testid="assignment-title"
			@update:model-value="(value: string) => (modelValue.title = value)"
		/>
		<VTextarea
			:model-value="modelValue.text"
			:label="t('components.cardElement.assignmentElement.description')"
			auto-grow
			rows="2"
			data-testid="assignment-description"
			@update:model-value="(value: string) => (modelValue.text = value)"
		/>
		<DueDateTimeField
			:model-value="modelValue.startDate ?? undefined"
			:date-label="t('components.cardElement.assignmentElement.startDate')"
			show-now-button
			data-testid="assignment-start-date-time"
			@update:model-value="(value?: string) => (modelValue.startDate = value ?? null)"
		/>
		<DueDateTimeField
			:model-value="modelValue.dueDate ?? undefined"
			data-testid="assignment-due-date-time"
			@update:model-value="(value?: string) => (modelValue.dueDate = value ?? null)"
		/>
		<div class="assignment-edit-row">
			<GraceMinutesSelect
				:model-value="modelValue.graceMinutes ?? 0"
				@update:model-value="(value: number) => (modelValue.graceMinutes = value)"
			/>
			<VTextField
				v-if="!hasCriteria"
				:model-value="modelValue.maxPoints"
				type="number"
				min="1"
				:label="t('components.cardElement.assignmentElement.maxPoints')"
				data-testid="assignment-max-points"
				@update:model-value="(value: string) => (modelValue.maxPoints = value ? Number(value) : null)"
			/>
			<VTextField
				v-else
				:model-value="criteriaMaxPointsTotal"
				type="number"
				readonly
				:label="t('components.cardElement.assignmentElement.maxPoints')"
				data-testid="assignment-max-points-computed"
			/>
		</div>

		<div class="rubric-section">
			<VCheckbox
				:model-value="hasCriteria"
				:label="t('components.cardElement.assignmentElement.rubric.enable')"
				density="compact"
				hide-details
				data-testid="assignment-rubric-toggle"
				@update:model-value="onToggleRubric"
			/>

			<template v-if="hasCriteria">
				<div
					v-for="(criterion, index) in modelValue.criteria"
					:key="criterion.id"
					class="rubric-criterion-row"
					data-testid="assignment-rubric-criterion-row"
				>
					<VTextField
						:model-value="criterion.name"
						:label="t('components.cardElement.assignmentElement.rubric.criterionName')"
						density="compact"
						hide-details
						class="criterion-name-field"
						data-testid="assignment-rubric-criterion-name"
						@update:model-value="(value: string) => setCriterionName(index, value)"
					/>
					<VTextField
						:model-value="criterion.maxPoints"
						type="number"
						min="1"
						:label="t('components.cardElement.assignmentElement.rubric.criterionMaxPoints')"
						density="compact"
						hide-details
						class="criterion-points-field"
						data-testid="assignment-rubric-criterion-max-points"
						@update:model-value="(value: string) => setCriterionMaxPoints(index, value)"
					/>
					<VBtn
						icon
						variant="text"
						size="small"
						:aria-label="t('components.cardElement.assignmentElement.rubric.removeCriterion')"
						data-testid="assignment-rubric-remove-criterion"
						@click="removeCriterion(index)"
					>
						<VIcon :icon="mdiDelete" />
					</VBtn>
				</div>
				<VBtn
					variant="tonal"
					size="small"
					:prepend-icon="mdiPlus"
					data-testid="assignment-rubric-add-criterion"
					@click="addCriterion"
				>
					{{ t("components.cardElement.assignmentElement.rubric.addCriterion") }}
				</VBtn>
			</template>
		</div>

		<div class="peer-review-section">
			<VCheckbox
				:model-value="peerReviewEnabled"
				:label="t('components.cardElement.assignmentElement.peerReview.enable')"
				density="compact"
				hide-details
				data-testid="assignment-peer-review-toggle"
				@update:model-value="onTogglePeerReview"
			/>

			<div v-if="peerReviewEnabled" class="assignment-edit-row mt-2">
				<VSelect
					:model-value="peerReviewMode"
					:items="peerReviewModeItems"
					density="compact"
					hide-details
					:label="t('components.cardElement.assignmentElement.peerReview.mode')"
					data-testid="assignment-peer-review-mode"
					@update:model-value="(value: 'manual' | 'auto') => onChangePeerReviewMode(value)"
				/>
				<VTextField
					v-if="peerReviewMode === 'auto'"
					:model-value="peerReviewCount"
					type="number"
					min="1"
					density="compact"
					hide-details
					:label="t('components.cardElement.assignmentElement.peerReview.count')"
					data-testid="assignment-peer-review-count"
					@update:model-value="(value: string) => onChangePeerReviewCount(value)"
				/>
			</div>
		</div>
	</VCardText>
</template>

<script setup lang="ts">
import DueDateTimeField from "./DueDateTimeField.vue";
import GraceMinutesSelect from "./GraceMinutesSelect.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { usePeerReviewApi } from "@data-assignment";
import { useContentElementState } from "@data-board";
import { mdiDelete, mdiPlus } from "@icons/material";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: AssignmentElement;
	isEditMode: boolean;
}>();

const { t } = useI18n();

const { modelValue } = useContentElementState(props, { autoSaveDebounce: 400 });
const { updateSettings } = usePeerReviewApi();

// Peer review is edited through its own dedicated endpoint (not the generic content-update
// autosave above), because turning it on can trigger a side effect (auto-assign later, from
// the teacher's submissions overlay) that a silent autosave should not be able to cause.
// Local state kept optimistic; initialized once from the element's current (read-only mirror)
// values and updated immediately on every change so the UI never waits on a refetch. A
// deliberate one-time snapshot, not a live binding - eslint's reactivity-loss check doesn't
// distinguish that from an accidental one, hence the disables below.
// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const peerReviewEnabled = ref(props.element.content.peerReviewEnabled);
// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const peerReviewMode = ref<"manual" | "auto">(props.element.content.peerReviewMode);
// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const peerReviewCount = ref(props.element.content.peerReviewCount);

const peerReviewModeItems = computed(() => [
	{ title: t("components.cardElement.assignmentElement.peerReview.modeManual"), value: "manual" },
	{ title: t("components.cardElement.assignmentElement.peerReview.modeAuto"), value: "auto" },
]);

const onTogglePeerReview = async (enabled: boolean | null) => {
	peerReviewEnabled.value = !!enabled;
	await updateSettings(props.element.id, {
		enabled: peerReviewEnabled.value,
		mode: peerReviewMode.value,
		count: peerReviewCount.value,
	});
};

const onChangePeerReviewMode = async (mode: "manual" | "auto") => {
	peerReviewMode.value = mode;
	await updateSettings(props.element.id, { enabled: peerReviewEnabled.value, mode, count: peerReviewCount.value });
};

const onChangePeerReviewCount = async (value: string) => {
	const count = value ? Number(value) : 1;
	peerReviewCount.value = count;
	await updateSettings(props.element.id, { enabled: peerReviewEnabled.value, mode: peerReviewMode.value, count });
};

// A rubric is "on" once at least one criterion exists - an empty/undefined list means
// flat-points grading, matching the backend's AssignmentElementProps.criteria contract.
const hasCriteria = computed(() => (modelValue.value.criteria?.length ?? 0) > 0);

const criteriaMaxPointsTotal = computed(() =>
	(modelValue.value.criteria ?? []).reduce((sum, criterion) => sum + (criterion.maxPoints || 0), 0)
);

// keeps modelValue.maxPoints in sync with the criteria sum, since the backend's grading
// validation still reads the flat field regardless of the rubric UI shown here
const syncMaxPointsFromCriteria = () => {
	if (hasCriteria.value) {
		modelValue.value.maxPoints = criteriaMaxPointsTotal.value;
	}
};

const generateCriterionId = () =>
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `criterion-${Date.now()}-${Math.random()}`;

const onToggleRubric = (enabled: boolean | null) => {
	if (enabled) {
		modelValue.value.criteria = [{ id: generateCriterionId(), name: "", maxPoints: 1 }];
	} else {
		modelValue.value.criteria = undefined;
	}
	syncMaxPointsFromCriteria();
};

const addCriterion = () => {
	modelValue.value.criteria = [
		...(modelValue.value.criteria ?? []),
		{ id: generateCriterionId(), name: "", maxPoints: 1 },
	];
	syncMaxPointsFromCriteria();
};

const removeCriterion = (index: number) => {
	const criteria = [...(modelValue.value.criteria ?? [])];
	criteria.splice(index, 1);
	modelValue.value.criteria = criteria.length > 0 ? criteria : undefined;
	syncMaxPointsFromCriteria();
};

const setCriterionName = (index: number, value: string) => {
	if (!modelValue.value.criteria) return;
	modelValue.value.criteria = modelValue.value.criteria.map((criterion, i) =>
		i === index ? { ...criterion, name: value } : criterion
	);
};

const setCriterionMaxPoints = (index: number, value: string) => {
	if (!modelValue.value.criteria) return;
	modelValue.value.criteria = modelValue.value.criteria.map((criterion, i) =>
		i === index ? { ...criterion, maxPoints: value ? Number(value) : 0 } : criterion
	);
	syncMaxPointsFromCriteria();
};
</script>

<style scoped lang="scss">
.assignment-edit {
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.assignment-edit-row {
	display: flex;
	gap: 12px;

	> * {
		flex: 1 1 160px;
	}
}
.rubric-section,
.peer-review-section {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 8px;
}
.rubric-criterion-row {
	display: flex;
	align-items: center;
	gap: 12px;
}
.criterion-name-field {
	flex: 1 1 auto;
	min-width: 0;
}
.criterion-points-field {
	flex: 0 0 110px;
}
</style>
