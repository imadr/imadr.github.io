(function(){
let canvas = document.getElementById("canvas2");
let gl = canvas.getContext("webgl2");
canvas.width = 530;
canvas.height = 280;

let vertex_shader = `#version 300 es

layout(location = 0) in vec3 position_attrib;

out vec3 position;

void main(){
    gl_Position = vec4(position_attrib, 1);
    position = position_attrib;
}`;

let vertices = [
    -1, 1, 0,
    1, -1, 0,
    -1, -1, 0,

    -1, 1, 0,
    1, 1, 0,
    1, -1, 0
];

let shader_program, vao, vertex_buffer;
let uniforms = {};

fetch("2.glsl").then(res => res.text()).then(text => {
    init(text);
});

function init(fragment_shader){
    shader_program = link_shader_program(gl, vertex_shader, fragment_shader);
    let n_uniforms = gl.getProgramParameter(shader_program, gl.ACTIVE_UNIFORMS);

    for(let i = 0; i < n_uniforms; i++){
        let uniform = gl.getActiveUniform(shader_program, i);
        uniforms[uniform["name"]] = {
            type: uniform["type"],
            location: gl.getUniformLocation(shader_program, uniform["name"])
        };
    }
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    let position_attrib_location = gl.getAttribLocation(shader_program, "position_attrib");
    gl.enableVertexAttribArray(position_attrib_location);
    gl.vertexAttribPointer(position_attrib_location, 3, gl.FLOAT, false, 3*Float32Array.BYTES_PER_ELEMENT, 0);
    update();
}

function update(){
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(shader_program);
    set_shader_uniform("aspect_ratio", gl.canvas.height/gl.canvas.width);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length/3);
    window.requestAnimationFrame(update);
}

function set_shader_uniform(uniform, value){
    if(!uniforms.hasOwnProperty(uniform)) return;
    switch(uniforms[uniform].type){
        case gl.FLOAT:
            gl.uniform1f(uniforms[uniform].location, value);
            break;
        case gl.FLOAT_VEC2:
            gl.uniform2fv(uniforms[uniform].location, value);
            break;
    }
}
})();