var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var canvas_container = canvas.parentElement;

canvas_container.addEventListener("wheel", zoom);
canvas_container.addEventListener("mousedown", pan);
canvas_container.addEventListener("mouseup", pan);
canvas_container.addEventListener("mousemove", pan);

var panning = false;
var pan_start = [];

center_canvas();

var collapse = document.getElementsByClassName("collapse");
for(var i = 0; i < collapse.length; i++){
    (function(){
        collapse[i].addEventListener("click", function(){
            var arrow = this.querySelector("span");
            arrow.innerHTML = arrow.innerHTML == "▲" ? "▼" : "▲";
            var div = document.getElementById(this.id.split("_")[1]);
            div.classList.toggle("invisible");
        });
    }());
}

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
            /*var limit_left = document.documentElement.clientWidth-canvas.offsetWidth;
            if(new_left < canvas_container.offsetLeft) new_left = canvas_container.offsetLeft;
            if(new_left > limit_left) new_left = limit_left;*/
            canvas.style.left = new_left+"px";

            var new_top = e.clientY-pan_start[1];
            /*var limit_top = document.documentElement.clientHeight-canvas.offsetHeight;
            if(new_top < canvas_container.offsetTop) new_top = canvas_container.offsetTop;
            if(new_top > limit_top) new_top = limit_top;*/
            canvas.style.top = new_top+"px";
        }
    }
}

function center_canvas(){
    canvas.style.left = (canvas_container.offsetLeft+canvas_container.offsetWidth/2-canvas.offsetWidth/2)+"px";
    canvas.style.top = (canvas_container.offsetTop+canvas_container.offsetHeight/2-canvas.offsetHeight/2)+"px";
}

function zoom(e){
    var zoom_step = 1.5;
    if(e.deltaY > 0) zoom_step = 1/zoom_step;
    var width = canvas.getBoundingClientRect().width;
    var new_width = width*zoom_step;
    //if(new_width < canvas_container.offsetWidth){
        canvas.style.width = new_width+"px";
    //    center_canvas();
    //}
}

document.getElementById("image_upload").onchange = function(e){
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
    document.getElementById("current_image").innerHTML = name;

    img.onload = function(){
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        center_canvas();
    }
}

function grayscale(){
    console.log(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

document.getElementById("grayscale_button").onclick = grayscale;