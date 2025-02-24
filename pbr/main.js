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
        case gl.INT:
            gl.uniform1i(shader.uniforms[uniform].location, value);
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

    if (determinant == 0) return null;

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

function transform_point(point, rot_mat, position) {
    let x = point[0];
    let y = point[1];
    return [
        x * rot_mat[0] + y * rot_mat[3] + position[0],
        x * rot_mat[1] + y * rot_mat[4] + position[1],
        x * rot_mat[2] + y * rot_mat[5] + position[2]
    ];
}

function create_line_3d(points, radius, segments) {
    let vertices = [];
    let indices = [];
    let vertex_count = 0;
    let circle = generate_circle(radius, segments);
    let prev_circle_vertices = null;

    let start = points[0];
    let direction = vec3_normalize(vec3_sub(points[1], points[0]));
    let rot_mat = get_rotation_matrix(direction);

    vertices.push(start[0], start[1], start[2], -direction[0], -direction[1], -direction[2]);
    let center_start = vertex_count++;

    let start_circle_vertices = [];
    for (let j = 0; j < segments; j++) {
        let transformed = transform_point(circle[j], rot_mat, start);
        vertices.push(transformed[0], transformed[1], transformed[2], -direction[0], -direction[1], -direction[2]);
        start_circle_vertices.push(vertex_count++);
    }

    for (let j = 0; j < segments; j++) {
        let next_j = (j + 1) % segments;
        indices.push(center_start, start_circle_vertices[j], start_circle_vertices[next_j]);
    }

    for (let i = 0; i < points.length - 1; i++) {
        start = points[i];
        let end = points[i + 1];
        direction = vec3_normalize(vec3_sub(end, start));
        rot_mat = get_rotation_matrix(direction);
        let current_circle_vertices = [];

        for (let j = 0; j < segments; j++) {
            let transformed_start = transform_point(circle[j], rot_mat, start);
            let normal = vec3_normalize(transform_point([circle[j][0] / radius, circle[j][1] / radius, 0], rot_mat, [0, 0, 0]));
            vertices.push(transformed_start[0], transformed_start[1], transformed_start[2], normal[0], normal[1], normal[2]);
            current_circle_vertices.push(vertex_count++);
        }

        for (let j = 0; j < segments; j++) {
            let next_j = (j + 1) % segments;
            let v0 = current_circle_vertices[j];
            let v1 = current_circle_vertices[next_j];
            if (prev_circle_vertices) {
                let v2 = prev_circle_vertices[j];
                let v3 = prev_circle_vertices[next_j];
                indices.push(v2, v0, v3);
                indices.push(v3, v0, v1);
            }
        }

        for (let j = 0; j < segments; j++) {
            let transformed_end = transform_point(circle[j], rot_mat, end);
            let normal = vec3_normalize(transform_point([circle[j][0] / radius, circle[j][1] / radius, 0], rot_mat, [0, 0, 0]));
            vertices.push(transformed_end[0], transformed_end[1], transformed_end[2], normal[0], normal[1], normal[2]);
            current_circle_vertices.push(vertex_count++);
        }

        for (let j = 0; j < segments; j++) {
            let next_j = (j + 1) % segments;
            let v0 = current_circle_vertices[j];
            let v1 = current_circle_vertices[next_j];
            let v2 = current_circle_vertices[j + segments];
            let v3 = current_circle_vertices[next_j + segments];
            indices.push(v0, v2, v1);
            indices.push(v1, v2, v3);
        }
        prev_circle_vertices = current_circle_vertices.slice(segments);
    }

    let end = points[points.length - 1];
    direction = vec3_normalize(vec3_sub(points[points.length - 1], points[points.length - 2]));
    rot_mat = get_rotation_matrix(direction);

    vertices.push(end[0], end[1], end[2], direction[0], direction[1], direction[2]);
    let center_end = vertex_count++;

    let end_circle_vertices = prev_circle_vertices;

    for (let j = 0; j < segments; j++) {
        let idx = end_circle_vertices[j] * 6;
        vertices[idx + 3] = direction[0];
        vertices[idx + 4] = direction[1];
        vertices[idx + 5] = direction[2];
    }

    for (let j = 0; j < segments; j++) {
        let next_j = (j + 1) % segments;
        indices.push(center_end, end_circle_vertices[next_j], end_circle_vertices[j]);
    }

    return {vertices: vertices, indices: indices};
}

function create_arrow_3d(points, radius, segments, arrow_length = 0.15, arrow_radius = 0.07) {
    let arrow_base = points[points.length - 1];
    let pre_base = points[points.length - 2];
    let direction = vec3_normalize(vec3_sub(arrow_base, pre_base));
    let arrow_tip = vec3_add(arrow_base, vec3_scale(direction, arrow_length));

    let modified_points = [...points.slice(0, -1), arrow_base];
    let line_geometry = create_line_3d(modified_points, radius, segments);
    let vertices = line_geometry.vertices;
    let indices = line_geometry.indices;
    let vertex_count = vertices.length / 6;

    let circle = generate_circle(arrow_radius, segments);
    let rot_mat = get_rotation_matrix(direction);

    let base_vertices = [];
    for (let i = 0; i < segments; i++) {
        let transformed = transform_point(circle[i], rot_mat, arrow_base);
        vertices.push(
            transformed[0], transformed[1], transformed[2],
            circle[i][0] / arrow_radius, circle[i][1] / arrow_radius, 0
        );
        base_vertices.push(vertex_count++);
    }

    vertices.push(arrow_tip[0], arrow_tip[1], arrow_tip[2], 0, 0, 1);
    let tip_vertex = vertex_count++;

    for (let i = 0; i < segments; i++) {
        let next = (i + 1) % segments;
        indices.push(
            base_vertices[i],
            tip_vertex,
            base_vertices[next]
        );
    }

    let reversed_base_vertices = base_vertices.slice().reverse();

    let base_center_normal = vec3_scale(direction, -1);
    vertices.push(
        arrow_base[0], arrow_base[1], arrow_base[2],
        base_center_normal[0], base_center_normal[1], base_center_normal[2]
    );
    let base_center_index = vertex_count++;

    for (let i = 0; i < segments; i++) {
        let next = (i + 1) % segments;
        indices.push(
            base_center_index,
            reversed_base_vertices[next],
            reversed_base_vertices[i]
        );
    }

    return { vertices: vertices, indices: indices };
}

