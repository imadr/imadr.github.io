let ctx = {};

ctx.compile_shader = function(shader_source, shader_type){
    const gl = this.gl;
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

ctx.link_shader_program = function(vertex_shader_source, fragment_shader_source){
    const gl = this.gl;
    let vertex_shader = this.compile_shader(vertex_shader_source, gl.VERTEX_SHADER);
    if(vertex_shader == null) return null;

    let fragment_shader = this.compile_shader(fragment_shader_source, gl.FRAGMENT_SHADER);
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

ctx.create_shader = function(vertex_shader_source, fragment_shader_source){
    const gl = this.gl;
    let program = this.link_shader_program(vertex_shader_source, fragment_shader_source);
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

ctx.set_shader_uniform = function(shader, uniform, value){
    const gl = this.gl;
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

ctx.create_vertex_buffer = function(vertices, attributes, indices){
    const gl = this.gl;
    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    let vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
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

    let ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.DYNAMIC_DRAW);
    draw_count = indices.length;

    return {vao: vao, vbo: vbo, ebo: ebo, draw_count: draw_count, vertices: vertices, indices: indices, attributes: attributes};
}

function update_camera_projection_matrix(camera, aspect_ratio){
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

function create_line(points, thickness, use_miter = true) {
    thickness /= 2;
    let vertices = [];
    let indices = [];
    let vertex_count = 0;

    if (points.length >= 2) {
        let p1 = points[0];
        let p2 = points[1];
        let dir = vec2_normalize(vec2_sub(p2, p1));
        let normal = [-dir[1], dir[0]];

        vertices.push(
            p1[0] + normal[0] * thickness, p1[1] + normal[1] * thickness, 0, 0, 0, 1,
            p1[0] - normal[0] * thickness, p1[1] - normal[1] * thickness, 0, 0, 0, 1
        );
        vertex_count += 2;
    }

    for (let i = 1; i < points.length - 1; i++) {
        let prev = points[i - 1];
        let curr = points[i];
        let next = points[i + 1];

        let dir1 = vec2_normalize(vec2_sub(curr, prev));
        let dir2 = vec2_normalize(vec2_sub(next, curr));
        let normal1 = [-dir1[1], dir1[0]];
        let normal2 = [-dir2[1], dir2[0]];

        if (use_miter) {
            let tangent = vec2_normalize(vec2_add(dir1, dir2));
            let miter = [-tangent[1], tangent[0]];
            let dot = normal1[0] * normal2[0] + normal1[1] * normal2[1];
            let miter_length = thickness / Math.sqrt((1 + dot) / 2);

            vertices.push(
                curr[0] + miter[0] * miter_length, curr[1] + miter[1] * miter_length, 0, 0, 0, 1,
                curr[0] - miter[0] * miter_length, curr[1] - miter[1] * miter_length, 0, 0, 0, 1
            );

            indices.push(
                vertex_count - 2, vertex_count - 1, vertex_count,
                vertex_count - 1, vertex_count + 1, vertex_count
            );

            vertex_count += 2;
        } else {
            vertices.push(
                curr[0] + normal1[0] * thickness, curr[1] + normal1[1] * thickness, 0, 0, 0, 1,
                curr[0] - normal1[0] * thickness, curr[1] - normal1[1] * thickness, 0, 0, 0, 1,
                curr[0] + normal2[0] * thickness, curr[1] + normal2[1] * thickness, 0, 0, 0, 1,
                curr[0] - normal2[0] * thickness, curr[1] - normal2[1] * thickness, 0, 0, 0, 1
            );

            indices.push(
                vertex_count - 2, vertex_count - 1, vertex_count,
                vertex_count - 1, vertex_count + 1, vertex_count,
                vertex_count, vertex_count + 1, vertex_count + 2,
                vertex_count + 1, vertex_count + 3, vertex_count + 2
            );

            vertex_count += 4;
        }
    }

    if (points.length >= 2) {
        let p1 = points[points.length - 2];
        let p2 = points[points.length - 1];
        let dir = vec2_normalize(vec2_sub(p2, p1));
        let normal = [-dir[1], dir[0]];

        vertices.push(
            p2[0] + normal[0] * thickness, p2[1] + normal[1] * thickness, 0, 0, 0, 1,
            p2[0] - normal[0] * thickness, p2[1] - normal[1] * thickness, 0, 0, 0, 1
        );

        indices.push(
            vertex_count - 2, vertex_count - 1, vertex_count,
            vertex_count - 1, vertex_count + 1, vertex_count
        );

        vertex_count += 2;
    }

    return {vertices: vertices, indices: indices};
}

function create_line_3d(points, radius, segments) {
    let vertices = [];
    let indices = [];
    let vertex_count = 0;

    function generate_circle(radius, segments) {
        let circle = [];
        for (let i = 0; i < segments; i++) {
            let angle = (i / segments) * Math.PI * 2;
            circle.push([
                Math.cos(angle) * radius,
                Math.sin(angle) * radius
            ]);
        }
        return circle;
    }

    function get_rotation_matrix(direction) {
        let up = [0, 1, 0];
        let right = vec3_normalize(vec3_cross(direction, up));
        if (vec3_magnitude(right) < 0.001) {
            right = [1, 0, 0];
        }
        up = vec3_normalize(vec3_cross(right, direction));

        return [
            right[0], right[1], right[2],
            up[0], up[1], up[2],
            direction[0], direction[1], direction[2]
        ];
    }

    function transform_point(point, rot_mat, position) {
        let x = point[0];
        let y = point[1];
        return [
            x * rot_mat[0] + y * rot_mat[3] + position[0],
            x * rot_mat[1] + y * rot_mat[4] + position[1],
            x * rot_mat[2] + y * rot_mat[5] + position[2]
        ];
    }

    let circle = generate_circle(radius, segments);
    let prev_circle_vertices = null;

    for (let i = 0; i < points.length - 1; i++) {
        let start = points[i];
        let end = points[i + 1];

        let direction = vec3_normalize(vec3_sub(end, start));
        let rot_mat = get_rotation_matrix(direction);

        let current_circle_vertices = [];

        for (let j = 0; j < segments; j++) {
            let transformed_start = transform_point(circle[j], rot_mat, start);
            vertices.push(
                transformed_start[0], transformed_start[1], transformed_start[2],
                circle[j][0] / radius, circle[j][1] / radius, 0
            );
            current_circle_vertices.push(vertex_count++);
        }

        for (let j = 0; j < segments; j++) {
            let next_j = (j + 1) % segments;
            let v0 = current_circle_vertices[j];
            let v1 = current_circle_vertices[next_j];

            if (prev_circle_vertices) {
                let v2 = prev_circle_vertices[j];
                let v3 = prev_circle_vertices[next_j];

                indices.push(v2, v3, v0);
                indices.push(v3, v1, v0);
            }
        }

        for (let j = 0; j < segments; j++) {
            let transformed_end = transform_point(circle[j], rot_mat, end);
            vertices.push(
                transformed_end[0], transformed_end[1], transformed_end[2],
                circle[j][0] / radius, circle[j][1] / radius, 0
            );
            current_circle_vertices.push(vertex_count++);
        }

        for (let j = 0; j < segments; j++) {
            let next_j = (j + 1) % segments;
            let v0 = current_circle_vertices[j];
            let v1 = current_circle_vertices[next_j];
            let v2 = current_circle_vertices[j + segments];
            let v3 = current_circle_vertices[next_j + segments];

            indices.push(v0, v1, v2);
            indices.push(v1, v3, v2);
        }

        prev_circle_vertices = current_circle_vertices.slice(segments);
    }

    return {vertices: vertices, indices: indices};
}

function create_plane(start_position, size) {
    let [x, y, z] = start_position;
    let [width, height] = size;

    let vertices = [
        x, y, z, 0, 0, 0,
        x + width, y, z, 0, 1, 0,
        x + width, y + height, z, 0, 1, 1,
        x, y + height, z, 0, 0, 1,
    ];

    let indices = [
        0, 1, 2,
        0, 3, 2
    ];

    return { vertices: vertices, indices: indices };
}

function create_circle(center_position, radius, segments){
    let [cx, cy, cz] = center_position;
    let vertices = [
        cx, cy, cz, 0.5, 0.5, 0
    ];
    for (let i = 0; i <= segments; i++) {
        let angle = (i / segments) * Math.PI * 2;
        let x = cx + radius * Math.cos(angle);
        let y = cy + radius * Math.sin(angle);
        let u = 0.5 + 0.5 * Math.cos(angle);
        let v = 0.5 + 0.5 * Math.sin(angle);
        vertices.push(x, y, cz, u, v, 0);
    }
    let indices = [];
    for (let i = 1; i <= segments; i++) {
        indices.push(0, i, i + 1);
    }
    indices[indices.length - 1] = 1;
    return { vertices: vertices, indices: indices };
}

function create_minus_sign(center_position, size, thickness){
    let [cx, cy, cz] = center_position;
    let half_size = size / 2;
    let half_thickness = thickness / 2;

    let vertices = [
        cx - half_size, cy - half_thickness, cz, 0, 0, 0,
        cx + half_size, cy - half_thickness, cz, 1, 0, 0,
        cx + half_size, cy + half_thickness, cz, 1, 1, 0,
        cx - half_size, cy + half_thickness, cz, 0, 1, 0,
    ];

    let indices = [
        0, 1, 2,
        0, 3, 2,
    ];

    return { vertices: vertices, indices: indices };
}

function create_plus_sign(center_position, size, thickness){
    let [cx, cy, cz] = center_position;
    let half_size = size / 2;
    let half_thickness = thickness / 2;

    let vertices = [
        cx - half_size, cy - half_thickness, cz, 0, 0, 0,
        cx + half_size, cy - half_thickness, cz, 1, 0, 0,
        cx + half_size, cy + half_thickness, cz, 1, 1, 0,
        cx - half_size, cy + half_thickness, cz, 0, 1, 0,
        cx - half_thickness, cy - half_size, cz, 0, 0, 0,
        cx + half_thickness, cy - half_size, cz, 1, 0, 0,
        cx + half_thickness, cy + half_size, cz, 1, 1, 0,
        cx - half_thickness, cy + half_size, cz, 0, 1, 0,
    ];

    let indices = [
        0, 1, 2,
        0, 3, 2,
        4, 5, 6,
        4, 7, 6
    ];

    return { vertices: vertices, indices: indices };
}

ctx.canvas = document.getElementById("main-canvas");
ctx.gl = ctx.canvas.getContext("webgl2");
ctx.shaders = {};
ctx.shaders["shader_line"] = ctx.create_shader(`#version 300 es
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
ctx.shaders["shader_plane"] = ctx.create_shader(`#version 300 es
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
uniform float time;

out vec4 frag_color;

in vec3 position;
in vec3 normal;
#define NUM_POSITIVE 10
#define NUM_NEGATIVE 10
void main(){
    vec2 uv = normal.yz;
    float time_scaled = time*3.0;
    vec2 positive_charge[NUM_POSITIVE] = vec2[](
        vec2(0.5 + 0.3 * sin(time_scaled + 0.1), 0.5 + 0.3 * cos(time_scaled + 0.1)),
        vec2(-0.4 + 0.2 * sin(time_scaled + 0.2), 0.3 + 0.2 * cos(time_scaled + 0.3)),
        vec2(0.2 + 0.3 * cos(time_scaled + 0.4), -0.2 + 0.3 * sin(time_scaled + 0.5)),
        vec2(0.1 + 0.3 * sin(time_scaled + 0.6), 0.4 + 0.3 * cos(time_scaled + 0.7)),
        vec2(-0.3 + 0.2 * cos(time_scaled + 0.8), 0.1 + 0.2 * sin(time_scaled + 0.9)),
        vec2(0.4 + 0.3 * cos(time_scaled + 1.0), -0.4 + 0.3 * sin(time_scaled + 1.1)),
        vec2(-0.1 + 0.2 * sin(time_scaled + 1.2), -0.3 + 0.2 * cos(time_scaled + 1.3)),
        vec2(0.3 + 0.3 * sin(time_scaled + 1.4), 0.2 + 0.3 * cos(time_scaled + 1.5)),
        vec2(-0.2 + 0.2 * cos(time_scaled + 1.6), -0.1 + 0.2 * sin(time_scaled + 1.7)),
        vec2(0.0 + 0.3 * sin(time_scaled + 1.8), 0.0 + 0.3 * cos(time_scaled + 1.9))
    );

    vec2 negative_charge[NUM_NEGATIVE] = vec2[](
        vec2(-0.5 + 0.3 * sin(time_scaled + 0.2), -0.5 + 0.3 * cos(time_scaled + 0.2)),
        vec2(0.4 + 0.2 * cos(time_scaled + 0.3), -0.3 + 0.2 * sin(time_scaled + 0.4)),
        vec2(-0.2 + 0.3 * sin(time_scaled + 0.5), 0.2 + 0.3 * cos(time_scaled + 0.6)),
        vec2(-0.1 + 0.3 * cos(time_scaled + 0.7), -0.4 + 0.3 * sin(time_scaled + 0.8)),
        vec2(0.3 + 0.2 * sin(time_scaled + 0.9), -0.1 + 0.2 * cos(time_scaled + 1.0)),
        vec2(-0.4 + 0.3 * cos(time_scaled + 1.1), 0.4 + 0.3 * sin(time_scaled + 1.2)),
        vec2(0.1 + 0.2 * sin(time_scaled + 1.3), 0.3 + 0.2 * cos(time_scaled + 1.4)),
        vec2(-0.3 + 0.3 * sin(time_scaled + 1.5), -0.2 + 0.3 * cos(time_scaled + 1.6)),
        vec2(0.2 + 0.2 * cos(time_scaled + 1.7), 0.1 + 0.2 * sin(time_scaled + 1.8)),
        vec2(-0.0 + 0.3 * cos(time_scaled + 1.9), -0.0 + 0.3 * sin(time_scaled + 2.0))
    );

    vec2 origin = (uv - vec2(0.5, 0.5)) * 2.0;

    float charge = 0.0;
    float charge_normalized = 0.0;
    float decay_factor = 2.0;
    float max_distance = 0.0;
    for (int i = 0; i < NUM_POSITIVE; i++) {
        float dist_to_positive = distance(origin, positive_charge[i]);
        float positive_decay = exp(-dist_to_positive * decay_factor) * 1.0;
        charge += positive_decay;
        charge_normalized += dist_to_positive;
        if(dist_to_positive > max_distance){
            max_distance = dist_to_positive;
        }
    }

    for (int i = 0; i < NUM_NEGATIVE; i++) {
        float dist_to_negative = distance(origin, negative_charge[i]);
        float negative_decay = exp(-dist_to_negative * decay_factor) * 1.0;
        charge -= negative_decay;
        charge_normalized -= dist_to_negative;
        if(dist_to_negative > max_distance){
            max_distance = dist_to_negative;
        }
    }
    charge = clamp(charge, -1.0, 1.0);

    vec3 color = vec3(0.0);

    if (charge > 0.0) {
        color = mix(vec3(1, 1, 1), vec3(0.204, 0.443, 0.922), charge);
    } else {
        color = mix(vec3(1, 1, 1), vec3(0.922, 0.204, 0.204), -charge);
    }

    frag_color = vec4(color, 1);

}`);

ctx.scenes = [
    {id: "scene_charges", el: null, width: 600, height: 400, camera: null, dragging_rect: null, draggable_rects: [],
        camera: {
            fov: 60, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [0, 0, 0],
                pivot: [0, 0, 0],
                zoom: 3.0
            }
        }},
    {id: "scene1", el: null, width: 600, height: 400, camera: null, dragging_rect: null, draggable_rects: [[0, 0, 600, 400]],
        camera: {
            fov: 60, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [-0.4, 0, 0],
                pivot: [0, 0, 0],
                zoom: 3.0
            }
        }},
    {id: "scene2", el: null, width: 600, height: 400, camera: null, dragging_rect: null, draggable_rects: [[0, 0, 600, 400]],
        camera: {
            fov: 30, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [0, 0, 0],
                pivot: [0, 0, 0],
                zoom: 2.0
            }
        }},
];

document.addEventListener("mouseup", function(e){
    for (let scene of ctx.scenes) {
        scene.dragging_rect = null;
        scene.is_dragging = false;
        scene.last_mouse = null;
    }
});

for (let scene of ctx.scenes) {
    scene.el = document.getElementById(scene.id);
    scene.el.style.width = scene.width + "px";
    scene.el.style.height = scene.height + "px";

    (function(scene){
        scene.el.addEventListener("mousemove", (e) => {
            let rect_bounds = scene.el.getBoundingClientRect();
            let mouse_x = e.clientX - rect_bounds.left;
            let mouse_y = e.clientY - rect_bounds.top;
            let hovered = false;

            for (let rect of scene.draggable_rects) {
                if (mouse_x >= rect[0] && mouse_x <= rect[2] &&
                    mouse_y >= rect[1] && mouse_y <= rect[3]) {
                    hovered = true;
                    break;
                }
            }
            scene.el.style.cursor = hovered ? "move" : "default";
        });

        scene.el.addEventListener("mousedown", function(e){
            if (e.which == 1) {
                e.preventDefault();
                let rect_bounds = scene.el.getBoundingClientRect();
                let mouse_x = e.clientX - rect_bounds.left;
                let mouse_y = e.clientY - rect_bounds.top;

                for (let rect of scene.draggable_rects) {
                    if (mouse_x >= rect[0] && mouse_x <= rect[2] &&
                        mouse_y >= rect[1] && mouse_y <= rect[3]) {
                        scene.dragging_rect = rect;
                        scene.is_dragging = true;
                        scene.last_mouse = [mouse_x, mouse_y];
                        break;
                    }
                }
            }
        });
    })(scene);
}

document.addEventListener("mousemove", function(e) {
    for (let scene of ctx.scenes) {
        if (!scene.is_dragging || !scene.last_mouse) continue;

        let rect_bounds = scene.el.getBoundingClientRect();
        let current_mouse = [
            e.clientX - rect_bounds.left,
            e.clientY - rect_bounds.top
        ];
        let mouse_delta = vec2_sub(current_mouse, scene.last_mouse);
        let delta_angle = [2 * Math.PI / scene.width, Math.PI / scene.height];

        if (scene.id == "scene1") {
            if (scene.dragging_rect === scene.draggable_rects[0]) {
                scene.camera.orbit.rotation = vec3_add(
                    scene.camera.orbit.rotation,
                    [-mouse_delta[1] * delta_angle[1], -mouse_delta[0] * delta_angle[0], 0]
                );
                scene.camera.orbit.rotation[0] = clamp(
                    scene.camera.orbit.rotation[0],
                    -Math.PI / 2,
                    Math.PI / 2
                );
            }
        }
        else if (scene.id == "scene2") {
            if (scene.dragging_rect === scene.draggable_rects[0]) {
                scene.camera.orbit.rotation = vec3_add(
                    scene.camera.orbit.rotation,
                    [-mouse_delta[1] * delta_angle[1], -mouse_delta[0] * delta_angle[0], 0]
                );
                scene.camera.orbit.rotation[0] = clamp(
                    scene.camera.orbit.rotation[0],
                    -Math.PI / 2,
                    Math.PI / 2
                );
            }
        }
        scene.last_mouse = current_mouse;
    }
});

ctx.draw = function(drawable){
    const gl = this.gl;

    if(this.previous_shader != drawable.shader || this.previous_scene != this.current_scene){
        const shader = ctx.shaders[drawable.shader];
        gl.useProgram(shader.program);
        const scene = ctx.current_scene;
        update_camera_projection_matrix(scene.camera, scene.width/scene.height);
        update_camera_orbit(scene.camera, scene.canvas);
        ctx.set_shader_uniform(shader, "p", scene.camera.projection_matrix);
        ctx.set_shader_uniform(shader, "time", this.time);
        ctx.set_shader_uniform(shader, "v", scene.camera.view_matrix);
        this.previous_shader = drawable.shader;
        this.previous_scene = this.current_scene;
    }

    gl.bindVertexArray(drawable.vertex_buffer.vao);
    this.set_shader_uniform(this.shaders[drawable.shader], "color", drawable.color);
    this.set_shader_uniform(this.shaders[drawable.shader], "m", drawable.transform);
    gl.drawElements(gl.TRIANGLES, drawable.vertex_buffer.draw_count, gl.UNSIGNED_SHORT, 0);
}

ctx.drawables = [];

ctx.create_drawable = function(shader, mesh, color, transform){
    let drawable = {
        shader: shader,
        vertex_buffer : this.create_vertex_buffer(mesh.vertices, [
                            { name: 'position_attrib', size: 3 },
                            { name: 'normal_attrib', size: 3 }
                        ], mesh.indices),
        color: color,
        transform: transform
    };
    this.drawables.push(drawable);
    return drawable;
}

ctx.update_wave_3d = function(drawable, wave_parms, lines_segments_3d) {
    const gl = this.gl;

    let points = [];
    for (let i = 0; i < wave_parms.num_points; i++) {
        let t = i / (wave_parms.num_points - 1);
        let x = t * wave_parms.width;
        let y = Math.sin(x * wave_parms.frequency * Math.PI + wave_parms.time) * wave_parms.amplitude;
        let z = t * wave_parms.z_range;
        points.push([x, y, z]);
    }

    let mesh = create_line_3d(points, wave_parms.thickness, lines_segments_3d);

    if(drawable.vertex_buffer == null){
        drawable.vertex_buffer = this.create_vertex_buffer(mesh.vertices, [
                                    { name: 'position_attrib', size: 3 },
                                    { name: 'normal_attrib', size: 3 }
                                ], mesh.indices);
    }
    else{
        gl.bindBuffer(gl.ARRAY_BUFFER, drawable.vertex_buffer.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.DYNAMIC_DRAW);
    }
}

const lines_segments_3d = 8;

let wave_parms = {
    num_points: 500,
    width: 4.0,
    amplitude: 0.5,
    frequency: 2,
    thickness: 0.03,
    z_range: 0,
    time: 0,
}

document.getElementById("amplitude-input").value = wave_parms.amplitude;
document.getElementById("amplitude-input").addEventListener("input", (e) => {
    wave_parms.amplitude = parseFloat(e.target.value);
});

document.getElementById("frequency-input").value = wave_parms.frequency;
document.getElementById("frequency-input").addEventListener("input", (e) => {
    wave_parms.frequency = parseFloat(e.target.value)   ;
});

let red = [0.922, 0.204, 0.204];
let blue = [0.204, 0.443, 0.922];

let negative_charge_pos = [1.0, 0, 0];
let negative_charge_background = ctx.create_drawable("shader_line", create_circle(negative_charge_pos, 0.3, 32), [0.1, 0.1, 0.1], mat4_identity());
let negative_charge = ctx.create_drawable("shader_line", create_circle(negative_charge_pos, 0.26, 32), blue, mat4_identity());
let negative_plus_sign = ctx.create_drawable("shader_line", create_minus_sign(negative_charge_pos, 0.21, 0.04), [0.1, 0.1, 0.1], mat4_identity());

let positive_charge_pos = [-1.0, 0, 0];
let positive_charge_background = ctx.create_drawable("shader_line", create_circle(positive_charge_pos, 0.3, 32), [0.1, 0.1, 0.1], mat4_identity());
let positive_charge = ctx.create_drawable("shader_line", create_circle(positive_charge_pos, 0.26, 32), red, mat4_identity());
let positive_plus_sign = ctx.create_drawable("shader_line", create_plus_sign(positive_charge_pos, 0.21, 0.04), [0.1, 0.1, 0.1], mat4_identity());

let wave_3d = {vertex_buffer: null, shader: "shader_line"};
ctx.update_wave_3d(wave_3d, wave_parms, lines_segments_3d);

let x_axis = ctx.create_drawable("shader_line",
    create_line_3d([[0, 0, 0], [6, 0, 0]], 0.02, lines_segments_3d),
    [0.3, 0.3, 0.3], translate_3d([-2.5, 0, 0]));

let y_axis = ctx.create_drawable("shader_line",
    create_line_3d([[0, -1.5, 0], [0, 1.5, 0]], 0.02, lines_segments_3d),
    [0.3, 0.3, 0.3], translate_3d([-1.5, 0, 0]));

let z_axis = ctx.create_drawable("shader_line",
    create_line_3d([[0, 0, -1.5], [0, 0, 1.5]], 0.02, lines_segments_3d),
    [0.3, 0.3, 0.3], translate_3d([-1.5, 0, 0]));

let plane = ctx.create_drawable("shader_plane",
    create_plane([-0.5, -0.5, 0], [1, 1]),
    [0.3, 0.3, 0.3], translate_3d([0, 0, 0]));

ctx.time = 0.0;
function update() {
    const gl = ctx.gl;
    gl.canvas.style.transform = "translateY("+window.scrollY+"px)";
    gl.canvas.width = window.innerWidth;
    gl.canvas.height = window.innerHeight;
    gl.enable(gl.SCISSOR_TEST);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for(let scene of ctx.scenes){
        ctx.current_scene = scene;
        const rect = scene.el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top  > gl.canvas.clientHeight ||
            rect.right  < 0 || rect.left > gl.canvas.clientWidth) {
            continue;
        }

        const width  = rect.width;
        const height = rect.height;
        const left   = rect.left - gl.canvas.getBoundingClientRect().left;
        const bottom = gl.canvas.clientHeight - (rect.bottom - gl.canvas.getBoundingClientRect().top);

        gl.viewport(left, bottom, width, height);
        gl.scissor(left, bottom, width, height);

        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let draw_calls = [];
        if(scene.id == "scene_charges"){
            ctx.draw(negative_plus_sign);
            ctx.draw(negative_charge);
            ctx.draw(negative_charge_background);

            ctx.draw(positive_plus_sign);
            ctx.draw(positive_charge);
            ctx.draw(positive_charge_background);
        }
        else if(scene.id == "scene1"){
            ctx.update_wave_3d(wave_3d, wave_parms, lines_segments_3d);

            wave_3d.color = blue;
            wave_3d.transform = translate_3d([-2, 0, 0]);
            ctx.draw(wave_3d);

            wave_3d.color = red;
            wave_3d.transform = mat4_mat4_mul(translate_3d([-2, 0, 0]), rotate_3d(axis_angle_to_quat([1, 0, 0], rad(90))));
            ctx.draw(wave_3d);

            wave_parms.time += 0.05;

            ctx.draw(x_axis);
            ctx.draw(y_axis);
            ctx.draw(z_axis);
        }
        else if(scene.id == "scene2"){
            ctx.draw(plane);
        }
    }
    ctx.time += 0.01;

    requestAnimationFrame(update);
}
requestAnimationFrame(update);

const sliders = document.querySelectorAll("input[type='range']");

function update_slider_background(slider) {
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const value = parseFloat(slider.value);
    const percentage = ((value - min) / (max - min)) * 100;
    const color = slider.getAttribute("data-color") || "#555";

    slider.style.background = `linear-gradient(to right, ${color} ${percentage}%, #ddd ${percentage}%)`;
    slider.style.setProperty("--thumb-color", color);
}

sliders.forEach(slider => {
    update_slider_background(slider);
    slider.addEventListener("input", () => update_slider_background(slider));
});