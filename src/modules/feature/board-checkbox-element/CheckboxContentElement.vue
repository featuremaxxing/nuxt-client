<template>
	<VCard
		ref="cardRef"
		class="content-element-card mb-4"
		:class="{ 'content-element-card-edit-mode': isEditMode }"
		variant="outlined"
		data-testid="board-checkbox-element"
	>
		<ContentElementBar :icon="mdiCheckboxOutline">
			<template #title>{{ element.content.text || t("components.cardElement.checkboxElement") }}</template>
			<template v-if="isEditMode && state?.canManage" #menu>
				<BoardMenu :scope="BoardMenuScope.CHECKBOX_ELEMENT" has-background>
					<KebabMenuActionMoveUp v-if="isNotFirstElement" @click="onMoveUp" />
					<KebabMenuActionMoveDown v-if="isNotLastElement" @click="onMoveDown" />
					<KebabMenuActionDelete @click="onDelete" />
				</BoardMenu>
			</template>
		</ContentElementBar>
		<VCardText v-if="isEditMode && state?.canManage">
			<VTextField
				:model-value="modelValue.text"
				:label="t('components.cardElement.checkboxElement.text')"
				data-testid="checkbox-text"
				@update:model-value="(value: string) => (modelValue.text = value)"
			/>
			<VSwitch
				:model-value="modelValue.requireTeacherConfirmation"
				:label="t('components.cardElement.checkboxElement.approvalRequired')"
				:disabled="!state || state.hasCheckActivity"
				:hint="state?.hasCheckActivity ? t('components.cardElement.checkboxElement.approvalLocked') : undefined"
				persistent-hint
				data-testid="checkbox-require-approval"
				@update:model-value="onApprovalRequirementChange"
			/>
			<VSelect
				:model-value="modelValue.audience"
				:items="audienceItems"
				:label="t('components.cardElement.checkboxElement.audienceLabel')"
				:disabled="state.hasCheckActivity"
				:hint="state.hasCheckActivity ? t('components.cardElement.checkboxElement.approvalLocked') : undefined"
				persistent-hint
				data-testid="checkbox-audience-select"
				@update:model-value="onAudienceChange"
			/>
			<div v-if="modelValue.audience === PollAudience.CUSTOM">
				<VCheckbox
					v-for="role in audienceRoleItems"
					:key="role.value"
					:model-value="(modelValue.audienceRoles ?? []).includes(role.value)"
					:label="role.title"
					:disabled="state.hasCheckActivity"
					:data-testid="`checkbox-audience-role-${role.value}`"
					@update:model-value="(checked: boolean | null) => onToggleAudienceRole(role.value, !!checked)"
				/>
			</div>
			<VBtn variant="text" data-testid="checkbox-details" @click="detailsOpen = true">
				{{ t("components.cardElement.checkboxElement.details") }}
			</VBtn>
		</VCardText>
		<VCardText v-else>
			<VCheckbox
				v-if="state?.myEntry && !state.canManage"
				:model-value="state.myEntry.checked"
				:label="t('components.cardElement.checkboxElement.checked')"
				:disabled="busy || state.myEntry.approved"
				data-testid="checkbox-student-check"
				@update:model-value="(value: boolean | null) => onCheck(!!value)"
			/>
			<p
				v-if="state?.myEntry?.checked && !state.canManage && element.content.requireTeacherConfirmation"
				data-testid="checkbox-approval-status"
			>
				{{
					t(
						state.myEntry.approved
							? "components.cardElement.checkboxElement.approved"
							: "components.cardElement.checkboxElement.pending"
					)
				}}
			</p>
			<VBtn v-if="state?.canManage" variant="text" data-testid="checkbox-details" @click="detailsOpen = true">
				{{ t("components.cardElement.checkboxElement.details") }}
			</VBtn>
		</VCardText>
		<VDialog v-model="detailsOpen" max-width="700">
			<VCard>
				<VCardTitle>{{ t("components.cardElement.checkboxElement.students") }}</VCardTitle>
				<VCardText>
					<VList>
						<VListItem
							v-for="entry in state?.entries ?? []"
							:key="entry.userId"
							:data-testid="`checkbox-student-${entry.userId}`"
						>
							<VListItemTitle>{{ entry.firstName }} {{ entry.lastName }}</VListItemTitle>
							<VListItemSubtitle>
								{{
									t(
										entry.checked
											? "components.cardElement.checkboxElement.checked"
											: "components.cardElement.checkboxElement.unchecked"
									)
								}}
								<span v-if="entry.checked && element.content.requireTeacherConfirmation">
									·
									{{
										t(
											entry.approved
												? "components.cardElement.checkboxElement.approved"
												: "components.cardElement.checkboxElement.pending"
										)
									}}
								</span>
							</VListItemSubtitle>
							<template v-if="entry.checked && element.content.requireTeacherConfirmation" #append>
								<VBtn
									:disabled="busy"
									:data-testid="`checkbox-approve-${entry.userId}`"
									@click="onApprove(entry.userId, !entry.approved)"
								>
									{{
										t(
											entry.approved
												? "components.cardElement.checkboxElement.revoke"
												: "components.cardElement.checkboxElement.confirm"
										)
									}}
								</VBtn>
							</template>
						</VListItem>
					</VList>
				</VCardText>
			</VCard>
		</VDialog>
	</VCard>