function create_triangle(start_position, size) {
    let [x, y, z] = start_position;
    let [width, height] = size;

    let vertices = [
        x, y, z, 0, 0, 0,
        x + width, y, z, 0, 1, 0,
        x + width / 2, y + height, z, 0, 1, 1,
    ];

    let indices = [
        0, 1, 2
    ];

    return { vertices: vertices, indices: indices };
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
        0, 2, 3
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

function create_coil_3d(turns, height, radius, tube_radius, segments, radial_segments) {
    let points = [];
    let coil_steps = turns * segments;
    for (let i = 0; i <= coil_steps; i++) {
        let t = (i / coil_steps) * Math.PI * 2 * turns;
        let x = Math.cos(t) * radius;
        let y = (i / coil_steps) * height;
        let z = Math.sin(t) * radius;
        points.push([x, y, z]);
    }
    return create_line_3d(points, tube_radius, radial_segments);
}

function create_box(width, height, depth) {
    let vertices = [
        -width / 2, -height / 2, -depth / 2, 0, 0, -1,
        width / 2, -height / 2, -depth / 2, 0, 0, -1,
        width / 2, height / 2, -depth / 2, 0, 0, -1,
        -width / 2, height / 2, -depth / 2, 0, 0, -1,
        -width / 2, -height / 2, depth / 2, 0, 0, 1,
        width / 2, -height / 2, depth / 2, 0, 0, 1,
        width / 2, height / 2, depth / 2, 0, 0, 1,
        -width / 2, height / 2, depth / 2, 0, 0, 1,
        width / 2, -height / 2, -depth / 2, 1, 0, 0,
        width / 2, -height / 2, depth / 2, 1, 0, 0,
        width / 2, height / 2, depth / 2, 1, 0, 0,
        width / 2, height / 2, -depth / 2, 1, 0, 0,
        -width / 2, -height / 2, -depth / 2, -1, 0, 0,
        -width / 2, -height / 2, depth / 2, -1, 0, 0,
        -width / 2, height / 2, depth / 2, -1, 0, 0,
        -width / 2, height / 2, -depth / 2, -1, 0, 0,
        -width / 2, height / 2, -depth / 2, 0, 1, 0,
        width / 2, height / 2, -depth / 2, 0, 1, 0,
        width / 2, height / 2, depth / 2, 0, 1, 0,
        -width / 2, height / 2, depth / 2, 0, 1, 0,
        -width / 2, -height / 2, -depth / 2, 0, -1, 0,
        width / 2, -height / 2, -depth / 2, 0, -1, 0,
        width / 2, -height / 2, depth / 2, 0, -1, 0,
        -width / 2, -height / 2, depth / 2, 0, -1, 0
    ];

    let indices = [
        0,  2,  1,
        0,  3,  2,
        4,  5,  6,
        4,  6,  7,
        8, 10,  9,
        8, 11, 10,
        12, 13, 14,
        12, 14, 15,
        16, 18, 17,
        16, 19, 18,
        20, 21, 22,
        20, 22, 23
    ];

    return { vertices, indices };
}

function create_cylinder(radius, height, segments){
    let vertices = [];
    let indices = [];

    for (let i = 0; i <= segments; i++) {
        let theta = (i / segments) * Math.PI * 2;
        let x = Math.cos(theta) * radius;
        let z = Math.sin(theta) * radius;

        vertices.push(x, -height / 2, z, x, 0, z);
        vertices.push(x, height / 2, z, x, 0, z);
    }

    for (let i = 0; i < segments; i++) {
        let a = i * 2;
        let b = a + 1;
        let c = (a + 2) % (segments * 2);
        let d = (a + 3) % (segments * 2);

        indices.push(a, b, c);
        indices.push(b, d, c);
    }

    let top_center = vertices.length / 6;
    let bottom_center = top_center + 1;

    vertices.push(0, height / 2, 0, 0, 1, 0);
    vertices.push(0, -height / 2, 0, 0, -1, 0);

    for (let i = 0; i < segments; i++) {
        let a = i * 2 + 1;
        let b = (a + 2) % (segments * 2);

        indices.push(top_center, b, a);
    }

    for (let i = 0; i < segments; i++) {
        let a = i * 2;
        let b = (a + 2) % (segments * 2);

        indices.push(bottom_center, a, b);
    }

    return { vertices, indices };
}

function create_arrow(from, to, size) {
    let [x1, y1, z1] = from;
    let [x2, y2, z2] = to;
    let [body_width, head_size] = size;
    let dx = x2 - x1;
    let dy = y2 - y1;
    let length = Math.sqrt(dx * dx + dy * dy);
    let dir_x = dx / length;
    let dir_y = dy / length;
    let perp_x = -dir_y;
    let perp_y = dir_x;
    let body_half_width = body_width / 2;
    let body_end_x = x2 - dir_x * head_size;
    let body_end_y = y2 - dir_y * head_size;
    let vertices = [
        x1 + perp_x * body_half_width, y1 + perp_y * body_half_width, z1, 0, 0, 0,
        x1 - perp_x * body_half_width, y1 - perp_y * body_half_width, z1, 0, 1, 0,
        body_end_x - perp_x * body_half_width, body_end_y - perp_y * body_half_width, z1, 0, 1, 1,
        body_end_x + perp_x * body_half_width, body_end_y + perp_y * body_half_width, z1, 0, 0, 1,
        x2, y2, z1, 0.5, 0.5, 0,
        body_end_x + perp_x * head_size, body_end_y + perp_y * head_size, z1, 0, 0, 0,
        body_end_x - perp_x * head_size, body_end_y - perp_y * head_size, z1, 0, 1, 0,
    ];
    let indices = [
        0, 1, 2,
        0, 2, 3,
        4, 5, 6,
    ];
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
        0, 2, 3,
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
        0, 2, 3,
        4, 5, 6,
        4, 6, 7
    ];

    return { vertices: vertices, indices: indices };
}

function world_to_screen_space(scene, point){
    point = [...point, 1];
    let view_space = mat4_vec4_mul(mat4_transpose(scene.camera.view_matrix), point);
    let clip_space = mat4_vec4_mul(mat4_transpose(scene.camera.projection_matrix), view_space);

    let ndc = [
        clip_space[0] / clip_space[3],
        clip_space[1] / clip_space[3],
        clip_space[2] / clip_space[3],
        1
    ];
    const screen_x = (ndc[0] + 1) * 0.5 * scene.width;
    const screen_y = (1 - ndc[1]) * 0.5 * scene.height;
    return [screen_x, screen_y];
}

function screen_to_world_space(scene, screen_pos, z_distance) {
    const ndc_x = (screen_pos[0] / scene.width) * 2 - 1;
    const ndc_y = (1 - (screen_pos[1] / scene.height)) * 2 - 1;
    const ndc = [ndc_x, ndc_y, 1, 1];

    const clip_space = [
        ndc[0] * z_distance,
        ndc[1] * z_distance,
        ndc[2] * z_distance,
        z_distance
    ];

    const inv_projection_matrix = mat4_transpose(mat4_invert(scene.camera.projection_matrix));
    let view_space = mat4_vec4_mul(inv_projection_matrix, clip_space);

    const inv_view_matrix = mat4_transpose(mat4_invert(scene.camera.view_matrix));
    let world_space = mat4_vec4_mul(inv_view_matrix, view_space);
    return vec3_add(world_space, scene.camera.position);
}

ctx.canvas = document.getElementById("main-canvas");
ctx.gl = ctx.canvas.getContext("webgl2");
ctx.shaders = {};
ctx.shaders["shader_basic"] = ctx.create_shader(`#version 300 es
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
ctx.shaders["shader_spectrum"] = ctx.create_shader(`#version 300 es
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

vec3 wavelength_to_rgb(float wavelength) {
    float r = 0.0, g = 0.0, b = 0.0;

    if (wavelength >= 380.0 && wavelength < 440.0) {
        r = -(wavelength - 440.0) / (440.0 - 380.0);
        g = 0.0;
        b = 1.0;
    } else if (wavelength >= 440.0 && wavelength < 490.0) {
        r = 0.0;
        g = (wavelength - 440.0) / (490.0 - 440.0);
        b = 1.0;
    } else if (wavelength >= 490.0 && wavelength < 510.0) {
        r = 0.0;
        g = 1.0;
        b = -(wavelength - 510.0) / (510.0 - 490.0);
    } else if (wavelength >= 510.0 && wavelength < 580.0) {
        r = (wavelength - 510.0) / (580.0 - 510.0);
        g = 1.0;
        b = 0.0;
    } else if (wavelength >= 580.0 && wavelength < 645.0) {
        r = 1.0;
        g = -(wavelength - 645.0) / (645.0 - 580.0);
        b = 0.0;
    } else if (wavelength >= 645.0 && wavelength <= 700.0) {
        r = 1.0;
        g = 0.0;
        b = 0.0;
    }

    float fade = smoothstep(370.0, 420.0, wavelength)*smoothstep(700.0, 650.0, wavelength);
    return vec3(r, g, b) * fade;
}

void main(){
    frag_color = vec4(wavelength_to_rgb(mix(450.0, 620.0, normal.y*2.0-0.5)), 1);
}`);
ctx.shaders["shader_field"] = ctx.create_shader(`#version 300 es
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
    vec3 blue = vec3(0.922, 0.204, 0.204);
    vec3 red = vec3(0.204, 0.443, 0.922);
    frag_color = vec4(mix(blue, red, position.x), 1);
}`);
ctx.shaders["shader_shaded"] = ctx.create_shader(`#version 300 es
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
uniform int metallic;

