let assets_to_load = [
    {name: "test_shader", path: ["assets/shaders/test.vert", "assets/shaders/test.frag"], type: "asset_shader"},
    {name: "teapot_mesh", path: "assets/meshes/teapot.mesh", type: "asset_mesh"},
    {name: "grid_shader", path: ["assets/shaders/grid.vert", "assets/shaders/grid.frag"], type: "asset_shader"},
    {name: "plane_mesh", path: "assets/meshes/plane.mesh", type: "asset_mesh"},
    {name: "axis_mesh", path: "assets/meshes/axis.mesh", type: "asset_mesh"},
    {name: "axis_shader", path: ["assets/shaders/axis.vert", "assets/shaders/axis.frag"], type: "asset_shader"},
];
let assets = {};
let objects = {
    "teapot": {
        type: "drawable",
        shader: "test_shader", mesh: "teapot_mesh",
        transform: {
            position: [0, 0.5, 0],
            scale: [1, 1, 1],
            rotation: quat_id()
        },
        cull_face: false
    },
    "grid": {
        type: "drawable",
        shader: "grid_shader", mesh: "plane_mesh",
        transform: {
            position: [0, 0, 0],
            scale: [1, 1, 1],
            rotation: quat_id()
        },
        cull_face: false
    },
    "axis": {
        type: "drawable",
        shader: "axis_shader", mesh: "axis_mesh",
        transform: {
            position: [0, 0, 0],
            scale: [1, 1, 1],
            rotation: quat_id()
        },
        cull_face: false,
        depth_func: false,
        primitive: "lines"
    },
    "camera": {
        type: "camera",
        fov: 60, near_plane: 0.1, far_plane: 1000,
        position: [0, 0, 0], target: [0, 0, 0],
        rotation: [0, 0, 0], up_vector: [0, 1, 0]
    }
};

let gl_canvas = document.getElementById("canvas");
let gl = gl_canvas.getContext("webgl2");

load_assets_and_objects(gl, assets_to_load, assets, objects, init);

function resize_canvas(){
    gl_canvas.width = document.documentElement.clientWidth;
    gl_canvas.height = document.documentElement.clientHeight;
    update_camera_projection_matrix(gl, objects["camera"]);
}

function init(){
    window.addEventListener("resize", resize_canvas);
    resize_canvas();
    update_camera_projection_matrix(gl, objects["camera"]);
    // update_camera_view_matrix(gl, objects["camera"]);
    update_camera_orbit(gl, objects["camera"]);
    update();
}

function update(){
    gl.viewport(0, 0, gl_canvas.width, gl_canvas.height);
    gl.clearColor(0.08, 0.07, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    update_camera_projection_matrix(gl, objects["camera"]);

    draw(gl, objects["teapot"], objects["camera"]);
    draw(gl, objects["grid"], objects["camera"]);

    gl.viewport(0, 0, 100, 100);
    objects["camera"].projection_matrix = perspective_projection(rad(50),
                                1,
                                0,
                                1);
    draw(gl, objects["axis"], objects["camera"]);

    window.requestAnimationFrame(update);
}

let last_mouse = [];
let dragging = false;
document.addEventListener("mousedown", function(e){
    if(e.which == 1){
        last_mouse = [e.clientX, e.clientY];
        dragging = true;
    }
});

document.body.addEventListener("contextmenu", function(e){
    e.preventDefault();
});

document.addEventListener("mouseup", function(e){
    dragging = false;
});

document.addEventListener("mousemove", function(e){
    if(dragging){
        let current_mouse = [e.clientX, e.clientY];
        let mouse_delta = vec2_sub(current_mouse, last_mouse);
        let delta_angle = [2*Math.PI/gl_canvas.width, Math.PI/gl_canvas.height];
        objects["camera"].orbit.angle = vec2_sub(objects["camera"].orbit.angle, vec2_hadamard(mouse_delta, delta_angle));
        objects["camera"].orbit.angle[1] = Math.max(objects["camera"].orbit.angle[1], 0.0001);
        objects["camera"].orbit.angle[1] = Math.min(objects["camera"].orbit.angle[1], Math.PI-0.0001);
        update_camera_orbit(gl, objects["camera"]);
        last_mouse = [e.clientX, e.clientY];
    }
});

document.addEventListener("wheel", function(e){
    let delta = 0;
    if(Math.abs(e.deltaY) != 0){
        delta = e.deltaY/Math.abs(e.deltaY)/10;
    }
    objects["camera"].orbit.zoom += delta;
    update_camera_orbit(gl, objects["camera"]);
});