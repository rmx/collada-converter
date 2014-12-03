/// <reference path="rmx/model.ts" />
/// <reference path="rmx/model-loader.ts" />
/// <reference path="rmx/model-animation.ts" />
/// <reference path="rmx/threejs-loader.ts" />
/// <reference path="../external/threejs/three.d.ts" />
/// <reference path="../external/stats/stats.d.ts" />

// ----------------------------------------------------------------------------
// Evil global data
// ----------------------------------------------------------------------------

var threejs_objects: any = {};

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

    if (threejs_objects.timestamp === null) {
        threejs_objects.last_timestamp = null
        threejs_objects.time = 0;
    } else if (threejs_objects.last_timestamp === null) {
        threejs_objects.last_timestamp = timestamp;
        threejs_objects.time = 0;
    } else {
        delta_time = timestamp - threejs_objects.last_timestamp;
        threejs_objects.last_timestamp = timestamp;
    }

    if (threejs_objects.mesh) {
        requestAnimationFrame(tickThreejs);
    }

    // Increase the number of loops to measure performance
    // (type 'threejs_objects.render_loops=100' in the development console)
    // FPS is otherwise bounded by the vertical sync
    var loops = threejs_objects.render_loops || 1;
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
        threejs_objects.mesh.skeleton.update(threejs_objects.renderer.context);
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