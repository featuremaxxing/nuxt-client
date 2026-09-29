import type { Model3dFormat } from "@/utils/fileHelper";
import {
	Box3,
	BufferGeometry,
	DirectionalLight,
	HemisphereLight,
	Material,
	Mesh,
	MeshStandardMaterial,
	Object3D,
	PerspectiveCamera,
	Scene,
	Sphere,
	Texture,
	Vector3,
	WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

// Loaded lazily by Model3dDisplay, so three.js only ends up in the chunk that
// is fetched once a 3D file actually becomes visible.

export class Model3dLoadError extends Error {
	constructor(readonly reason: "external-resources") {
		super(reason);
	}
}

const STL_COLOR = 0x8fa3b8;

const loadStl = (buffer: ArrayBuffer): Object3D => {
	const geometry = new STLLoader().parse(buffer) as BufferGeometry & { hasColors?: boolean };
	// many exporters write zero normals, which renders the model black
	geometry.computeVertexNormals();
	const material = new MeshStandardMaterial({
		color: geometry.hasColors ? 0xffffff : STL_COLOR,
		vertexColors: !!geometry.hasColors,
		metalness: 0.1,
		roughness: 0.7,
	});
	const mesh = new Mesh(geometry, material);
	// STL files usually come from CAD/3D printing with Z pointing up
	mesh.rotation.x = -Math.PI / 2;
	return mesh;
};

type GltfJson = {
	buffers?: { uri?: string }[];
	images?: { uri?: string }[];
};

// A single file element holds a single file: .gltf files referencing a
// separate .bin or texture file cannot be resolved.
const assertSelfContainedGltf = (buffer: ArrayBuffer) => {
	const json = JSON.parse(new TextDecoder().decode(buffer)) as GltfJson;
	const resources = [...(json.buffers ?? []), ...(json.images ?? [])];
	if (resources.some((resource) => resource.uri !== undefined && !resource.uri.startsWith("data:"))) {
		throw new Model3dLoadError("external-resources");
	}
};

const loadGltf = async (buffer: ArrayBuffer, format: "gltf" | "glb"): Promise<Object3D> => {
	if (format === "gltf") {
		assertSelfContainedGltf(buffer);
	}
	const gltf = await new GLTFLoader().parseAsync(buffer, "");
	return gltf.scene;
};

export const loadModel3d = (buffer: ArrayBuffer, format: Model3dFormat): Promise<Object3D> =>
	format === "stl" ? Promise.resolve(loadStl(buffer)) : loadGltf(buffer, format);

const disposeMaterial = (material: Material) => {
	for (const value of Object.values(material)) {
		if (value instanceof Texture) value.dispose();
	}
	material.dispose();
};

const disposeObject = (object: Object3D) => {
	object.traverse((child) => {
		if (!(child instanceof Mesh)) return;
		child.geometry.dispose();
		const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material];
		materials.forEach(disposeMaterial);
	});
};

export type Model3dViewer = {
	resize(width: number, height: number): void;
	dispose(): void;
};

export const createModel3dViewer = (canvas: HTMLCanvasElement, model: Object3D): Model3dViewer => {
	const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

	const scene = new Scene();
	scene.add(new HemisphereLight(0xffffff, 0x666666, 2.5));

	const camera = new PerspectiveCamera(40, 1, 0.01, 1000);
	// light follows the camera, so the side facing the viewer is always lit
	const keyLight = new DirectionalLight(0xffffff, 1.5);
	keyLight.position.set(1, 1, 1);
	camera.add(keyLight);
	scene.add(camera);

	// center the model and fit it into the view
	const bounds = new Box3().setFromObject(model).getBoundingSphere(new Sphere());
	model.position.sub(bounds.center);
	scene.add(model);

	const radius = bounds.radius || 1;
	const distance = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.1;
	camera.position.copy(new Vector3(1, 0.8, 1).normalize().multiplyScalar(distance));
	camera.near = distance / 100;
	camera.far = distance * 100;
	camera.updateProjectionMatrix();

	// rotate only: the mouse wheel keeps scrolling the board
	const controls = new OrbitControls(camera, canvas);
	controls.enableZoom = false;
	controls.enablePan = false;

	const render = () => renderer.render(scene, camera);
	controls.addEventListener("change", render);

	return {
		resize(width, height) {
			if (width <= 0 || height <= 0) return;
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			render();
		},
		dispose() {
			controls.dispose();
			disposeObject(model);
			renderer.dispose();
			// free the WebGL context right away, browsers only allow a few at a time
			renderer.forceContextLoss();
		},
	};
};
