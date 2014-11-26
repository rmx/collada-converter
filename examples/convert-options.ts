/// <reference path="../lib/collada.d.ts" />
/// <reference path="external/jquery/jquery.d.ts" />

class ColladaConverterOption {
    option: COLLADA.Converter.Option;
    control: JQuery;
    group: JQuery;
    setFn: (value: any) => void;
    getFn: () => any;

    constructor(option: COLLADA.Converter.Option, parent?: JQuery) {
        this.option = option;

        // Label
        var label = $("<label>").addClass("col-sm-6").addClass("control-label").text(option.title);

        // Control
        var control_content = null;
        switch (option.type) {
            // Boolean option (checkbox)
            case "boolean":
                this.control = $("<input>").attr("type", "checkbox");
                control_content = 
                $("<div>").addClass("checkbox").append(
                    $("<label>").append(this.control).append("Enabled")
                    );
                this.getFn = () => this.control.prop("checked");
                this.setFn = (value: any) => this.control.prop("checked", value);
                break;
            // Number option (input field)
            case "number":
                this.control = $("<input>").attr("type", "number").addClass("form-control");
                control_content = this.control;
                this.getFn = () => this.control.val();
                this.setFn = (value: any) => this.control.val(value);
                break;
            // Select option (select element)
            case "select":
                var src_option = <COLLADA.Converter.OptionSelect> option;
                this.control = $("<select>").addClass("form-control");
                control_content = this.control;
                src_option.options.forEach((value) => {
                    this.control.append($("<option>").attr("value", value).text(value));
                });
                this.getFn = () => this.control.val();
                this.setFn = (value: any) => this.control.val(value);
                break;
            default:
                throw new Error("Unknown option type");
        }
        var control_group = $("<div>").addClass("col-sm-4");
        control_group.append(control_content);

        // Initialize
        this.setFn(option.value);

        // Events
        this.control.change(() => { this.option.value = this.getFn(); });
        
        // Info
        var info_icon = $("<span>").addClass("glyphicon glyphicon-info-sign");
        var info_button = $("<button>").addClass("btn btn-info btn-block").attr("type", "button");
        (<any>info_button).popover({'title': option.title, 'content': option.description, 'placement': top, 'trigger': 'click hover'});
        info_button.append(info_icon);
        var info_group = $("<div>").addClass("col-sm-2");
        info_group.append(info_button);

        // Group
        this.group = $("<div>").addClass("form-group");
        this.group.append(label);
        this.group.append(control_group);
        this.group.append(info_group);

        if (parent) {
            parent.append(this.group);
        }
    }

}