</template>

<script setup lang="ts">
import { CheckboxState, useCheckboxApi } from "./checkbox-api";
import { CheckboxElement } from "@/types/board/ContentElement";
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { BoardRoles, PollAudience } from "@api-server";
import { useBoardFocusHandler, useContentElementState } from "@data-board";
import { mdiCheckboxOutline } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
import { onMounted, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: CheckboxElement;
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
const audienceItems = [
	{ title: t("components.cardElement.checkboxElement.audience.students"), value: PollAudience.STUDENTS },
	{ title: t("components.cardElement.checkboxElement.audience.teachers"), value: PollAudience.TEACHERS },
	{ title: t("components.cardElement.checkboxElement.audience.all"), value: PollAudience.ALL },
	{ title: t("components.cardElement.checkboxElement.audience.custom"), value: PollAudience.CUSTOM },
];
const audienceRoleItems = [
	{ title: t("components.cardElement.checkboxElement.audienceRole.reader"), value: BoardRoles.READER },
	{ title: t("components.cardElement.checkboxElement.audienceRole.editor"), value: BoardRoles.EDITOR },
	{ title: t("components.cardElement.checkboxElement.audienceRole.admin"), value: BoardRoles.ADMIN },
];
const cardRef = ref(null);
const element = toRef(props, "element");
useBoardFocusHandler(element.value.id, cardRef);
const { modelValue } = useContentElementState(props, { autoSaveDebounce: 400 });
const api = useCheckboxApi();
const state = ref<CheckboxState>();
const busy = ref(false);
const detailsOpen = ref(false);
const refresh = async () => {
	state.value = await api.getState(props.element.id);
};
onMounted(refresh);
watch(() => props.isEditMode, refresh);
watch(detailsOpen, (open) => {
	if (open) void refresh();
});
const onCheck = async (checked: boolean) => {
	if (!state.value?.myEntry || state.value.canManage || state.value.myEntry.approved || busy.value) return;
	busy.value = true;
	try {
		const result = await api.check(props.element.id, checked);
		if (result) state.value = result;
	} finally {
		busy.value = false;
	}
};
const onApprove = async (userId: string, approved: boolean) => {
	busy.value = true;
	try {
		const result = await api.approve(props.element.id, userId, approved);
		if (result) state.value = result;
	} finally {
		busy.value = false;
	}
};
const onApprovalRequirementChange = (value: boolean | null) => {
	if (state.value?.canManage && !state.value.hasCheckActivity) modelValue.value.requireTeacherConfirmation = !!value;
};
const onAudienceChange = (audience: PollAudience) => {
	if (state.value?.canManage && !state.value.hasCheckActivity) modelValue.value.audience = audience;
};
const onToggleAudienceRole = (role: BoardRoles, checked: boolean) => {
	if (!state.value?.canManage || state.value.hasCheckActivity) return;
	const current = modelValue.value.audienceRoles ?? [];
	modelValue.value.audienceRoles = checked ? [...new Set([...current, role])] : current.filter((item) => item !== role);
};
const onMoveUp = () => {
	if (state.value?.canManage) emit("move-up:edit");
};
const onMoveDown = () => {
	if (state.value?.canManage) emit("move-down:edit");
};
const onDelete = async () => {
	if (state.value?.canManage && (await askDeletionForType("components.cardElement.checkboxElement")))
		emit("delete:element", props.element.id);
};
</script>
