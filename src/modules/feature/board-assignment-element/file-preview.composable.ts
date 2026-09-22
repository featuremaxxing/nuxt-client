import { AssignmentPreviewKind, canPreview, previewKindFor } from "./file-preview.util";
import { FileRecord } from "@/types/file/File";
import { LightBoxContentType, useLightBox } from "@ui-light-box";

// Shared "open this submission/feedback file" behavior for the assignment module -
// used by the student's own submission, the teacher's grading overlay and the
// feedback correction list. Not used for the teacher's audio feedback: that one is
// deliberately never opened in the light box, whose toolbar has a fixed download
// button (see AssignmentElementStudentDisplay.vue).
export const useAssignmentFilePreview = () => {
	const lightBox = useLightBox();

	const openPreview = (record: FileRecord | undefined) => {
		if (!record) return;

		const kind = previewKindFor(record);

		switch (kind) {
			case AssignmentPreviewKind.PDF:
				lightBox.open({ type: LightBoxContentType.PDF, downloadUrl: record.url, name: record.name });
				return;
			case AssignmentPreviewKind.IMAGE:
				lightBox.open({
					type: LightBoxContentType.IMAGE,
					downloadUrl: record.url,
					name: record.name,
					// show the original image - preview thumbnails (max 500px) look blurry fullscreen
					previewUrl: record.url,
					alt: record.name,
				});
				return;
			case AssignmentPreviewKind.TEXT:
				lightBox.open({ type: LightBoxContentType.TEXT, downloadUrl: record.url, name: record.name });
				return;
			case AssignmentPreviewKind.AUDIO:
				lightBox.open({ type: LightBoxContentType.AUDIO, downloadUrl: record.url, name: record.name });
				return;
			case AssignmentPreviewKind.VIDEO:
				lightBox.open({ type: LightBoxContentType.VIDEO, downloadUrl: record.url, name: record.name });
				return;
			case AssignmentPreviewKind.NONE:
				return;
		}
	};

	return { canPreview, openPreview };
};
