/// <reference path="../lib/collada.d.ts" />


function worker_postMessage(msg: any) {
    // Acutal signature is worker.postMessage(aMessage, transferList);
    (<Worker><any>self).postMessage(msg);
}

function worker_postStart(name: string) {
    var message = {
        progress_start: name
    };
    worker_postMessage(message);
}

function worker_postEnd(name: string) {
    var message = {
        progress_end: name
    };
    worker_postMessage(message);
}


function worker_postResult(data: COLLADA.Exporter.Document) {
    var message = {
        result_json: data.json,
        result_data: data.data
    };
    worker_postMessage(message);
}

function worker_postLog(name:string, msg: string, level: COLLADA.LogLevel) {
    var message = {
        log_name: name,
        log_message: msg,
        log_level: level
    };
    worker_postMessage(message);
}

function worker_convert(data) {
    var loadData = null;

    if (data.load_data == null) {
        // Parser
        var parser: any = new DOMImplementation();

        // Parse
        worker_postStart("XML parsing");
        var xmlDoc = parser.loadXML(data.input_data);
        worker_postEnd("XML parsing");

        // Loader
        var loader = new COLLADA.Loader.ColladaLoader();
        var loaderlog = loader.log = new COLLADA.LogCallback;
        loaderlog.onmessage = (message: string, level: COLLADA.LogLevel) => { worker_postLog("loader", message, level); }

        // Load
        worker_postStart("COLLADA parsing");
        loadData = loader.loadFromXML("id", xmlDoc);
        worker_postEnd("COLLADA parsing");
    } else {
        loadData = data.load_data;
    }

    // Converter
    var converter = new COLLADA.Converter.ColladaConverter();
    var converterlog = converter.log = new COLLADA.LogCallback;
    converterlog.onmessage = (message: string, level: COLLADA.LogLevel) => { worker_postLog("converter", message, level); }
    converter.options.animationFps.value = data.options.fps || 25;
    converter.options.enableAnimations.value = data.options.animations || true;
    converter.options.worldScale.value = data.options.scale || 1;

    // Convert
    worker_postStart("COLLADA conversion");
    var convertData = converter.convert(loadData);
    worker_postEnd("COLLADA conversion");

    // Exporter
    var exporter = new COLLADA.Exporter.ColladaExporter();
    var exporterlog = exporter.log = new COLLADA.LogCallback;
    exporterlog.onmessage = (message: string, level: COLLADA.LogLevel) => { worker_postLog("converter", message, level); }

    // Export
    worker_postStart("COLLADA export");
    var exportData = exporter.export(convertData);
    worker_postEnd("COLLADA export");
    worker_postResult(exportData);

    self.close();
}

onmessage = function (event) {
    worker_convert(event.data);
};