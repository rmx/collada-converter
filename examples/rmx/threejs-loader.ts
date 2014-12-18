/// <reference path="./model.ts" />
/// <reference path="./blendtree.ts" />
/// <reference path="../../external/threejs/three.d.ts" />

/**
* Converts a Model into corresponding three.js objects
*/
class ThreejsModelLoader {

    private materialCache: { [hash: string]: THREE.Material };
    private imageLoader: THREE.ImageLoader;

    constructor() {
        this.materialCache = {};
        this.imageLoader = new THREE.ImageLoader();
    }

    private createGeometry(chunk: rmx.ModelChunk): THREE.BufferGeometry {
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

    private createTexture(url: string): THREE.Texture {
        if (url == null || url == "") {
            return null;
        }

        var image = this.imageLoader.load(url);
        var result = new THREE.Texture(image);

        return result;
    }

    private createMaterial(material: rmx.Material, skinned: boolean): THREE.Material {
        var prefix = skinned ? "skinned-" : "static-";
        var hash = prefix + material.hash();
        var cached_material = this.materialCache[hash];

        if (cached_material) {
            return cached_material;
        } else {
            var result = new THREE.MeshPhongMaterial();
            result.skinning = skinned;
            result.color = new THREE.Color(0.8, 0.8, 0.8);

            // Disable textures. They won't work due to CORS for local files anyway.
            result.map = null; //this.createTexture(material.diffuse);
            result.specularMap = null; // this.createTexture(material.specular);
            result.normalMap = null; // this.createTexture(material.normal);

            this.materialCache[hash] = result;
            return result;
        }
    }

    createModel(model: rmx.Model): ThreejsModel {
        var result = new ThreejsModel;
        var skinned = model.skeleton != null;

        // Geometry - create THREE objects
        for (var i = 0; i < model.chunks.length; ++i) {
            var rmx_chunk = model.chunks[i];

            var threejs_chunk = new ThreejsModelChunk;
            threejs_chunk.geometry = this.createGeometry(rmx_chunk);
            threejs_chunk.material = this.createMaterial(model.materials[rmx_chunk.material_index], skinned);
            result.chunks.push(threejs_chunk);
        }

        // Skeleton - use custom object
        result.skeleton = model.skeleton;

        // Animation - use custom object
        result.animations = model.animations;

        return result;
    }
}

/**
* A custom class that replaces THREE.Skeleton
*/
class ThreejsSkeleton {
    boneTexture: rmx.BoneMatrixTexture;
    matrices: rmx.SkeletonMatrices;
    skeleton: rmx.Skeleton;
    pose: rmx.Pose;

    constructor(skeleton: rmx.Skeleton) {
        // The skeleton stores information about the hiearchy of the bones
        this.skeleton = skeleton;

        // The pose stores information about the current bone transformations
        this.pose = new rmx.Pose(this.skeleton);
        rmx.resetPose(this.skeleton, this.pose);

        // The bone texture stores the bone matrices for the use on the GPU
        this.boneTexture = new rmx.BoneMatrixTexture(this.skeleton);
        this.matrices = new rmx.SkeletonMatrices(this.boneTexture);

        // Trick three.js into thinking this is a THREE.Skeleton object
        Object.defineProperty(this, "useVertexTexture", { get: function () { return true; } });
        Object.defineProperty(this, "boneTextureWidth", { get: function () { return this.boneTexture.size; } });
        Object.defineProperty(this, "boneTextureHeight", { get: function () { return this.boneTexture.size; } });

        // Trick three.js into thinking our bone texture is a THREE.DataTexture
        Object.defineProperty(this.boneTexture, "__webglTexture", { get: function () { return this.texture; } });
        Object.defineProperty(this.boneTexture, "needsUpdate", { get: function () { return false; } });
        Object.defineProperty(this.boneTexture, "width", { get: function () { return this.size; } });
        Object.defineProperty(this.boneTexture, "height", { get: function () { return this.size; } });
    }

    update(gl: WebGLRenderingContext) {
        // Compute the bone matrices
        rmx.exportPose(this.skeleton, this.pose, this.matrices);

        // Upload the bone matrices to the bone texture
        this.boneTexture.update(this.matrices, gl);
    }
}

/**
* Stores information about a piece of geometry
*/
class ThreejsModelChunk {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;

    constructor() {
        this.geometry = null;
        this.material = null;
    }
}

class ThreejsModelInstance {
    model: ThreejsModel;
    skeleton: ThreejsSkeleton;
    blendtree: rmx.BlendTree;

    constructor(model: ThreejsModel, skeleton: ThreejsSkeleton) {
        this.model = model;
        this.skeleton = skeleton;
        this.blendtree = null;
    }
}

/**
* A factory for producing objects that behave like THREE.SkinnedMesh
*/
class ThreejsModel {
    chunks: ThreejsModelChunk[];
    skeleton: rmx.Skeleton;
    animations: rmx.Animation[];
    static identityMatrix: THREE.Matrix4;

    constructor() {
        this.chunks = [];
        this.skeleton = null;
        this.animations = [];
    }

    instanciate(): THREE.Object3D {
        // Create one container object.
        var result = new THREE.Object3D;

        // Create one custom skeleton object.
        var threejsSkeleton: ThreejsSkeleton = null;
        if (this.skeleton) {
            threejsSkeleton = new ThreejsSkeleton(this.skeleton);
        }

        // Create all THREE.Mesh instances. They will share the skeleton.
        for (var i = 0; i < this.chunks.length; ++i) {
            var chunk = this.chunks[i];
            var mesh = new THREE.Mesh(chunk.geometry, chunk.material);

            // Trick three.js into thinking this is a THREE.SkinnedMesh.
            if (this.skeleton) {
                mesh.userData = threejsSkeleton;
                Object.defineProperty(mesh, "skeleton", { get: function () { return this.userData; } });
                Object.defineProperty(mesh, "bindMatrix", { get: function () { return ThreejsModel.identityMatrix; } });
                Object.defineProperty(mesh, "bindMatrixInverse", { get: function () { return ThreejsModel.identityMatrix; } });
            }

            // Add the mesh to the container object.
            result.add(mesh);
        }

        // Store the custom skeleton in the container object.
        result.userData = new ThreejsModelInstance(this, threejsSkeleton);

        return result;
    }
}
ThreejsModel.identityMatrix = new THREE.Matrix4();
ThreejsModel.identityMatrix.identity();
