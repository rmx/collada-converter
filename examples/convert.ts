/// <reference path="../lib/collada.d.ts" />
/// <reference path="external/jquery/jquery.d.ts" />
/// <reference path="convert-renderer.ts" />
/// <reference path="convert-options.ts" />

var use_threejs: boolean = true;

interface i_elements {
    input?: HTMLInputElement;
    log_progress?: HTMLTextAreaElement;
    log_loader?: HTMLTextAreaElement;
    log_converter?: HTMLTextAreaElement;
    log_exporter?: HTMLTextAreaElement;
    output?: HTMLTextAreaElement;
    download_json?: HTMLAnchorElement;
    download_data?: HTMLAnchorElement;
    download_threejs?: HTMLAnchorElement;
    mesh_parts_checkboxes?: HTMLInputElement[];
    mesh_parts_labels?: HTMLLabelElement[];
};
var elements: i_elements = {};

var timestamps: {[name: string]:number} = {};
var input_data: string = "";
var options: COLLADA.Converter.Options = new COLLADA.Converter.Options();
var optionElements: ColladaConverterOption[] = [];

function writeProgress(msg: string) {
    elements.log_progress.textContent += msg + "\n";
    console.log(msg);
}

function writeLog(name: string, message: string, level: COLLADA.LogLevel) {
    var line: string = COLLADA.LogLevelToString(level) + ": " + message;
    switch (name) {
        case "loader": elements.log_loader.textContent += line + "\n"; break;
        case "converter": elements.log_converter.textContent += line + "\n"; break;
        case "exporter": elements.log_exporter.textContent += line + "\n"; break;
        case "progress": elements.log_progress.textContent += line + "\n"; break;
    }
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

function clearInput() {
    elements.input.textContent = "";
    clearOutput();
}

function clearOutput() {
    if (use_threejs) {
        clearBuffersThreejs();
    } else {
        clearBuffers();
    }

    resetCheckboxes([]);
    elements.log_progress.textContent = "";
    elements.log_loader.textContent = "";
    elements.log_converter.textContent = "";
    elements.log_exporter.textContent = "";
    elements.output.textContent = "";
    elements.download_json.textContent = "No file converted";
    elements.download_json.href = "javascript:void(0)";
    elements.download_data.textContent = "No file converted";
    elements.download_data.href = "javascript:void(0)";
}

function onFileDrag(ev: JQueryEventObject) {
    ev.preventDefault();
}

function onFileDrop(ev: JQueryEventObject) {
    clearInput();
    writeProgress("Something dropped.");
    ev.preventDefault();
    var dt = ev.data.dataTransfer;
    var files = dt.files;
    if (files.length == 0) {
        writeProgress("You did not drop a file. Try dragging and dropping a file instead.");
        return;
    }
    if (files.length > 1) {
        writeProgress("You dropped multiple files. Please only drop a single file.");
        return;
    }
    var file = files[0];
    var reader = new FileReader();
    reader.onload = onFileLoaded;
    reader.onerror = onFileError;
    timeStart("Reading file");
    reader.readAsText(file);
}

function onFileError() {
    writeProgress("Error reading file.");
}

function onFileLoaded(ev: Event) {
    timeEnd("Reading file");
    var data = this.result;
    input_data = data;
    elements.input.textContent = "COLLADA loaded (" + (data.length/1024).toFixed(1) + " kB)";
}

function convertSync() {
    // Parser
    var parser = new DOMParser();

    // Parse
    timeStart("XML parsing");
    var xmlDoc = parser.parseFromString(input_data, "text/xml");
    timeEnd("XML parsing");

    // Loader
    var loader = new COLLADA.Loader.ColladaLoader();
    var loaderlog = new COLLADA.LogCallback;
    loaderlog.onmessage = (message: string, level: COLLADA.LogLevel) => { writeLog("loader", message, level); }
    loader.log = new COLLADA.LogFilter(loaderlog, COLLADA.LogLevel.Info);

    // Load
    timeStart("COLLADA parsing");
    var load_data = loader.loadFromXML("id", xmlDoc);
    timeEnd("COLLADA parsing");

    // Converter
    var converter = new COLLADA.Converter.ColladaConverter();
    var converterlog = converter.log = new COLLADA.LogCallback;
    converterlog.onmessage = (message: string, level: COLLADA.LogLevel) => { writeLog("converter", message, level); }

    // Convert
    timeStart("COLLADA conversion");
    var convertData = converter.convert(load_data);
    timeEnd("COLLADA conversion");

    // Exporter
    var exporter = new COLLADA.Exporter.ColladaExporter();
    var exporterlog = exporter.log = new COLLADA.LogCallback;
    exporterlog.onmessage = (message: string, level: COLLADA.LogLevel) => { writeLog("converter", message, level); }

    // Export
    timeStart("COLLADA export");
    var exportData = exporter.export(convertData);
    timeEnd("COLLADA export");

    var json = exportData.json;
    var data = exportData.data;

    // Download links
    elements.download_json.href = COLLADA.Exporter.Utils.jsonToDataURI(json, null);
    elements.download_json.textContent = "Download (" + (JSON.stringify(json).length / 1024).toFixed(1) + " kB)";
    elements.download_data.href = COLLADA.Exporter.Utils.bufferToBlobURI(data);
    elements.download_data.textContent = "Download (" + (data.length / 1024).toFixed(1) + " kB)";

    // Output
    elements.output.textContent = JSON.stringify(json, null, 2);
    resetCheckboxes(json.chunks);

    // Exporter2
    var exporter2 = new COLLADA.Threejs.ThreejsExporter();
    var exporter2log = exporter2.log = new COLLADA.LogCallback;
    exporter2log.onmessage = (message: string, level: COLLADA.LogLevel) => { writeLog("converter", message, level); }

    // Export2
    timeStart("Threejs export");
    var threejsData = exporter2.export(convertData);
    timeEnd("Threejs export");

    elements.download_threejs.href = COLLADA.Exporter.Utils.jsonToBlobURI(threejsData);
    elements.download_threejs.textContent = "Download (" + (JSON.stringify(threejsData).length / 1024).toFixed(1) + " kB)";

    // Start rendering
    timeStart("WebGL loading");
    if (use_threejs) {
        fillBuffersThreejs(json, data.buffer);
    } else {
        fillBuffers(json, data.buffer);
        setupCamera(json);
    }
    timeEnd("WebGL loading");

    timeStart("WebGL rendering");
    if (use_threejs) {
        tickThreejs(null);
    } else {
        tick(null);
    }
    timeEnd("WebGL rendering");
}

function onConvertClick() {
    clearOutput();

    convertSync();
}

function onColladaProgress(id: string, loaded: number, total: number) {
    writeProgress("Collada loading progress");
}

function init() {
    // Initialize WebGL
    var canvas: HTMLCanvasElement = <HTMLCanvasElement>$("#canvas")[0];
    if (use_threejs) {
        initThreejs(canvas);
    } else {
        initGL(canvas);
    }

    // Create option elements
    var optionsForm = $("#form-options");
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
    $("#drop-target").on("drop", onFileDrop);
    $("#convert").click(onConvertClick);

    //
    // clearOutput();
}

function resetCheckboxes(chunks: COLLADA.Exporter.GeometryJSON[]) {
    for (var i: number = 0; i < elements.mesh_parts_checkboxes.length; ++i) {
        var checkbox: HTMLInputElement = elements.mesh_parts_checkboxes[i];
        var label: HTMLLabelElement = elements.mesh_parts_labels[i];
        checkbox.checked = true;
        if (chunks.length <= i) {
            checkbox.style.setProperty("display", "none");
            label.style.setProperty("display", "none");
        } else {
            checkbox.style.removeProperty("display");
            label.style.removeProperty("display");
            label.textContent = chunks[i].name;
        }
    }
}
