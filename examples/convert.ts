/// <reference path="../lib/collada.d.ts" />
/// <reference path="../external/jquery/jquery.d.ts" />
/// <reference path="./threejs-renderer.ts" />
/// <reference path="./convert-options.ts" />
/// <reference path="./parse-animations.ts" />
/// <reference path="./stringify.ts" />

// ----------------------------------------------------------------------------
// Evil global data
// ----------------------------------------------------------------------------

var timestamps: {[name: string]:number} = {};
var options: COLLADA.Converter.Options = new COLLADA.Converter.Options();
var optionElements: ColladaConverterOption[] = [];
var renderer: ThreejsRenderer;

interface i_conversion_data {
    stage: number;
    exception: boolean;
    s0_source: string;                                  // Stage 0: raw file string
    s0_animations: parseAnimations.AnimationLabel[];    // Stage 0: animation setup
    s1_xml: Document;                                   // Stage 1: XML document
    s2_loaded: COLLADA.Loader.Document;                 // Stage 2: COLLADA document
    s3_converted: COLLADA.Converter.Document;           // Stage 3: Converted document
    s4_exported_custom: COLLADA.Exporter.Document;      // Stage 4: JSON + binary
    s5_exported_threejs: any;                           // Stage 5: JSON
}

var conversion_data: i_conversion_data = {
    stage: null,
    exception: null,
    s0_source: null,
    s0_animations: null,
    s1_xml: null,
    s2_loaded: null,
    s3_converted: null,
    s4_exported_custom: null,
    s5_exported_threejs: null
}

// ----------------------------------------------------------------------------
// Misc
// ----------------------------------------------------------------------------

function fileSizeStr(bytes: number): string {
    var kilo = 1024;
    var mega = 1024 * 1024;
    var giga = 1024 * 1024 * 1024;
    var tera = 1024 * 1024 * 1024 * 1024;

    var value: number = 0;
    var unit: string = "";
    if (bytes < kilo) {
        value = bytes;
        unit = "B";
    } else if (bytes < mega) {
        value = bytes / kilo;
        unit = "kB";
    } else if (bytes < giga) {
        value = bytes / mega;
        unit = "MB";
    } else if (bytes < tera) {
        value = bytes / giga;
        unit = "GB";
    } else {
        return ">1TB";
    }

    if (value < 10) {
        return value.toFixed(3) + " " + unit;
    } else if (value < 100) {
        return value.toFixed(2) + " " + unit;
    } else {
        return value.toFixed(1) + " " + unit;
    }
}

// ----------------------------------------------------------------------------
// Log
// ----------------------------------------------------------------------------

