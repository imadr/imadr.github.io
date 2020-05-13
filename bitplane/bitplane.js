var canvas = get("image");
var ctx = canvas.getContext("2d");

function upload_image(src){
    var img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    img.onload = function(){
        var tmp_canvas = document.createElement("canvas");
        var tmp_ctx = tmp_canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        tmp_canvas.width = img.width;
        tmp_canvas.height = img.height;
        tmp_ctx.drawImage(img, 0, 0, img.width, img.height);
        var img_data = tmp_ctx.getImageData(0, 0, tmp_canvas.width, tmp_canvas.height);
        draw(img_data);
    }
}

get("image-upload").onchange = function(e){
    var file = e.target.files[0];
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function(e){
        upload_image(e.target.result);
    }
}

function draw(img_data){
    get("planes-canvas").innerHTML = "";

    var canvas_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for(var i = 0; i < img_data.data.length; i+=4){
        canvas_data.data[i] = img_data.data[i];
        canvas_data.data[i+1] = img_data.data[i+1];
        canvas_data.data[i+2] = img_data.data[i+2];
        canvas_data.data[i+3] = 255;
    }
    ctx.putImageData(canvas_data, 0, 0);

    for(var i = 0; i < 8; i++){
        var new_canvas_container = document.createElement("div");
        var new_canvas = document.createElement("canvas");
        var txt = document.createElement("div");
        txt.innerHTML = "Bit "+(i+1);
        new_canvas_container.appendChild(txt);
        new_canvas_container.appendChild(new_canvas);
        var new_ctx = new_canvas.getContext("2d");
        new_canvas.width = canvas.width;
        new_canvas.height = canvas.height;
        var data = new_ctx.getImageData(0, 0, new_canvas.width, new_canvas.height);

        for(var j = 0; j < data.data.length; j+=4){
            var n = canvas_data.data[j].toString(2);
            var c = ("00000000".substr(n.length)+n)[i] == "1" ? 255 : 0;
            data.data[j] = c;
            data.data[j+1] = c;
            data.data[j+2] = c;
            data.data[j+3] = 255;
        }
        new_ctx.putImageData(data, 0, 0);
        get("planes-canvas").appendChild(new_canvas_container);
    }
}

upload_image("peppers.png");