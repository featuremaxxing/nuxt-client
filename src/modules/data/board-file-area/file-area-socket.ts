import { useEnvConfig } from "@data-env";
import { io, type Socket } from "socket.io-client";
import { onBeforeUnmount, onMounted, type Ref } from "vue";

export type FileAreaChangedPayload = {
	boardId: string;
	parentIds: string[];
	kind: "folders" | "files";
};

type Handlers = {
	onChanged: (payload: FileAreaChangedPayload) => void;
	// called after a lost connection is back, changes may have been missed in between
	onReconnected: () => void;
	onBoardDeleted?: () => void;
};

/**
 * Live updates for an open file area. It joins the socket room of the board (the same room the
 * board page uses) and gets told which levels changed, no matter whether the change came from
 * the web app, another user or the WebDAV network drive.
 */
export const useFileAreaSocket = (boardId: Ref<string>, handlers: Handlers) => {
	let socket: Socket | undefined;
	let hasConnectedBefore = false;

	const join = (): void => {
		socket?.emit("fetch-board-request", { boardId: boardId.value });
	};

	onMounted(() => {
		socket = io(useEnvConfig().value.BOARD_COLLABORATION_URI, {
			path: "/board-collaboration",
			reconnection: true,
			reconnectionAttempts: 10,
			withCredentials: true,
			closeOnBeforeunload: true,
		});

		socket.on("connect", () => {
			join();
			if (hasConnectedBefore) handlers.onReconnected();
			hasConnectedBefore = true;
		});

		socket.on("file-area-changed", (payload: FileAreaChangedPayload) => {
			if (payload.boardId === boardId.value) handlers.onChanged(payload);
		});

		socket.on("delete-board-success", (payload: { boardId?: string; isOwnAction?: boolean }) => {
			if (payload.boardId === boardId.value && !payload.isOwnAction) handlers.onBoardDeleted?.();
		});
	});

	onBeforeUnmount(() => {
		socket?.disconnect();
		socket = undefined;
	});
};
