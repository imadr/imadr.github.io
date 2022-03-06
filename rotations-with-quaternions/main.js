function cube_vertex_buffer(gl){
    let vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    let vertices = cube_vertex.slice();
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    return [vertex_buffer, vertices.length/3/2];
}

let start = euler_to_quat([0, -Math.PI-Math.PI/2, 0]);
let end = euler_to_quat([0, 0, 0]);

let cube = {
    vertex_shader_path: "shaders/simple_vertex.glsl",
    fragment_shader_path: "shaders/simple_fragment.glsl",
    transform: {
        position: [0, 0, 0],
        scale: [1, 1, 1],
        rotation: start
    },
    shader: {
        program: null,
        uniforms: {}
    },
    vertex_count: null,
    vao: null,
};

let main_camera = {
    fov: 60,
    near_plane: 0.1,
    far_plane: 1000,
    position: [0, 1.5, -4],
    rotation: [Math.PI/2, -Math.PI/8, 0]
};

function draw(gl, camera, objects_to_draw){
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let aspect_ratio = gl.canvas.width/gl.canvas.height;
    let p = perspective_projection(rad(camera.fov),
                                aspect_ratio,
                                camera.near_plane,
                                camera.far_plane);

    let x = camera.rotation[0];
    let y = camera.rotation[1];
    let forward = [
        Math.cos(x)*Math.cos(y),
        Math.sin(y),
        Math.sin(x)*Math.cos(y)
    ];

    let v = lookat_matrix(camera.position, vec3_add(camera.position, forward), [0, 1, 0]);

    for(let i = 0; i < objects_to_draw.length; i++){
        let m = mat4_identity();
        m = mat4_mat4_mul(translate_3d(objects_to_draw[i].transform.position), m);
        m = mat4_mat4_mul(rotate_3d(objects_to_draw[i].transform.rotation), m);
        m = mat4_mat4_mul(scale_3d(objects_to_draw[i].transform.scale), m);
        let mvp = mat4_identity();
        mvp = mat4_mat4_mul(m, mat4_mat4_mul(v, p));
        gl.useProgram(objects_to_draw[i].shader.program);
        set_shader_uniform(gl, objects_to_draw[i].shader, "mvp", mvp);

        gl.bindVertexArray(objects_to_draw[i].vao);
        gl.drawArrays(gl.TRIANGLES, 0, objects_to_draw[i].vertex_count);
    }
}

let simple_vertex = `#version 300 es

layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec3 color_attrib;

uniform mat4 mvp;

out vec3 color;
out vec3 position;

void main(){
    gl_Position = mvp*vec4(position_attrib, 1);
    color = color_attrib;
    position = position_attrib;
}`;

let simple_fragment = `#version 300 es
precision highp float;

out vec4 frag_color;

in vec3 position;
in vec3 color;

void main(){
    frag_color = vec4(color, 1);
}`;

function init(gl, objects_to_draw){
    for(let i = 0; i < objects_to_draw.length; i++){
        let shader_program = link_shader_program(gl, simple_vertex, simple_fragment);
        objects_to_draw[i].shader.program = shader_program;
        let n_uniforms = gl.getProgramParameter(shader_program, gl.ACTIVE_UNIFORMS);

        for(let j = 0; j < n_uniforms; j++){
            let uniform = gl.getActiveUniform(shader_program, j);
            objects_to_draw[i].shader.uniforms[uniform["name"]] = {
                type: uniform["type"],
                location: gl.getUniformLocation(shader_program, uniform["name"])
            };
        }

        let vao = gl.createVertexArray();
        objects_to_draw[i].vao = vao;
        gl.bindVertexArray(vao);

        let vertex_buffer = cube_vertex_buffer(gl);
        objects_to_draw[i].vertex_count = vertex_buffer[1];

        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer[0]);
        let position_attrib_location = gl.getAttribLocation(shader_program, "position_attrib");
        gl.enableVertexAttribArray(position_attrib_location);
        gl.vertexAttribPointer(position_attrib_location, 3, gl.FLOAT, false,
                                6*Float32Array.BYTES_PER_ELEMENT, 0);
        let color_attrib_location = gl.getAttribLocation(shader_program, "color_attrib");
        gl.enableVertexAttribArray(color_attrib_location);
        gl.vertexAttribPointer(color_attrib_location, 3, gl.FLOAT, false,
                                6*Float32Array.BYTES_PER_ELEMENT, 3*Float32Array.BYTES_PER_ELEMENT);
    }
}

