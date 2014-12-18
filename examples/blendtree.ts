/// <reference path="../lib/collada.d.ts" />
/// <reference path="../external/jquery/jquery.d.ts" />
/// <reference path="./threejs-renderer.ts" />
/// <reference path="./convert-options.ts" />

// ----------------------------------------------------------------------------
// Evil global data
// ----------------------------------------------------------------------------

var renderer: ThreejsRenderer;
var speedSlider: any;
var speed: number = 0;
var timescaleSlider: any;
var timescale: number = 1;
var inputJson: any;
var inputBinary: ArrayBuffer;

// ----------------------------------------------------------------------------
// User interface
// ----------------------------------------------------------------------------

function addAnimationGroup(name: string, f0: number, f1: number, fps: number, parent: JQuery) {
    var label = $("<label>").addClass("col-sm-3").addClass("control-label").text(name);

    var begin = $("<input>").attr("type", "number").attr("data-name", name).addClass("form-control").addClass("animation-begin").val("" + f0);
    var begin_group = $("<div>").addClass("col-sm-3");
    begin_group.append(begin);

    var end = $("<input>").attr("type", "number").attr("data-name", name).addClass("form-control").addClass("animation-end").val("" +f1);
    var end_group = $("<div>").addClass("col-sm-3");
    end_group.append(end);

    var duration = $("<input>").attr("type", "number").attr("data-name", name).addClass("form-control").addClass("animation-fps").val("" +fps);
    var duration_group = $("<div>").addClass("col-sm-3");
    duration_group.append(duration);

    var group = $("<div>").addClass("form-group");
    group.append(label);
    group.append(begin_group);
    group.append(end_group);
    group.append(duration_group);

    parent.append(group);
}

function getTracks(): any {
    var result = {};
    $(".animation-begin").each((index, elem) => {
        var name = elem.getAttribute("data-name");
        result[name] = result[name] || {};
        result[name].begin = parseFloat($(elem).val());
    });
    $(".animation-end").each((index, elem) => {
        var name = elem.getAttribute("data-name");
        result[name] = result[name] || {};
        result[name].end = parseFloat($(elem).val());
    });
    $(".animation-fps").each((index, elem) => {
        var name = elem.getAttribute("data-name");
        result[name] = result[name] || {};
        result[name].fps = parseFloat($(elem).val());
    });
    return result;
}

function updateSpeed() {
    speed = speedSlider.slider('getValue');
    $("#speed-number").text(speed.toFixed(2));
}

function updateTimescale() {
    timescale = timescaleSlider.slider('getValue');
    timescale = Math.pow(1.2, timescale);
    $("#timescale-number").text((100*timescale).toFixed(2) + "%");
}

// ----------------------------------------------------------------------------
// Drag & Drop
// ----------------------------------------------------------------------------

function onFileDrag(ev: JQueryEventObject) {
    ev.preventDefault();
}

function onFileDrop(ev: JQueryEventObject) {
    resetInput();
    ev.preventDefault();
    var dt = (<any>ev.originalEvent).dataTransfer;
    if (!dt) {
        alert("Your browser does not support drag&drop for files (?).");
        return;
    }
    var files = dt.files;
    if (files.length != 2) {
        alert("You did not drop two files.");
        return;
    }
    if (files[0].size > files[1].size) {
        loadJson(files[1]);
        loadBinary(files[0]);
    } else {
        loadJson(files[0]);
        loadBinary(files[1]);
    }
}

function loadJson(file: File) {
    var reader = new FileReader();
    reader.onload = () => {
        var result: string = reader.result;
        inputJson = JSON.parse(result);
        checkInput();
    };
    reader.onerror = () => {
        alert("Error reading JSON file.");
    };
    reader.readAsText(file);
}

function loadBinary(file: File) {
    var reader = new FileReader();
    reader.onload = () => {
        var result: ArrayBuffer = reader.result;
        inputBinary = result;
        checkInput();
    };
    reader.onerror = () => {
        alert("Error reading binary file.");
    };
    reader.readAsArrayBuffer(file);
}

