/// <reference path="../lib/collada.d.ts" />
/// <reference path="../external/jquery/jquery.d.ts" />
/// <reference path="./threejs-renderer.ts" />
/// <reference path="./convert-options.ts" />

var renderer: ThreejsRenderer;
var speedSlider: any;

function addAnimationGroup(name: string, f0: number, f1: number, t: number, parent: JQuery) {
    var label = $("<label>").addClass("col-sm-3").addClass("control-label").text(name);

    var begin = $("<input>").attr("type", "number").attr("data-name", name).addClass("form-control").addClass("animation-begin").val("" + f0);
    var begin_group = $("<div>").addClass("col-sm-3");
    begin_group.append(begin);

    var end = $("<input>").attr("type", "number").attr("data-name", name).addClass("form-control").addClass("animation-end").val("" +f1);
    var end_group = $("<div>").addClass("col-sm-3");
    end_group.append(end);

    var duration = $("<input>").attr("type", "number").attr("data-name", name).addClass("form-control").addClass("animation-duration").val("" +t);
    var duration_group = $("<div>").addClass("col-sm-3");
    duration_group.append(duration);

    var group = $("<div>").addClass("form-group");
    group.append(label);
    group.append(begin_group);
    group.append(end_group);
    group.append(duration_group);

    parent.append(group);
}

function updateSpeed() {
    var speed = speedSlider.slider('getValue');
    $("#speed-number").text(speed.toFixed(1));
}

function init() {
    // Animation labels
    var options = $("#form-options");
    addAnimationGroup("idle", 0, 10, 1, options);
    addAnimationGroup("walk", 11, 20, 1, options);
    addAnimationGroup("walk-back", 21, 30, 1, options);
    addAnimationGroup("run", 31, 40, 1, options);
    addAnimationGroup("sprint", 41, 50, 1, options);
    addAnimationGroup("action-a", 51, 60, 1, options);
    addAnimationGroup("action-b", 61, 70, 1, options);
    addAnimationGroup("action-c", 71, 80, 1, options);

    // Slider
    speedSlider = (<any>$("#speed")).slider();
    speedSlider.on("slide", updateSpeed);
    updateSpeed();

    // Events
    $(".btn-speed").click(function (event) {
        var value = parseInt(this.getAttribute("data-speed"), 10);
        speedSlider.slider('setValue', value);
        updateSpeed();
    });

    // Initialize WebGL
    var canvas: HTMLCanvasElement = <HTMLCanvasElement>$("#canvas")[0];
    renderer = new ThreejsRenderer();
    renderer.init(canvas);
}