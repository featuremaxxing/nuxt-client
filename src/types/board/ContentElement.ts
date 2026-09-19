import {
	AssignmentElementResponse,
	CollaborativeTextEditorElementResponse,
	ContentElementType,
	DrawingElementResponse,
	ExternalToolElementResponse,
	FileElementResponse,
	FileFolderElementResponse,
	H5pElementResponse,
	LinkElementResponse,
	ParentNodeInfoResponse,
	ParentNodeType,
	RichTextElementResponse,
	VideoConferenceElementResponse,
} from "@api-server";

export type FileFolderElement = FileFolderElementResponse;
export type AssignmentElement = AssignmentElementResponse;

export type AnyContentElement =
	| LinkElementResponse
	| RichTextElementResponse
	| FileElementResponse
	| FileFolderElementResponse
	| ExternalToolElementResponse
	| DrawingElementResponse
	| CollaborativeTextEditorElementResponse
	| VideoConferenceElementResponse
	| H5pElementResponse
	| AssignmentElementResponse;

export type ParentNodeInfo = ParentNodeInfoResponse;

export { ContentElementType, ParentNodeType };
