/// <reference path="convert-renderer-rmx.ts" />
/// <reference path="external/three.d.ts" />

class ThreejsModelLoader {

    materialCache: { [hash: string]: THREE.Material };
    imageLoader: THREE.ImageLoader;

    constructor() {
        this.materialCache = {};
        this.imageLoader = new THREE.ImageLoader();
    }

    createGeometry(chunk: RMXModelChunk): THREE.BufferGeometry {
        var result = new THREE.BufferGeometry;

        if (chunk.data_position) {
            result.addAttribute("position", new THREE.BufferAttribute(chunk.data_position, 3));
        }
        if (chunk.data_normal) {
            result.addAttribute("normal", new THREE.BufferAttribute(chunk.data_normal, 3));
        }
        if (chunk.data_texcoord) {
            result.addAttribute("uv", new THREE.BufferAttribute(chunk.data_texcoord, 2));
        }
        if (chunk.data_boneindex) {
            result.addAttribute("skinIndex", new THREE.BufferAttribute(chunk.data_boneindex, 4));
        }
        if (chunk.data_boneindex) {
            result.addAttribute("skinWeight", new THREE.BufferAttribute(chunk.data_boneweight, 4));
        }
        if (chunk.data_indices) {
            result.addAttribute("index", new THREE.BufferAttribute(chunk.data_indices, 1));
        }

        return result;
    }

    createTexture(url: string): THREE.Texture {
        if (url == null || url == "") {
            return null;
        }

        var image = this.imageLoader.load(url);
        var result = new THREE.Texture(image);

        return result;
    }

    createMaterial(material: RMXMaterial): THREE.Material {
        var hash = material.hash();
        var cached_material = this.materialCache[hash];

        if (cached_material) {
            return cached_material;
        } else {
            var result = new THREE.MeshPhongMaterial();
            result.skinning = false;
            result.color = new THREE.Color(1, 1, 1);
            result.map = this.createTexture(material.diffuse);
            result.specularMap = this.createTexture(material.specular);
            result.normalMap = this.createTexture(material.normal);

            this.materialCache[hash] = result;
            return result;
        }
    }

    createModel(model: RMXModel): ThreejsModel {
        var result = new ThreejsModel;

        // Geometry - create THREE objects
        for (var i = 0; i < model.chunks.length; ++i) {
            var rmx_chunk = model.chunks[i];

            var threejs_chunk = new ThreejsModelChunk;
            threejs_chunk.geometry = this.createGeometry(rmx_chunk);
            threejs_chunk.material = this.createMaterial(model.materials[rmx_chunk.material_index]);
            result.chunks.push(threejs_chunk);
        }

        // Skeleton - use custom object
        result.skeleton = model.skeleton;

        // Animation - use custom object
        result.animations = model.animations;

        return result;
    }
}

class ThreejsModelChunk {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;

    constructor() {
        this.geometry = null;
        this.material = null;
    }
}

class ThreejsSkeletonAdapter {
    useVertexTexture: boolean;
    boneTextureWidth: number;
    boneTextureHeight: number;
    boneTexture: THREE.DataTexture;
    boneMatrices: Float32Array;
    skeleton: RMXSkeleton;
    pose: RMXPose;

    constructor(skeleton: RMXSkeleton) {
        this.skeleton = skeleton;
        this.pose = new RMXPose(skeleton.bones.length);

        this.useVertexTexture = true;
        this.boneTextureWidth = RMXBoneMatrixTexture.optimalSize(skeleton.bones.length);
        this.boneTextureHeight = this.boneTextureWidth;
        this.boneMatrices = new Float32Array(this.boneTextureWidth * this.boneTextureWidth * 4);

        this.boneTexture = new THREE.DataTexture(<any>this.boneMatrices, this.boneTextureWidth, this.boneTextureHeight,
            THREE.RGBAFormat, THREE.FloatType, THREE.UVMapping(), THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
            THREE.NearestFilter, THREE.NearestFilter);
        this.boneTexture.generateMipmaps = false;
        this.boneTexture.flipY = false;
    }

