import { setupAddElementDialogMock } from "../test-utils/AddElementDialogMock";
import CardHost from "./CardHost.vue";
import ContentElementList from "./ContentElementList.vue";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { useCardRestApi } from "@/modules/data/board/cardActions/cardRestApi.composable";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { useCardSocketApi } from "@/modules/data/board/cardActions/cardSocketApi.composable";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { useLearningRoomApi } from "@/modules/data/learning-room/LearningRoomApi.composable";
import { BoardContextType } from "@/types/board/BoardContext";
import * as confirmDialogUtils from "@/utils/confirmation-dialog.utils";
import { createTestEnvStore, mockComposable } from "@@/tests/test-utils";
import { cardResponseFactory, fileElementResponseFactory } from "@@/tests/test-utils/factory";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardResponseAllowedOperations, CardResponse, Colors } from "@api-server";
import {
	useBoardFocusHandler,
	useCardStore,
	useCourseBoardEditMode,
	useSharedBoardPageInformation,
	useSharedEditMode,
} from "@data-board";
import * as featureDialog from "@feature-dialog";
import { createTestingPinia } from "@pinia/testing";
import { BoardMenuScope, PinCardButton } from "@ui-board";
import {
	KebabMenuActionDelete,
	KebabMenuActionDuplicate,
	KebabMenuActionEdit,
	KebabMenuActionExport,
	KebabMenuActionShare,
	KebabMenuActionShareLink,
} from "@ui-kebab-menu";
import { useShareBoardLink, useSharedFileSelect, useSharedLastCreatedElement } from "@util-board";
import { shallowMount } from "@vue/test-utils";
import { useElementHover } from "@vueuse/core";
import { Mocked } from "vitest";
import { computed, ref } from "vue";
import { createRouterMock, injectRouterMock, RouterMock } from "vue-router-mock";
import { VCard, VChip } from "vuetify/components";

vi.mock("@util-board");

vi.mock("@feature-dialog", () => ({
	withGlobalLoadingState: vi.fn(async (fn: () => Promise<unknown>) => await fn()),
}));

vi.mock("@vueuse/core", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@vueuse/core")>();

	return {
		...actual,
		useElementHover: vi.fn(actual.useElementHover),
	};
});

vi.mock("@data-board/BoardFocusHandler.composable");
vi.mock("@data-board/edit-mode.composable");
vi.mock("@data-board/BoardPageInformation.composable");

vi.mock("@/modules/data/learning-room/LearningRoomApi.composable");

vi.mock("../shared/AddElementDialog.composable");

vi.mock("@data-board/cardActions/cardRestApi.composable");
vi.mocked(useCardRestApi).mockReturnValue(mockComposable(useCardRestApi));

vi.mock("@data-board/cardActions/cardSocketApi.composable");
vi.mocked(useCardSocketApi).mockReturnValue(mockComposable(useCardSocketApi));

