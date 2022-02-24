let canvas = document.getElementById("canvas");
let gl = canvas.getContext("webgl2");
canvas.width = document.body.offsetWidth;
canvas.height = 300;

let camera = {
    fov: 60,
    near_plane: 0.1,
    far_plane: 1000,
    position: [0, 1.5, 2.5],
};

let vertex_shader = `#version 300 es

layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec3 normal_attrib;

uniform mat4 mvp;

out vec3 position;
out vec3 normal;

float z0 = -2.;
float z1 = 2.;

float max_angle = 9.;

float r(float z){
    if(z < z0){
        return 0.;
    }
    else if(z >= z0 && z <= z1){
        return (z-z0)/(z1-z0)*max_angle;
    }
    else if(z > z1){
        return max_angle;
    }
}

void main(){
    // float z = position_attrib.z;
    // mat3 twist = mat3(
    //     cos(r(z)), sin(r(z)), 0,
    //     -sin(r(z)), cos(r(z)), 0,
    //     0, 0, 1
    // );

    gl_Position = mvp*vec4(position_attrib, 1);
    normal = normal_attrib;
    position = position_attrib;
}`;

let fragment_shader = `#version 300 es
precision highp float;

out vec4 frag_color;

in vec3 position;
in vec3 normal;

void main(){
    frag_color = vec4(normal, 1);
}`;

let shader = {
    program: link_shader_program(gl, vertex_shader, fragment_shader),
    uniforms: {}
};

let n_uniforms = gl.getProgramParameter(shader.program, gl.ACTIVE_UNIFORMS);
for(let i = 0; i < n_uniforms; i++){
    let uniform = gl.getActiveUniform(shader.program, i);
    shader.uniforms[uniform["name"]] = {
        type: uniform["type"],
        location: gl.getUniformLocation(shader.program, uniform["name"])
    };
}

let vao = gl.createVertexArray();
gl.bindVertexArray(vao);

let vertex_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

let major_radius = 1.5;
let minor_radius = 0.7;
let center = [0, 0, 0];
let major_segments = 30;
let minor_segments = 30;

let position = [];
let normals = [];

for(let i = 0; i < major_segments; i++){
    let major_angle = 2*Math.PI/major_segments*i;
    let major_pos = vec3_add(center, vec3_scale([
        Math.cos(major_angle), 0, Math.sin(major_angle)], major_radius));
    let direction = vec3_normalize(vec3_sub(major_pos, center));
    for(let j = 0; j < minor_segments; j++){
        let minor_angle = 2*Math.PI/minor_segments*j;

        let minor_pos = vec3_add(major_pos,
            vec3_add(vec3_scale(direction, Math.cos(minor_angle)*minor_radius),
                vec3_scale([0, 1, 0], Math.sin(minor_angle)*minor_radius)));
        position.push(minor_pos);
        normals.push([0, 0, 0]);
    }
}

let indices = [];
for(let j = 0; j < major_segments; j++){
    for(let i = 0; i < minor_segments; i++){
        let j_ = (j-1)*minor_segments;
        if(j_ < 0) j_ += major_segments*minor_segments;
        let i_ = i+1;
        if(i_ >= minor_segments) i_ -= minor_segments;
        indices.push(i+j*minor_segments);
        indices.push(i_+j*minor_segments);
        indices.push(i+j_);
        indices.push(i+j_);
        indices.push(i_+j*minor_segments);
        indices.push(i_+j_);
    }
}

for(let i = 0; i < indices.length; i+=3){
    let a = position[indices[i]];
    let b = position[indices[i+1]];
    let c = position[indices[i+2]];
    let a_ = vec3_sub(c, b);
    let b_ = vec3_sub(a, b);
    let normal = vec3_normalize(vec3_cross(b_, a_));
    normals[indices[i]] = vec3_add(normals[indices[i]], normal);
    normals[indices[i+1]] = vec3_add(normals[indices[i+1]], normal);
    normals[indices[i+2]] = vec3_add(normals[indices[i+2]], normal);
}
for(let i = 0; i < normals.length; i++){
    normals[indices[i]] = vec3_normalize(normals[indices[i]]);
}

let vertices = [];
for(let i = 0; i < position.length; i++){
    vertices = vertices.concat(position[i].concat(normals[i]));
}

gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

let position_attrib_location = gl.getAttribLocation(shader.program, "position_attrib");
gl.enableVertexAttribArray(position_attrib_location);
gl.vertexAttribPointer(position_attrib_location, 3, gl.FLOAT, false,
                        6*Float32Array.BYTES_PER_ELEMENT, 0);
let normal_attrib_location = gl.getAttribLocation(shader.program, "normal_attrib");
gl.enableVertexAttribArray(normal_attrib_location);
gl.vertexAttribPointer(normal_attrib_location, 3, gl.FLOAT, false,
                        6*Float32Array.BYTES_PER_ELEMENT, 3*Float32Array.BYTES_PER_ELEMENT);