    update() {
        RMXSkeletalAnimation.resetPose(this.skeleton, this.pose);
        RMXSkeletalAnimation.exportPose(this.skeleton, this.pose, this.boneMatrices);
    }
}

class ThreejsModel {
    chunks: ThreejsModelChunk[];
    skeleton: RMXSkeleton;
    animations: RMXAnimation[];

    constructor() {
        this.chunks = [];
        this.skeleton = null;
        this.animations = [];
    }

    instanciate(): THREE.Object3D {
        var result = new THREE.Object3D;

        var skeletonAdapter: ThreejsSkeletonAdapter = null;
        if (this.skeleton) {
            skeletonAdapter = new ThreejsSkeletonAdapter(this.skeleton);
        }

        for (var i = 0; i < this.chunks.length; ++i) {
            var chunk = this.chunks[i];
            var mesh = new THREE.Mesh(chunk.geometry, chunk.material);

            // Trick three.js into thinking this is a skinned mesh
            if (this.skeleton) {
                (<any>mesh).skeleton = skeletonAdapter;
            }

            result.add(mesh);
        }

        (<any>result).skeleton = skeletonAdapter;
        result.userData = this;

        return result;
    }
}

var threejs_objects: any = {};

function initThreejs() {

    // Camera
    threejs_objects.camera = new THREE.PerspectiveCamera(27, elements.canvas.width / elements.canvas.height, 1, 100);
    threejs_objects.camera.position.x = 5;
    threejs_objects.camera.position.y = 2;
    threejs_objects.camera.position.z = 20;

    // Scene
    threejs_objects.scene = new THREE.Scene();

    // Light
    threejs_objects.scene.add(new THREE.AmbientLight(0x444444));

    var light1 = new THREE.DirectionalLight(0xffffff, 0.5);
    light1.position.set(1, 1, 1);
    threejs_objects.scene.add(light1);

    var light2 = new THREE.DirectionalLight(0xffffff, 1.5);
    light2.position.set(0, -1, 0);
    threejs_objects.scene.add(light2);

    // Renderer
    var renderer = new THREE.WebGLRenderer({ canvas: elements.canvas, antialias: false });
    renderer.setSize(elements.canvas.width, elements.canvas.height);
    renderer.setClearColor(new THREE.Color(0.5, 0.5, 0.5), 1);
    threejs_objects.renderer = renderer;

    threejs_objects.renderer.gammaInput = true;
    threejs_objects.renderer.gammaOutput = true;

    // elements.canvas.appendChild(threejs_objects.renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);

    drawSceneThreejs();
}

function onWindowResize() {

    threejs_objects.camera.aspect = elements.canvas.width / elements.canvas.height;
    threejs_objects.camera.updateProjectionMatrix();

    threejs_objects.renderer.setSize(elements.canvas.width, elements.canvas.height);
}

function fillBuffersThreejs(json: COLLADA.Exporter.DocumentJSON, data: ArrayBuffer) {
    var loader = new RMXModelLoader;
    var model: RMXModel = loader.loadModel(json, data);

    var loader2 = new ThreejsModelLoader;
    var model2: ThreejsModel = loader2.createModel(model);

    threejs_objects.mesh = model2.instanciate();
    threejs_objects.scene.add(threejs_objects.mesh);
}


function tickThreejs(timestamp: number) {
    var delta_time: number = 0;

    if (timestamp === null) {
        last_timestamp = null
    } else if (last_timestamp === null) {
        time = 0
        last_timestamp = timestamp;
    } else {
        delta_time = timestamp - last_timestamp;
        last_timestamp = timestamp;
    }

    requestAnimationFrame(tickThreejs);
    drawSceneThreejs();
    animateThreejs(delta_time);
}

function drawSceneThreejs() {
    threejs_objects.renderer.render(threejs_objects.scene, threejs_objects.camera);
}

function animateThreejs(delta_time: number) {
    if (threejs_objects.mesh && threejs_objects.mesh.skeleton) {
        threejs_objects.mesh.skeleton.update();
    }
}


function clearBuffersThreejs() {
    if (threejs_objects.mesh) {
        threejs_objects.scene.remove(threejs_objects.mesh);
        threejs_objects.mesh = null;
    }

}