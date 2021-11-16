let canvas = document.getElementById("canvas");
let gl = canvas.getContext("webgl2");

let keyboard = {};
let mouse_pos = [0, 0];

let camera_move_speed = 0.35;

let main_camera = {
    fov: 70,
    near_plane: 0.1,
    far_plane: 10000,
    position: [0, 10, 0],
    rotation: [Math.PI/2, -Math.PI/2.3, 0],
    unzoomed_y: 10,
    zoomed_y: 5,
    unzoomed_angle: -Math.PI/2.3,
    zoomed_angle: -Math.PI/3,
    zoom: 1
};

let assets = [
    {path: "assets/shaders/test_vertex.glsl", type: ASSET_VERTEX_SHADER, content: null},
    {path: "assets/shaders/test_fragment.glsl", type: ASSET_FRAGMENT_SHADER, content: null},
    {path: "assets/meshes/ground.obj", type: ASSET_MESH, content: null},
    {path: "assets/img/cursor.png", type: ASSET_IMG, content: null},
    {path: "assets/shaders/ui_vertex.glsl", type: ASSET_VERTEX_SHADER, content: null},
    {path: "assets/shaders/ui_fragment.glsl", type: ASSET_FRAGMENT_SHADER, content: null},
    {path: "assets/meshes/plane2d.obj", type: ASSET_MESH, content: null},
    {path: "assets/img/grass.png", type: ASSET_IMG, content: null},
    {path: "assets/meshes/cube.obj", type: ASSET_MESH, content: null},
    {path: "assets/img/cube.png", type: ASSET_IMG, content: null},
];

let objects = [
    {type: OBJECT_SHADER, vertex_asset_id: 0, fragment_asset_id: 1},
    {type: OBJECT_MESH, mesh_asset_id: 2, shader_object_id: 0},
    {type: OBJECT_TEXTURE, img_asset_id: 3},
    {type: OBJECT_SHADER, vertex_asset_id: 4, fragment_asset_id: 5},
    {type: OBJECT_MESH, mesh_asset_id: 6, shader_object_id: 3},
    {type: OBJECT_TEXTURE, img_asset_id: 7},
    {type: OBJECT_MESH, mesh_asset_id: 8, shader_object_id: 0},
    {type: OBJECT_TEXTURE, img_asset_id: 9},
];

objects.push({type: OBJECT_RENDERABLE2D, transform2D: {
            position: [0, 0],
            scale: [25, 25],
            rotation: 0
        }, mesh_object_id: 4, texture_object_id: 2});
let cursor_object = objects[objects.length-1];

for(let i = -14; i < 23; i++){
    for(let j = -14; j < 28; j++){
        if(i == 2 && j == 1) continue;
        objects.push({type: OBJECT_RENDERABLE, transform: {
            position: [i, 0, j],
            scale: [1, 1, 1],
            rotation: quat_id()
        }, mesh_object_id: 1, texture_object_id: 5});
    }
}

objects.push({type: OBJECT_RENDERABLE, transform: {
    position: [0, 0, 0],
    scale: [1, 1, 1],
    rotation: quat_id()
}, mesh_object_id: 6, texture_object_id: 7});

let renderables = [];
let renderables_2d = [];
let last_used_resources = [null, null, null];

(async function(){
    // load assets
    for(let asset of assets){
        let res = await fetch(asset.path);
        if(asset.type == ASSET_MESH){
            let text = await res.text();
            asset.content = parse_obj(text);
        }
        else if(asset.type == ASSET_IMG){
            let blob = await res.blob();
            let bitmap = await createImageBitmap(blob);
            let tmp_canvas = document.createElement("canvas");
            let tmp_ctx = tmp_canvas.getContext("2d");
            tmp_canvas.width = bitmap.width;
            tmp_canvas.height = bitmap.height;
            tmp_ctx.drawImage(bitmap, 0, 0);
            asset.content = tmp_ctx.getImageData(0, 0, bitmap.width, bitmap.height);
            tmp_canvas.remove();
        }
        else{
            asset.content = await res.text();
        }
    }

    // init objects
    for(let i = 0; i < objects.length; i++){
        let object = objects[i];
        if(object.type == OBJECT_SHADER){
            objects[i] = new Shader(gl,
                assets[object.vertex_asset_id].content,
                assets[object.fragment_asset_id].content, i);
        }
        else if(object.type == OBJECT_MESH){
            objects[i] = new Mesh(gl, assets[object.mesh_asset_id].content,
                objects[object.shader_object_id]);
        }
        else if(object.type == OBJECT_TEXTURE){
            objects[i] = new Texture(gl, assets[object.img_asset_id].content);
        }
        else if(object.type == OBJECT_RENDERABLE){
            objects[i] = new Renderable(gl, object.transform, objects[object.mesh_object_id],
                objects[object.texture_object_id]);
            ;
            renderables.push(i);
        }
        else if(object.type == OBJECT_RENDERABLE2D){
            objects[i] = new Renderable2D(gl, object.transform2D, objects[object.mesh_object_id],
                objects[object.texture_object_id]);
            renderables_2d.push(i);
        }
    }
    init();
})();

