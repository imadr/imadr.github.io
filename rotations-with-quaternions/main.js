let canvas1 = document.getElementById("canvas1");
let gl1 = canvas1.getContext("webgl2");
canvas1.width = 530;
canvas1.height = 280;

let canvas2 = document.getElementById("canvas2");
let gl2 = canvas2.getContext("webgl2");
canvas2.height = 280;

window.addEventListener("resize", resize_canvas);

function resize_canvas(){
    let padding = parseFloat(window.getComputedStyle(document.body).getPropertyValue("padding-left"))
    let width = parseFloat(window.getComputedStyle(document.body).width);
    width -= padding*2;
    width = Math.min(530, width);
    canvas1.width = width;
    canvas2.width = width;
}

resize_canvas();

function cube_vertex_buffer(gl){
    let vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    let vertices = cube_vertex.slice();
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    return [vertex_buffer, vertices.length/3/2];
}

let objects_to_draw1 = [];
let objects_to_draw2 = [];

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

objects_to_draw1.push(JSON.parse(JSON.stringify(cube)));
objects_to_draw2.push(JSON.parse(JSON.stringify(cube)));

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
        gl.useProgram(objects_to_draw[i].shader.program);

        let m = mat4_identity();
        m = mat4_mat4_mul(translate_3d(objects_to_draw[i].transform.position), m);
        m = mat4_mat4_mul(rotate_3d(objects_to_draw[i].transform.rotation), m);
        m = mat4_mat4_mul(scale_3d(objects_to_draw[i].transform.scale), m);
        let mvp = mat4_identity();
        mvp = mat4_mat4_mul(m, mat4_mat4_mul(v, p));
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

        for(let i = 0; i < n_uniforms; i++){
            let uniform = gl.getActiveUniform(shader_program, i);
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

function demo(objects_to_draw, id){
    let slider = document.getElementById("slerp-slider"+id);
    let t_value = document.getElementById("t-value"+id);
    t_value.innerHTML = (Math.round(parseFloat(slider.value)*100)/100).toFixed(2);
    slider.addEventListener("input", function(e){
        clearInterval(demo_interval);
        update_lerp();
    });

    let demo_interval = null;
    let play = true;
    let demo_button = document.getElementById("play-demo"+id);

    function update_lerp(){
        if(id == 1){
            objects_to_draw[0].transform.rotation = bad_quat_slerp(start, end, parseFloat(slider.value));
        }
        else if(id == 2){
            objects_to_draw[0].transform.rotation = quat_slerp(start, end, parseFloat(slider.value));
        }
        t_value.innerHTML = (Math.round(parseFloat(slider.value)*100)/100).toFixed(2);
    }

    demo_button.onclick = function(){
        slider.value = 0;
        if(play){
            demo_interval = setInterval(function(){
                slider.value = parseFloat(slider.value)+0.002;
                update_lerp();
            }, 1);
        }
        else{
            clearInterval(demo_interval);
            update_lerp();
        }
        play = !play;
        demo_button.innerHTML = play ? "Play" : "Reset";
    };
}

demo(objects_to_draw1, 1);
demo(objects_to_draw2, 2);

function update(){
    draw(gl1, main_camera, objects_to_draw1);
    draw(gl2, main_camera, objects_to_draw2);
    window.requestAnimationFrame(update);
}

init(gl1, objects_to_draw1);
init(gl2, objects_to_draw2);
update();