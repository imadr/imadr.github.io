var $ = function(selector){
    if(selector[0] == ".") return document.querySelectorAll(selector);
    else return document.querySelector(selector);
};

var map = L.map("map").setView([40.7612, -73.9812], 14.5);
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

var opacity = 40;
var buffer_radius = 10;
var f = 0.4;
var g = 0.9;
var resolution = 100;

window.addEventListener("resize", function(){
    set_canvas_pos();
    resolution = parseInt($("#resolution").value);
    set_canvas_size();
});

window.addEventListener("load", function(){
    set_canvas_pos();
    resolution = parseInt($("#resolution").value);
    set_canvas_size();
});

$("#resolution").addEventListener("change", function(){
    resolution = parseInt(this.value);
    set_canvas_size();
});

$("#resolution").value = resolution;

function set_canvas_pos(){
    canvas.style.left = map_div.offsetLeft+"px";
    canvas.style.top = map_div.offsetTop+"px";
    canvas.style.width = map_div.offsetWidth+"px";
    canvas.style.height = map_div.offsetHeight+"px";
}

function set_canvas_size(){
    var c = canvas.width;
    canvas.width = resolution;
    var ratio = canvas.offsetWidth/canvas.offsetHeight;
    canvas.height = resolution/ratio;
    c /= canvas.width;
    for(var i = 0; i < crimes.length; i++){
        crimes[i][0] = Math.floor(crimes[i][0]/c);
        crimes[i][1] = Math.floor(crimes[i][1]/c);
    }
    update_crimes_input();
    update_crimes();
}

canvas.addEventListener("click", function(e){
    var rect = e.target.getBoundingClientRect();
    var click = [e.clientX-rect.left, e.clientY-rect.top];
    click[0] /= rect.width;
    click[1] /= rect.height
    click[0] = Math.floor(click[0]*canvas.width);
    click[1] = Math.floor(click[1]*canvas.height);
    crimes.push(click);
    update_crimes_input();
    update_crimes();
});

function update_crimes_input(){
    $("#crimes").value = "";
    for(var i = 0; i < crimes.length; i++){
        $("#crimes").value += "("+crimes[i][0]+","+crimes[i][1]+");";
    }
}

$("#opacity_input").value = $("#opacity").innerHTML = opacity;
$("#b_input").value = buffer_radius;
$("#f_input").value = f;
$("#g_input").value = g;

$("#b_input").addEventListener("input", function(){
    buffer_radius = parseFloat(this.value);
    update_crimes();
});

$("#f_input").addEventListener("input", function(){
    f = parseFloat(this.value);
    update_crimes();
});

$("#g_input").addEventListener("input", function(){
    g = parseFloat(this.value);
    update_crimes();
});

$("#opacity_input").addEventListener("input", function(){
    opacity = parseInt(this.value);
    $("#opacity").innerHTML = opacity;
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
        d[i+1] = r > 0.5 ? 255-((r-0.5)*255) : 255;
        d[i] = r > 0.5 ? 255 : r*255*2;
        d[i+2] = 0;
        d[i+3] = opacity*255/100;
    }
    ctx.putImageData(imgData, 0, 0);
}