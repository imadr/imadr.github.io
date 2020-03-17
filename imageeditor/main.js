class Layer{
    constructor(_name, _visible, _type, _thing){
        this.name = _name;
        this.visible = _visible;
        this.type = _type;
        if(_type == "image"){
            this.img = _thing;
        }
        else if(_type == "filter"){
            this.function = _thing;
        }
    }
}

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

update_layers_ui();

document.addEventListener("click", function(e){
    if(!e.target.classList.contains("layer")){
        current_selected_layer = -1;
    }
    else{
        current_selected_layer = parseInt(e.target.id.split("-")[1]);
    }
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

get("image_upload").onchange = function(e){
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
        add_layer(new Layer(name, true, "image", img));
    }
}

function resize_canvas(width, height){
    canvas.width = width;
    canvas.height = height;
    update_canvas();
    center_canvas();
}

get("resize_canvas_button").addEventListener("click", function(){
    var width = parseInt(get("canvas_width_input").value);
    var height = parseInt(get("canvas_height_input").value);
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
        if(layers[i].type == "image"){
            ctx.drawImage(layers[i].img, 0, 0);
        }
        else if(layers[i].type == "filter"){
            layers[i].function();
        }
    }
}

function grayscale(){
    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var r_luminance = parseFloat(get("r_grayscale_input").value);
    var g_luminance = parseFloat(get("g_grayscale_input").value);
    var b_luminance = parseFloat(get("b_grayscale_input").value);
    for(i = 0; i < imgData.data.length; i += 4){
        var r = imgData.data[i+0];
        var g = imgData.data[i+1];
        var b = imgData.data[i+2];
        imgData.data[i+0] = imgData.data[i+1] = imgData.data[i+2] = r_luminance*r+g_luminance*g+b_luminance*b;
    }
    ctx.putImageData(imgData, 0, 0);
}

function threshold(){
    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var level = parseFloat(get("level_threshold_input").value);
    for(i = 0; i < imgData.data.length; i += 4){
        if(imgData.data[i+0] >= level){
            imgData.data[i+0] = imgData.data[i+1] = imgData.data[i+2] = 255;
        }
        else{
            imgData.data[i+0] = imgData.data[i+1] = imgData.data[i+2] = 0;
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

get("grayscale_button").onclick = function(){
    add_layer(new Layer("Grayscale", true, "filter", grayscale));
};
get("threshold_button").onclick = function(){
    add_layer(new Layer("Threshold", true, "filter", threshold));
};

/// Test ///

resize_canvas(512, 512);
upload_image("peppers.png", "peppers.png");