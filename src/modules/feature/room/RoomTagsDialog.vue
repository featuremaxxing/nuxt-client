<template>
	<VDialog
		:model-value="!!roomToTag"
		max-width="480"
		data-testid="room-tags-dialog"
		@update:model-value="(isOpen) => !isOpen && close()"
		@after-enter="focusInput"
	>
		<VCard v-if="roomToTag">
			<VCardTitle class="text-h4 px-6 pt-5 text-break">
				{{ t("pages.rooms.tags.dialog.title", { name: roomToTag.name }) }}
			</VCardTitle>
			<VCardText class="px-6">
				<p class="mb-4">{{ t("pages.rooms.tags.dialog.text") }}</p>
				<VCombobox
					ref="input"
					v-model="names"
					v-model:search="search"
					:items="existingNames"
					:label="t('pages.rooms.tags.dialog.label')"
					:hint="t('pages.rooms.tags.dialog.hint')"
					persistent-hint
					multiple
					chips
					closable-chips
					hide-selected
					:delimiters="[',']"
					:counter="MAX_TAGS"
					:rules="[
						(value: string[]) => value.length <= MAX_TAGS || t('pages.rooms.tags.dialog.tooMany', { max: MAX_TAGS }),
					]"
					:prepend-inner-icon="mdiTagOutline"
					data-testid="room-tags-input"
					@keydown.enter.ctrl.prevent="save"
					@keydown.enter.meta.prevent="save"
				/>
			</VCardText>
			<VCardActions class="px-6 pb-4">
				<VSpacer />
				<VBtn variant="text" data-testid="room-tags-cancel" @click="close">
					{{ t("common.actions.cancel") }}
				</VBtn>
				<VBtn
					variant="flat"
					color="primary"
					:disabled="names.length > MAX_TAGS"
					:loading="isSaving"
					data-testid="room-tags-save"
					@click="save"
				>
					{{ t("common.actions.save") }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { useRoomsView } from "./roomsView.composable";
import { byTagName, tagsOfRoom, useRoomStore } from "@data-room";
import { mdiTagOutline } from "@icons/material";
import { computed, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

const MAX_TAGS = 20;

const { t } = useI18n();
const roomStore = useRoomStore();
const { roomToTag } = useRoomsView();

const names = ref<string[]>([]);
const search = ref<string | null>("");
const isSaving = ref(false);
const input = useTemplateRef<{ focus: () => void }>("input");

const existingNames = computed(() => [...roomStore.tags].sort(byTagName).map((tag) => tag.name));

watch(roomToTag, (room) => {
	names.value = room ? tagsOfRoom(room, roomStore.tags).map((tag) => tag.name) : [];
	search.value = "";
});

const focusInput = () => input.value?.focus();

const close = () => {
	roomToTag.value = undefined;
};

const save = async () => {
	if (!roomToTag.value || names.value.length > MAX_TAGS) return;
	// a name that was typed but not confirmed with Enter is meant to be a tag, too
	const pending = search.value?.trim();
	const allNames = pending ? [...names.value, pending] : names.value;

	isSaving.value = true;
	const success = await roomStore.setRoomTags(roomToTag.value.id, allNames);
	isSaving.value = false;
	if (success) close();
};
</script>
