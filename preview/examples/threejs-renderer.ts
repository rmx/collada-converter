/// <reference path="./rmx/model.ts" />
/// <reference path="./rmx/model-loader.ts" />
/// <reference path="./rmx/model-animation.ts" />
/// <reference path="./rmx/threejs-loader.ts" />
/// <reference path="../external/threejs/three.d.ts" />
/// <reference path="../external/stats/stats.d.ts" />


class ThreejsRenderer {
    canvas: HTMLCanvasElement;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    mesh: THREE.Object3D;
    lights: THREE.Light[];
    grid: THREE.GridHelper;
    axes: THREE.AxisHelper;
    stats: Stats;
    time: number;
    last_timestamp: number;
    render_loops: number;

    constructor() {
        this.canvas = null;
        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.mesh = null;
        this.lights = [];
        this.grid = null;
        this.axes = null;
        this.stats = null;
        this.last_timestamp = null;
        this.time = 0;
        this.render_loops = 1;
    }

    init(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        // Camera
        this.camera = new THREE.PerspectiveCamera(27, canvas.width / canvas.height, 1, 10);
        this.zoomToObject(10);

        // Scene
        this.scene = new THREE.Scene();

        // Lights
        var light0 = new THREE.AmbientLight(0x444444);
        this.lights.push(light0);
        this.scene.add(light0);

        var light1 = new THREE.DirectionalLight(0xffffff, 0.5);
        light1.position.set(1, 1, 1);
        this.lights.push(light1);
        this.scene.add(light1);

        var light2 = new THREE.DirectionalLight(0xffffff, 1.5);
        light2.position.set(0, -1, 0);
        this.lights.push(light2);
        this.scene.add(light2);

        // Grid
        var gridXY = new THREE.GridHelper(5, 1);
        gridXY.rotation.x = Math.PI / 2;
        gridXY.position.z = -0.001;
        this.scene.add(gridXY);

        // Axes
        this.axes = new THREE.AxisHelper(2);
        this.scene.add(this.axes);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.setClearColor(new THREE.Color(0.5, 0.5, 0.5), 1);
        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true;

        // Stats block
        this.stats = new Stats();
        canvas.parentNode.insertBefore(this.stats.domElement, canvas.parentNode.firstChild);

        // Events
        window.addEventListener('resize', () => {
            this.camera.aspect = this.canvas.width / this.canvas.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.canvas.width, this.canvas.height);

        }, false);

        this.drawScene();
    }

    static getObjectRadius(object: THREE.Object3D): number {

        if (object instanceof THREE.Mesh) {
            // Object is a mesh
            var mesh = <THREE.Mesh> object;
            if (mesh.geometry) {
                if (!mesh.geometry.boundingSphere) {
                    mesh.geometry.computeBoundingSphere();
                }
                return mesh.geometry.boundingSphere.radius;
            } else {
                return 0;
            }
        } else if (object.children.length > 0) {
            // Object is a container object
            var result: number = 0;
            object.children.forEach((child) => {
                result = Math.max(result, this.getObjectRadius(child) + child.position.length());
            });
            return result;
        } else {
            // Object is empty
            return 0;
        }
    }

    /** Zooms the camera so that it shows the object */
    zoomToObject(scale: number) {
        if (this.mesh) {
            var r = Math.max(0.01, ThreejsRenderer.getObjectRadius(this.mesh));
            this.zoomTo(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, r * scale);
        } else {
            this.zoomTo(0, 0, 0, 1 * scale);
        }
    }

    /** Zooms the camera so that it shows the given coordinates */
    zoomTo(x: number, y: number, z: number, r: number) {
        this.camera.position.set(x + 1 * r, y + 0.3 * r, z + 0.5 * r);
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(new THREE.Vector3(x, y, z));
        this.camera.far = 2 * r + 20;
        this.camera.updateProjectionMatrix();
    }

    /** Main render loop */
    tick(timestamp: number): boolean {
        // Abort if there is nothing to render
        if (!this.mesh) {
            return false;
        }

        // Timing
        var delta_time: number = 0;
        if (timestamp === null) {
            this.last_timestamp = null
            this.time = 0;
        } else if (this.last_timestamp === null) {
            this.last_timestamp = timestamp;
            this.time = 0;
        } else {
            delta_time = timestamp - this.last_timestamp;
            this.last_timestamp = timestamp;
        }

        // Increase the number of loops to measure performance
        // FPS is otherwise bounded by the vertical sync
        var loops: number = this.render_loops || 1;
        for (var i = 0; i < loops; ++i) {
            this.stats.begin();
            this.updateAnimation(delta_time / loops);
            this.drawScene();
            this.stats.end();
        }

        return true;
    }

    /** Draws the scene */
    drawScene() {
        this.renderer.render(this.scene, this.camera);
    }

    /** Updates skeletal animation data */
    updateAnimation(delta_time: number) {
        this.time += delta_time / (1000);

        var mesh: THREE.Object3D = this.mesh;
        var data: ThreejsModelInstance = mesh.userData;

        if (data.skeleton) {
            if (data.model.animations.length > 0) {
                RMXSkeletalAnimation.sampleAnimation(data.model.animations[0], data.model.skeleton,
                    data.skeleton.pose, this.time * 25);
            } else {
                RMXSkeletalAnimation.resetPose(data.model.skeleton, data.skeleton.pose);
            }

            var gl: WebGLRenderingContext = this.renderer.context;
            data.skeleton.update(gl);
        }
    }

    setMesh(json: COLLADA.Exporter.DocumentJSON, data: Uint8Array) {
        this.resetMesh();
        if (!json || !data) {
            return;
        }

        var loader = new RMXModelLoader;
        var model: RMXModel = loader.loadModel(json, data.buffer);

        var loader2 = new ThreejsModelLoader;
        var model2: ThreejsModel = loader2.createModel(model);

        this.mesh = model2.instanciate();
        this.scene.add(this.mesh);
        this.zoomToObject(5);
    }

    resetMesh() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
    }
}
