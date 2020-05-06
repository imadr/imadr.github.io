class Layer{
    constructor(_name, _visible, _function, _settings){
        this.name = _name;
        this.visible = _visible;
        this.function = _function;
        this.settings = _settings;
    }
}

var layers_input = {
    "pixel": {
        "order": {0: 1, 1: 2},
        "parse_to": {0: "int", 1: "int"}
    }
};
var layers = [];
var current_selected_layer = -1;

function update_layers_ui(){
    get("layers").innerHTML = "";
    for(var i = layers.length-1; i >= 0; i--){
        get("layers").innerHTML += `<div id="layer-`+i+`" class="layer `+(i == current_selected_layer ? "selected-layer" : "")+`">
            <span class="layer-hide"><i class="fas fa-`+(layers[i].visible ? "eye" : "eye-slash")+`"></i></span>
            <div class="layer-name">`+layers[i].name+`</div>
            <span class="float-right">
                <span class="layer-move layer-move-up"><i class="fas fa-caret-up `+(i == layers.length-1 ? "disabled" : "")+`"></i></span>
                <span class="layer-move layer-move-down"><i class="fas fa-caret-down `+(i == 0 ? "disabled" : "")+`"></i></span>
            </span>
        </div>`;
    }
    var layer_hide_buttons = getc("layer-hide");
    for(var i = 0; i < layer_hide_buttons.length; i++){
        var j = parseInt(layer_hide_buttons[i].parentElement.id.split("-")[1]);
        layer_hide_buttons[i].addEventListener("click", switch_hide(j));
    }
    var move_buttons = getc("layer-move");
    for(var i = 0; i < move_buttons.length; i++){
        var j = parseInt(move_buttons[i].parentElement.parentElement.id.split("-")[1]);
        var up = move_buttons[i].classList.contains("layer-move-up");
        move_buttons[i].addEventListener("click", move_layer(j, up));
    }
}

function set_layer_settings(){
    var divs = getc("layer-settings");
    for(var i = 0; i < divs.length; i++){
        divs[i].classList.toggle("invisible", true);
    }

    if(current_selected_layer == -1){
        get("settings-title").innerHTML = "Layer settings";
        return;
    }


    var layer = layers[current_selected_layer];
    var layer_type = layer.function.name;
    var div_id = layer_type+"_settings";
    var div_name = layer_type[0].toUpperCase()+layer_type.substring(1);

    get("settings-title").innerHTML = div_name+" layer settings:";
    get(div_id).classList.toggle("invisible", false);

    var inputs = document.querySelectorAll("#"+div_id+" input");
    for(var i = 0; i < inputs.length; i++){
        (function(i){
            inputs[i].onchange = function(){
                var settings_to_change_i = layers_input[layer_type]["order"][i];
                var new_value = this.value;
                switch(layers_input[layer_type]["parse_to"][i]){
                    case "int":
                        new_value = parseInt(new_value);
                        break;
                }
                layer.settings[settings_to_change_i] = new_value;

                update_canvas();
            }
        })(i);
    }
}

update_layers_ui();

document.addEventListener("click", function(e){
    if(e.target.classList.contains("layer")){
        current_selected_layer = parseInt(e.target.id.split("-")[1]);
    }
    set_layer_settings();
    update_layers_ui();
});

get("layer-delete").addEventListener("click", function(){
    if(current_selected_layer != -1){
        layers.splice(current_selected_layer, 1);
        current_selected_layer = -1;
        update_canvas();
        update_layers_ui();
    }
});

function move_layer(i, up){
    return function(){
        if(up && i < layers.length-1){
            var tmp = layers[i];
            layers[i] = layers[i+1];
            layers[i+1] = tmp;
        }
        if(!up && i > 0){
            var tmp = layers[i];
            layers[i] = layers[i-1];
            layers[i-1] = tmp;
        }
        current_selected_layer = -1;
        update_canvas();
        update_layers_ui();
    }
}

function switch_hide(i){
    return function(){
        layers[i].visible = !layers[i].visible;
        update_canvas();
        update_layers_ui();
    }
}

function add_layer(layer){
    layers.push(layer);
    update_canvas();
    update_layers_ui();
}

get("image-upload").onchange = function(e){
    var file = e.target.files[0];
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function(e){
        upload_image(e.target.result, file.name);
    }
}

