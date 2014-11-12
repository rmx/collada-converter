/// <reference path="../lib/collada.d.ts" />
/// <reference path="convert-renderer.ts" />

var use_threejs: boolean = true;

interface i_elements {
    input?: HTMLInputElement;
    log_progress?: HTMLTextAreaElement;
    log_loader?: HTMLTextAreaElement;
    log_converter?: HTMLTextAreaElement;
    log_exporter?: HTMLTextAreaElement;
    output?: HTMLTextAreaElement;
    convert?: HTMLButtonElement;
    canvas?: HTMLCanvasElement;
    download_json?: HTMLAnchorElement;
    download_data?: HTMLAnchorElement;
    download_threejs?: HTMLAnchorElement;
    mesh_parts_checkboxes?: HTMLInputElement[];
    mesh_parts_labels?: HTMLLabelElement[];
};
var elements: i_elements = {};

var timestamps: {[name: string]:number} = {};
var input_data: string = "";

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

function onFileDrag(ev: DragEvent) {
    ev.preventDefault();
}

function onFileDrop(ev: DragEvent) {
    clearInput();
    writeProgress("Something dropped.");
    ev.preventDefault();
    var dt = ev.dataTransfer;
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

function convertAsync() {

    var url = window.location.href.replace("convert.html", "");
    var script_urls = ["convert-task.js", "../js/xmlsax.js", "../js/xmlw3cdom.js", "../lib/collada.js", "../js/gl-matrix.js"].map((value) => ("'" + url + value + "'"));
    var worker_script = new Blob(["importScripts(" + script_urls.join(",") + ");"]);
    var worker_script_url = URL.createObjectURL(worker_script);
    var worker = new Worker(worker_script_url);
    URL.revokeObjectURL(worker_script_url);

    worker.onmessage = function (event) {
        var message: any = event.data;
        if (message.progress_start) {
            timeStart(message.progress_start);
        }
        if (message.progress_end) {
            timeEnd(message.progress_end);
        }
        if (message.log_name) {
            writeLog(message.log_name, message.log_message, message.log_level);
        }
        if (message.result_json) {
            var json = message.result_json;
            var data = message.result_data;

            // Download links
            elements.download_json.href = COLLADA.Exporter.Utils.jsonToDataURI(json, null);
            elements.download_json.textContent = "Download (" + (JSON.stringify(json).length / 1024).toFixed(1) + " kB)";
            elements.download_data.href = COLLADA.Exporter.Utils.bufferToBlobURI(data.buffer);
            elements.download_data.textContent = "Download (" + (data.length / 1024).toFixed(1) + " kB)";

            // Output
            elements.output.textContent = JSON.stringify(json, null, 2);
            resetCheckboxes(json.chunks);

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
    };

    // Worker data
    var worker_data: any = {};
    worker_data.input_data = input_data;
    
    // Start the worker
    var options: any = {};
    options.fps = parseFloat((<HTMLInputElement>document.getElementById("option-fps")).value);
    options.animations = (<HTMLInputElement>document.getElementById("option-animations")).checked;
    worker_data.options = options;

    worker.postMessage(worker_data);
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
    var loaderlog = loader.log = new COLLADA.LogCallback;
    loaderlog.onmessage = (message: string, level: COLLADA.LogLevel) => { writeLog("loader", message, level); }

    // Load
    timeStart("COLLADA parsing");
    var load_data = loader.loadFromXML("id", xmlDoc);
    timeEnd("COLLADA parsing");

    // Converter
    var converter = new COLLADA.Converter.ColladaConverter();
    var converterlog = converter.log = new COLLADA.LogCallback;
    converterlog.onmessage = (message: string, level: COLLADA.LogLevel) => { writeLog("converter", message, level); }

    // Convert
    converter.options.animationFps.value = parseFloat((<HTMLInputElement>document.getElementById("option-fps")).value);
    converter.options.enableAnimations.value = (<HTMLInputElement>document.getElementById("option-animations")).checked;
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

    if (true) {
        convertSync();
    } else {
        convertAsync();
    }
}

function onColladaProgress(id: string, loaded: number, total: number) {
    writeProgress("Collada loading progress");
}

function init() {
    // Find elements
    elements.input = <HTMLInputElement> document.getElementById("input");
    elements.log_progress = <HTMLTextAreaElement> document.getElementById("log_progress");
    elements.log_loader = <HTMLTextAreaElement> document.getElementById("log_loader");
    elements.log_converter = <HTMLTextAreaElement> document.getElementById("log_converter");
    elements.log_exporter = <HTMLTextAreaElement> document.getElementById("log_exporter");
    elements.output = <HTMLTextAreaElement> document.getElementById("output");
    elements.convert = <HTMLButtonElement> document.getElementById("convert");
    elements.canvas = <HTMLCanvasElement> document.getElementById("canvas");
    elements.download_json = <HTMLAnchorElement> document.getElementById("download_json");
    elements.download_data = <HTMLAnchorElement> document.getElementById("download_data");
    elements.download_threejs = <HTMLAnchorElement> document.getElementById("download_threejs");
    elements.mesh_parts_checkboxes = [];
    elements.mesh_parts_labels = [];
    for (var i: number = 0; i < 18; ++i) {
        var id: string = "part_" + ("0" + (i+1)).slice(-2);
        elements.mesh_parts_checkboxes[i] = <HTMLInputElement> document.getElementById(id);
        elements.mesh_parts_labels[i] = <HTMLLabelElement> document.getElementById(id + "_label");
    }

    // Initialize WebGL
    if (use_threejs) {
        initThreejs();
    } else {
        initGL();
    }

    // Register events
    elements.input.ondragover = onFileDrag;
    elements.input.ondrop = onFileDrop;
    elements.convert.onclick = onConvertClick;

    //
    clearOutput();
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
