import { READ_MORE_CLASS } from "@feature-editor";

export type ReadMoreParts = {
	intro: string;
	more: string;
};

// Splits rich text at the first top-level "Mehr" marker (see read-more.plugin
// in @feature-editor). The marker itself is dropped; without a marker, or with
// nothing after it, everything ends up in `intro`.
export const splitAtReadMore = (html: string): ReadMoreParts => {
	const template = document.createElement("template");
	template.innerHTML = html;

	const marker = Array.from(template.content.children).find(
		(child) => child.tagName === "FIGURE" && child.classList.contains(READ_MORE_CLASS)
	);
	if (!marker) return { intro: html, more: "" };

	const intro = document.createElement("template");
	const more = document.createElement("template");

	let target = intro;
	for (const node of Array.from(template.content.childNodes)) {
		if (node === marker) {
			target = more;
			continue;
		}
		target.content.appendChild(node);
	}

	return { intro: intro.innerHTML, more: more.innerHTML.trim() };
};