out vec4 frag_color;

in vec3 position;
in vec3 normal;

void main(){
    vec3 light_pos = vec3(0, 2, 1);
    float angle = clamp(dot(normalize(light_pos), normal), 0.0, 1.0);
    float dist = 1.0/distance(light_pos, position);
    float light = angle*dist+0.7;
    light = clamp(light, 0.0, 1.0);
    frag_color = vec4(color*1.1*light, 1.0);
    if(metallic == 1){
        frag_color = vec4(1, 0, 1, 1.0);
    }
}`);
ctx.shaders["shader_glass"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec3 normal_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 world_position;
out vec3 normal;
out vec3 world_normal;
out vec3 camera_pos;

void main(){
    gl_Position = p*v*m*vec4(position_attrib, 1);
    mat3 inv_m = mat3(transpose(inverse(m)));
    world_normal = inv_m * normal_attrib;
    world_position = (m*vec4(position_attrib, 1)).xyz;
    normal = normal_attrib;
    camera_pos = -transpose(mat3(v)) * v[3].xyz;
}`,
`#version 300 es
precision highp float;

uniform vec3 color;

out vec4 frag_color;

in vec3 world_position;
in vec3 normal;
in vec3 world_normal;
in vec3 camera_pos;

void main(){
    vec3 view_dir = normalize(world_position - camera_pos);
    float fresnel = pow(1.0 - max(dot(normalize(normal), -view_dir), 0.0), 1.0);
    // frag_color = vec4(0, 0, 0, max(fresnel, 0.3)*1.5+0.1);
    frag_color = vec4(0, 0, 0, 0.5);
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
    float aspect_ratio = 1000.0/400.0;
    vec2 uv = normal.yz * vec2(aspect_ratio, 1);
    float time_scaled = time*2.0;
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
        float dist_to_positive = distance(origin, positive_charge[i]+vec2(1, 0));
        float positive_decay = exp(-dist_to_positive * decay_factor) * 1.0;
        charge += positive_decay;
        charge_normalized += dist_to_positive;
        if(dist_to_positive > max_distance){
            max_distance = dist_to_positive;
        }
    }

    for (int i = 0; i < NUM_NEGATIVE; i++) {
        float dist_to_negative = distance(origin, negative_charge[i]+vec2(1, 0));
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
        color = mix(vec3(0.98, 0.98, 0.98), vec3(0.204, 0.443, 0.922), charge);
    } else {
        color = mix(vec3(0.98, 0.98, 0.98), vec3(0.922, 0.204, 0.204), -charge);
    }

    frag_color = vec4(color, 1);
}`);

ctx.scenes = {
    "scene_charges": {id: "scene_charges", el: null, ratio: 3, camera: null, dragging_rect: null, draggable_rects: {},
        camera: {
            fov: 50, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [0, 0, 0],
                pivot: [0, 0, 0],
                zoom: 3.0
            }
        },
        charges: []},
    "scene_electric_field": {id: "scene_electric_field", el: null, ratio: 2.5, camera: null, dragging_rect: null, draggable_rects: {},
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
        },
        charges: [], field_lines: []},
    "scene_wave": {el: null, ratio: 1.8, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 60, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [-0.4, 0.2, 0],
                pivot: [0, 0, 0],
                zoom: 3.0
            }
        }},
    "scene_spectrum": {el: null, ratio: 2.5, camera: null, dragging_rect: null, draggable_rects: {},
        camera: {
            fov: 20, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [0, 0, 0],
                pivot: [0, 0, 0],
                zoom: 3.0
            }
        }},
    "scene_field_gradient": {id: "scene_field_gradient", el: null, ratio: 2.5, camera: null, dragging_rect: null, draggable_rects: {},
        camera: {
            fov: 60, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [0, 0, 0],
                pivot: [0, 0, 0],
                zoom: 2.0
            }
        }},
    "scene_relativity": {id: "scene_relativity", el: null, ratio: 2, camera: null, dragging_rect: null, draggable_rects: {},
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
        },
        cable_y_pos: 1.3, num_charges: 100, set_charges_spacing: -1, spacing_positive: 0.28, spacing_negative: 0.28,
        charges: [], reference_frame: 0},
    "scene_induction": {id: "scene_induction", el: null, ratio: 1.7, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 70, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [-0.4, 0, 0],
                pivot: [0, 0, 0],
                zoom: 3.0
            }
        }},
    "scene_ampere": {id: "scene_ampere", el: null, ratio: 1.7, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 70, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [-0.4, 0, 0],
                pivot: [0, 0, 0],
                zoom: 3.0
            }
        }},
    "scene_bulb": {id: "scene_bulb", el: null, ratio: 1.7, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [0, 0, 0],
                pivot: [0, 0, 0],
                zoom: 3.0
            }
        }},
};

function get_event_coordinates(e, element) {
    const rect = element.getBoundingClientRect();
    const is_touch = e.touches ? true : false;
    const client_x = is_touch ? e.touches[0].clientX : e.clientX;
    const client_y = is_touch ? e.touches[0].clientY : e.clientY;

    return {
        x: client_x - rect.left,
        y: client_y - rect.top
    };
}

function handle_interaction_end(e) {
    for (let scene_id in ctx.scenes) {
        const scene = ctx.scenes[scene_id];
        scene.dragging_rect = null;
        scene.is_dragging = false;
        scene.last_pos = null;
    }
}

function setup_scene_listeners(){
    for (let scene_id in ctx.scenes) {
        const scene = ctx.scenes[scene_id];
        scene.el = document.getElementById(scene_id);

        (function(scene_id, scene) {
            function handle_move(e) {
                if (e.touches) e.preventDefault();

                const coords = get_event_coordinates(e, scene.el);
                let hovered = false;

                for (let rect_id in scene.draggable_rects) {
                    const rect = scene.draggable_rects[rect_id];
                    if (rect_id == "scene" || coords.x >= rect[0] && coords.x <= rect[2] &&
                        coords.y >= rect[1] && coords.y <= rect[3]) {
                        hovered = true;
                        break;
                    }
                }
                scene.el.style.cursor = hovered ? "move" : "default";
            }

            function handle_start(e) {
                e.preventDefault();
                if (!e.touches && e.which !== 1) return;

                const coords = get_event_coordinates(e, scene.el);

                for (let rect_id in scene.draggable_rects) {
                    const rect = scene.draggable_rects[rect_id];
                    if (rect_id == "scene" || coords.x >= rect[0] && coords.x <= rect[2] &&
                        coords.y >= rect[1] && coords.y <= rect[3]) {
                        scene.dragging_rect = rect_id;
                        scene.is_dragging = true;
                        scene.last_pos = [coords.x, coords.y];
                        break;
                    }
                }
            }

            scene.el.removeEventListener("mousemove", scene.event_listener_mousemove);
            scene.el.removeEventListener("touchmove", scene.event_listener_touchmove);
            scene.el.removeEventListener("mousedown", scene.event_listener_mousedown);
            scene.el.removeEventListener("touchstart", scene.event_listener_touchstart);
            scene.event_listener_mousemove = scene.el.addEventListener("mousemove", handle_move);
            scene.event_listener_touchmove = scene.el.addEventListener("touchmove", handle_move);
            scene.event_listener_mousedown = scene.el.addEventListener("mousedown", handle_start);
            scene.event_listener_touchstart = scene.el.addEventListener("touchstart", handle_start);
        })(scene_id, scene);
    }
}

