import { loadModel3d, Model3dLoadError } from "./model-3d-viewer";
import { Mesh } from "three";

const encode = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

const ASCII_STL = `solid triangle
facet normal 0 0 0
 outer loop
  vertex 0 0 0
  vertex 1 0 0
  vertex 0 1 0
 endloop
endfacet
endsolid triangle`;

// minimal binary glTF: header + JSON chunk + BIN chunk holding one triangle
const buildGlb = (): ArrayBuffer => {
	const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
	const json = JSON.stringify({
		asset: { version: "2.0" },
		scene: 0,
		scenes: [{ nodes: [0] }],
		nodes: [{ mesh: 0 }],
		meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
		accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
		bufferViews: [{ buffer: 0, byteLength: positions.byteLength }],
		buffers: [{ byteLength: positions.byteLength }],
	});
	const jsonBytes = new TextEncoder().encode(json.padEnd(Math.ceil(json.length / 4) * 4, " "));
	const binBytes = new Uint8Array(positions.buffer);
	const totalLength = 12 + 8 + jsonBytes.length + 8 + binBytes.length;

	const glb = new ArrayBuffer(totalLength);
	const view = new DataView(glb);
	view.setUint32(0, 0x46546c67, true); // "glTF"
	view.setUint32(4, 2, true);
	view.setUint32(8, totalLength, true);
	view.setUint32(12, jsonBytes.length, true);
	view.setUint32(16, 0x4e4f534a, true); // "JSON"
	new Uint8Array(glb, 20, jsonBytes.length).set(jsonBytes);
	const binOffset = 20 + jsonBytes.length;
	view.setUint32(binOffset, binBytes.length, true);
	view.setUint32(binOffset + 4, 0x004e4942, true); // "BIN"
	new Uint8Array(glb, binOffset + 8, binBytes.length).set(binBytes);
	return glb;
};

describe("model-3d-viewer", () => {
	describe("loadModel3d", () => {
		it("should load an STL file as a mesh with computed normals", async () => {
			const model = await loadModel3d(encode(ASCII_STL), "stl");

			expect(model).toBeInstanceOf(Mesh);
			const normals = (model as Mesh).geometry.getAttribute("normal");
			// the file only has zero normals, which would render black
			expect(Math.abs(normals.getZ(0))).toBeCloseTo(1);
		});

		it("should load a binary glTF (.glb) file", async () => {
			const model = await loadModel3d(buildGlb(), "glb");

			let meshCount = 0;
			model.traverse((child) => {
				if (child instanceof Mesh) meshCount++;
			});
			expect(meshCount).toBe(1);
		});

		it("should reject a .gltf file that refers to a separate .bin file", async () => {
			const gltf = encode(
				JSON.stringify({ asset: { version: "2.0" }, buffers: [{ uri: "scene.bin", byteLength: 4 }] })
			);

			await expect(loadModel3d(gltf, "gltf")).rejects.toThrow(Model3dLoadError);
		});

		it("should reject a .gltf file that refers to a separate texture file", async () => {
			const gltf = encode(JSON.stringify({ asset: { version: "2.0" }, images: [{ uri: "texture.png" }] }));

			await expect(loadModel3d(gltf, "gltf")).rejects.toThrow("external-resources");
		});
	});
});