function demo(i){
    let slider = document.getElementById("slerp-slider-"+canvas_id[i]);
    let t_value = document.getElementById("t-value-"+canvas_id[i]);
    t_value.innerHTML = (Math.round(parseFloat(slider.value)*100)/100).toFixed(2);
    slider.addEventListener("input", function(e){
        clearInterval(demo_interval);
        update_lerp(i);
    });

    let demo_interval = null;
    let play = true;
    let demo_button = document.getElementById("play-demo-"+canvas_id[i]);

    function update_lerp(i){
        if(canvas_id[i] == "lerp"){
            objects_to_draw[i][0].transform.rotation = bad_quat_slerp(start, end, parseFloat(slider.value));
        }
        else if(canvas_id[i] == "lerp-fixed"){
            objects_to_draw[i][0].transform.rotation = quat_slerp(start, end, parseFloat(slider.value));
        }
        t_value.innerHTML = (Math.round(parseFloat(slider.value)*100)/100).toFixed(2);
        update();
    }

    demo_button.onclick = function(){
        slider.value = 0;
        if(play){
            demo_interval = setInterval(function(){
                slider.value = parseFloat(slider.value)+0.002;
                update_lerp(i);
            }, 1);
        }
        else{
            clearInterval(demo_interval);
            update_lerp(i);
        }
        play = !play;
        demo_button.innerHTML = play ? "Play" : "Reset";
    };
}

// quick and dirty
function input_parse(id){
    return eval(document.getElementById(id).value.replace("π", "Math.PI"));
}

function demo_mult(i){
    let rot1 = euler_to_quat([input_parse("rot1-0"), input_parse("rot1-1"), input_parse("rot1-2")]);
    let rot2 = euler_to_quat([input_parse("rot2-0"), input_parse("rot2-1"), input_parse("rot2-2")]);
    objects_to_draw[i][0].transform.rotation = quat_mul(quat_mul(rot1, rot2), quat_id());
    update();
}

let canvases = [];
let gl = [];
let objects_to_draw = [];

let canvas_id = ["mult", "lerp", "lerp-fixed"];

for(let i = 0; i < canvas_id.length; i++){
    let canvas = document.getElementById("canvas-"+canvas_id[i]);
    canvas.width = 530;
    canvas.height = 280;
    canvases.push(canvas);
    gl.push(canvas.getContext("webgl2"));

    objects_to_draw.push([JSON.parse(JSON.stringify(cube))]);
    init(gl[i], objects_to_draw[i]);

    switch(canvas_id[i]){
        case "lerp":
        case "lerp-fixed":
            demo(i);
            break;
        case "mult":
            demo_mult(i);
    }
}

for(let j = 1; j <= 2; j++){
    for(let i = 0; i < 3; i++){
        (function(i, j){
            document.getElementById("rot"+j+"-"+i).addEventListener("input", function(){
                demo_mult(0);
            });
        })(i, j);
    }
}

function update(){
    for(let i = 0; i < gl.length; i++){
        draw(gl[i], main_camera, objects_to_draw[i]);
    }
}

function resize_canvas(){
    let padding = parseFloat(window.getComputedStyle(document.body).getPropertyValue("padding-left"))
    let width = parseFloat(window.getComputedStyle(document.body).width);
    width -= padding*2;
    width = Math.min(530, width);
    for(let i = 0; i < canvases.length; i++){
        canvases[i].width = width;
    }
    update();
}
window.addEventListener("resize", resize_canvas);
resize_canvas();