function handle_input(){
    if(keyboard["w"]){
        main_camera.position[2] += camera_move_speed;
        console.log(main_camera.position)
    }
    if(keyboard["s"]) main_camera.position[2] -= camera_move_speed;
    if(keyboard["d"]) main_camera.position[0] += camera_move_speed;
    if(keyboard["a"]) main_camera.position[0] -= camera_move_speed;

    cursor_object.transform2D.position[0] = mouse_pos[0];
    cursor_object.transform2D.position[1] = mouse_pos[1];
    cursor_object.transform2D.position[0] = Math.max(0, cursor_object.transform2D.position[0]);
    cursor_object.transform2D.position[0] = Math.min(canvas.width, cursor_object.transform2D.position[0]);
    cursor_object.transform2D.position[1] = Math.max(0, cursor_object.transform2D.position[1]);
    cursor_object.transform2D.position[1] = Math.min(canvas.height, cursor_object.transform2D.position[1]);

    // if(mouse_pos[0] <= 2) main_camera.position[0] -= camera_move_speed;
    // if(mouse_pos[0] >= canvas.width-2) main_camera.position[0] += camera_move_speed;
    // if(mouse_pos[1] <= 2) main_camera.position[2] += camera_move_speed;
    // if(mouse_pos[1] >= canvas.height-2) main_camera.position[2] -= camera_move_speed;
}

let fps = document.getElementById("fps");

function update(){
    let time = performance.now()
    handle_input();
    draw();
    fps.innerHTML = Math.round(1000/(performance.now()-time))+" fps";
    window.requestAnimationFrame(update);
}

function draw(){
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let aspect_ratio = gl.canvas.width/gl.canvas.height;
    let p = perspective_projection(rad(main_camera.fov),
        aspect_ratio,
        main_camera.near_plane,
        main_camera.far_plane);
    let x = main_camera.rotation[0];
    let y = main_camera.rotation[1];
    let forward = [
        Math.cos(x)*Math.cos(y),
        Math.sin(y),
        Math.sin(x)*Math.cos(y)
    ];

    let v = lookat_matrix(main_camera.position, vec3_add(main_camera.position, forward), [0, 1, 0]);
    for(let i = 0; i < renderables.length; i++){
        let renderable = objects[renderables[i]];
        last_used_resources = renderable.draw(v, p, last_used_resources);
    }

    gl.disable(gl.DEPTH_TEST);
    for(let i = 0; i < renderables_2d.length; i++){
        let renderable_2d = objects[renderables_2d[i]];
        last_used_resources = renderable_2d.draw(canvas.width, canvas.height, last_used_resources);
    }
}

function init(){
    resize_canvas();
    mouse_pos[0] = canvas.width/2-cursor_object.transform2D.scale[0];
    mouse_pos[1] = canvas.height/2-cursor_object.transform2D.scale[1];
    update();
}

function resize_canvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("keydown", function(e){
    keyboard[e.key] = true;
});

window.addEventListener("keyup", function(e){
    keyboard[e.key] = false;
});

window.addEventListener("mousemove", function(e){
    mouse_pos = [e.clientX, e.clientY];
});

window.addEventListener("mouseout", function(e){
    mouse_pos = [e.clientX, e.clientY];
});

document.addEventListener("blur", function(e){
    keyboard = {};
});

window.addEventListener("wheel", function(e){
    main_camera.zoom += e.deltaY*0.001;
    main_camera.zoom = Math.max(0, main_camera.zoom);
    main_camera.zoom = Math.min(1, main_camera.zoom);
    main_camera.position[1] = lerp(
        main_camera.zoomed_y,
        main_camera.unzoomed_y,
        main_camera.zoom);
    main_camera.rotation[1] = lerp(
        main_camera.zoomed_angle,
        main_camera.unzoomed_angle,
        main_camera.zoom);
});

window.addEventListener("contextmenu", function(e){
    e.preventDefault()
});

window.addEventListener("resize", resize_canvas, false);