function upload_image(src, name){
    var img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    img.onload = function(){
        var tmp_canvas = document.createElement("canvas");
        var tmp_ctx = tmp_canvas.getContext("2d");
        tmp_canvas.width = img.width;
        tmp_canvas.height = img.height;
        tmp_ctx.drawImage(img, 0, 0, img.width, img.height);
        var img_data = tmp_ctx.getImageData(0, 0, tmp_canvas.width, tmp_canvas.height);
        add_layer(new Layer(name, true, pixel, [img_data, 0, 0]));
    }
}

function resize_canvas(width, height){
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = "512px";
    update_canvas();
    center_canvas();
}

get("resize-canvas-button").addEventListener("click", function(){
    var width = parseInt(get("canvas-width-input").value);
    var height = parseInt(get("canvas-height-input").value);
    resize_canvas(width, height);
})

function center_canvas(){
    canvas.style.left = (canvas_container.offsetLeft+canvas_container.offsetWidth/2-canvas.offsetWidth/2)+"px";
    canvas.style.top = (canvas_container.offsetTop+canvas_container.offsetHeight/2-canvas.offsetHeight/2)+"px";
}

var panning = false;
var pan_start = [];

function pan(e){
    if(e.type == "mousedown"){
        panning = true;
        pan_start = [e.clientX-canvas.offsetLeft, e.clientY-canvas.offsetTop];
    }
    else if(e.type == "mouseup"){
        panning = false;
    }
    else if(e.type == "mousemove"){
        if(panning){
            var new_left = e.clientX-pan_start[0];
            canvas.style.left = new_left+"px";

            var new_top = e.clientY-pan_start[1];
            canvas.style.top = new_top+"px";
        }
    }
}

function zoom(e){
    var zoom_step = 1.5;
    if(e.deltaY > 0) zoom_step = 1/zoom_step;
    var width = canvas.getBoundingClientRect().width;
    var new_width = width*zoom_step;
    if(new_width > 5){
        canvas.style.width = new_width+"px";
        center_canvas();
    }
}

var canvas = get("canvas");
var ctx = canvas.getContext("2d");
var canvas_container = canvas.parentElement;

canvas_container.addEventListener("wheel", zoom);
canvas_container.addEventListener("mousedown", pan);
canvas_container.addEventListener("mouseup", pan);
canvas_container.addEventListener("mousemove", pan);

function update_canvas(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(var i = 0; i < layers.length; i++){
        if(!layers[i].visible) continue;
        layers[i].function(layers[i].settings);
    }
}

function pixel(settings){
    var canvas_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var img_data = settings[0];

    var width = Math.min(canvas_data.width, img_data.width);
    var height = Math.min(canvas_data.height, img_data.height);

    for(var j = 0; j < height; j++){
        for(var i = 0; i < width; i++){
            var index = i+j*width;
            index *= 4;
            var index_canvas = i+j*canvas_data.width;
            index_canvas *= 4;
            canvas_data.data[index_canvas+0] = img_data.data[index+0];
            canvas_data.data[index_canvas+1] = img_data.data[index+1];
            canvas_data.data[index_canvas+2] = img_data.data[index+2];
            canvas_data.data[index_canvas+3] = 255;
        }
    }

    ctx.putImageData(canvas_data, 0, 0);
}

function grayscale(settings){
    var img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var r_luminance = settings[0];
    var g_luminance = settings[1];
    var b_luminance = settings[2];
    for(i = 0; i < img_data.data.length; i += 4){
        var r = img_data.data[i+0];
        var g = img_data.data[i+1];
        var b = img_data.data[i+2];
        img_data.data[i+0] = img_data.data[i+1] = img_data.data[i+2] = r_luminance*r+g_luminance*g+b_luminance*b;
    }
    ctx.putImageData(img_data, 0, 0);
}

// function threshold(){
//     var img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
//     var level = parseFloat(get("level_threshold_input").value);
//     for(i = 0; i < img_data.data.length; i += 4){
//         if(img_data.data[i+0] >= level){
//             img_data.data[i+0] = img_data.data[i+1] = img_data.data[i+2] = 255;
//         }
//         else{
//             img_data.data[i+0] = img_data.data[i+1] = img_data.data[i+2] = 0;
//         }
//     }
//     ctx.putImageData(img_data, 0, 0);
// }

get("grayscale-button").onclick = function(){
    add_layer(new Layer("Grayscale", true, grayscale, [0.299, 0.587, 0.144]));
};

resize_canvas(512, 512);
upload_image("peppers.png", "peppers.png");