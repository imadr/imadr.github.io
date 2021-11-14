let canvas = document.getElementById("canvas");
let gl = canvas.getContext("webgl2");

let keyboard = {};

let camera_move_speed = 0.2;

let main_camera = {
    fov: 90,
    near_plane: 0.1,
    far_plane: 10000,
    position: [0, 10, -4],
    rotation: [Math.PI/2, -Math.PI/4, 0]
};

let assets = [
    {path: "assets/shaders/test_vertex.glsl", type: ASSET_VERTEX_SHADER, content: null},
    {path: "assets/shaders/test_fragment.glsl", type: ASSET_FRAGMENT_SHADER, content: null},
    {path: "assets/meshes/plane.json", type: ASSET_MESH, content: null},
    {path: "assets/img/cursor.png", type: ASSET_IMG, content: null},
    {path: "assets/shaders/ui_vertex.glsl", type: ASSET_VERTEX_SHADER, content: null},
    {path: "assets/shaders/ui_fragment.glsl", type: ASSET_FRAGMENT_SHADER, content: null},
    {path: "assets/meshes/plane_2d.json", type: ASSET_MESH, content: null},
];

let objects = [
    {type: OBJECT_SHADER, vertex_asset_id: 0, fragment_asset_id: 1},
    {type: OBJECT_MESH, mesh_asset_id: 2, shader_object_id: 0},
    {type: OBJECT_RENDERABLE, transform: {
            position: [0, 0, 0],
            scale: [1, 1, 1],
            rotation: quat_id()
        }, mesh_object_id: 1},
    {type: OBJECT_SHADER, vertex_asset_id: 4, fragment_asset_id: 5},
    {type: OBJECT_MESH, mesh_asset_id: 6, shader_object_id: 3},
    {type: OBJECT_RENDERABLE2D, transform2D: {
            position: [0, 0],
            scale: [50, 50],
            rotation: 0
        }, img_asset_id: 3, mesh_object_id: 4},
        {type: OBJECT_RENDERABLE, transform: {
            position: [2, 0, 0],
            scale: [1, 1, 1],
            rotation: quat_id()
        }, mesh_object_id: 1},
                {type: OBJECT_RENDERABLE, transform: {
            position: [2, 0, 2],
            scale: [1, 1, 1],
            rotation: quat_id()
        }, mesh_object_id: 1},
];

let renderables = [];
let renderables_2d = [];

window.onload = (async function(){
    // load assets
    for(let asset of assets){
        let res = await fetch(asset.path);
        if(asset.type == ASSET_MESH){
            asset.content = await res.json();
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
                assets[object.fragment_asset_id].content);
        }
        else if(object.type == OBJECT_MESH){
            objects[i] = new Mesh(gl, assets[object.mesh_asset_id].content,
                objects[object.shader_object_id]);
        }
        else if(object.type == OBJECT_RENDERABLE){
            objects[i] = new Renderable(gl, object.transform, objects[object.mesh_object_id]);
            renderables.push(i);
        }
        else if(object.type == OBJECT_RENDERABLE2D){
            objects[i] = new Renderable2D(gl, object.transform2D, objects[object.mesh_object_id],
                assets[object.img_asset_id].content);
            renderables_2d.push(i);
        }
    }

    init();
})();

function handle_input(){
    if(keyboard["w"]) main_camera.position[2] += camera_move_speed;
    if(keyboard["s"]) main_camera.position[2] -= camera_move_speed;
    if(keyboard["d"]) main_camera.position[0] += camera_move_speed;
    if(keyboard["a"]) main_camera.position[0] -= camera_move_speed;
}

function update(){
    handle_input();
    draw();
    window.requestAnimationFrame(update);
}

function draw(){
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
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
        renderable.draw(v, p);
    }

    gl.disable(gl.DEPTH_TEST);
    for(let i = 0; i < renderables_2d.length; i++){
        let renderable_2d = objects[renderables_2d[i]];
        renderable_2d.draw(canvas.width, canvas.height);
    }
}

function init(){
    resize_canvas();
    objects[5].transform2D.position[0] = canvas.width/2-objects[5].transform2D.scale[0];
    objects[5].transform2D.position[1] = canvas.height/2-objects[5].transform2D.scale[1];
    update();
}

function resize_canvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.onclick = function(){
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.requestPointerLock();
}

let pointer_locked = false;
document.addEventListener("pointerlockchange", function(e){
    if(document.pointerLockElement === canvas){
        pointer_locked = true;
    }
    else{
        pointer_locked = false;
    }
}, false);

window.addEventListener("keydown", function(e){
    keyboard[e.key] = true;
});

window.addEventListener("keyup", function(e){
    keyboard[e.key] = false;
});

window.addEventListener("mousemove", function(e){
    if(!pointer_locked) return;
    let move_x = e.movementX;
    let move_y = e.movementY;
    if(navigator.userAgent.toLowerCase().indexOf("firefox") > -1){
        if(move_x == -1) move_x = 0;
        if(move_y == -1) move_y = 0;
    }
    objects[5].transform2D.position[0] += move_x;
    objects[5].transform2D.position[1] += move_y;
    if(objects[5].transform2D.position[0] <= 0) main_camera.position[0] -= camera_move_speed;
    if(objects[5].transform2D.position[0] >= canvas.width) main_camera.position[0] += camera_move_speed;
    if(objects[5].transform2D.position[1] <= 0) main_camera.position[2] += camera_move_speed;
    if(objects[5].transform2D.position[1] >= canvas.height) main_camera.position[2] -= camera_move_speed;
    objects[5].transform2D.position[0] = Math.max(0, objects[5].transform2D.position[0]);
    objects[5].transform2D.position[0] = Math.min(canvas.width, objects[5].transform2D.position[0]);
    objects[5].transform2D.position[1] = Math.max(0, objects[5].transform2D.position[1]);
    objects[5].transform2D.position[1] = Math.min(canvas.height, objects[5].transform2D.position[1]);
});


window.addEventListener("resize", resize_canvas, false);