function resetInput() {
    inputBinary = null;
    inputJson = null;
    renderer.resetMesh();
}

function checkInput() {
    if (inputBinary && inputJson) {
        renderSetModel(inputJson, new Uint8Array(inputBinary));
        renderStartRendering();
    }
}

// ----------------------------------------------------------------------------
// Renderer
// ----------------------------------------------------------------------------

function renderSetModel(json: any, data: Uint8Array) {
    renderer.setMesh(json, data);

    var tracks = getTracks();

    var model = renderer.getMeshModel();
    var skeleton: RMXSkeleton = model.model.skeleton;
    var animation: RMXAnimation = model.model.animations[0];

    model.blendtree = new RMXBlendTree;
    
    var back = new RMXBlendTreeNodeTrack(skeleton, animation, tracks["move--1"].begin, tracks["move--1"].end, true, 0);
    var walk = new RMXBlendTreeNodeTrack(skeleton, animation, tracks["move-+1"].begin, tracks["move-+1"].end, true, 0);
    var run = new RMXBlendTreeNodeTrack(skeleton, animation, tracks["move-+2"].begin, tracks["move-+2"].end, true, 0);
    var charge = new RMXBlendTreeNodeTrack(skeleton, animation, tracks["move-+3"].begin, tracks["move-+3"].end, true, 0.5);
    var idle = new RMXBlendTreeNodeTrack(skeleton, animation, tracks["idle"].begin, tracks["idle"].end, true, 0);
    var movement = new RMXBlendTreeNode1D(skeleton, [back, walk, run, charge], [-1, 1, 2, 3], "speed", 4);
    var idle_move = new RMXBlendTreeNodeBool(skeleton, idle, movement, "idle", 1);

    model.blendtree.params.floats["speed"] = speed;
    model.blendtree.params.floats["idle"] = 0;

    model.blendtree.root = idle_move;
}

function renderStartRendering() {
    renderTick(null);
}

function renderTick(timestamp: number) {
    var model = renderer.getMeshModel();
    model.blendtree.params.floats["speed"] = speed;
    model.blendtree.params.floats["idle"] = Math.abs(speed) > 0.05 ? 0 : 1;

    if (renderer.tick(timestamp, timescale)) {
        requestAnimationFrame(renderTick);
    }
}

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------

function init() {
    // Animation labels
    var options = $("#form-options");
    addAnimationGroup("idle",     574,  633, 30, options);
    addAnimationGroup("move--1",   30,   59, 30, options);
    addAnimationGroup("move-+1", 1339, 1368, 30, options);
    addAnimationGroup("move-+2",  813,  836, 30, options);
    addAnimationGroup("move-+3",  119,  136, 30, options);
    addAnimationGroup("action-a", 205,  245, 30, options);
    addAnimationGroup("action-b", 290,  355, 30, options);
    addAnimationGroup("action-c", 865,  915, 30, options);
    addAnimationGroup("action-d", 740,  785, 30, options);

    // Slider
    speedSlider = (<any>$("#speed")).slider();
    speedSlider.on("slide", updateSpeed);
    updateSpeed();

    timescaleSlider = (<any>$("#timescale")).slider();
    timescaleSlider.on("slide", updateTimescale);
    updateTimescale();

    // Events
    $(".btn-speed").click(function (event) {
        var value = parseInt(this.getAttribute("data-speed"), 10);
        speedSlider.slider('setValue', value);
        updateSpeed();
    });
    $("#drop-target").on("dragover", onFileDrag);
    $("#drop-target").on("drop", onFileDrop);

    // Initialize WebGL
    var canvas: HTMLCanvasElement = <HTMLCanvasElement>$("#canvas")[0];
    renderer = new ThreejsRenderer();
    renderer.init(canvas);
}