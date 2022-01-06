let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let tileset_path = "tileset.png";
let tileset = new Image();
tileset.src = tileset_path;
let tiles = [];
let tile_width = 9*2;
let tile_height = 16*2;

let tmp_canvas = document.createElement("canvas");
let tmp_ctx = tmp_canvas.getContext("2d");
tmp_canvas.width = tile_width;
tmp_canvas.height = tile_height;

let map = [];
for(let j = 0; j < 30; j++){
    map.push([]);
    for(let i = 0; i < 50; i++){
        map[j].push(0);
    }
}

map = [
[46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46],
[46, 35, 35, 35, 35, 35, 46, 46, 46, 46, 46, 46],
[46, 35, 46, 46, 46, 35, 46, 46, 46, 46, 46, 46],
[46, 35, 46, 46, 46, 35, 46, 46, 46, 46, 46, 46],
[46, 35, 46, 46, 46, 35, 46, 46, 46, 46, 46, 46],
[46, 35, 35, 256, 35, 35, 46, 46, 46, 46, 46, 46],
[46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46],
[46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46],
[46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46],
[46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46, 46],
];

let colliders = [35];

let player = {
    position: {x: 0, y: 0},
};

let player_tile = 1;

tileset.onload = function(){
    for(let j = 0; j < tileset.height/tile_height; j++){
        for(let i = 0; i < tileset.width/tile_width; i++){
            tiles.push([i*tile_width, j*tile_height]);
        }
    }

    init();
}

function init(){
    canvas.width = tile_width*map[0].length;
    canvas.height = tile_height*map.length;
    draw();
}

function draw_tile(tile_id, x, y, bg, fg){
    let tile = tiles[tile_id];
    tmp_ctx.clearRect(0, 0, tile_width, tile_height);
    tmp_ctx.drawImage(tileset, tile[0], tile[1], tile_width, tile_height,
                        0, 0, tile_width, tile_height);
    let data = tmp_ctx.getImageData(0, 0, tile_width, tile_height);
    for(let i = 0; i < data.data.length; i+=4){
        if(data.data[i+3] != 255) continue;
        data.data[i] = fg[0];
        data.data[i+1] = fg[1];
        data.data[i+2] = fg[2];
        data.data[i+3] = 255;
    }
    tmp_ctx.putImageData(data, 0, 0);
    ctx.fillStyle = "rgb("+bg[0]+", "+bg[1]+", "+bg[2]+")";
    ctx.fillRect(x*tile_width, y*tile_height, tile_width, tile_height);
    ctx.drawImage(tmp_canvas, x*tile_width, y*tile_height);
}

function draw(){
    for(let j = 0; j < map.length; j++){
        for(let i = 0; i < map[j].length; i++){
            draw_tile(map[j][i], i, j, [0, 0, 0], [255, 255, 255]);
        }
    }

    draw_tile(player_tile, player.position.x, player.position.y, [0, 0, 0], [255, 0, 0]);
}

function collision(position){
    if(!(position.y in map && position.x in map[0])){
        return true;
    }
    if(colliders.indexOf(map[position.y][position.x]) > -1){
        return true;
    }
    return false;
}

document.addEventListener("keydown", function(e){
    let new_position = {x: player.position.x, y: player.position.y};
    switch(e.keyCode){
        case 87:
            new_position.y--;
            break;
        case 83:
            new_position.y++;
            break;
        case 65:
            new_position.x--;
            break;
        case 68:
            new_position.x++;
            break;
    }
    if(!collision(new_position)){
        player.position = new_position;
    }
    draw();
});