var $ = function(selector){
    if(selector[0] == ".") return document.querySelectorAll(selector);
    else return document.querySelector(selector);
};

var map = L.map("map").setView([51.505, -0.09], 13);
var layer = L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}", {
    attribution: `Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>`,
    maxZoom: 18,
    id: "mapbox/streets-v11",
    tileSize: 512,
    zoomOffset: -1,
    accessToken: "pk.eyJ1IjoicmprcnlrcnlrcnlrZXkiLCJhIjoiY2s5emI5YmRoMDRydzNtcnR0c3h4YXRseiJ9.HP6_ydCH-DotnFq0nrKmmg"
}).addTo(map);

var canvas = $("#canvas");
var ctx = canvas.getContext("2d");
var map_div = $("#map");

var crimes = [];

var buffer_radius = 20;
var f = 1;
var g = 2;

canvas.style.width = map_div.offsetWidth+"px";
canvas.style.height = map_div.offsetHeight+"px";
canvas.style.top = map_div.offsetTop+"px";
canvas.style.left = map_div.offsetLeft+"px";

var resolution = parseInt($("#resolution").value);
set_canvas_size();

$("#resolution").addEventListener("input", function(){
    resolution = parseInt(this.value);
    set_canvas_size()
});

function set_canvas_size(){
    canvas.width = resolution;
    var ratio = canvas.offsetWidth/canvas.offsetHeight;
    canvas.height = resolution/ratio;
    update_crimes();
}

canvas.addEventListener("click", function(e){
    canvas.style.top = map_div.offsetTop+"px";
    var rect = e.target.getBoundingClientRect();
    var click = [e.clientX-rect.left, e.clientY-rect.top];
    click[0] /= rect.width;
    click[1] /= rect.height
    click[0] = Math.floor(click[0]*canvas.width);
    click[1] = Math.floor(click[1]*canvas.height);
    crimes.push(click);
    $("#crimes").value = "";
    for(var i = 0; i < crimes.length; i++){
        $("#crimes").value += "("+crimes[i][0]+","+crimes[i][1]+");";
    }
    update_crimes();
});

$("#b_input").value = $("#b").innerHTML = buffer_radius;
$("#f_input").value = $("#f").innerHTML = f;
$("#g_input").value = $("#g").innerHTML = g;

$("#b_input").addEventListener("input", function(){
    buffer_radius = parseFloat(this.value);
    $("#b").innerHTML = buffer_radius;
    update_crimes();
});

$("#f_input").addEventListener("input", function(){
    f = parseFloat(this.value);
    $("#f").innerHTML = f;
    update_crimes();
});

$("#g_input").addEventListener("input", function(){
    g = parseFloat(this.value);
    $("#g").innerHTML = g;
    update_crimes();
});

$("#crimes").addEventListener("change", function(){
    var input = this.value;
    input = input.split(";");
    crimes = [];
    for(var i = 0; i < input.length-1; i++){
        var c = input[i].replace("(", "").replace(")", "").split(",");
        var x = parseInt(c[0]);
        var y = parseInt(c[1]);
        crimes.push([x, y]);
    }
    update_crimes();
});

$("#map_control").addEventListener("click", function(){
    canvas.style.display = canvas.style.display == "none" ? "inherit" : "none";
});

$("#clear_crimes").addEventListener("click", function(){
    crimes = [];
    $("#crimes").value = "";
    update_crimes();
});

function change_distance(dist){
    distance_type = dist;
    update_crimes();
}

var distance_radios = document.getElementsByName("distance");
for(var i = 0; i < distance_radios.length; i++){
    distance_radios[i].addEventListener("change", function(){
        change_distance(this.value);
    });
}

var distance_type = "manhattan";

function distance(a, b){
    if(distance_type == "manhattan"){
        return Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
    }
    else if(distance_type == "euclidean"){
        return Math.sqrt(Math.pow(a[0]-b[0], 2)+Math.pow(a[1]-b[1], 2));
    }
}

function rossmo(point){
    var p = 0;
    var t = Math.pow(buffer_radius, g-f);
    for(var i = 0; i < crimes.length; i++){
        var dist = distance(point, crimes[i]);
        if(dist > buffer_radius){
            p += 1/(Math.pow(dist, f));
        }
        else{
            p += t/Math.pow(2*buffer_radius-dist, g);
        }
    }
    return p;
}

function update_crimes(){
    var min_probability = Number.POSITIVE_INFINITY;
    var max_probability = Number.NEGATIVE_INFINITY;
    for(var j = 0; j < canvas.height; j++){
        for(var i = 0; i < canvas.width; i++){
            var probability = rossmo([i, j]);
            if(probability > max_probability){
                max_probability = probability;
            }
            else if(probability < min_probability){
                min_probability = probability;
            }
        }
    }

    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var d = imgData.data;
    for(var i = 0; i < d.length; i += 4){
        var x = (i/4)%canvas.width;
        var y = (i/4)/canvas.width;

        var probability = rossmo([x, y]);
        var r = (probability-min_probability)/(max_probability-min_probability);
        d[i] = r > 0.5 ? 255-((r-0.5)*255) : 255;
        d[i+1] = r > 0.5 ? 255 : r*255*2;
        d[i+2] = 0;
        d[i+3] = 120;
    }
    ctx.putImageData(imgData, 0, 0);
}