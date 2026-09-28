import type { Editor } from "@ckeditor/ckeditor5-core";
import { mdiUnfoldMoreHorizontal } from "@icons/material";

// "Mehr" break for rich text: everything after the marker is collapsed in the
// read-only view until the reader expands it. Stored as an empty
// <figure class="read-more"> because the server's RichTextCk5 sanitizer keeps
// figure[class] but strips attributes from <hr>.
export const READ_MORE_CLASS = "read-more";
export const READ_MORE_TOOLBAR_ITEM = "readMore";

const MODEL_ELEMENT = "readMore";

const READ_MORE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${mdiUnfoldMoreHorizontal}"/></svg>`;

type ReadMoreLabels = {
	tooltip: string;
	marker: string;
};

// @hpi-schul-cloud/ckeditor only exports the editor classes, so the UI
// building blocks are taken from an existing toolbar button of the build.
type ButtonView = {
	isEnabled: boolean;
	set(values: Record<string, unknown>): void;
	on(event: "execute", callback: () => void): void;
};
type ButtonViewConstructor = new (locale: unknown) => ButtonView;

type UIElementContext = { toDomElement(domDocument: Document): HTMLElement };

export const createReadMorePlugin = (labels: ReadMoreLabels) =>
	class ReadMore {
		static get pluginName() {
			return "ReadMore";
		}

		constructor(private readonly editor: Editor) {}

		init() {
			this.defineSchema();
			this.defineConverters();
			this.registerToolbarButton();
		}

		private defineSchema() {
			this.editor.model.schema.register(MODEL_ELEMENT, {
				isObject: true,
				isBlock: true,
				allowIn: "$root",
			});
		}

		private defineConverters() {
			const { conversion } = this.editor;

			conversion.for("upcast").elementToElement({
				view: { name: "figure", classes: READ_MORE_CLASS },
				model: MODEL_ELEMENT,
			});

			conversion.for("dataDowncast").elementToElement({
				model: MODEL_ELEMENT,
				view: (_modelElement, { writer }) => {
					const figure = writer.createContainerElement("figure", { class: READ_MORE_CLASS });
					// no &nbsp; block filler inside the empty marker
					figure.getFillerOffset = () => null;
					return figure;
				},
			});

			conversion.for("editingDowncast").elementToElement({
				model: MODEL_ELEMENT,
				view: (_modelElement, { writer }) => {
					const label = writer.createUIElement(
						"span",
						{ class: "ck-read-more__label" },
						function (this: UIElementContext, domDocument: Document) {
							const domElement = this.toDomElement(domDocument);
							domElement.textContent = labels.marker;
							return domElement;
						}
					);
					const figure = writer.createContainerElement("figure", { class: `${READ_MORE_CLASS} ck-read-more` }, [label]);

					// same as toWidget() from ckeditor5-widget, which the build does not export:
					// makes the marker selectable and deletable as a whole
					writer.setCustomProperty("widget", true, figure);
					writer.setCustomProperty("widgetLabel", [], figure);
					writer.addClass("ck-widget", figure);
					writer.setAttribute("contenteditable", "false", figure);
					figure.getFillerOffset = () => null;

					return figure;
				},
			});
		}

		private registerToolbarButton() {
			const { editor } = this;

			editor.ui.componentFactory.add(READ_MORE_TOOLBAR_ITEM, (locale: unknown) => {
				const ButtonView = editor.ui.componentFactory.create("horizontalLine").constructor as ButtonViewConstructor;
				const button = new ButtonView(locale);

				button.set({ label: labels.tooltip, icon: READ_MORE_ICON, tooltip: true });

				const refresh = () => {
					button.isEnabled = this.canInsert();
				};
				refresh();
				editor.model.document.on("change", refresh);
				editor.model.document.selection.on("change:range", refresh);

				button.on("execute", () => {
					this.insert();
					editor.editing.view.focus();
				});

				return button;
			});
		}

		private containsReadMore(): boolean {
			const root = this.editor.model.document.getRoot();
			if (!root) return false;
			return Array.from(root.getChildren()).some((child) => child.is("element", MODEL_ELEMENT));
		}

		// one marker per text, and only between top-level blocks (not inside tables)
		private canInsert(): boolean {
			if (this.containsReadMore()) return false;
			const position = this.editor.model.document.selection.getFirstPosition();
			return !position?.findAncestor("tableCell");
		}

		private insert() {
			if (!this.canInsert()) return;
			const { model } = this.editor;
			model.change((writer) => {
				model.insertObject(writer.createElement(MODEL_ELEMENT), null, null, { setSelection: "after" });
			});
		}
	};
