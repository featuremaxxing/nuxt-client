import { createReadMorePlugin, READ_MORE_TOOLBAR_ITEM } from "./read-more.plugin";
import { Editor } from "@ckeditor/ckeditor5-core";
import { InlineEditor } from "@hpi-schul-cloud/ckeditor";

class ResizeObserver {
	observe() {
		return;
	}
	unobserve() {
		return;
	}
	disconnect() {
		return;
	}
}

type ToolbarButton = { label?: string; isEnabled: boolean; fire(event: "execute"): void };
type EditorWithData = Editor & {
	getData(): string;
	setData(data: string): void;
};
type EditorUiWithToolbar = { view: { toolbar: { items: Iterable<ToolbarButton> } } };

const MARKER = '<figure class="read-more"></figure>';

// runs the real @hpi-schul-cloud/ckeditor build, so the plugin is exercised
// against the same engine it runs on in the app
describe("read-more.plugin", () => {
	let editor: EditorWithData;

	beforeEach(async () => {
		window.ResizeObserver = ResizeObserver as unknown as typeof window.ResizeObserver;

		const element = document.createElement("div");
		document.body.appendChild(element);

		editor = (await InlineEditor.create(element, {
			plugins: ["Essentials", "Paragraph", "HorizontalLine", "Table"],
			extraPlugins: [createReadMorePlugin({ tooltip: "Insert more", marker: "More below" })],
			toolbar: { items: ["horizontalLine", READ_MORE_TOOLBAR_ITEM] },
		})) as unknown as EditorWithData;
	});

	afterEach(async () => {
		await editor.destroy();
		document.body.innerHTML = "";
	});

	const getButton = () =>
		Array.from((editor.ui as unknown as EditorUiWithToolbar).view.toolbar.items).find(
			(item) => item.label === "Insert more"
		);

	const placeCursorInFirstParagraph = () => {
		editor.model.change((writer) => {
			const firstChild = editor.model.document.getRoot()?.getChild(0);
			if (firstChild) writer.setSelection(firstChild, "end");
		});
	};

	it("should add a toolbar button", () => {
		expect(getButton()).toBeDefined();
	});

	it("should insert the marker after the current block", () => {
		editor.setData("<p>intro</p><p>more</p>");
		placeCursorInFirstParagraph();

		getButton()?.fire("execute");

		expect(editor.getData()).toBe(`<p>intro</p>${MARKER}<p>more</p>`);
	});

	it("should keep a stored marker when loading and saving", () => {
		editor.setData(`<p>intro</p>${MARKER}<p>more</p>`);

		expect(editor.getData()).toBe(`<p>intro</p>${MARKER}<p>more</p>`);
	});

	it("should show the marker label in the editing view", () => {
		editor.setData(`<p>intro</p>${MARKER}<p>more</p>`);

		const domRoot = editor.editing.view.getDomRoot();
		const marker = domRoot?.querySelector("figure.read-more");
		expect(marker?.getAttribute("contenteditable")).toBe("false");
		expect(marker?.textContent).toContain("More below");
	});

	it("should disable the button once the text contains a marker", () => {
		editor.setData("<p>intro</p><p>more</p>");
		placeCursorInFirstParagraph();
		expect(getButton()?.isEnabled).toBe(true);

		getButton()?.fire("execute");

		expect(getButton()?.isEnabled).toBe(false);
	});

	it("should re-enable the button when the marker is removed", () => {
		editor.setData(`<p>intro</p>${MARKER}<p>more</p>`);
		expect(getButton()?.isEnabled).toBe(false);

		editor.setData("<p>intro</p><p>more</p>");

		expect(getButton()?.isEnabled).toBe(true);
	});

	it("should disable the button inside a table", () => {
		editor.setData("<figure class='table'><table><tbody><tr><td>cell</td></tr></tbody></table></figure>");
		editor.model.change((writer) => {
			const root = editor.model.document.getRoot();
			if (!root) return;
			// $root > table > tableRow > tableCell > paragraph
			const cellParagraph = Array.from(writer.createRangeIn(root).getItems()).find((item) =>
				item.is("element", "paragraph")
			);
			if (cellParagraph) writer.setSelection(cellParagraph, "end");
		});
		expect(editor.model.document.selection.getFirstPosition()?.findAncestor("tableCell")).toBeTruthy();

		expect(getButton()?.isEnabled).toBe(false);
	});
});
