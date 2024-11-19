function compile_shader(gl, shader_source, shader_type){
    let shader = gl.createShader(shader_type);
    gl.shaderSource(shader, shader_source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        console.error("couldn't compile shader: "+gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function link_shader_program(gl, vertex_shader_source, fragment_shader_source){
    let vertex_shader = compile_shader(gl, vertex_shader_source, gl.VERTEX_SHADER);
    if(vertex_shader == null) return null;

    let fragment_shader = compile_shader(gl, fragment_shader_source, gl.FRAGMENT_SHADER);
    if(fragment_shader == null) return null;


    let shader_program = gl.createProgram();
    gl.attachShader(shader_program, vertex_shader);
    gl.attachShader(shader_program, fragment_shader);

    gl.linkProgram(shader_program);
    if(!gl.getProgramParameter(shader_program, gl.LINK_STATUS)){
        console.error("couldn't link shader program: "+gl.getProgramInfoLog(shader_program));
        return null;
    }
    return shader_program;
}

function create_shader(gl, vertex_shader_source, fragment_shader_source){
    let program = link_shader_program(gl, vertex_shader_source, fragment_shader_source);
    if(program == null) return null;
    let shader = {
        program: program,
        uniforms: {},
        attributes: {}
    };

    let n_uniforms = gl.getProgramParameter(shader.program, gl.ACTIVE_UNIFORMS);
    for(let i = 0; i < n_uniforms; i++){
        let uniform = gl.getActiveUniform(shader.program, i);
        shader.uniforms[uniform["name"]] = {
            type: uniform["type"],
            location: gl.getUniformLocation(shader.program, uniform["name"])
        };
    }

    let n_attributes = gl.getProgramParameter(shader.program, gl.ACTIVE_ATTRIBUTES);
    for(let i = 0; i < n_attributes; i++){
        let attribute = gl.getActiveAttrib(shader.program, i);
        shader.attributes[attribute["name"]] = {
            type: attribute["type"],
            location: gl.getAttribLocation(shader.program, attribute["name"])
        };
    }
    return shader;
}

function set_shader_uniform(gl, shader, uniform, value){
    gl.useProgram(shader.program);
    if(!shader.uniforms.hasOwnProperty(uniform)) return;
    switch(shader.uniforms[uniform].type){
        case gl.UNSIGNED_INT:
            gl.uniform1ui(shader.uniforms[uniform].location, value);
            break;
        case gl.FLOAT:
            gl.uniform1f(shader.uniforms[uniform].location, value);
            break;
        case gl.FLOAT_VEC2:
            gl.uniform2fv(shader.uniforms[uniform].location, value);
            break;
        case gl.FLOAT_VEC3:
            gl.uniform3fv(shader.uniforms[uniform].location, value);
            break;
        case gl.FLOAT_VEC4:
            gl.uniform4fv(shader.uniforms[uniform].location, value);
            break;
        case gl.FLOAT_MAT4:
            gl.uniformMatrix4fv(shader.uniforms[uniform].location, false, value);
            break;
        default:
            console.error("set_shader_uniform: unknown uniform type");
    }
}

function create_vertex_buffer(gl, vertices, attributes, indices){
    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    let vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    let attribs_stride = 0;
    for(let attribute of attributes){
        attribs_stride += attribute.size;
    }

    let attrib_offset = 0;
    for(const [i, attribute] of attributes.entries()){
        gl.vertexAttribPointer(i, attribute.size, gl.FLOAT, false,
                               attribs_stride*Float32Array.BYTES_PER_ELEMENT,
                               attrib_offset*Float32Array.BYTES_PER_ELEMENT);
        attrib_offset += attribute.size;
        gl.enableVertexAttribArray(i);
    }

    let index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    draw_count = indices.length;

    return {vao: vao, vbo: vertex_buffer, draw_count: draw_count, vertices: vertices, indices: indices};
}

function update_camera_projection_matrix(aspect_ratio, camera){
    let projection_matrix = perspective_projection(rad(camera.fov),
                                aspect_ratio,
                                camera.z_near,
                                camera.z_far);
    camera.projection_matrix = projection_matrix;
}

function update_camera_orbit(camera){
    let m = mat4_identity();
        m = mat4_mat4_mul(translate_3d(camera.orbit.pivot), m);
        m = mat4_mat4_mul(rotate_3d(euler_to_quat(camera.orbit.rotation)), m);
        m = mat4_mat4_mul(translate_3d([0, 0, camera.orbit.zoom]), m);
    camera.position = vec4_mat4_mul([0, 0, 0, 1], m).slice(0, 3);
    camera.view_matrix = mat4_invert(m);
}

let canvas = document.getElementById("canvas");
canvas.width = 500;
canvas.height = 300;
let gl = canvas.getContext("webgl2");

let shader = create_shader(gl, `#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec3 normal_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec3 normal;

void main(){
    gl_Position = p*v*m*vec4(position_attrib, 1);
    position = position_attrib;
    normal = normal_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec3 color;

out vec4 frag_color;

in vec3 position;
in vec3 normal;

void main(){
    frag_color = vec4(color, 1);
}`);

let main_camera = {
    fov: 40, z_near: 0.1, z_far: 1000,
    position: [0, 0, 3], rotation: [0, 0, 0],
    up_vector: [0, 1, 0],
    view_matrix: mat4_identity(),
    orbit: {
        rotation: [0, 0, 0],
        pivot: [0, 0, 0],
        zoom: 3
    }
};

function line_intersection(p1, p2, p3, p4) {
    let a1 = p2[1] - p1[1];
    let b1 = p1[0] - p2[0];
    let c1 = a1 * p1[0] + b1 * p1[1];

    let a2 = p4[1] - p3[1];
    let b2 = p3[0] - p4[0];
    let c2 = a2 * p3[0] + b2 * p3[1];

    let determinant = a1 * b2 - a2 * b1;

    if (determinant === 0) return null;

    let x = (b2 * c1 - b1 * c2) / determinant;
    let y = (a1 * c2 - a2 * c1) / determinant;

    return [x, y];
}

function create_line(gl, points, thickness) {
    thickness /= 2;
    let vertices = [];
    let indices = [];

    for (let i = 1; i < points.length - 2; i++) {
        let p1 = points[i - 1];
        let p2 = points[i];
        let p3 = points[i + 1];

        let dx = p2[0] - p1[0];
        let dy = p2[1] - p1[1];
        let length = Math.sqrt(dx * dx + dy * dy);
        let offset_x = (dy / length) * thickness;
        let offset_y = -(dx / length) * thickness;

        let lower_left =  [p1[0] + offset_x, p1[1] + offset_y, p1[2]];
        let upper_left =  [p1[0] - offset_x, p1[1] - offset_y, p1[2]];
        let lower_right = [p2[0] + offset_x, p2[1] + offset_y, p2[2]];
        let upper_right = [p2[0] - offset_x, p2[1] - offset_y, p2[2]];

        vertices.push(...[...verts[i], 0, 0, 1]);
        vertices.push(...[...verts[i+1], 0, 0, 1]);
        vertices.push(...[...verts[i+2], 0, 0, 1]);
        vertices.push(...[...verts[i+3], 0, 0, 1]);
        indices.push(
            i, i + 1, i + 2,
            i + 1, i + 3, i + 2
        );
    }

    return create_vertex_buffer(gl, vertices, [
        { name: 'position_attrib', size: 3 },
        { name: 'normal_attrib', size: 3 }
    ], indices);
}


let points = [];
let numPoints = 19;
let radius = 0.5;
let angleIncrement = -Math.PI / 8; // controls how tightly the spiral curves

for (let i = 0; i < numPoints; i++) {
    let angle = i * angleIncrement;
    let x = Math.cos(angle) * radius;
    let y = Math.sin(angle) * radius;
    points.push([x+1.0, y, 0]);
    radius += 0.01; // gradually expand the spiral outwards
}

// let rectangle = create_line(gl, points, 0.3);
let rectangle = create_line(gl, [[0, 0], [1.3, 0.0], [2.5, 0.7], [3.0, -0.7]], 0.5);
// let rectangle = create_line(gl, [[0, 0, 0], [1.3, 0.5, 0], [2.5, -0.4, 0]], 0.5);
// let rectangle = create_line(gl, [[0, 0, 0], [1.0, 0, 0], [2.0, 0.5, 0], [2.5, 0.5, 0], [3.0, -0.5, 0]], 0.4);

update_camera_projection_matrix(canvas.width/gl.canvas.height, main_camera);
update_camera_orbit(main_camera);


let line_indices = [];
let cloned_indices = [...rectangle.indices];
for (let i = 0; i < cloned_indices.length; i += 3) {
    line_indices.push(cloned_indices[i], cloned_indices[i + 1]);
    line_indices.push(cloned_indices[i + 1], cloned_indices[i + 2]);
    line_indices.push(cloned_indices[i + 2], cloned_indices[i]);
}
let rectangle_wireframe = create_vertex_buffer(gl, rectangle.vertices, [{ name: 'position_attrib', size: 3 },
    { name: 'normal_attrib', size: 3 }], line_indices);

// line_indices = [];
// cloned_indices = [...rectangle2.indices];
// for (let i = 0; i < cloned_indices.length; i += 3) {
//     line_indices.push(cloned_indices[i], cloned_indices[i + 1]);
//     line_indices.push(cloned_indices[i + 1], cloned_indices[i + 2]);
//     line_indices.push(cloned_indices[i + 2], cloned_indices[i]);
// }
// let rectangle2_wireframe = create_vertex_buffer(gl, rectangle2.vertices, [{ name: 'position_attrib', size: 3 },
//     { name: 'normal_attrib', size: 3 }], line_indices);


function update(now) {

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);

    gl.useProgram(shader.program);

    set_shader_uniform(gl, shader, "p", main_camera.projection_matrix);
    set_shader_uniform(gl, shader, "v", main_camera.view_matrix);

    set_shader_uniform(gl, shader, "color", [1, 0, 1]);

    set_shader_uniform(gl, shader, "m", mat4_mat4_mul(translate_3d([-1.5, 0, 0]), mat4_identity()));
    gl.bindVertexArray(rectangle.vao);
    gl.drawElements(gl.TRIANGLES , rectangle.draw_count, gl.UNSIGNED_SHORT, 0);

    // set_shader_uniform(gl, shader, "m", mat4_mat4_mul(translate_3d([0.5, 0, 0]), mat4_identity()));
    // gl.bindVertexArray(rectangle2.vao);
    // gl.drawElements(gl.TRIANGLES , rectangle2.draw_count, gl.UNSIGNED_SHORT, 0);

    set_shader_uniform(gl, shader, "color", [0, 0, 1]);


    set_shader_uniform(gl, shader, "m", mat4_mat4_mul(translate_3d([-1.5, 0, 0]), mat4_identity()));
    gl.bindVertexArray(rectangle_wireframe.vao);
    gl.drawElements(gl.LINES , rectangle_wireframe.draw_count, gl.UNSIGNED_SHORT, 0);

    // set_shader_uniform(gl, shader, "m", mat4_mat4_mul(translate_3d([0.5, 0, 0]), mat4_identity()));
    // gl.bindVertexArray(rectangle2_wireframe.vao);
    // gl.drawElements(gl.LINES , rectangle2_wireframe.draw_count, gl.UNSIGNED_SHORT, 0);



    requestAnimationFrame(update);
}
requestAnimationFrame(update);


let last_mouse = [];
let dragging = false;
canvas.addEventListener("mousedown", function(e){
    if(e.which == 1){
        last_mouse = [e.clientX, e.clientY];
        dragging = true;
    }
});

canvas.addEventListener("mouseup", function(e){
    dragging = false;
});

document.addEventListener("mousemove", function(e){
    if(dragging){
        let current_mouse = [e.clientX, e.clientY];
        let mouse_delta = vec2_sub(last_mouse, current_mouse);
        let delta_angle = [2*Math.PI/canvas.width, Math.PI/canvas.height];
        main_camera.orbit.rotation = vec3_add(main_camera.orbit.rotation, [mouse_delta[1]*delta_angle[1], mouse_delta[0]*delta_angle[0], 0]);
        main_camera.orbit.rotation[0] = clamp(main_camera.orbit.rotation[0], -Math.PI/2, Math.PI/2);
        last_mouse = [e.clientX, e.clientY];

        update_camera_orbit(main_camera);
    }
});