function handle_global_move(e) {
    if (e.touches) e.preventDefault();

    for(let scene_id in ctx.scenes) {
        const scene = ctx.scenes[scene_id];
        if (!scene.is_dragging || !scene.last_pos) continue;

        const coords = get_event_coordinates(e, scene.el);
        let current_pos = [coords.x, coords.y];
        let pos_delta = vec2_sub(current_pos, scene.last_pos);
        let delta_angle = [2 * Math.PI / scene.width, Math.PI / scene.height];

        if(scene_id == "scene_charges" || scene_id == "scene_electric_field" || scene_id == "scene_relativity") {
            const charge = scene.charges.find(charge => charge.id == scene.dragging_rect);
            let padding = scene.width/10-30;
            current_pos[0] = Math.max(padding, Math.min(scene.width - padding, current_pos[0]));
            current_pos[1] = Math.max(padding, Math.min(scene.height - padding, current_pos[1]));
            let new_pos = screen_to_world_space(scene, current_pos, 3);
            charge.pos = new_pos;
            update_charge_pos(charge);
            update_drag_charges(scene);
            if(scene_id == "scene_electric_field") {
                update_electric_field(scene);
            }
        }

        if(scene.dragging_rect == "scene") {
            scene.camera.orbit.rotation = vec3_add(
                scene.camera.orbit.rotation,
                [-pos_delta[1] * delta_angle[1], -pos_delta[0] * delta_angle[0], 0]
            );
            scene.camera.orbit.rotation[0] = clamp(
                scene.camera.orbit.rotation[0],
                -Math.PI / 2,
                Math.PI / 2
            );
            update_camera_orbit(scene.camera, scene.canvas);
            scene.camera_dirty = true;
        }
        scene.last_pos = current_pos;
    }
}

document.addEventListener("mousemove", handle_global_move);
document.addEventListener("touchmove", handle_global_move);
document.addEventListener("mouseup", handle_interaction_end);
document.addEventListener("touchend", handle_interaction_end);
setup_scene_listeners();

ctx.draw = function(drawable, custom_uniforms){
    if(drawable.vertex_buffer == null) return;

    const gl = this.gl;
    const shader = ctx.shaders[drawable.shader];

    if(this.previous_shader != drawable.shader || this.previous_scene != this.current_scene || ctx.current_scene.camera_dirty){
        gl.useProgram(shader.program);
        const scene = ctx.current_scene;
        update_camera_projection_matrix(scene.camera, scene.width/scene.height);
        update_camera_orbit(scene.camera, scene.canvas);
        ctx.set_shader_uniform(shader, "p", scene.camera.projection_matrix);
        ctx.set_shader_uniform(shader, "v", scene.camera.view_matrix);
        this.previous_shader = drawable.shader;
        this.previous_scene = this.current_scene;
        this.current_scene.camera_dirty = true;
    }

    if(custom_uniforms){
        for(let custom_uniform in custom_uniforms){
            ctx.set_shader_uniform(shader, custom_uniform, custom_uniforms[custom_uniform]);
        }
    }

    ctx.set_shader_uniform(shader, "time", this.time);
    gl.bindVertexArray(drawable.vertex_buffer.vao);
    this.set_shader_uniform(this.shaders[drawable.shader], "color", drawable.color);
    this.set_shader_uniform(this.shaders[drawable.shader], "m", drawable.transform);
    gl.drawElements(gl.TRIANGLES, drawable.vertex_buffer.draw_count, gl.UNSIGNED_SHORT, 0);
}

ctx.drawables = [];

ctx.create_drawable = function(shader, mesh, color, transform){
    let drawable = {
        shader: shader,
        vertex_buffer : mesh == null ? null : this.create_vertex_buffer(mesh.vertices, [
                            { name: 'position_attrib', size: 3 },
                            { name: 'normal_attrib', size: 3 }
                        ], mesh.indices),
        color: color,
        transform: transform
    };
    this.drawables.push(drawable);
    return drawable;
}

ctx.update_drawable_mesh = function(drawable, mesh){
    const gl = this.gl;
    gl.deleteVertexArray(drawable.vertex_buffer.vao);
    gl.deleteBuffer(drawable.vertex_buffer.vbo);
    gl.deleteBuffer(drawable.vertex_buffer.ebo);
    drawable.vertex_buffer = this.create_vertex_buffer(mesh.vertices, [
                            { name: 'position_attrib', size: 3 },
                            { name: 'normal_attrib', size: 3 }
                        ], mesh.indices);
}

