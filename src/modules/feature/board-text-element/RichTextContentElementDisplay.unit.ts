import RichTextContentElementDisplay from "./RichTextContentElementDisplay.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { RenderHTML } from "@feature-render-html";
import { mount } from "@vue/test-utils";

describe("RichTextContentElementDisplay", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	const setup = (options: { value: string }) => {
		const wrapper = mount(RichTextContentElementDisplay, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: {
				...options,
			},
			attachTo: document.body,
		});

		return { wrapper };
	};

	describe("when component is mounted", () => {
		it("should be found in dom", () => {
			const { wrapper } = setup({ value: "test value" });
			const content = wrapper.findComponent(RichTextContentElementDisplay);
			expect(content.exists()).toBe(true);
		});

		it("should pass props to ck-editor component", () => {
			const { wrapper } = setup({ value: "test value" });
			const editorComponent = wrapper.findComponent(RenderHTML);
			expect(editorComponent.text()).toStrictEqual("test value");
		});

		it("should not offer to expand text without a read-more marker", () => {
			const { wrapper } = setup({ value: "<p>short</p>" });
			expect(wrapper.find("[data-testid='rich-text-read-more-toggle']").exists()).toBe(false);
		});
	});

	describe("when the text contains a read-more marker", () => {
		const value = '<p>intro</p><figure class="read-more"></figure><p>hidden part</p>';

		it("should show the intro and collapse the rest", () => {
			const { wrapper } = setup({ value });

			expect(wrapper.text()).toContain("intro");
			const more = wrapper.find("[data-testid='rich-text-read-more-content']");
			expect(more.isVisible()).toBe(false);
			expect(wrapper.find("[data-testid='rich-text-read-more-toggle']").attributes("aria-expanded")).toBe("false");
		});

		it("should label the toggle with 'show more'", () => {
			const { wrapper } = setup({ value });

			const toggle = wrapper.find("[data-testid='rich-text-read-more-toggle']");
			expect(toggle.text()).toContain("components.cardElement.richTextElement.showMore");
		});

		it("should expand and collapse the rest on click", async () => {
			const { wrapper } = setup({ value });
			const toggle = wrapper.find("[data-testid='rich-text-read-more-toggle']");

			await toggle.trigger("click");

			const more = wrapper.find("[data-testid='rich-text-read-more-content']");
			expect(more.isVisible()).toBe(true);
			expect(more.text()).toContain("hidden part");
			expect(toggle.attributes("aria-expanded")).toBe("true");
			expect(toggle.attributes("aria-controls")).toBe(more.attributes("id"));
			expect(toggle.text()).toContain("components.cardElement.richTextElement.showLess");

			await toggle.trigger("click");

			expect(wrapper.find("[data-testid='rich-text-read-more-content']").isVisible()).toBe(false);
		});

		it("should not let the click reach the card", async () => {
			const { wrapper } = setup({ value });
			const onCardClick = vi.fn();
			wrapper.element.parentElement?.addEventListener("click", onCardClick);

			await wrapper.find("[data-testid='rich-text-read-more-toggle']").trigger("click");

			expect(onCardClick).not.toHaveBeenCalled();
		});
	});
});
