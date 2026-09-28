<template>
	<DefaultWireframe max-width="short" :breadcrumbs="[]">
		<template #header>
			<h1 data-testid="webdav-title">{{ t("pages.webdav.title") }}</h1>
		</template>

		<p class="mb-6">{{ t("pages.webdav.intro") }}</p>

		<h2 class="text-h4 mb-2">{{ t("pages.webdav.address.title") }}</h2>
		<VTextField
			:model-value="webDavUrl"
			readonly
			variant="outlined"
			density="compact"
			data-testid="webdav-url"
			:append-inner-icon="mdiContentCopy"
			@click:append-inner="copy(webDavUrl)"
		/>

		<VExpansionPanels class="mb-8" variant="accordion" data-testid="webdav-instructions">
			<VExpansionPanel v-for="system in systems" :key="system" :title="t(`pages.webdav.instructions.${system}.title`)">
				<VExpansionPanelText>{{
					t(`pages.webdav.instructions.${system}.text`, { url: webDavUrl })
				}}</VExpansionPanelText>
			</VExpansionPanel>
		</VExpansionPanels>

		<h2 class="text-h4 mb-2">{{ t("pages.webdav.appPasswords.title") }}</h2>
		<p class="mb-4">{{ t("pages.webdav.appPasswords.description") }}</p>

		<VAlert
			v-if="created"
			type="success"
			variant="tonal"
			class="mb-4"
			closable
			data-testid="webdav-created"
			@click:close="created = undefined"
		>
			<p class="mb-2">{{ t("pages.webdav.appPasswords.created") }}</p>
			<div class="d-flex align-center ga-2">
				<span class="font-weight-bold">{{ t("pages.webdav.appPasswords.username") }}:</span>
				<code data-testid="webdav-created-username">{{ created.username }}</code>
			</div>
			<div class="d-flex align-center ga-2">
				<span class="font-weight-bold">{{ t("pages.webdav.appPasswords.password") }}:</span>
				<code class="text-break" data-testid="webdav-created-token">{{ created.token }}</code>
				<VBtn
					:icon="mdiContentCopy"
					size="small"
					variant="text"
					:aria-label="t('common.actions.copy')"
					data-testid="webdav-copy-token"
					@click="copy(created.token)"
				/>
			</div>
		</VAlert>

		<form class="d-flex ga-2 align-start mb-4" @submit.prevent="onCreate">
			<VTextField
				v-model="newName"
				:label="t('pages.webdav.appPasswords.name')"
				:placeholder="t('pages.webdav.appPasswords.namePlaceholder')"
				variant="outlined"
				density="compact"
				maxlength="100"
				data-testid="webdav-new-name"
			/>
			<VBtn
				type="submit"
				color="primary"
				variant="flat"
				:disabled="!newName.trim() || isCreating"
				:loading="isCreating"
				data-testid="webdav-create"
			>
				{{ t("pages.webdav.appPasswords.create") }}
			</VBtn>
		</form>

		<p v-if="!isLoading && appPasswords.length === 0" data-testid="webdav-empty">
			{{ t("pages.webdav.appPasswords.empty") }}
		</p>
		<VList v-else>
			<VListItem
				v-for="appPassword in appPasswords"
				:key="appPassword.id"
				:title="appPassword.name"
				:subtitle="usageLabel(appPassword)"
				:data-testid="`webdav-app-password-${appPassword.id}`"
			>
				<template #append>
					<VBtn
						variant="text"
						color="error"
						:data-testid="`webdav-revoke-${appPassword.id}`"
						@click="toRevoke = appPassword"
					>
						{{ t("pages.webdav.appPasswords.revoke") }}
					</VBtn>
				</template>
			</VListItem>
		</VList>

		<VDialog :model-value="!!toRevoke" max-width="480" @update:model-value="toRevoke = undefined">
			<VCard v-if="toRevoke" data-testid="webdav-revoke-dialog">
				<VCardTitle>{{ t("pages.webdav.appPasswords.revokeConfirm.title") }}</VCardTitle>
				<VCardText>{{ t("pages.webdav.appPasswords.revokeConfirm.text", { name: toRevoke.name }) }}</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" @click="toRevoke = undefined">{{ t("common.actions.cancel") }}</VBtn>
					<VBtn color="error" variant="flat" data-testid="webdav-revoke-confirm" @click="onRevoke">
						{{ t("pages.webdav.appPasswords.revoke") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { notifySuccess } from "@data-app";
import { AppPassword, CreatedAppPassword, useAppPasswordApi } from "@data-app-password";
import { mdiContentCopy } from "@icons/material";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t, d } = useI18n();
const { getAppPasswords, createAppPassword, deleteAppPassword } = useAppPasswordApi();

useTitle(buildPageTitle(t("pages.webdav.title")));

const systems = ["macos", "windows", "ios", "linux"] as const;
const webDavUrl = `${window.location.origin}/api/v3/webdav/`;

const appPasswords = ref<AppPassword[]>([]);
const isLoading = ref(true);
const newName = ref("");
const isCreating = ref(false);
const created = ref<CreatedAppPassword>();
const toRevoke = ref<AppPassword>();

const load = async () => {
	appPasswords.value = (await getAppPasswords()) ?? [];
	isLoading.value = false;
};

onMounted(load);

const usageLabel = (appPassword: AppPassword) => {
	const createdAt = t("pages.webdav.appPasswords.createdAt", { date: d(new Date(appPassword.createdAt)) });
	const lastUsed = appPassword.lastUsedAt
		? t("pages.webdav.appPasswords.lastUsedAt", { date: d(new Date(appPassword.lastUsedAt)) })
		: t("pages.webdav.appPasswords.neverUsed");

	return `${createdAt} · ${lastUsed}`;
};

const copy = async (text: string) => {
	await navigator.clipboard.writeText(text);
	notifySuccess(t("pages.webdav.copied"));
};

const onCreate = async () => {
	isCreating.value = true;
	const result = await createAppPassword(newName.value.trim());
	isCreating.value = false;
	if (result) {
		created.value = result;
		newName.value = "";
		await load();
	}
};

const onRevoke = async () => {
	const appPassword = toRevoke.value;
	toRevoke.value = undefined;
	if (appPassword && (await deleteAppPassword(appPassword.id))) {
		if (created.value?.id === appPassword.id) {
			created.value = undefined;
		}
		await load();
	}
};
</script>