function escapeHTML(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function writeProgress(msg: string) {
    $("#log").append(msg + "\n");
}

function writeLog(name: string, message: string, level: COLLADA.LogLevel) {
    var line: string = COLLADA.LogLevelToString(level) + ": " + escapeHTML(message);
    $("#log").append("[" + name + "] " + line + "\n");
}

function clearLog() {
    $("#log").text("");
}

function timeStart(name: string) {
    timestamps[name] = performance.now();
    writeProgress(name + " started"); 
}

function timeEnd(name: string) {
    var endTime = performance.now();
    var startTime = timestamps[name];
    writeProgress(name + " finished (" + (endTime - startTime).toFixed(2) + "ms)"); 
}

// ----------------------------------------------------------------------------
// Reset
// ----------------------------------------------------------------------------

function reset() {

    resetInput();
    resetOutput();
}

function resetInput() {
    conversion_data.s0_source = "";
    conversion_data.s0_animations = null;

    updateUIInput();
}

function resetOutput() {

    conversion_data.stage = -1;
    conversion_data.exception = null;
    conversion_data.s1_xml = null;
    conversion_data.s2_loaded = null;
    conversion_data.s3_converted = null;
    conversion_data.s4_exported_custom = null;
    conversion_data.s5_exported_threejs = null;

    renderSetModel(null, null);
    clearLog();
    updateUIOutput();
    updateUIProgress();
}

// ----------------------------------------------------------------------------
// Renderer
// ----------------------------------------------------------------------------

function renderSetModel(json: any, data: Uint8Array) {
    renderer.setMesh(json, data);
}

function renderStartRendering() {
    renderTick(null);
}

function renderTick(timestamp: number) {
    if (renderer.tick(timestamp)) {
        requestAnimationFrame(renderTick);
    }
}

// ----------------------------------------------------------------------------
// Download
// ----------------------------------------------------------------------------

function downloadJSON(data: any, name: string) {
    var mime = "application/json";
    var url = COLLADA.Exporter.Utils.jsonToBlobURI(data, mime);
    downloadUrl(url, name, mime);
}

function previewJSON(data: any) {
    var str = stringify.stringify(data, {maxLength: 120});
    $("#preview-data").val(str);
    (<any>$("#preview-modal")).modal('show');
}

function downloadBinary(data: Uint8Array, name: string) {
    var mime = "application/octet-stream";
    var url = COLLADA.Exporter.Utils.bufferToBlobURI(data, mime);
    downloadUrl(url, name, mime);
}

function downloadUrl(url: string, name: string, mime: string) {
    var a: any = $("#download-link")[0];
    a.href = url;
    a.download = name;
    a.type = mime;
    a.click();
    // TODO: Find a reliable way of releasing the blob URI,
    // so that the blob can be freed from memory.
}

// ----------------------------------------------------------------------------
// UI
// ----------------------------------------------------------------------------

function updateUIProgress() {
    if (conversion_data.stage >= 0) {
        $("#progress-container").removeClass("hidden");
        $("#progress-container").css("display", "");
        $("#progress").css("width", (100*conversion_data.stage / 5).toFixed(1) + "%");
    } else {
        $("#progress-container").addClass("hidden");
    }

    if (conversion_data.stage >= 6) {
        $("#progress-container").fadeOut(2000);
    }
}

function updateUIInput() {
    if (conversion_data.s0_source.length > 0) {
        $("#drop-target-result").removeClass("hidden");
        $("#drop-target-instructions").addClass("hidden");
        $("#input_file_size").text("File loaded (" + fileSizeStr(conversion_data.s0_source.length) + ")");
        $("#convert").removeAttr("disabled");
    } else {
        $("#drop-target-result").addClass("hidden");
        $("#drop-target-instructions").removeClass("hidden");
        $("#convert").attr("disabled", "disabled");
    }

    if (conversion_data.s0_animations) {
        $("#input_animations").removeClass("hidden");
        $("#input_animations").text("Animation labels loaded (" + conversion_data.s0_animations.length + ")");
    } else {
        $("#input_animations").addClass("hidden");
    }
}

function updateUIOutput() {
    if (conversion_data.s4_exported_custom) {
        var data = conversion_data.s4_exported_custom.json;
        var binary = conversion_data.s4_exported_custom.data;

        // Geometry complexity
        var geometry_complexity: string = "";
        geometry_complexity += data.chunks.length + " chunks";
        var tris = 0;
        var verts = 0;
        data.chunks.forEach((chunk) => {
            tris += chunk.triangle_count;
            verts += chunk.vertex_count;
        });
        geometry_complexity += ", " + tris + " triangles, " + verts + " vertices";
        $("#output-geometry-complexity").text(geometry_complexity);

        // Animation complexity
        var animation_complexity: string = "";
        animation_complexity += data.bones.length + " bones";
        animation_complexity += ", ";
        animation_complexity += data.animations.length + " animations";
        animation_complexity += ", ";
        animation_complexity += data.animations.reduce((prev, cur) => prev + cur.frames, 0) + " keyframes";
        $("#output-animation-complexity").text(animation_complexity);

        // Geometry size
        var bbox = data.info.bounding_box;
        var geometry_size: string = "";
        if (bbox) {
            geometry_size += "[" + bbox.min[0].toFixed(2) + "," + bbox.min[1].toFixed(2) + "," + bbox.min[2].toFixed(2) + "]";
            geometry_size += "  -  ";
            geometry_size += "[" + bbox.max[0].toFixed(2) + "," + bbox.max[1].toFixed(2) + "," + bbox.max[2].toFixed(2) + "]";
        }
        $("#output-geometry-size").text(geometry_size);

        // Rendered chunks
        $("#output-chunks").append('<option value="0" selected>All</option>');
        for (var i = 0; i < data.chunks.length; ++i) {
            var chunk_name = data.chunks[i].name || ("Chunk " + i);
            $("#output-chunks").append('<option value="' + (i + 1) + '">' + chunk_name + '</option>');
        }

        // Played animation
        for (var i = 0; i < data.animations.length; ++i) {
            var animation_name = data.animations[i].name || ("Animation " + i);
            $("#output-animation").append('<option value="' + (i) + '">' + animation_name + '</option>');
        }

        // File sizes
        $("#output-custom-json .output-size").text(fileSizeStr(JSON.stringify(data).length));
        $("#output-custom-binary .output-size").text(fileSizeStr(binary.length));
        $("#output-custom-json button").removeAttr("disabled");
        $("#output-custom-binary button").removeAttr("disabled");
    } else {
        $("#output-geometry-complexity").text("");
        $("#output-animation-complexity").text("");
        $("#output-geometry-size").text("");
        $("#output-chunks").find('option').remove();
        $("#output-animation").find('option').remove();

        // Output
        $("#output-custom-json .output-size").text("");
        $("#output-custom-binary .output-size").text("");
        $("#output-custom-json button").attr("disabled", "disabled");
        $("#output-custom-binary button").attr("disabled", "disabled");
    }

    if (conversion_data.s5_exported_threejs) {
        var threejs_data = conversion_data.s5_exported_threejs;
        $("#output-threejs .output-size").text(fileSizeStr(JSON.stringify(threejs_data).length));
        $("#output-threejs button").removeAttr("disabled");
    } else {
        $("#output-threejs .output-size").text("");
        $("#output-threejs button").attr("disabled", "disabled");
    }
}

// ----------------------------------------------------------------------------
// Drag & Drop
// ----------------------------------------------------------------------------

function onFileDrag(ev: JQueryEventObject) {
    ev.preventDefault();
}

function onFileDrop(ev: JQueryEventObject) {
    console.log("Something dropped.");
    ev.stopPropagation();
    ev.preventDefault();
    var dt = (<any>ev.originalEvent).dataTransfer;
    if (!dt) {
        writeProgress("Your browser does not support drag&drop for files (?).");
        return;
    }
    var filelist: FileList = dt.files;
    var files: File[] = [];
    for (var i = 0; i < filelist.length; ++i) {
        files.push(filelist[i]);
    }

    files = files.sort((a, b) => b.size - a.size);

    switch (files.length) {
        case 0: writeProgress("You did not drop a file. Try dragging and dropping a file instead."); break;
        case 1: onFileLoad(files[0]); break;
        case 2: onFileLoad(files[0], files[1]); break;
        default: writeProgress("You dropped too many files. Please only drop a single file.");
    };
}

function readTextFile(file: File, name: string, callback: (result: string) => void) {
    // File reader
    var reader = new FileReader();
    reader.onload = () => {
        timeEnd("Reading " + name);
        var result: string = reader.result;
        callback(result);
    };
    reader.onerror = () => {
        writeProgress("Error reading " + name + ".");
    };
    timeStart("Reading " + name);

    // Read
    reader.readAsText(file);
}


function onFileLoad(file: File, animations?: File) {
    // Reset all data
    reset();

    // Read the 
    if (animations) {
        readTextFile(animations, "animations",(result) => {
            animationSetup(result);
            readTextFile(file, "file",(result2) => convertSetup(result2));
        });
    } else {
        readTextFile(file, "file",(result) => convertSetup(result));
    }
}

// ----------------------------------------------------------------------------
// Conversion
// ----------------------------------------------------------------------------

function animationSetup(src: string) {
    conversion_data.s0_animations = parseAnimations.parse(src);
}

function convertSetup(src: string) {
    // Set the source data
    conversion_data.s0_source = src;
    conversion_data.stage = 1;
    updateUIInput();
}

function convertTick() {
    // Synchronously perform one step of the conversion
    try {
        switch (conversion_data.stage) {
            case 1: convertParse(); break;
            case 2: convertLoad(); break;
            case 3: convertConvert(); break;
            case 4: convertExportCustom(); break;
            case 5: convertExportThreejs(); updateUIOutput(); break;
            case 6: convertRenderPreview(); break;
            case 7: break;
            default: throw new Error("Unknown stage");
        }
    } catch (e) {
        conversion_data.exception = true;
    }

    // Update the progress bar
    updateUIProgress();
}

function convertNextStage() {
    conversion_data.stage++;
    setTimeout(convertTick, 10);
}

function convertParse() {
    // Parser
    var parser = new DOMParser();

    // Parse
    timeStart("XML parsing");
    conversion_data.s1_xml = parser.parseFromString(conversion_data.s0_source, "text/xml");
    timeEnd("XML parsing");

    // Next stage
    convertNextStage();
}

function convertLoad() {
    // Loader
    var loader = new COLLADA.Loader.ColladaLoader();
    var loaderlog = new COLLADA.LogCallback;
    loaderlog.onmessage = (message: string, level: COLLADA.LogLevel) => { writeLog("loader", message, level); }
    loader.log = new COLLADA.LogFilter(loaderlog, COLLADA.LogLevel.Info);

    // Load
    timeStart("COLLADA parsing");
    conversion_data.s2_loaded = loader.loadFromXML("id", conversion_data.s1_xml);
    timeEnd("COLLADA parsing");

    // Next stage
    convertNextStage();
}

function convertConvert() {
    // Converter
    var converter = new COLLADA.Converter.ColladaConverter();
    var converterlog = converter.log = new COLLADA.LogCallback;
    converterlog.onmessage = (message: string, level: COLLADA.LogLevel) => { writeLog("converter", message, level); }
    converter.options = options;
    converter.options.animationLabels.value = conversion_data.s0_animations;
    converter.options.useAnimationLabels.value = conversion_data.s0_animations != null;

    // Convert
    timeStart("COLLADA conversion");
    conversion_data.s3_converted = converter.convert(conversion_data.s2_loaded);
    timeEnd("COLLADA conversion");

    // Next stage
    convertNextStage();
}

function convertExportCustom() {
    // Exporter
    var exporter = new COLLADA.Exporter.ColladaExporter();
    var exporterlog = exporter.log = new COLLADA.LogCallback;
    exporterlog.onmessage = (message: string, level: COLLADA.LogLevel) => { writeLog("converter", message, level); }

    // Export
    timeStart("COLLADA export");
    conversion_data.s4_exported_custom = exporter.export(conversion_data.s3_converted);
    timeEnd("COLLADA export");

    // Next stage
    convertNextStage();
}

function convertExportThreejs() {
    // Exporter2
    var exporter = new COLLADA.Threejs.ThreejsExporter();
    var exporterlog = exporter.log = new COLLADA.LogCallback;
    exporterlog.onmessage = (message: string, level: COLLADA.LogLevel) => { writeLog("threejs", message, level); }

    // Export2
    timeStart("Threejs export");
    conversion_data.s5_exported_threejs = exporter.export(conversion_data.s3_converted);
    timeEnd("Threejs export");

    // Next stage
    convertNextStage();
}

function convertRenderPreview() {
    timeStart("WebGL loading");
    renderSetModel(conversion_data.s4_exported_custom.json, conversion_data.s4_exported_custom.data);
    timeEnd("WebGL loading");

    timeStart("WebGL rendering");
    renderStartRendering();
    timeEnd("WebGL rendering");

    // Next stage
    convertNextStage();
}

function onConvertClick() {
    // Delete any previously converted data
    resetOutput();

    // Start the conversion
    conversion_data.stage = 1;
    setTimeout(convertTick, 10);
}

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------

function init() {
    // Initialize WebGL
    var canvas: HTMLCanvasElement = <HTMLCanvasElement>$("#canvas")[0];
    renderer = new ThreejsRenderer();
    renderer.init(canvas);

    // Create option elements
    var optionsForm = $("#form-options");
    optionElements.push(new ColladaConverterOption(options.createSkeleton, optionsForm));
    optionElements.push(new ColladaConverterOption(options.enableAnimations, optionsForm));
    optionElements.push(new ColladaConverterOption(options.animationFps, optionsForm));
    optionElements.push(new ColladaConverterOption(options.worldTransform, optionsForm));
    optionElements.push(new ColladaConverterOption(options.worldTransformScale, optionsForm));
    optionElements.push(new ColladaConverterOption(options.worldTransformRotationAxis, optionsForm));
    optionElements.push(new ColladaConverterOption(options.worldTransformRotationAngle, optionsForm));
    optionElements.push(new ColladaConverterOption(options.sortBones, optionsForm));
    optionElements.push(new ColladaConverterOption(options.applyBindShape, optionsForm));
    optionElements.push(new ColladaConverterOption(options.singleBufferPerGeometry, optionsForm));

    // Register events
    $("#drop-target").on("dragover", onFileDrag);
    $("#drop-target").on("drop", onFileDrop);
    $("#convert").click(onConvertClick);

    $("#output-custom-json .output-download").click(() =>
        downloadJSON(conversion_data.s4_exported_custom.json, "model.json"));
    $("#output-custom-binary .output-download").click(() =>
        downloadBinary(conversion_data.s4_exported_custom.data, "model.bin"));
    $("#output-threejs .output-download").click(() =>
        downloadJSON(conversion_data.s5_exported_threejs, "model-threejs.json"));

    $("#output-custom-json .output-view").click(() =>
        previewJSON(conversion_data.s4_exported_custom.json));
    $("#output-custom-binary .output-view").click(() =>
        alert("Binary preview not implemented"));
    $("#output-threejs .output-view").click(() =>
        previewJSON(conversion_data.s5_exported_threejs));
    $("#close-preview").click(() =>
        (<any>$("#preview-modal")).modal('hide'));

    $("#output-animation").change(() =>
        renderer.animation_index = +$("#output-animation").val());

    // Update all UI elements
    reset();

    writeProgress("Converter initialized");
}