ctx.update_wave_3d = function(drawable, wave_param, lines_segments_3d) {
    const gl = this.gl;

    let points = [];
    for (let i = 0; i < wave_param.num_points; i++) {
        let t = i / (wave_param.num_points - 1);
        let x = t * wave_param.width;
        let y = Math.sin(x * wave_param.frequency * Math.PI + wave_param.time) * wave_param.amplitude;
        let z = t * wave_param.z_range;
        points.push([x, y, z]);
    }

    let mesh = create_line_3d(points, wave_param.thickness, lines_segments_3d);

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


function resize_event(ctc){
    ctx.gl.canvas.width = window.innerWidth;
    ctx.gl.canvas.height = window.innerHeight;
    let width = document.body.clientWidth - parseInt(window.getComputedStyle(document.body).paddingLeft) - parseInt(window.getComputedStyle(document.body).paddingRight);
    for (let scene_id in ctx.scenes) {
        const scene = ctx.scenes[scene_id];
        scene.el = document.getElementById(scene_id);
        let height = width/scene.ratio;
        scene.el.style.width = width + "px";
        scene.el.style.height = height + "px";
        scene.width = width;
        scene.height = height;
    }
    setup_scene_listeners();
    update_drag_charges(ctx.scenes["scene_charges"]);
    update_drag_charges(ctx.scenes["scene_electric_field"]);

}
resize_event(ctx);
addEventListener("resize", resize_event);

const lines_segments_3d = 8;

let wave_param = {
    num_points: 500,
    width: 3.7,
    amplitude: 0.5,
    frequency: 2,
    thickness: 0.03,
    z_range: 0,
    time: 0,
}

document.getElementById("amplitude-input").value = wave_param.amplitude;
document.getElementById("amplitude-input").addEventListener("input", (e) => {
    wave_param.amplitude = parseFloat(e.target.value);
});

document.getElementById("frequency-input").value = wave_param.frequency;
document.getElementById("frequency-input").addEventListener("input", (e) => {
    wave_param.frequency = parseFloat(e.target.value);
});

const red = [0.922, 0.204, 0.204];
const blue = [0.204, 0.443, 0.922];

// scene_charges setup
function add_charge(scene, type, pos, charge_size = 0.25, border_size = 0.21, sign_size = 0.16, sign_thickness = 0.04, start_pos = 0, draggable = false, show_arrow = false){
    let charge_background = ctx.create_drawable("shader_basic", create_circle([0, 0, 0], charge_size, 32), [0.1, 0.1, 0.1], mat4_identity());
    let charge = ctx.create_drawable("shader_basic", create_circle([0, 0, 0], border_size, 32), type == "positive" ? red : blue, mat4_identity());
    let sign;

    if(type == "positive"){
        sign = ctx.create_drawable("shader_basic", create_plus_sign([0, 0, 0], sign_size, sign_thickness), [0.1, 0.1, 0.1], mat4_identity());
    }
    else{
        sign = ctx.create_drawable("shader_basic", create_minus_sign([0, 0, 0], sign_size, sign_thickness), [0.1, 0.1, 0.1], mat4_identity());
    }

    let arrow = ctx.create_drawable("shader_basic",
        create_arrow([0, 0, 0], [0, 0, 0], [0, 0]), [0.3, 0.3, 0.3], translate_3d([0, 0, 0]));

    let id = type+""+scene.charges.length;
    scene.charges.push({id: id, draggable: draggable, show_arrow: show_arrow, type: type, charge: charge, charge_background: charge_background, sign: sign, arrow: arrow, pos: pos, start_pos: start_pos, size: charge_size});
    update_charge_pos(scene.charges[scene.charges.length-1]);

    return id;
}

function update_charge_pos(charge){
    charge.charge.transform = translate_3d(charge.pos);
    charge.charge_background.transform = translate_3d(charge.pos);
    charge.sign.transform = translate_3d(charge.pos);
    charge.arrow.transform = translate_3d(charge.pos);
}

add_charge(ctx.scenes["scene_charges"], "positive", [0.5, 0.6, 0], 0.25, 0.21, 0.16, 0.04, 0, true, true);
add_charge(ctx.scenes["scene_charges"], "negative", [-2, -0.3, 0], 0.25, 0.21, 0.16, 0.04, 0, true, true);
add_charge(ctx.scenes["scene_charges"], "positive", [1.5, 0.3, 0], 0.25, 0.21, 0.16, 0.04, 0, true, true);

function update_drag_charges(scene){
    update_camera_projection_matrix(scene.camera, scene.width/scene.height);
    update_camera_orbit(scene.camera, scene.canvas);

    const force_strength = 1.0;
    for (let i = 0; i < scene.charges.length; i++) {
        let charge = scene.charges[i];
        let force = [0, 0, 0];

        for (let j = 0; j < scene.charges.length; j++) {
            if (i == j) continue;

            let charge2 = scene.charges[j];

            let dir = vec3_sub(charge2.pos, charge.pos);
            let dist = vec3_magnitude(dir);
            dir = vec3_normalize(dir);

            let strength = (charge.type == charge2.type) ? -force_strength : force_strength;
            strength /= dist * dist;

            force = vec3_add(force, vec3_scale(dir, strength));
        }

        let direction = vec3_normalize(force);
        let magnitude = vec3_magnitude(force);
        magnitude = Math.min(magnitude, 10);
        const old_min = 0.08;
        const old_max = 0.6;
        const min = 0.8;
        const max = 1.8;
        let normalized = (magnitude - old_min) / (old_max - old_min);
        magnitude = min + normalized * (max - min);
        magnitude = Math.min(magnitude, 1.8);
        let arrow_length = 0.5;
        let arrow_thickness = magnitude;
        if(scene.id != "scene_electric_field" && charge.show_arrow){
            let new_mesh = create_arrow([0, 0, 0], vec3_scale(direction, arrow_length*arrow_thickness), vec2_scale([0.1, 0.15], arrow_thickness));
            ctx.update_drawable_mesh(charge.arrow, new_mesh);
        }
    }

    scene.draggable_rects = [];
    for(const charge of scene.charges){
        if(!charge.draggable) continue;
        let screen_space_charge = [
            ...world_to_screen_space(scene, [charge.pos[0]-charge.size, charge.pos[1]+charge.size, 0.1, 1]),
            ...world_to_screen_space(scene, [charge.pos[0]+charge.size, charge.pos[1]-charge.size, 0.1, 1])
        ];
        scene.draggable_rects[charge.id] = [...screen_space_charge];
    }
}
update_drag_charges(ctx.scenes["scene_charges"]);
// scene_charges setup


// scene_electric_field setup
add_charge(ctx.scenes["scene_electric_field"], "negative", [1.0, 0.8, 0], 0.25, 0.21, 0.16, 0.04, 0, true);
add_charge(ctx.scenes["scene_electric_field"], "positive", [-1.0, -0.8, 0], 0.25, 0.21, 0.16, 0.04, 0, true);

function update_electric_field(scene) {
    const lines = 32;
    const step_size = 0.03;
    const max_steps = 10000;

    function calculate_field_at_point(point, charges) {
        let field = [0, 0, 0];
        for (let charge of charges) {
            let dir = vec3_sub(charge.pos, point);
            let dist = vec3_magnitude(dir);
            if (dist < 0.1) continue;
            let strength = charge.id.includes("negative") ? 1 : -1;
            strength /= (dist * dist * dist);
            field = vec3_add(field, vec3_scale(dir, strength));
        }
        return vec3_normalize(field);
    }

    function rk4_step(point, charges) {
        let k1 = calculate_field_at_point(point, charges);
        let temp = vec3_add(point, vec3_scale(k1, step_size * 0.5));
        let k2 = calculate_field_at_point(temp, charges);
        temp = vec3_add(point, vec3_scale(k2, step_size * 0.5));
        let k3 = calculate_field_at_point(temp, charges);
        temp = vec3_add(point, vec3_scale(k3, step_size));
        let k4 = calculate_field_at_point(temp, charges);
        return vec3_scale(
            vec3_add(
                vec3_add(
                    vec3_scale(k1, 1 / 6),
                    vec3_scale(k2, 1 / 3)
                ),
                vec3_add(
                    vec3_scale(k3, 1 / 3),
                    vec3_scale(k4, 1 / 6)
                )
            ),
            step_size
        );
    }

    function generate_circle_points(center, radius, num_points) {
        let points = [];
        for (let i = 0; i < num_points; i++) {
            let angle = (i / num_points) * Math.PI * 2.0;
            let x = center[0] + radius * Math.cos(angle);
            let y = center[1] + radius * Math.sin(angle);
            points.push([x, y, 0]);
        }
        return points;
    }

    function integrate_field_line(start_point, charges) {
        let points = [start_point];
        let current_point = [...start_point];
        for (let i = 0; i < max_steps; i++) {
            let step = rk4_step(current_point, charges);
            if (vec3_magnitude(step) < 0.01) break;
            current_point = vec3_add(current_point, step);
            points.push([...current_point]);
            let too_close = charges.some(charge => vec3_magnitude(vec3_sub(current_point, charge.pos)) < 0.3);
            if (too_close) break;
            if (Math.abs(current_point[0]) > 5 || Math.abs(current_point[1]) > 5) break;
        }
        return points;
    }

    scene.field_lines = [];
    const positive_charges = scene.charges.filter(c => c.id.includes("positive"));

    for (let charge of positive_charges) {
        let start_points = generate_circle_points(charge.pos, 0.3, lines);
        for (let start_point of start_points) {
            let points = integrate_field_line(start_point, scene.charges);
            if (points.length > 10) {
                scene.field_lines.push(ctx.create_drawable(
                    "shader_basic",
                    create_line(points, 0.02, true),
                    [0.3, 0.3, 0.3],
                    translate_3d([0, 0, 0])
                ));
            }
        }
    }
}

update_drag_charges(ctx.scenes["scene_electric_field"]);
update_electric_field(ctx.scenes["scene_electric_field"]);
// scene_electric_field setup

// scene_relativity setup
function update_drag_charges_relativity(scene){
    update_camera_projection_matrix(scene.camera, scene.width/scene.height);
    update_camera_orbit(scene.camera, scene.canvas);

    const force_strength = 1.0;

    let charge = scene.charges[0];
    let force = [0, 0, 0];
    let first_charge_y_pos = null;

    for (let j = 0; j < scene.charges.length; j++) {
        if (j == 0) continue;

        let charge2 = scene.charges[j];
        let charge2_pos = [charge2.pos[0], charge2.pos[1], charge2.pos[2]];
        if(first_charge_y_pos == null){
            first_charge_y_pos = charge2_pos[1];
        }
        charge2_pos[1] = first_charge_y_pos;

        let dir = vec3_sub(charge2_pos, charge.pos);
        let dist = vec3_magnitude(dir);
        dir = vec3_normalize(dir);

        let strength = (charge.type == charge2.type) ? -force_strength : force_strength;
        strength /= dist * dist;

        force = vec3_add(force, vec3_scale(dir, strength));
    }


    let direction = vec3_normalize(force);
    let magnitude = vec3_magnitude(force);
    magnitude = Math.min(magnitude, 10);
    const old_min = 0;
    const old_max = 0.6;
    const min = 0;
    const max = 1.8;
    let normalized = (magnitude - old_min) / (old_max - old_min);
    magnitude = min + normalized * (max - min);
    magnitude = Math.min(magnitude, 1.8);
    let arrow_length = magnitude/2;
    let arrow_thickness = magnitude;

    let new_mesh = create_arrow([0, 0, 0], vec3_scale(direction, arrow_length), vec2_scale([0.1, 0.15], arrow_thickness));
    ctx.update_drawable_mesh(charge.arrow, new_mesh);
}

function setup_relativity_scene(scene){
    for(let i = 0; i < scene.num_charges; i++){
        let positive_pos = [i*scene.spacing_positive - (scene.num_charges-1)/2*scene.spacing_positive, scene.cable_y_pos, 0];
        add_charge(scene, "positive", positive_pos, 0.12, 0.095, 0.10, 0.02, positive_pos[0]);
    }
    for(let i = 0; i < scene.num_charges; i++){
        let negative_pos = [i*scene.spacing_negative - (scene.num_charges-1)/2*scene.spacing_negative, scene.cable_y_pos-0.28, 0];
        add_charge(scene, "negative", negative_pos, 0.12, 0.095, 0.10, 0.02, negative_pos[0]);
    }
}
let big_charge_id = add_charge(ctx.scenes["scene_relativity"], "positive", [0, 0, 0], 0.25, 0.21, 0.2, 0.05, -3.75, false, true);
let big_charge = ctx.scenes["scene_relativity"].charges.find(charge => charge.id == big_charge_id);
setup_relativity_scene(ctx.scenes["scene_relativity"]);
update_drag_charges_relativity(ctx.scenes["scene_relativity"]);
let cable = ctx.create_drawable("shader_basic",
    create_plane([-5, ctx.scenes["scene_relativity"].cable_y_pos-0.44, 0], [10, 0.6]),
    [0.5, 0.5, 0.5], translate_3d([0, 0, 0]));

let position_range = {x: [-3.5, 3.5], y: [-1.7, 1.7]};
let random_circles = [];
let random_circles_pos = [];
for(let i = 0; i < 60; i++){
    let x = position_range.x[0] + Math.random() * (position_range.x[1] - position_range.x[0]);
    let y = position_range.y[0] + Math.random() * (position_range.y[1] - position_range.y[0]);
    let min_size = 0.02;
    let max_size = 0.05;
    let size = min_size + Math.random() * (max_size - min_size);
    random_circles.push(ctx.create_drawable("shader_basic", create_circle([0, 0, 0], size, 32), [0.9, 0.9, 0.9], translate_3d([x, y, 0])));
    random_circles_pos.push([x, y, 0]);
}
// scene_relativity setup

// scene_spectrum setup
let wave_param_spectrum = {
    num_points: 500,
    width: 15,
    amplitude: 0.5,
    frequency: 2.75,
    thickness: 0.03,
    z_range: 0,
    time: 0,
};
document.getElementById("frequency-input-spectrum").value = 0.5;
document.getElementById("frequency-input-spectrum").addEventListener("input", (e) => {
    let value = parseFloat(e.target.value);
    wave_param_spectrum.frequency = 0.5 + (1-value) * (5-0.5);
    arrow.transform = translate_3d([-1.43 + value * (1.43 - (-1.43)) -0.075, -0.64, -0.9]);
});
let spectrum_wave = {vertex_buffer: null, shader: "shader_basic"};
spectrum_wave.transform = translate_3d([-7.5, 0.9, -10]);
ctx.update_wave_3d(spectrum_wave, wave_param_spectrum, lines_segments_3d);
let spectrum = ctx.create_drawable("shader_spectrum",
    create_plane([0, 0, 0], [0.8, 0.4]),
    [0, 0, 0], translate_3d([-0.4, -0.5, -1]));
let arrow_spectrum_1 = ctx.create_drawable("shader_basic",
   create_arrow([0, 0, 0], [1.2, 0, 0], [0.015, 0.04]), [0, 0, 0], translate_3d([0, -0.07, 0]));
let arrow_spectrum_2 = ctx.create_drawable("shader_basic",
   create_arrow([0, 0, 0], [-1.2, 0, 0], [0.015, 0.04]), [0, 0, 0], translate_3d([0, -0.07, 0]));
let arrow_spectrum_3 = ctx.create_drawable("shader_basic",
   create_arrow([0, 0, 0], [1.2, 0, 0], [0.015, 0.04]), [0, 0, 0], translate_3d([0, -0.37, 0]));
let arrow_spectrum_4 = ctx.create_drawable("shader_basic",
   create_arrow([0, 0, 0], [-1.2, 0, 0], [0.015, 0.04]), [0, 0, 0], translate_3d([0, -0.37, 0]));
let arrow = ctx.create_drawable("shader_basic",
    create_triangle([0, 0, 0], [0.15, 0.15]),
    [0, 0, 0], translate_3d([-0.075, -0.64, -0.9]));

function wavelength_to_rgb(value, start, end) {
    let wavelength = 380 + (700 - 380) * ((start - value) / (start - end));
    let r = 0, g = 0, b = 0;

    if (wavelength >= 380 && wavelength < 440) {
        r = -(wavelength - 440) / (440 - 380);
        g = 0;
        b = 1;
    } else if (wavelength >= 440 && wavelength < 490) {
        r = 0;
        g = (wavelength - 440) / (490 - 440);
        b = 1;
    } else if (wavelength >= 490 && wavelength < 510) {
        r = 0;
        g = 1;
        b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength >= 510 && wavelength < 580) {
        r = (wavelength - 510) / (580 - 510);
        g = 1;
        b = 0;
    } else if (wavelength >= 580 && wavelength < 645) {
        r = 1;
        g = -(wavelength - 645) / (645 - 580);
        b = 0;
    } else if (wavelength >= 645 && wavelength <= 700) {
        r = 1;
        g = 0;
        b = 0;
    }

    function smoothstep(edge0, edge1, x) {
        let t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    let fade = smoothstep(370, 420, wavelength) * smoothstep(700, 650, wavelength);
    return [r * fade, g * fade, b * fade];
}
// scene_spectrum setup
// scene_wave setup
let wave_3d = {vertex_buffer: null, shader: "shader_basic"};
ctx.update_wave_3d(wave_3d, wave_param, lines_segments_3d);

let x_axis = ctx.create_drawable("shader_basic",
    create_arrow_3d([[0, 0, 0], [4.5, 0, 0]], 0.02, 32),
    [0.3, 0.3, 0.3], translate_3d([-2.5, 0, 0]));

let y_axis = ctx.create_drawable("shader_basic",
    create_arrow_3d([[0, -1.5, 0], [0, 1, 0]], 0.02, 32),
    [0.3, 0.3, 0.3], translate_3d([-1.5, 0, 0]));

let z_axis = ctx.create_drawable("shader_basic",
    create_arrow_3d([[0, 0, -1], [0, 0, 1]], 0.02, 32),
    [0.3, 0.3, 0.3], translate_3d([-1.5, 0, 0]));
// scene_wave setup

// scene_field_gradient setup
let plane = ctx.create_drawable("shader_plane",
    create_plane([0, 0, 0], [6, 2.4]),
    [0, 0, 0], translate_3d([-3, -1.2, 0]));
// scene_field_gradient setup

// scene_induction setup
function update_magnetic_field(north_pole, south_pole) {
    const lines = 31;
    const step_size = 0.03;
    const max_steps = 1000;

    function calculate_field_at_point(point) {
        let field = [0, 0, 0];

        let dir_north = vec3_sub(north_pole, point);
        let dist_north = vec3_magnitude(dir_north);
        if (dist_north >= 0.1) {
            let strength_north = -1 / (dist_north * dist_north);
            field = vec3_add(field, vec3_scale(dir_north, strength_north));
        }

        let dir_south = vec3_sub(south_pole, point);
        let dist_south = vec3_magnitude(dir_south);
        if (dist_south >= 0.1) {
            let strength_south = 1 / (dist_south * dist_south);
            field = vec3_add(field, vec3_scale(dir_south, strength_south));
        }

        return vec3_normalize(field);
    }

    function rk4_step(point) {
        let k1 = calculate_field_at_point(point);
        let temp = vec3_add(point, vec3_scale(k1, step_size * 0.5));
        let k2 = calculate_field_at_point(temp);
        temp = vec3_add(point, vec3_scale(k2, step_size * 0.5));
        let k3 = calculate_field_at_point(temp);
        temp = vec3_add(point, vec3_scale(k3, step_size));
        let k4 = calculate_field_at_point(temp);
        return vec3_scale(
            vec3_add(
                vec3_add(
                    vec3_scale(k1, 1 / 6),
                    vec3_scale(k2, 1 / 3)
                ),
                vec3_add(
                    vec3_scale(k3, 1 / 3),
                    vec3_scale(k4, 1 / 6)
                )
            ),
            step_size
        );
    }

    function generate_circle_points(center, radius, num_points) {
        let points = [];
        for (let i = 0; i < num_points; i++) {
            let angle = (i / num_points) * Math.PI * 2.0;
            let x = center[0] + radius * Math.cos(angle);
            let y = center[1] + radius * Math.sin(angle);
            points.push([x, y, 0]);
        }
        return points;
    }

    function integrate_field_line(start_point) {
        let points = [start_point];
        let current_point = [...start_point];
        for (let i = 0; i < max_steps; i++) {
            let step = rk4_step(current_point);
            current_point = vec3_add(current_point, step);
            points.push([...current_point]);

            let too_close_north = vec3_magnitude(vec3_sub(current_point, north_pole)) < 0.3;
            let too_close_south = vec3_magnitude(vec3_sub(current_point, south_pole)) < 0.3;

            if (too_close_north || too_close_south) break;
            if (Math.abs(current_point[0]) > 5 || Math.abs(current_point[1]) > 5) break;
        }
        return points;
    }

    let field_lines = [];
    let start_points = generate_circle_points(north_pole, 0.3, lines);
    for (let start_point of start_points) {
        let points = integrate_field_line(start_point);
        if (points.length > 10) {
            field_lines.push(ctx.create_drawable(
                "shader_field",
                create_line_3d(points, 0.01, 16),
                [0.3, 0.3, 0.3],
                translate_3d([0, 0, 0])
            ));
        }
    }
    return field_lines;
}

let magnetic_field_drawables = update_magnetic_field([-0.25, 0, 0], [0.25, 0, 0]);

let coil = ctx.create_drawable("shader_shaded",
    create_coil_3d(15, 3, 0.5, 0.02, 32, 32),
    [0.722, 0.451, 0.200],
    mat4_mat4_mul(
        translate_3d([0, -1.5, 0]),
        mat4_mat4_mul(
            rotate_3d(axis_angle_to_quat(vec3_normalize([1, 0, 0]), rad(90))),
            rotate_3d(axis_angle_to_quat(vec3_normalize([0, 1, 0]), rad(90))),
        )
    )
);
let magnet_north = ctx.create_drawable("shader_shaded",
    create_box(0.5, 0.5, 0.5), red, translate_3d([-0.25, 0, 0]));
let magnet_south = ctx.create_drawable("shader_shaded",
    create_box(0.5, 0.5, 0.5), blue, translate_3d([0.25, 0, 0]));
let magnet_pos = 0;
document.getElementById("magnet-input").value = magnet_pos;
document.getElementById("magnet-input").addEventListener("input", (e) => {
    magnet_pos = parseFloat(e.target.value);
    magnet_south.transform = translate_3d([0.25+magnet_pos, 0, 0]);
    magnet_north.transform = translate_3d([-0.25+magnet_pos, 0, 0]);

    for(let line of magnetic_field_drawables){
        line.transform = translate_3d([magnet_pos, 0, 0]);
    }
});
let wire = ctx.create_drawable("shader_shaded",
    create_line_3d([[1.5, 0, -0.5], [2.0, -0.2, 0]], 0.02, 32),
    [0.722, 0.451, 0.200],
    mat4_identity()
);
// scene_induction setup

// scene_ampere setup
let coil2 = ctx.create_drawable("shader_shaded",
    create_coil_3d(15, 3, 0.5, 0.02, 32, 32),
    [0.722, 0.451, 0.200],
    mat4_mat4_mul(
        translate_3d([0, -1.5, 0]),
        mat4_mat4_mul(
            rotate_3d(axis_angle_to_quat(vec3_normalize([1, 0, 0]), rad(0))),
            rotate_3d(axis_angle_to_quat(vec3_normalize([0, 1, 0]), rad(90))),
        )
    )
);
// scene_ampere setup

// scene_bulb
let bulb_transform = scale_3d([1.0, 1.0, 1.0]);
let bulb = ctx.create_drawable("shader_glass", null, [0.5, 0.5, 0.5], bulb_transform);
let bulb2 = ctx.create_drawable("shader_glass", null, [0.4, 0.4, 0.4], bulb_transform);
let bulb_screw = ctx.create_drawable("shader_shaded", null, [0.8, 0.8, 0.8], bulb_transform);
let bulb_screw_black = ctx.create_drawable("shader_shaded", null, [0.3, 0.3, 0.3], bulb_transform);
let bulb_wire = ctx.create_drawable("shader_shaded", null, [0.2, 0.2, 0.2], bulb_transform);
// scene_bulb

ctx.time = 0.0;
ctx.last_time = 0.0;
function update(current_time){
    let delta_time = (current_time - ctx.last_time) / 1000;
    delta_time = Math.min(delta_time, 0.1);

    ctx.time += 0.01;

    const gl = ctx.gl;
    gl.canvas.style.transform = "translateY("+window.scrollY+"px)";
    gl.enable(gl.SCISSOR_TEST);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for(let scene_id in ctx.scenes){
        const scene = ctx.scenes[scene_id];
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

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let draw_calls = [];
        if(scene_id == "scene_charges" || scene_id == "scene_electric_field"){
            for(const charge of scene.charges){
                ctx.draw(charge.sign);
                ctx.draw(charge.charge);
                ctx.draw(charge.charge_background);
                ctx.draw(charge.arrow);
            }

            if(scene_id == "scene_electric_field"){
                for(const line of scene.field_lines){
                    ctx.draw(line);
                }
            }
        }
        else if(scene_id == "scene_spectrum"){
            ctx.draw(spectrum);
            ctx.draw(arrow_spectrum_1);
            ctx.draw(arrow_spectrum_2);
            ctx.draw(arrow_spectrum_3);
            ctx.draw(arrow_spectrum_4);
            wave_param_spectrum.time += 0.05;
            spectrum_wave.color = wavelength_to_rgb(wave_param_spectrum.frequency, 3.35, 2.14);
            ctx.update_wave_3d(spectrum_wave, wave_param_spectrum, lines_segments_3d);
            ctx.draw(spectrum_wave);
            ctx.draw(arrow);
        }
        else if(scene_id == "scene_wave"){
            ctx.update_wave_3d(wave_3d, wave_param, lines_segments_3d);

            wave_3d.color = blue;
            wave_3d.transform = translate_3d([-2, 0, 0]);
            ctx.draw(wave_3d);

            wave_3d.color = red;
            wave_3d.transform = mat4_mat4_mul(translate_3d([-2, 0, 0]), rotate_3d(axis_angle_to_quat([1, 0, 0], rad(90))));
            ctx.draw(wave_3d);

            wave_param.time += 0.2*delta_time;

            ctx.draw(x_axis);
            ctx.draw(y_axis);
            ctx.draw(z_axis);
        }
        else if(scene_id == "scene_field_gradient"){
            ctx.draw(plane);
        }
        else if(scene_id == "scene_induction"){
            ctx.draw(coil);
            ctx.draw(magnet_south);
            ctx.draw(magnet_north);
            ctx.draw(wire);

            for(let line of magnetic_field_drawables){
                ctx.draw(line);
            }
        }
        else if(scene_id == "scene_ampere"){
            ctx.draw(coil2);
        }
        else if(scene_id == "scene_bulb"){
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            ctx.draw(bulb_screw, {"metallic": 2});
            ctx.draw(bulb_screw_black);
            ctx.draw(bulb_wire);
            ctx.draw(bulb2);
            ctx.draw(bulb);
        }
        else if(scene_id == "scene_relativity"){
            if(scene.set_charges_spacing >= 0){
                if(scene.set_charges_spacing == 2){
                    scene.spacing_positive = 0.14;
                    scene.spacing_negative = 0.45;
                }
                else{
                    scene.spacing_positive = 0.28;
                    scene.spacing_negative = 0.28;
                }

                let counter = 0;
                for(let i = 0; i < scene.charges.length; i++){
                    if(scene.charges[i].id === big_charge_id){
                        continue;
                    }
                    if(scene.charges[i].id.includes("positive")){
                        continue;
                    }
                    let start_pos = counter*scene.spacing_negative - (scene.num_charges-1)/2*scene.spacing_negative;
                    charge_pos = [start_pos, scene.cable_y_pos-0.28, 0];
                    scene.charges[i].pos = charge_pos;
                    scene.charges[i].start_pos = start_pos;
                    counter++;
                }

                counter = 0;
                for(let i = 0; i < scene.charges.length; i++){
                    if(scene.charges[i].id == big_charge_id){
                        continue;
                    }
                    if(scene.charges[i].id.includes("negative")){
                        continue;
                    }
                    let start_pos = counter*scene.spacing_positive - (scene.num_charges-1)/2*scene.spacing_positive;
                    charge_pos = [start_pos, scene.cable_y_pos, 0];
                    scene.charges[i].pos = charge_pos;
                    scene.charges[i].start_pos = start_pos;
                    counter++;
                }

                scene.set_charges_spacing = -1;
            }

            let stuff_speed = 0.08; // this needs to be a multiple of 2 (?) for some reason
            let speed = stuff_speed*delta_time;
            for(const charge of scene.charges){
                ctx.draw(charge.sign);
                ctx.draw(charge.charge);
                ctx.draw(charge.charge_background);
                ctx.draw(charge.arrow);

                if(charge.id == big_charge_id) continue;

                if(scene.reference_frame == 0){
                    if(charge.type != "positive"){
                        charge.pos[0] += speed;
                    }
                }
                else if(scene.reference_frame >= 1){
                    if(charge.type != "negative"){
                        charge.pos[0] -= speed;
                    }
                }

                let spacing = charge.type == "negative" ? scene.spacing_negative : scene.spacing_positive;
                if(Math.abs(charge.pos[0]-charge.start_pos) > spacing){
                    charge.pos[0] = charge.start_pos;
                }
                update_charge_pos(charge);
            }

            if(scene.reference_frame == 0){
                big_charge.pos[0] += speed;
                if(big_charge.pos[0]-big_charge.start_pos > Math.abs(big_charge.start_pos)*2){
                    big_charge.pos[0] = big_charge.start_pos;
                }
            }
            else{
                big_charge.pos[0] = 0;
            }

            update_charge_pos(big_charge);

            update_drag_charges_relativity(ctx.scenes["scene_relativity"]);

            ctx.draw(cable);

            for(let i = 0; i < random_circles.length; i++){
                if(scene.reference_frame > 0){
                        random_circles_pos[i][0] -= stuff_speed*delta_time;
                        if(random_circles_pos[i][0] < -3.5){
                            random_circles_pos[i][0] = 3.5;
                        }
                }
                random_circles[i].transform = translate_3d(random_circles_pos[i]);
                ctx.draw(random_circles[i]);
            }
        }
    }

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

const buttons_reference = document.querySelectorAll(".button-reference");
const buttons_reference_inline = document.querySelectorAll(".button-reference-inline");
buttons_reference.forEach(button => {
    button.addEventListener("click", () => {
        let scene = ctx.scenes["scene_relativity"];
        scene.reference_frame = parseInt(button.getAttribute("data-reference"));
        scene.set_charges_spacing = scene.reference_frame;
        buttons_reference.forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        buttons_reference_inline.forEach(b => b.classList.remove("active"));
        for(let other_button of buttons_reference_inline){
            if(other_button.getAttribute("data-reference") == button.getAttribute("data-reference")){
                other_button.classList.add("active");
            }
        }
    });
});
buttons_reference_inline.forEach(button => {
    button.addEventListener("click", () => {
        let scene = ctx.scenes["scene_relativity"];
        scene.reference_frame = parseInt(button.getAttribute("data-reference"));
        scene.set_charges_spacing = scene.reference_frame;
        buttons_reference_inline.forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        buttons_reference.forEach(b => b.classList.remove("active"));
        for(let other_button of buttons_reference){
            if(other_button.getAttribute("data-reference") == button.getAttribute("data-reference")){
                other_button.classList.add("active");
            }
        }
    });
});

function get_uint32(data_view, offset, little_endian = true) {
    return data_view.getUint32(offset, little_endian);
}

function get_uint64(data_view, offset, little_endian = true) {
    let low = data_view.getUint32(offset, little_endian);
    let high = data_view.getUint32(offset + 4, little_endian);
    return little_endian ? high * 2 ** 32 + low : low * 2 ** 32 + high;
}

function get_string(data_view, offset, size) {
    let bytes = new Uint8Array(data_view.buffer, offset, size);
    return new TextDecoder().decode(bytes);
}

function get_uint32_buffer(data_view, offset, size, little_endian = true) {
    let uints = [];
    for (let i = 0; i < size; i += 4) {
        uints.push(data_view.getUint32(offset + i, little_endian));
    }
    return uints;
}

function get_float_buffer(data_view, offset, size, little_endian = true) {
    let floats = [];
    for (let i = 0; i < size; i += 4) {
        floats.push(data_view.getFloat32(offset + i, little_endian));
    }
    return floats;
}

async function get_mesh_from_file(path) {
    try {
        let res = await fetch(path);
        let data = await res.arrayBuffer();
        let view = new DataView(data);
        let ptr = 0;
        const name_size = get_uint64(view, ptr);
        ptr += 8;
        ptr += name_size;
        const num_attribs = get_uint64(view, ptr);
        ptr += 8;
        let attribs = [];
        for(let i = 0; i < num_attribs; i++){
            const attrib_name_size = get_uint64(view, ptr);
            ptr += 8;
            const attrib_name = get_string(view, ptr, attrib_name_size);
            ptr += attrib_name_size;
            const attrib_size = get_uint32(view, ptr);
            ptr += 4;
            attribs.push({name: attrib_name, size: attrib_size});
        }

        const vertices_size = get_uint64(view, ptr);
        ptr += 8;
        const vertices = get_float_buffer(view, ptr, vertices_size * 4);
        ptr += vertices_size * 4;

        const indices_size = get_uint64(view, ptr);
        ptr += 8;
        const indices = get_uint32_buffer(view, ptr, indices_size * 4);
        ptr += indices_size * 4;
        return { vertices: vertices, indices: indices, attribs: attribs };
    } catch (err) {
        console.error(err);
    }
}
get_mesh_from_file("bulb.mesh").then(function(mesh){
    bulb.vertex_buffer = ctx.create_vertex_buffer(mesh.vertices, mesh.attribs, mesh.indices);
});
get_mesh_from_file("bulb2.mesh").then(function(mesh){
    bulb2.vertex_buffer = ctx.create_vertex_buffer(mesh.vertices, mesh.attribs, mesh.indices);
});
get_mesh_from_file("bulb_screw.mesh").then(function(mesh){
    bulb_screw.vertex_buffer = ctx.create_vertex_buffer(mesh.vertices, mesh.attribs, mesh.indices);
});
get_mesh_from_file("bulb_screw_black.mesh").then(function(mesh){
    bulb_screw_black.vertex_buffer = ctx.create_vertex_buffer(mesh.vertices, mesh.attribs, mesh.indices);
});
get_mesh_from_file("bulb_wire.mesh").then(function(mesh){
    bulb_wire.vertex_buffer = ctx.create_vertex_buffer(mesh.vertices, mesh.attribs, mesh.indices);
});