/// <reference path="../lib/collada.d.ts" />
/// <reference path="convert-renderer.ts" />

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
    mesh_parts_checkboxes?: HTMLInputElement[];
    mesh_parts_labels?: HTMLLabelElement[];
};
var elements: i_elements = {};

interface i_loader_objects {
    parser?: DOMParser;
    loader?: COLLADA.Loader.ColladaLoader;
    converter?: COLLADA.Converter.ColladaConverter;
    exporter?: COLLADA.Exporter.ColladaExporter;
};
var loader_objects: i_loader_objects = {};

var timestamps: {[name: string]:number} = {};
var input_data: string = "";

function writeProgress(msg: string) {
    elements.log_progress.textContent += msg + "\n";
    console.log(msg);
}

function timeStart(name: string) {
    timestamps[name] = performance.now();
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
    clearBuffers();
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

function onConvertClick() {
    clearOutput();

    // Input
    var input = input_data;

    // Parse
    timeStart("XML parsing");
    var xmlDoc = loader_objects.parser.parseFromString(input, "text/xml");
    timeEnd("XML parsing");

    // Load
    timeStart("COLLADA parsing");
    var loadData = loader_objects.loader.loadFromXML("id", xmlDoc);
    timeEnd("COLLADA parsing");
    // console.log(loadData);

    // Convert
    loader_objects.converter.options.animationFps.value = parseFloat((<HTMLInputElement>document.getElementById("option-fps")).value);
    loader_objects.converter.options.enableAnimations.value = (<HTMLInputElement>document.getElementById("option-animations")).checked;
    timeStart("COLLADA conversion");
    var convertData = loader_objects.converter.convert(loadData);
    timeEnd("COLLADA conversion");
    //console.log(convertData);

    // Export
    timeStart("COLLADA export");
    var exportData = loader_objects.exporter.export(convertData);
    timeEnd("COLLADA export");
    // console.log(exportData);

    // Download links
    elements.download_json.href = COLLADA.Exporter.Utils.jsonToDataURI(exportData.json, null);
    elements.download_json.textContent = "Download (" + (JSON.stringify(exportData.json).length / 1024).toFixed(1) + " kB)";
    elements.download_data.href = COLLADA.Exporter.Utils.bufferToBlobURI(exportData.data);
    elements.download_data.textContent = "Download (" + (exportData.data.length / 1024).toFixed(1) + " kB)";

    // Output
    elements.output.textContent = JSON.stringify(exportData.json, null, 2);
    resetCheckboxes(exportData.json.chunks);

    // Start rendering
    timeStart("WebGL loading");
    fillBuffers(exportData.json, exportData.data.buffer);
    setupCamera(exportData.json);
    timeEnd("WebGL loading");

    timeStart("WebGL rendering");
    tick(null);
    timeEnd("WebGL rendering");
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
    elements.mesh_parts_checkboxes = [];
    elements.mesh_parts_labels = [];
    for (var i: number = 0; i < 18; ++i) {
        var id: string = "part_" + ("0" + (i+1)).slice(-2);
        elements.mesh_parts_checkboxes[i] = <HTMLInputElement> document.getElementById(id);
        elements.mesh_parts_labels[i] = <HTMLLabelElement> document.getElementById(id + "_label");
    }

    // Create COLLADA converter chain
    loader_objects.parser = new DOMParser();
    loader_objects.loader = new COLLADA.Loader.ColladaLoader();
    loader_objects.loader.log = new COLLADA.LogTextArea(elements.log_loader);
    loader_objects.converter = new COLLADA.Converter.ColladaConverter();
    loader_objects.converter.log = new COLLADA.LogTextArea(elements.log_converter);
    loader_objects.exporter = new COLLADA.Exporter.ColladaExporter();
    loader_objects.exporter.log = new COLLADA.LogTextArea(elements.log_exporter);

    // Initialize WebGL
    initGL();

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
