import LearningPathCanvas from "./LearningPathCanvas.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { type LearningPathStep } from "@data-board-learning-path";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

const step = (id: string, overrides: Partial<LearningPathStep> = {}): LearningPathStep => ({
	id,
	linkedBoardId: `board-${id}`,
	title: id,
	isVisible: true,
	positionX: 0,
	positionY: 0,
	prerequisiteStepIds: [],
	unlockMode: "all",
	lockUntilPrerequisitesDone: false,
	status: "open",
	...overrides,
});

// the stage starts shifted by 24px, see LearningPathCanvas
const OFFSET = 24;

const pointer = (target: EventTarget, type: string, clientX: number, clientY: number) =>
	target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX, clientY, button: 0 }));

describe("LearningPathCanvas", () => {
	const steps = () => [step("a"), step("b", { positionX: 400, prerequisiteStepIds: ["a"] })];

	const setup = (props: { steps?: LearningPathStep[]; isEditor?: boolean } = {}) => {
		const wrapper = mount(LearningPathCanvas, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { steps: props.steps ?? steps(), isEditor: props.isEditor ?? true },
			attachTo: document.body,
		});

		return { wrapper, tile: (id: string) => wrapper.get(`[data-testid=learning-path-tile-${id}]`) };
	};

	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("should draw an arrow for every prerequisite", () => {
		const { wrapper } = setup();

		expect(wrapper.findAll("[data-testid=learning-path-edge]")).toHaveLength(1);
	});

	describe("as an editor", () => {
		it("should select a tile on click", () => {
			const { wrapper, tile } = setup();

			pointer(tile("b").element, "pointerdown", 430, 50);
			pointer(tile("b").element, "pointerup", 431, 50);
			tile("b").element.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

			expect(wrapper.emitted("select")).toEqual([["b"]]);
		});

		it("should select a tile again after working elsewhere", () => {
			const { wrapper, tile } = setup();
			const canvas = wrapper.get("[data-testid=learning-path-canvas]").element;

			pointer(tile("a").element, "pointerdown", 10, 10);
			pointer(window, "pointermove", 60, 40);
			pointer(window, "pointerup", 60, 40);
			pointer(canvas, "pointerdown", 700, 300);
			pointer(window, "pointerup", 700, 300);
			pointer(tile("a").element, "pointerdown", 60, 40);
			pointer(tile("a").element, "pointerup", 60, 40);

			expect(wrapper.emitted("select")).toEqual([[undefined], ["a"]]);
		});

		it("should select a tile with the keyboard", async () => {
			const { wrapper, tile } = setup();

			await tile("b").trigger("click");

			expect(wrapper.emitted("select")).toEqual([["b"]]);
		});

		it("should move a dragged tile and not select it", async () => {
			const { wrapper, tile } = setup();

			pointer(tile("a").element, "pointerdown", 10, 10);
			pointer(window, "pointermove", 60, 40);
			pointer(window, "pointerup", 60, 40);
			tile("a").element.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
			await nextTick();

			expect(wrapper.emitted("move")).toEqual([["a", 50, 30]]);
			expect(wrapper.emitted("select")).toBeUndefined();
		});

		it("should connect two tiles by dragging from the handle", () => {
			const { wrapper, tile } = setup({ steps: [step("a"), step("b", { positionX: 400 })] });
			const handle = tile("a").get("[data-testid=learning-path-tile-handle-right]");

			pointer(handle.element, "pointerdown", OFFSET + 220, OFFSET + 48);
			pointer(window, "pointermove", OFFSET + 300, OFFSET + 40);
			pointer(window, "pointerup", OFFSET + 410, OFFSET + 10);

			expect(wrapper.emitted("connect")).toEqual([["a", "b"]]);
		});

		it("should connect from a handle on any side", () => {
			const { wrapper, tile } = setup({ steps: [step("a"), step("b", { positionY: 300 })] });
			const handle = tile("a").get("[data-testid=learning-path-tile-handle-bottom]");

			pointer(handle.element, "pointerdown", OFFSET + 110, OFFSET + 96);
			pointer(window, "pointerup", OFFSET + 110, OFFSET + 320);

			expect(wrapper.emitted("connect")).toEqual([["a", "b"]]);
			expect(tile("a").findAll("[data-testid^=learning-path-tile-handle-]")).toHaveLength(4);
		});

		it("should move the focused tile with the arrow keys", async () => {
			const { wrapper, tile } = setup();

			await tile("b").trigger("keydown", { key: "ArrowDown" });
			await tile("b").trigger("keydown", { key: "ArrowLeft", shiftKey: true });

			expect(wrapper.emitted("move")).toEqual([
				["b", 400, 20],
				["b", 340, 0],
			]);
		});

		describe("removing an arrow", () => {
			const selectArrow = async () => {
				const { wrapper } = setup();
				pointer(wrapper.get("[data-testid=learning-path-edge-hit-a-b]").element, "pointerdown", 200, 50);
				await nextTick();
				return wrapper;
			};

			it("should select an arrow on click and remove it with its button", async () => {
				const wrapper = await selectArrow();

				expect(wrapper.get("[data-testid=learning-path-edge]").classes()).toContain("lp-canvas__edge--selected");
				await wrapper.get("[data-testid=learning-path-edge-remove]").trigger("click");

				expect(wrapper.emitted("disconnect")).toEqual([["a", "b"]]);
				expect(wrapper.find("[data-testid=learning-path-edge-remove]").exists()).toBe(false);
			});

			it("should remove the selected arrow with the delete key, and let it go with escape", async () => {
				const wrapper = await selectArrow();
				const canvas = wrapper.get("[data-testid=learning-path-canvas]");

				await canvas.trigger("keydown", { key: "Escape" });
				expect(wrapper.find("[data-testid=learning-path-edge-remove]").exists()).toBe(false);
				await canvas.trigger("keydown", { key: "Delete" });
				expect(wrapper.emitted("disconnect")).toBeUndefined();

				pointer(wrapper.get("[data-testid=learning-path-edge-hit-a-b]").element, "pointerdown", 200, 50);
				await nextTick();
				await canvas.trigger("keydown", { key: "Delete" });
				expect(wrapper.emitted("disconnect")).toEqual([["a", "b"]]);
			});

			it("should let the arrow go when the empty canvas is clicked", async () => {
				const wrapper = await selectArrow();
				const canvas = wrapper.get("[data-testid=learning-path-canvas]").element;

				pointer(canvas, "pointerdown", 900, 600);
				pointer(canvas, "pointerup", 900, 600);
				await nextTick();

				expect(wrapper.find("[data-testid=learning-path-edge-remove]").exists()).toBe(false);
			});

			it("should not let students select arrows", () => {
				const { wrapper } = setup({ isEditor: false });

				expect(wrapper.find("[data-testid=learning-path-edge-hit-a-b]").exists()).toBe(false);
			});
		});

		it("should clear the selection when the empty canvas is clicked", () => {
			const { wrapper } = setup();
			const canvas = wrapper.get("[data-testid=learning-path-canvas]").element;

			pointer(canvas, "pointerdown", 5, 5);
			pointer(window, "pointerup", 5, 5);

			expect(wrapper.emitted("select")).toEqual([[undefined]]);
		});
	});

	describe("as a student", () => {
		it("should open a step that is open", async () => {
			const { wrapper, tile } = setup({ isEditor: false });

			await tile("a").trigger("click");

			expect(wrapper.emitted("open")?.[0][0]).toMatchObject({ id: "a" });
		});

		it("should not open a locked step", async () => {
			const { wrapper, tile } = setup({
				isEditor: false,
				steps: [step("a", { status: "locked" })],
			});

			await tile("a").trigger("click");

			expect(wrapper.emitted("open")).toBeUndefined();
			expect(tile("a").attributes("aria-disabled")).toBe("true");
		});

		it("should not let students drag tiles", () => {
			const { wrapper, tile } = setup({ isEditor: false });

			pointer(tile("a").element, "pointerdown", 10, 10);
			pointer(window, "pointermove", 60, 40);
			pointer(window, "pointerup", 60, 40);

			expect(wrapper.emitted("move")).toBeUndefined();
			expect(tile("a").find("[data-testid^=learning-path-tile-handle-]").exists()).toBe(false);
		});
	});
});