describe("CardHost", () => {
	let useShareBoardLinkMock: Mocked<ReturnType<typeof useShareBoardLink>>;
	let useSharedFileSelectMock: Mocked<ReturnType<typeof useSharedFileSelect>>;
	let router: RouterMock;

	beforeEach(() => {
		vi.mocked(useSharedEditMode).mockReturnValue(
			mockComposable(useSharedEditMode, {
				editModeId: ref(undefined),
				isInEditMode: computed(() => true),
			})
		);

		useShareBoardLinkMock = mockComposable(useShareBoardLink);
		vi.mocked(useShareBoardLink).mockReturnValue(useShareBoardLinkMock);

		vi.mocked(useBoardFocusHandler).mockReturnValue(
			mockComposable(useBoardFocusHandler, {
				isFocusContained: computed(() => true),
				isFocused: computed(() => true),
				isFocusWithin: computed(() => true),
				isFocusedById: computed(() => true),
			})
		);

		vi.mocked(useCourseBoardEditMode).mockReturnValue(
			mockComposable(useCourseBoardEditMode, {
				isEditMode: computed(() => true),
			})
		);

		setupAddElementDialogMock();

		vi.mocked(useSharedLastCreatedElement).mockReturnValue(mockComposable(useSharedLastCreatedElement));

		useSharedFileSelectMock = mockComposable(useSharedFileSelect, {
			isFileSelectOnMountEnabled: ref(true),
		});
		vi.mocked(useSharedFileSelect).mockReturnValue(useSharedFileSelectMock);

		router = createRouterMock();
		injectRouterMock(router);

		vi.mocked(useLearningRoomApi).mockReturnValue(
			mockComposable(useLearningRoomApi, { fetchPinnedCardIds: vi.fn().mockResolvedValue([]) })
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const setup = (options?: {
		hasCard?: boolean;
		hasElement?: boolean;
		allowedOperations?: Partial<BoardResponseAllowedOperations>;
		backgroundColor?: Colors;
		cardId?: string;
		originTitle?: string;
		originBoardId?: string;
		isPinnedCopy?: boolean;
		contextType?: BoardContextType;
		isLearningRoomEnabled?: boolean;
	}) => {
		const {
			hasElement = false,
			hasCard = true,
			allowedOperations = {},
			backgroundColor = Colors.TRANSPARENT,
		} = options ?? {};

		let card: CardResponse | null = null;
		if (hasCard) {
			card = cardResponseFactory.build({
				elements: hasElement ? [fileElementResponseFactory.build()] : [],
				backgroundColor,
				id: options?.cardId ?? "cardId",
			});
		}

		const cardId = card?.id ?? "cardId";

		vi.mocked(useSharedBoardPageInformation).mockReturnValue(
			mockComposable(useSharedBoardPageInformation, {
				contextType: computed(() => options?.contextType ?? BoardContextType.ROOM),
			})
		);

		const pinia = createTestingPinia({
			initialState: {
				cardStore: {
					cards: card ? { [card.id]: card } : {},
				},
				boardStore: {
					board: {
						allowedOperations: allowedOperations,
						id: "boardId",
					},
				},
			},
			stubActions: false,
		});
		createTestEnvStore(
			{ FEATURE_PERSONAL_LEARNING_ROOM_ENABLED: options?.isLearningRoomEnabled ?? false },
			undefined,
			pinia
		);

		const wrapper = shallowMount(CardHost, {
			global: {
				plugins: [pinia, createTestingVuetify(), createTestingI18n()],
			},
			propsData: {
				cardId,
				height: card?.height ?? 0,
				columnIndex: 0,
				rowIndex: 1,
				originTitle: options?.originTitle,
				originBoardId: options?.originBoardId,
				isPinnedCopy: options?.isPinnedCopy,
			},
		});

		return {
			wrapper,
			cardId,
		};
	};

	describe("pinned copy in the learning room", () => {
		const setupPinnedCopy = () =>
			setup({
				isPinnedCopy: true,
				originTitle: "Mathe 9b",
				originBoardId: "originBoardId",
				contextType: BoardContextType.USER,
				isLearningRoomEnabled: true,
				allowedOperations: { deleteCard: true, moveCard: true, copyCard: true, updateCardTitle: true },
			});

		it("should show where the card comes from and link back to it", () => {
			useShareBoardLinkMock.getShareLinkId.mockReturnValue("card-cardId");
			const { wrapper } = setupPinnedCopy();

			const chip = wrapper.getComponent(VChip);

			expect(chip.text()).toContain("Mathe 9b");
			expect(chip.props("to")).toEqual({
				name: "boards-id",
				params: { id: "originBoardId" },
				hash: "#card-cardId",
			});
		});

		it("should only offer to open the original or unpin it", () => {
			// the learning room grants its owner every board right - those must not
			// reach the original card in the course board
			const { wrapper } = setupPinnedCopy();

			expect(wrapper.find('[data-testid="kebab-menu-action-open-origin"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="kebab-menu-action-unpin-card"]').exists()).toBe(true);
			expect(wrapper.findComponent(KebabMenuActionDelete).exists()).toBe(false);
			expect(wrapper.findComponent(KebabMenuActionDuplicate).exists()).toBe(false);
			expect(wrapper.findComponent(KebabMenuActionExport).exists()).toBe(false);
		});

		it("should navigate to the original board", async () => {
			const { wrapper } = setupPinnedCopy();

			await wrapper.find('[data-testid="kebab-menu-action-open-origin"]').trigger("click");

			expect(router.push).toHaveBeenCalledWith(
				expect.objectContaining({ name: "boards-id", params: { id: "originBoardId" } })
			);
		});

		it("should keep the pin button to unpin the card", () => {
			const { wrapper } = setupPinnedCopy();

			expect(wrapper.findComponent(PinCardButton).exists()).toBe(true);
		});
	});

	describe("own card in the learning room", () => {
		it("should not offer to pin it into the room it already lives in", () => {
			const { wrapper } = setup({ contextType: BoardContextType.USER, isLearningRoomEnabled: true });

			expect(wrapper.findComponent(PinCardButton).exists()).toBe(false);
			expect(wrapper.find('[data-testid="card-origin-chip"]').exists()).toBe(false);
		});
	});

	describe("regular card in a room", () => {
		it("should offer the pin button and no origin chip", () => {
			const { wrapper } = setup({ isLearningRoomEnabled: true });

			expect(wrapper.findComponent(PinCardButton).exists()).toBe(true);
			expect(wrapper.find('[data-testid="card-origin-chip"]').exists()).toBe(false);
		});
	});

	describe("when component is mounted", () => {
		it("should be found in dom", () => {
			const { wrapper } = setup();

			expect(wrapper.findComponent(CardHost).exists()).toBe(true);
		});

		describe("'CardSkeleton' component", () => {
			it("should be rendered if card is not loaded", () => {
				const { wrapper } = setup({ hasCard: false });

				expect(wrapper.findComponent({ name: "CardSkeleton" }).exists()).toBe(true);
			});

			it("should not be rendered if card is loaded", () => {
				const { wrapper } = setup();
				expect(wrapper.findComponent({ name: "CardSkeleton" }).exists()).toBe(false);
			});
		});

		describe("'ContentElementList' component", () => {
			it("should be found in dom", () => {
				const { wrapper } = setup({});

				const contentElementList = wrapper.findComponent(ContentElementList);

				expect(contentElementList.exists()).toBe(true);
			});
		});
	});

	describe("user permissions", () => {
		describe("when user wants to share a card.", () => {
			it("should show share button", () => {
				const { wrapper } = setup({ allowedOperations: { shareCard: true } });
				const shareButton = wrapper.findComponent(KebabMenuActionShare);
				expect(shareButton.exists()).toEqual(true);
			});

			it("should not show share button", () => {
				const { wrapper } = setup({ allowedOperations: { shareCard: false } });
				const shareButton = wrapper.findComponent(KebabMenuActionShare);
				expect(shareButton.exists()).toEqual(false);
			});
		});

		describe("when user is not permitted to delete", () => {
			it("should not show an edit button", () => {
				const { wrapper } = setup({ allowedOperations: { deleteCard: false } });

				const deleteButton = wrapper.findComponent(KebabMenuActionEdit);

				expect(deleteButton.exists()).toEqual(false);
			});

			it("should not show a delete button", () => {
				const { wrapper } = setup({ allowedOperations: { deleteCard: false } });

				const deleteButton = wrapper.findComponent(KebabMenuActionDelete);

				expect(deleteButton.exists()).toEqual(false);
			});
		});

		describe("when user wants to move a card.", () => {
			it("should show move button when allowed to edit", () => {
				const { wrapper } = setup({ allowedOperations: { moveCard: true } });

				const moveButton = wrapper.findComponent(KebabMenuActionExport);

				expect(moveButton.exists()).toEqual(true);
			});

			it("should not show move button when not allowed to edit", () => {
				const { wrapper } = setup({ allowedOperations: { moveCard: false } });

				const moveButton = wrapper.findComponent(KebabMenuActionExport);

				expect(moveButton.exists()).toEqual(false);
			});
		});
	});

	describe("card menus", () => {
		describe("when users clicks duplicate menu btn", () => {
			it("should call cardStore.duplicateCardRequest", async () => {
				const { wrapper, cardId } = setup({ allowedOperations: { copyCard: true } });

				const duplicateButton = wrapper.findComponent(KebabMenuActionDuplicate);

				await duplicateButton.trigger("click");

				expect(useCardStore().duplicateCard).toHaveBeenCalledWith({ cardId });
			});

			it("should trigger the global loading dialog while duplicating", async () => {
				const { wrapper } = setup({ allowedOperations: { copyCard: true } });
				const duplicateButton = wrapper.findComponent(KebabMenuActionDuplicate);

				await duplicateButton.trigger("click");

				expect(featureDialog.withGlobalLoadingState).toHaveBeenCalledOnce();
			});
		});

		describe("when user clicks move button", () => {
			it("should emit move:card event", () => {
				const { wrapper } = setup({ allowedOperations: { moveCard: true } });

				const moveButton = wrapper.findComponent(KebabMenuActionExport);
				moveButton.vm.$emit("click");

				expect(wrapper.emitted("move:card")).toHaveLength(1);
			});
		});

		describe("when user clicks share button", () => {
			it("should emit share:card event", () => {
				const { wrapper } = setup({ allowedOperations: { shareCard: true } });

				const shareButton = wrapper.findComponent(KebabMenuActionShare);
				shareButton.vm.$emit("click");

				expect(wrapper.emitted("share:card")).toHaveLength(1);
			});
		});

		describe("when users clicks share link menu", () => {
			it("should copy a share link", async () => {
				const { wrapper, cardId } = setup({ allowedOperations: { shareCard: true } });

				const shareLinkButton = wrapper.findComponent(KebabMenuActionShareLink);
				await shareLinkButton.trigger("click");

				expect(useShareBoardLinkMock.copyShareLink).toHaveBeenCalledWith(cardId, BoardMenuScope.CARD);
			});
		});

		describe("when users click delete menu", () => {
			it("should emit 'delete:card' when confirmed", async () => {
				vi.spyOn(confirmDialogUtils, "askDeletionForType").mockResolvedValue(true);
				const { wrapper } = setup({ allowedOperations: { deleteCard: true } });

				const deleteButton = wrapper.findComponent(KebabMenuActionDelete);
				await deleteButton.trigger("click");

				expect(confirmDialogUtils.askDeletionForType).toHaveBeenCalledWith("components.boardCard");
				expect(wrapper.emitted("delete:card")).toHaveLength(1);
			});
		});
	});

	describe("hover state", () => {
		describe("when user hovers over card and user has move permission", () => {
			describe("when card is not in edit mode", () => {
				it("should apply hover attribute to Card", async () => {
					vi.mocked(useElementHover).mockReturnValue(ref(true));

					vi.mocked(useCourseBoardEditMode).mockReturnValue(
						mockComposable(useCourseBoardEditMode, {
							isEditMode: computed(() => false),
						})
					);

					const { wrapper } = setup({ allowedOperations: { moveCard: true } });
					const card = wrapper.findComponent(VCard);

					expect(card.props("hover")).toBe(true);
				});
			});

			describe("when card is in edit mode", () => {
				it("should not apply hover attribute to Card", async () => {
					vi.mocked(useElementHover).mockReturnValue(ref(true));

					vi.mocked(useCourseBoardEditMode).mockReturnValue(
						mockComposable(useCourseBoardEditMode, {
							isEditMode: computed(() => true),
						})
					);

					const { wrapper } = setup({ allowedOperations: { moveCard: true } });
					const card = wrapper.findComponent(VCard);

					expect(card.props("hover")).toBe(false);
				});
			});
		});
	});

	describe("card detail view", () => {
		describe("when detail view button is clicked", () => {
			it("should navigate to detail view route", async () => {
				const { wrapper } = setup();

				const detailViewButton = wrapper.findComponent({ name: "DetailViewButton" });
				await detailViewButton.vm.$emit("open-detail-view");

				expect(router.push).toHaveBeenCalled();
			});
		});

		describe("when detail view is active", () => {
			it("should propagate state to content element list", async () => {
				router.currentRoute.value = {
					...router.currentRoute.value,
					params: { cardId: "cardId" },
				};
				const { wrapper } = setup();

				const contentElementList = wrapper.findComponent({ name: "ContentElementList" });

				expect(contentElementList.props("isDetailView")).toBe(true);
			});

			it("should render card with transparent background", async () => {
				const backgroundColor = Colors.BLUE;
				router.currentRoute.value = {
					...router.currentRoute.value,
					params: { cardId: "cardId" },
				};
				const { wrapper } = setup({
					backgroundColor,
				});

				const card = wrapper.findComponent(VCard);

				expect(card.attributes("style")).toContain("background-color: transparent");
			});

			it("should render card with no border", async () => {
				const backgroundColor = Colors.BLUE;
				router.currentRoute.value = {
					...router.currentRoute.value,
					params: { cardId: "cardId" },
				};
				const { wrapper } = setup({
					backgroundColor,
				});

				const card = wrapper.findComponent(VCard);

				expect(card.attributes("style")).not.toContain("border-left");
			});

			it("should render card with no elevation", async () => {
				const backgroundColor = Colors.BLUE;
				router.currentRoute.value = {
					...router.currentRoute.value,
					params: { cardId: "cardId" },
				};
				const { wrapper } = setup({
					backgroundColor,
				});

				const card = wrapper.findComponent(VCard);

				expect(card.attributes("elevation")).toBe("0");
			});
		});
	});
});