let index_buffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

class Line{
    constructor(gl, from, to, color){
        this.gl = gl;
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        let vertex_shader = `#version 300 es

        layout(location = 0) in vec3 position_attrib;

        uniform mat4 vp;

        void main(){
            gl_Position = vp*vec4(position_attrib, 1);
        }`;

        let fragment_shader = `#version 300 es
        precision highp float;

        out vec4 frag_color;

        void main(){
            frag_color = vec4(`+color[0]+`, `+color[1]+`, `+color[2]+`, 1);
        }`;

        this.shader = {
            program: link_shader_program(gl, vertex_shader, fragment_shader),
            uniforms: {}
        };

        let n_uniforms = gl.getProgramParameter(this.shader.program, gl.ACTIVE_UNIFORMS);
        for(let i = 0; i < n_uniforms; i++){
            let uniform = gl.getActiveUniform(this.shader.program, i);
            this.shader.uniforms[uniform["name"]] = {
                type: uniform["type"],
                location: gl.getUniformLocation(this.shader.program, uniform["name"])
            };
        }

        let vertex_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(from.concat(to)), gl.STATIC_DRAW);
        let position_attrib_location = gl.getAttribLocation(shader.program, "position_attrib");
        gl.enableVertexAttribArray(position_attrib_location);
        gl.vertexAttribPointer(position_attrib_location, 3, gl.FLOAT, false,
                                3*Float32Array.BYTES_PER_ELEMENT, 0);
    }

    draw(vp){
        gl.disable(gl.DEPTH_TEST);
        this.gl.useProgram(this.shader.program);
        set_shader_uniform(this.gl, this.shader, "vp", vp);
        this.gl.bindVertexArray(this.vao);
        this.gl.drawArrays(gl.LINES, 0, 2);
        gl.enable(gl.DEPTH_TEST);
    }
}

let line_x = new Line(gl, [0, 0, 0], [1, 0, 0], [1, 0, 0]);
let line_y = new Line(gl, [0, 0, 0], [0, 1, 0], [0, 1, 0]);
let line_z = new Line(gl, [0, 0, 0], [0, 0, 1], [0, 0, 1]);

let rot = 0;
function draw(){
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let aspect_ratio = gl.canvas.width/gl.canvas.height;
    let p = perspective_projection(rad(camera.fov),
                                aspect_ratio,
                                camera.near_plane,
                                camera.far_plane);

    let v = lookat_matrix(camera.position, [0, 0, 0], [0, 1, 0]);

    gl.useProgram(shader.program);

    let m = mat4_identity();
    m = mat4_mat4_mul(translate_3d([0, 0, 0]), m);
    m = mat4_mat4_mul(rotate_3d(euler_to_quat([0, 0, 0])), m);
    rot += 0.01;
    m = mat4_mat4_mul(scale_3d([0.5, 0.5, 0.5]), m);
    let mvp = mat4_identity();
    let vp = mat4_mat4_mul(v, p);
    mvp = mat4_mat4_mul(m, vp);
    set_shader_uniform(gl, shader, "mvp", mvp);

    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    window.requestAnimationFrame(draw);

    line_x.draw(vp);
    line_y.draw(vp);
    line_z.draw(vp);
}

draw();

let mouse_down = false;
let previous_mouse_pos = [0, 0];
let camera_angle = [0, 0];

canvas.addEventListener("mousedown", function(e){
    let rect = e.target.getBoundingClientRect();
    let x = e.clientX-rect.left;
    let y = e.clientY-rect.top;
    previous_mouse_pos = [x, y];
    mouse_down = true;
});
canvas.addEventListener("mouseup", function(e){
    let rect = e.target.getBoundingClientRect();
    let x = e.clientX-rect.left;
    let y = e.clientY-rect.top;
    previous_mouse_pos = [x, y];
    mouse_down = false;
});
canvas.addEventListener("mousemove", function(e){
    if(mouse_down){
        let rect = e.target.getBoundingClientRect();
        let x = e.clientX-rect.left;
        let y = e.clientY-rect.top;
        camera_angle[0] = (previous_mouse_pos[0]-x)*2*Math.PI*canvas.width;
        camera_angle[1] = (previous_mouse_pos[1]-y)*Math.PI*canvas.height;
        let new_pos = [
            Math.cos(camera_angle[0]),
            Math.cos(camera_angle[1]),
            // Math.sqrt(1-Math.pow(Math.cos(camera_angle[0]), 2)-Math.pow(Math.cos(camera_angle[1]), 2))
            0
        ];
        // console.log(1-Math.pow(Math.cos(camera_angle[0]), 2)-Math.pow(Math.cos(camera_angle[1]), 2))
        camera.position = new_pos;
        previous_mouse_pos = [x, y];
    }
});