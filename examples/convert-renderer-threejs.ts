/// <reference path="convert-renderer-rmx.ts" />
/// <reference path="external/threejs/three.d.ts" />
/// <reference path="external/stats/stats.d.ts" />

// ----------------------------------------------------------------------------
// Evil global data
// ----------------------------------------------------------------------------

var threejs_objects: any = {
    render_loops: 1
};

// ----------------------------------------------------------------------------
// Model loading
// ----------------------------------------------------------------------------

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
            result.skinning = true;
            result.color = new THREE.Color(0.8, 0.8, 0.8);
            // Disable textures. They won't work due to CORS anyway.
            result.map = null; //this.createTexture(material.diffuse);
            result.specularMap = null; // this.createTexture(material.specular);
            result.normalMap = null; // this.createTexture(material.normal);

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

// ----------------------------------------------------------------------------
// Hacking the custom animation code into three.js
// ----------------------------------------------------------------------------

class ThreejsSkeleton {
    useVertexTexture: boolean;
    boneTextureWidth: number;
    boneTextureHeight: number;
    boneTexture: RMXBoneMatrixTexture;
    skeleton: RMXSkeleton;
    pose: RMXPose;

    constructor(skeleton: RMXSkeleton) {
        // The skeleton stores information about the hiearchy of the bones
        this.skeleton = skeleton;

        // The pose stores information about the current bone transformations
        this.pose = new RMXPose(skeleton.bones.length);
        RMXSkeletalAnimation.resetPose(this.skeleton, this.pose);

        // Trick three.js into thinking this is a THREE.Skeleton object
        this.useVertexTexture = true;
        this.boneTexture = new RMXBoneMatrixTexture(skeleton.bones.length);
        this.boneTextureWidth = this.boneTexture.size;
        this.boneTextureHeight = this.boneTexture.size;

        Object.defineProperty(this.boneTexture, "__webglTexture", { get: function () { return this.texture; } });
        Object.defineProperty(this.boneTexture, "needsUpdate", { get: function () { return false; } });
        Object.defineProperty(this.boneTexture, "width", { get: function () { return this.size; } });
        Object.defineProperty(this.boneTexture, "height", { get: function () { return this.size; } });
    }

    update() {
        RMXSkeletalAnimation.exportPose(this.skeleton, this.pose, this.boneTexture.data);

        var _gl: WebGLRenderingContext = threejs_objects.renderer.context;
        this.boneTexture.update(_gl);
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
        // Create one container object.
        var result = new THREE.Object3D;

        // Create one custom skeleton object.
        var skeletonAdapter: ThreejsSkeleton = null;
        if (this.skeleton) {
            skeletonAdapter = new ThreejsSkeleton(this.skeleton);
        }

        // Create all THREE.Mesh instances. They will share the skeleton.
        for (var i = 0; i < this.chunks.length; ++i) {
            var chunk = this.chunks[i];
            var mesh = new THREE.Mesh(chunk.geometry, chunk.material);

            // Trick three.js into thinking this is a skinned mesh.
            // This is an ugly hack that might break at any time.
            if (this.skeleton) {
                var anymesh = <any>mesh;
                anymesh.skeleton = skeletonAdapter;
                anymesh.bindMatrixInverse = new THREE.Matrix4();
                anymesh.bindMatrixInverse.identity();
                anymesh.bindMatrix = new THREE.Matrix4();
                anymesh.bindMatrix.identity();
            }

            // Add the mesh to the container object.
            result.add(mesh);
        }

        // Store the custom skeleton in the container object.
        (<any>result).skeleton = skeletonAdapter;
        result.userData = this;

        return result;
    }
}

// ----------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------

function zoomThreejsCamera(scale: number) {
    threejs_objects.camera.position.set(1 * scale, 0.3 * scale, 0.5 * scale);
    threejs_objects.camera.up.set(0, 0, 1);
    threejs_objects.camera.lookAt(new THREE.Vector3(0, 0, 0));
    threejs_objects.camera.far = 2 * scale + 20;
    threejs_objects.camera.updateProjectionMatrix();
}

function initThreejs(canvas: HTMLCanvasElement) {

    threejs_objects.canvas = canvas;

    // Camera
    var camera = new THREE.PerspectiveCamera(27, canvas.width / canvas.height, 1, 10);
    threejs_objects.camera = camera;
    zoomThreejsCamera(10.0);

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
    
    // Grid
    var gridXY = new THREE.GridHelper(5, 1);
    gridXY.rotation.x = Math.PI / 2;
    gridXY.position.z = -0.001;
    threejs_objects.scene.add(gridXY);

    // Axes
    threejs_objects.scene.add(new THREE.AxisHelper(2));

    // Renderer
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setClearColor(new THREE.Color(0.5, 0.5, 0.5), 1);
    threejs_objects.renderer = renderer;

    threejs_objects.renderer.gammaInput = true;
    threejs_objects.renderer.gammaOutput = true;

    // Stats block
    threejs_objects.stats = new Stats();
    canvas.parentNode.insertBefore(threejs_objects.stats.domElement, canvas.parentNode.firstChild);

    // Events
    window.addEventListener('resize', onWindowResize, false);

    drawSceneThreejs();
}

function onWindowResize() {

    threejs_objects.camera.aspect = threejs_objects.canvas.width / threejs_objects.canvas.height;
    threejs_objects.camera.updateProjectionMatrix();

    threejs_objects.renderer.setSize(threejs_objects.canvas.width, threejs_objects.canvas.height);
}

function tickThreejs(timestamp: number) {
    var delta_time: number = 0;

    if (timestamp === null) {
        last_timestamp = null
        threejs_objects.time = 0;
    } else if (last_timestamp === null) {
        last_timestamp = timestamp;
        threejs_objects.time = 0;
    } else {
        delta_time = timestamp - last_timestamp;
        last_timestamp = timestamp;
    }

    if (threejs_objects.mesh) {
        requestAnimationFrame(tickThreejs);
    }

    // Increase the number of loops to measure performance
    // (type 'threejs_objects.render_loops=100' in the development console)
    // FPS is otherwise bounded by the vertical sync
    var loops = threejs_objects.render_loops;
    for (var i = 0; i < loops; ++i) {
        threejs_objects.stats.begin();
        animateThreejs(delta_time / loops);
        drawSceneThreejs();
        threejs_objects.stats.end();
    }
}

function drawSceneThreejs() {
    threejs_objects.renderer.render(threejs_objects.scene, threejs_objects.camera);
}

function animateThreejs(delta_time: number) {
    threejs_objects.time += delta_time / (1000);

    if (threejs_objects.mesh && threejs_objects.mesh.skeleton) {
        RMXSkeletalAnimation.sampleAnimation(threejs_objects.mesh.userData.animations[0], threejs_objects.mesh.skeleton.skeleton,
            threejs_objects.mesh.skeleton.pose, threejs_objects.time * 25);
        threejs_objects.mesh.skeleton.update();
    }
}

function fillBuffersThreejs(json: COLLADA.Exporter.DocumentJSON, data: ArrayBuffer) {
    var loader = new RMXModelLoader;
    var model: RMXModel = loader.loadModel(json, data);

    var loader2 = new ThreejsModelLoader;
    var model2: ThreejsModel = loader2.createModel(model);

    threejs_objects.mesh = model2.instanciate();
    threejs_objects.scene.add(threejs_objects.mesh);
}

function clearBuffersThreejs() {
    if (threejs_objects.mesh) {
        threejs_objects.scene.remove(threejs_objects.mesh);
        threejs_objects.mesh = null;
    }

}