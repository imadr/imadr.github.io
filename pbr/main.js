let ctx = {};

function remap_value(value, from_min, from_max, to_min, to_max) {
    const normalized = (value - from_min) / (from_max - from_min)
    return to_min + (normalized * (to_max - to_min))
}

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

function create_line_dashed(points, thickness, dash_length = 0.1, gap_length = 0.1, use_miter = true) {
    let dashed_points = [];

    for (let i = 1; i < points.length; i++) {
        let p1 = points[i - 1];
        let p2 = points[i];
        let dx = p2[0] - p1[0];
        let dy = p2[1] - p1[1];
        let segment_length = Math.sqrt(dx * dx + dy * dy);
        let dir = [dx / segment_length, dy / segment_length];
        let distance = 0;

        while (distance + dash_length <= segment_length) {
            let dash_start = [
                p1[0] + dir[0] * distance,
                p1[1] + dir[1] * distance
            ];
            dashed_points.push(dash_start);

            let dash_end = [
                p1[0] + dir[0] * (distance + dash_length),
                p1[1] + dir[1] * (distance + dash_length)
            ];
            dashed_points.push(dash_end);

            distance += dash_length + gap_length;
        }

        if (distance < segment_length && segment_length - distance > 0.01) {
            let remaining = segment_length - distance;
            if (remaining <= dash_length) {
                dashed_points.push([
                    p1[0] + dir[0] * distance,
                    p1[1] + dir[1] * distance
                ]);
                dashed_points.push([
                    p1[0] + dir[0] * segment_length,
                    p1[1] + dir[1] * segment_length
                ]);
            }
        }
    }

    let all_vertices = [];
    let all_indices = [];
    let vertex_offset = 0;

    for (let i = 0; i < dashed_points.length; i += 2) {
        if (i + 1 < dashed_points.length) {
            let dash = [dashed_points[i], dashed_points[i + 1]];
            let line = create_line(dash, thickness, use_miter);
            all_vertices.push(...line.vertices);

            for (let j = 0; j < line.indices.length; j++) {
                all_indices.push(line.indices[j] + vertex_offset);
            }

            vertex_offset += line.vertices.length / 6;
        }
    }

    return { vertices: all_vertices, indices: all_indices };
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

function create_uv_sphere(radius, latitudes, longitudes, smooth = true) {
    let vertices = [];
    let indices = [];
    
    for (let lat = 0; lat <= latitudes; lat++) {
        let theta = lat * Math.PI / latitudes;
        let sin_theta = Math.sin(theta);
        let cos_theta = Math.cos(theta);
        
        for (let lon = 0; lon <= longitudes; lon++) {
            let phi = lon * 2 * Math.PI / longitudes;
            let sin_phi = Math.sin(phi);
            let cos_phi = Math.cos(phi);
            
            let x = radius * sin_theta * cos_phi;
            let y = radius * cos_theta;
            let z = radius * sin_theta * sin_phi;
            
            let u = 1 - (lon / longitudes);
            let v = 1 - (lat / latitudes);
            
            let nx = sin_theta * cos_phi;
            let ny = cos_theta;
            let nz = sin_theta * sin_phi;
            
            vertices.push(x, y, z, nx, ny, nz, u, v);
        }
    }
    
    if (smooth) {
        for (let lat = 0; lat < latitudes; lat++) {
            for (let lon = 0; lon < longitudes; lon++) {
                let first = (lat * (longitudes + 1)) + lon;
                let second = first + longitudes + 1;
                
                indices.push(first, first + 1, second);
                indices.push(second, first + 1, second + 1);
            }
        }
    } else {
        let flat_vertices = [];
        
        for (let lat = 0; lat < latitudes; lat++) {
            for (let lon = 0; lon < longitudes; lon++) {
                let first = (lat * (longitudes + 1)) + lon;
                let second = first + longitudes + 1;
                let third = first + 1;
                let fourth = second + 1;
                
                let v1 = { x: vertices[first * 8], y: vertices[first * 8 + 1], z: vertices[first * 8 + 2], u: vertices[first * 8 + 6], v: vertices[first * 8 + 7] };
                let v2 = { x: vertices[second * 8], y: vertices[second * 8 + 1], z: vertices[second * 8 + 2], u: vertices[second * 8 + 6], v: vertices[second * 8 + 7] };
                let v3 = { x: vertices[third * 8], y: vertices[third * 8 + 1], z: vertices[third * 8 + 2], u: vertices[third * 8 + 6], v: vertices[third * 8 + 7] };
                let v4 = { x: vertices[fourth * 8], y: vertices[fourth * 8 + 1], z: vertices[fourth * 8 + 2], u: vertices[fourth * 8 + 6], v: vertices[fourth * 8 + 7] };
                
                let normal1 = calculate_normal(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
                flat_vertices.push(v1.x, v1.y, v1.z, normal1.x, normal1.y, normal1.z, v1.u, v1.v,
                                  v2.x, v2.y, v2.z, normal1.x, normal1.y, normal1.z, v2.u, v2.v,
                                  v3.x, v3.y, v3.z, normal1.x, normal1.y, normal1.z, v3.u, v3.v);
                
                let normal2 = calculate_normal(v2.x, v2.y, v2.z, v4.x, v4.y, v4.z, v3.x, v3.y, v3.z);
                flat_vertices.push(v2.x, v2.y, v2.z, normal2.x, normal2.y, normal2.z, v2.u, v2.v,
                                  v4.x, v4.y, v4.z, normal2.x, normal2.y, normal2.z, v4.u, v4.v,
                                  v3.x, v3.y, v3.z, normal2.x, normal2.y, normal2.z, v3.u, v3.v);
            }
        }
        
        vertices = flat_vertices;
        for (let i = 0; i < vertices.length / 8; i++) {
            indices.push(i);
        }
    }
    
    return { vertices, indices };
}

function calculate_normal(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
    let ux = x2 - x1;
    let uy = y2 - y1;
    let uz = z2 - z1;
    
    let vx = x3 - x1;
    let vy = y3 - y1;
    let vz = z3 - z1;
    
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    
    let length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (length > 0) {
        nx /= length;
        ny /= length;
        nz /= length;
    }
    
    return { x: nx, y: ny, z: nz };
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

function create_rect(start_position, size) {
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

function create_circle_stroke(center_position, radius, segments, stroke_width){
    let [cx, cy, cz] = center_position;
    let points = [];

    for (let i = 0; i <= segments; i++) {
        let angle = (i / segments) * Math.PI * 2;
        let x = cx + radius * Math.cos(angle);
        let y = cy + radius * Math.sin(angle);
        points.push([x, y]);
    }

    points.push(points[0]);
    return create_line(points, stroke_width);
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

// function create_cylinder(radius, height, segments){
//     let vertices = [];
//     let indices = [];

//     for (let i = 0; i <= segments; i++) {
//         let theta = (i / segments) * Math.PI * 2;
//         let x = Math.cos(theta) * radius;
//         let z = Math.sin(theta) * radius;

//         vertices.push(x, -height / 2, z, x, 0, z);
//         vertices.push(x, height / 2, z, x, 0, z);
//     }

//     for (let i = 0; i < segments; i++) {
//         let a = i * 2;
//         let b = a + 1;
//         let c = (a + 2) % (segments * 2);
//         let d = (a + 3) % (segments * 2);

//         indices.push(a, b, c);
//         indices.push(b, d, c);
//     }

//     let top_center = vertices.length / 6;
//     let bottom_center = top_center + 1;

//     vertices.push(0, height / 2, 0, 0, 1, 0);
//     vertices.push(0, -height / 2, 0, 0, -1, 0);

//     for (let i = 0; i < segments; i++) {
//         let a = i * 2 + 1;
//         let b = (a + 2) % (segments * 2);

//         indices.push(top_center, b, a);
//     }

//     for (let i = 0; i < segments; i++) {
//         let a = i * 2;
//         let b = (a + 2) % (segments * 2);

//         indices.push(bottom_center, a, b);
//     }

//     return { vertices, indices };
// }

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

function world_to_screen_space(scene, camera, point){
    point = [...point, 1];
    let view_space = mat4_vec4_mul(mat4_transpose(camera.view_matrix), point);
    let clip_space = mat4_vec4_mul(mat4_transpose(camera.projection_matrix), view_space);

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

function screen_to_world_space(scene, screen_pos, z_distance, camera) {
    const ndc_x = (screen_pos[0] / scene.width) * 2 - 1;
    const ndc_y = (1 - (screen_pos[1] / scene.height)) * 2 - 1;
    const ndc = [ndc_x, ndc_y, 1, 1];

    const clip_space = [
        ndc[0] * z_distance,
        ndc[1] * z_distance,
        ndc[2] * z_distance,
        z_distance
    ];

    let camera_ = camera;
    if(camera_ === undefined){
        camera_ = scene.camera;
    }

    const inv_projection_matrix = mat4_transpose(mat4_invert(camera_.projection_matrix));
    let view_space = mat4_vec4_mul(inv_projection_matrix, clip_space);

    const inv_view_matrix = mat4_transpose(mat4_invert(camera_.view_matrix));
    let world_space = mat4_vec4_mul(inv_view_matrix, view_space);
    return vec3_add(world_space, camera_.position);
}

ctx.canvas = document.getElementById("main-canvas");
ctx.gl = ctx.canvas.getContext("webgl2", {stencil: true});
ctx.font_texture = ctx.gl.createTexture();
ctx.font = {chars:{}, data: {}};
ctx.text_buffers = {};

const postprocess_framebuffer = ctx.gl.createFramebuffer();
ctx.gl.bindFramebuffer(ctx.gl.FRAMEBUFFER, postprocess_framebuffer);
const postprocess_texture = ctx.gl.createTexture();
ctx.gl.bindTexture(ctx.gl.TEXTURE_2D, postprocess_texture);
ctx.gl.texImage2D(ctx.gl.TEXTURE_2D, 0, ctx.gl.RGBA, ctx.gl.canvas.width, ctx.gl.canvas.height, 0, ctx.gl.RGBA, ctx.gl.UNSIGNED_BYTE, null);
ctx.gl.texParameteri(ctx.gl.TEXTURE_2D, ctx.gl.TEXTURE_MIN_FILTER, ctx.gl.LINEAR);
ctx.gl.texParameteri(ctx.gl.TEXTURE_2D, ctx.gl.TEXTURE_MAG_FILTER, ctx.gl.LINEAR);
ctx.gl.texParameteri(ctx.gl.TEXTURE_2D, ctx.gl.TEXTURE_MIN_FILTER, ctx.gl.LINEAR_MIPMAP_LINEAR);
ctx.gl.framebufferTexture2D(ctx.gl.FRAMEBUFFER, ctx.gl.COLOR_ATTACHMENT0, ctx.gl.TEXTURE_2D, postprocess_texture, 0);
const postprocess_renderbuffer = ctx.gl.createRenderbuffer();
ctx.gl.bindRenderbuffer(ctx.gl.RENDERBUFFER, postprocess_renderbuffer);
ctx.gl.renderbufferStorage(ctx.gl.RENDERBUFFER, ctx.gl.DEPTH_COMPONENT16, ctx.gl.canvas.width, ctx.gl.canvas.height);
ctx.gl.framebufferRenderbuffer(ctx.gl.FRAMEBUFFER, ctx.gl.DEPTH_ATTACHMENT, ctx.gl.RENDERBUFFER, postprocess_renderbuffer);
ctx.gl.bindFramebuffer(ctx.gl.FRAMEBUFFER, null);

function create_text_buffer(ctx, text, start_x = 0, start_y = 0) {
    let vertices = [];
    let indices = [];
    let offset_x = start_x;

    for (let i = 0; i < text.length; i++) {
        const char = ctx.font.chars[text[i]];
        if (!char) {
            continue;
        }

        const x = offset_x + char.xoffset;
        const y = start_y + (ctx.font.data.base - char.yoffset - char.height);
        const w = char.width;
        const h = char.height;
        const u1 = char.x / ctx.font.data.scale_w;
        const v1 = (char.y + char.height) / ctx.font.data.scale_h;
        const u2 = (char.x + char.width) / ctx.font.data.scale_w;
        const v2 = char.y / ctx.font.data.scale_h;
        const index_offset = vertices.length / 4;

        const is_space = text[i] === " ";
        vertices.push(
            x, y, u1, v1,
            x + w, y, u2, v1,
            x + w, y + h, u2, v2,
            x, y + h, u1, v2
        );
        indices.push(
            index_offset, index_offset + 1, index_offset + 2,
            index_offset, index_offset + 2, index_offset + 3
        );
        const start_idx = indices.length - 6;

        offset_x += char.xadvance;
    }

    return { vertices, indices };
}

ctx.shaders = {};
ctx.shaders["shader_text"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec2 position_attrib;
layout(location = 1) in vec2 texcoord_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec2 position;
out vec2 texcoord;

void main(){
    gl_Position = p*v*m*vec4(vec3(position_attrib, 0.0), 1);
    position = position_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec3 color;

uniform sampler2D font_texture;

out vec4 frag_color;

in vec2 position;
in vec2 texcoord;

void main(){
    vec4 font = texture(font_texture, texcoord);
    frag_color = vec4(color, font.a);
}`);
ctx.shaders["shader_postprocess"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec2 texcoord_attrib;

out vec3 position;
out vec2 texcoord;

void main(){
    gl_Position = vec4(position_attrib, 1.0);
    position = position_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec3 color;

out vec4 frag_color;

uniform sampler2D framebuffer_texture;
uniform vec4 scissor_texcoords;
uniform float brightness;
uniform float lod;

in vec3 position;
in vec2 texcoord;

void main(){
    vec2 texcoord_adjusted = mix(scissor_texcoords.xy, scissor_texcoords.zw, texcoord);
    vec4 sample_texture = texture(framebuffer_texture, texcoord_adjusted);
    vec4 color_total = vec4(0.0);
    float weight_total = 0.0;
    float blur_radius = 10.0;
    float blur_sigma = 4.0;
    for (float x = -blur_radius; x <= blur_radius; x++) {
        for (float y = -blur_radius; y <= blur_radius; y++) {
            float weight = exp(-(x * x + y * y) / (2.0 * blur_sigma * blur_sigma));
            vec2 pixel_offset = vec2(x, y) / vec2(textureSize(framebuffer_texture, 3));
            vec4 lod_sample_texture = textureLod(framebuffer_texture, texcoord_adjusted + pixel_offset, lod);
            color_total += lod_sample_texture * weight;
            weight_total += weight;
        }
    }
    color_total /= weight_total;
    frag_color = vec4(color_total.rgb, min(color_total.a, brightness));
}`);
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
uniform sampler2D texture_uniform;

out vec4 frag_color;

in vec3 position;
in vec3 normal;

void main(){
    frag_color = vec4(color, 1);
}`);
ctx.shaders["shader_eye"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec3 normal_attrib;
layout(location = 2) in vec2 texcoord_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec3 normal;
out vec2 texcoord;

void main(){
    gl_Position = p*v*m*vec4(position_attrib, 1);
    position = position_attrib;
    normal = normal_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec3 color;
uniform sampler2D texture_uniform;

out vec4 frag_color;

in vec3 position;
in vec3 normal;
in vec2 texcoord;

void main(){
    frag_color = vec4(texture(texture_uniform, texcoord*vec2(1, 1)).rgb-vec3(0.1), 1);
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
out vec3 camera_pos;

void main(){
    gl_Position = p*v*m*vec4(position_attrib, 1);
    position = position_attrib;
    normal = normal_attrib;
    camera_pos = -transpose(mat3(v)) * v[3].xyz;
}`,
`#version 300 es
precision highp float;

uniform vec3 color;
uniform int metallic;

out vec4 frag_color;

in vec3 position;
in vec3 normal;
in vec3 camera_pos;

void main(){
    if(metallic == 1){
        vec3 light_pos = vec3(0, 2, 1);
        vec3 light_dir = normalize(light_pos - position);
        vec3 view_dir = normalize(camera_pos - position);
        vec3 reflect_dir = reflect(-light_dir, normal);
        float angle = max(dot(normal, light_dir), 0.0);
        float dist = 1.0 / distance(light_pos, position);
        float diff = angle * dist;
        float spec = pow(max(dot(view_dir, reflect_dir), 0.0), 8.0);
        float light = clamp(diff + spec + 0.8, 0.0, 1.0);
        vec3 envmap = normalize(reflect(-view_dir, normal));
        float env_intensity = 0.5 + 0.5 * dot(envmap, vec3(0.0, 0.0, 1.0));
        vec3 env_color = vec3(env_intensity) * 0.35;
        vec3 metal_color = color * diff + env_color * (spec * 3.5);
        frag_color = vec4(metal_color + 0.4, 1.0);
    }
    else{
        vec3 light_pos = vec3(0, 2, 1);
        float angle = clamp(dot(normalize(light_pos), normal), 0.0, 1.0);
        float dist = 1.0/distance(light_pos, position);
        float light = angle*dist+0.7;
        light = clamp(light, 0.0, 1.0);
        frag_color = vec4(color*1.1*light, 1.0);
    }
}`);
ctx.shaders["shader_sun_cross"] = ctx.create_shader(`#version 300 es
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
    float d = distance(position, vec3(0, 0, 0));
    vec3 color = mix(vec3(1.000, 0.796, 0.610), vec3(0.926, 0.244, 0.000), d);
    if(d > 0.8){
        color = mix(vec3(0.9, 0.2, 0), vec3(0.7, 0.1, 0), (d - 0.8) / 0.2);
    }
    frag_color = vec4(color, 1.0);
}`);

ctx.shaders["shader_sun_surface"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec3 normal_attrib;
layout(location = 2) in vec2 texcoord_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec3 normal;
out vec2 texcoord;

void main(){
    gl_Position = p*v*m*vec4(position_attrib, 1);
    position = position_attrib;
    normal = normal_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec3 color;
uniform int metallic;
uniform float time;

out vec4 frag_color;

in vec3 position;
in vec3 normal;
in vec2 texcoord;

float noise(vec2 p)
{
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float smooth_noise(vec2 p)
{
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(mix(noise(i + vec2(0.0, 0.0)), 
                   noise(i + vec2(1.0, 0.0)), u.x),
               mix(noise(i + vec2(0.0, 1.0)), 
                   noise(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec3 p)
{
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    
    for (int i = 0; i < 6; ++i) {
        v += a * smooth_noise(p.xy + time);
        v += a * smooth_noise(p.xz + time);
        v += a * smooth_noise(p.yz + time);
        p = p * 3.0 + shift;
        a *= 0.5;
    }
    return v / 3.0;
}

void main(){
    vec3 yellow = vec3(1.000, 0.605, 0.0);
    vec3 orange = vec3(1.000, 0.383, 0.0);
    float n = pow(fbm(normalize(position)), 3.0)*3.0;
    vec3 color = mix(yellow, orange, n);
    frag_color = vec4(color, 1.0);
}`);
ctx.shaders["shader_apple"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec3 normal_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec3 normal;
out vec3 camera_pos;

void main(){
    gl_Position = p*v*m*vec4(position_attrib, 1);
    position = position_attrib;
    normal = normal_attrib;
    camera_pos = -transpose(mat3(v)) * v[3].xyz;
}`,
`#version 300 es
precision highp float;

uniform vec3 color;
uniform int metallic;

out vec4 frag_color;

in vec3 position;
in vec3 normal;
in vec3 camera_pos;

void main(){
    vec3 light_pos = vec3(0, 1, 1);
    vec3 light_dir = normalize(light_pos - position);
    vec3 view_dir = normalize(camera_pos - position);
    vec3 reflect_dir = reflect(-light_dir, normal);
    float specular = pow(max(dot(view_dir, reflect_dir), 0.0), 8.0);
    float angle = clamp(dot(normalize(light_pos), normal), 0.0, 1.0);
    float diffuse = angle;
    frag_color = vec4(color*(diffuse*0.6+ 0.4) + vec3(specular)*0.5, 1.0);
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
uniform float alpha;

out vec4 frag_color;

in vec3 world_position;
in vec3 normal;
in vec3 world_normal;
in vec3 camera_pos;

void main(){
    vec3 view_dir = normalize(camera_pos - world_position);
    vec3 reflect_dir = reflect(-view_dir, normalize(world_normal));
    float fresnel = pow(1.0 - max(dot(normalize(world_normal), view_dir), 0.0), 2.0);
    vec3 refract_dir = refract(-view_dir, normalize(world_normal), 0.95);

    frag_color = vec4(vec3(max(0.3-fresnel, 0.2))*color, alpha);
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
    "scene_induction": {id: "scene_induction", el: null, ratio: 1.8, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [-0.4, 0, 0],
                pivot: [0, 0.5, 0],
                zoom: 7.0
            }
        }},
    "scene_ampere": {id: "scene_ampere", el: null, ratio: 2.5, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [-0.4, 0, 0],
                pivot: [1, 0.5, 0],
                zoom: 6.0
            }
        }},
    "scene_led": {id: "scene_led", el: null, ratio: 1.7, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 50, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [0, 0, 0],
                pivot: [0, 0, 0],
                zoom: 10.0
            }
        }},
    "scene_bulb": {id: "scene_bulb", el: null, ratio: 1.7, camera: null, dragging_rect: null, draggable_rects: {},
        camera: {
            fov: 50, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [-0.2, -0.6, 0],
                pivot: [0, 0, 0],
                zoom: 3.0
            }
        },
        particles: []},
    "scene_bulb_graphs": {id: "scene_bulb_graphs", el: null, ratio: 3.5, camera: null, dragging_rect: null, draggable_rects: {},
        camera: {
            fov: 30, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [0, 0, 0],
                pivot: [0, 0, 0],
                zoom: 3.0
            }
        }},
    "scene_apple": {id: "scene_apple", el: null, ratio: 1.7, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 70, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [-0.3, 0.3, 0],
                pivot: [0, 0, 0],
                zoom: 3.0
            }
        }},
    "scene_transport": {id: "scene_transport", el: null, ratio: 2.1, camera: null, dragging_rect: null, draggable_rects: {},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [-0.3, 0.3, 0],
                pivot: [0, 0, 0],
                zoom: 5.0
            }
        }},
    "scene_sun": {id: "scene_sun", el: null, ratio: 1.7, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 50, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
            orbit: {
                rotation: [-0.3, 0.3, 0],
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
            update_camera_orbit(scene.camera);
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

ctx.draw = function(drawable, custom_uniforms, custom_camera, custom_shader){
    if(drawable == null) return;
    if(drawable.vertex_buffer == null) return;
    const gl = this.gl;
    const shader = custom_shader ? ctx.shaders[custom_shader] : ctx.shaders[drawable.shader];

    if(this.previous_shader != drawable.shader || this.previous_scene != this.current_scene || ctx.current_scene.camera_dirty){
        gl.useProgram(shader.program);
        const scene = ctx.current_scene;

        if(custom_camera){
            update_camera_projection_matrix(custom_camera, scene.width/scene.height);
            update_camera_orbit(custom_camera);
            ctx.set_shader_uniform(shader, "p", custom_camera.projection_matrix);
            ctx.set_shader_uniform(shader, "v", custom_camera.view_matrix);
        }
        else{
            update_camera_projection_matrix(scene.camera, scene.width/scene.height);
            update_camera_orbit(scene.camera);
            ctx.set_shader_uniform(shader, "p", scene.camera.projection_matrix);
            ctx.set_shader_uniform(shader, "v", scene.camera.view_matrix);
        }
        this.previous_shader = drawable.shader;
        this.previous_scene = this.current_scene;
        this.current_scene.camera_dirty = true;
    }
    
    ctx.set_shader_uniform(shader, "time", this.time);
    gl.bindVertexArray(drawable.vertex_buffer.vao);
    this.set_shader_uniform(this.shaders[drawable.shader], "color", drawable.color);
    this.set_shader_uniform(this.shaders[drawable.shader], "m", drawable.transform);
    if(custom_uniforms){
        for(let custom_uniform in custom_uniforms){
            ctx.set_shader_uniform(shader, custom_uniform, custom_uniforms[custom_uniform]);
        }
    }

    gl.drawElements(gl.TRIANGLES, drawable.vertex_buffer.draw_count, gl.UNSIGNED_SHORT, 0);
}

ctx.drawables = [];

ctx.create_drawable = function(shader, mesh, color, transform, custom_vertex_attribs){
    let drawable = {
        shader: shader,
        vertex_buffer : mesh == null ? null : this.create_vertex_buffer(mesh.vertices, custom_vertex_attribs == null ? [
                            { name: "position_attrib", size: 3 },
                            { name: "normal_attrib", size: 3 }
                        ] : custom_vertex_attribs, mesh.indices),
        color: color,
        transform: transform
    };
    this.drawables.push(drawable);
    return drawable;
}

ctx.update_drawable_mesh = function(drawable, mesh){
    const gl = this.gl;
    if(drawable.vertex_buffer != null){
        gl.deleteVertexArray(drawable.vertex_buffer.vao);
        gl.deleteBuffer(drawable.vertex_buffer.vbo);
        gl.deleteBuffer(drawable.vertex_buffer.ebo);
    }
    drawable.vertex_buffer = this.create_vertex_buffer(mesh.vertices, [
                            { name: "position_attrib", size: 3 },
                            { name: "normal_attrib", size: 3 }
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
                                    { name: "position_attrib", size: 3 },
                                    { name: "normal_attrib", size: 3 }
                                ], mesh.indices);
    }
    else{
        gl.bindBuffer(gl.ARRAY_BUFFER, drawable.vertex_buffer.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.DYNAMIC_DRAW);
    }
}

function resize_event(ctx){
    ctx.gl.canvas.width = window.innerWidth;
    ctx.gl.canvas.height = window.innerHeight;

    ctx.gl.bindFramebuffer(ctx.gl.FRAMEBUFFER, postprocess_framebuffer);
    ctx.gl.bindTexture(ctx.gl.TEXTURE_2D, postprocess_texture);
    ctx.gl.texImage2D(ctx.gl.TEXTURE_2D, 0, ctx.gl.RGBA, ctx.gl.canvas.width, ctx.gl.canvas.height, 0, ctx.gl.RGBA, ctx.gl.UNSIGNED_BYTE, null);
    ctx.gl.bindRenderbuffer(ctx.gl.RENDERBUFFER, postprocess_renderbuffer);
    ctx.gl.renderbufferStorage(ctx.gl.RENDERBUFFER, ctx.gl.DEPTH_COMPONENT16, ctx.gl.canvas.width, ctx.gl.canvas.height);
    ctx.gl.bindFramebuffer(ctx.gl.FRAMEBUFFER, null);

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
addEventListener("resize", () => resize_event(ctx));

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
const green = [0.143, 0.867, 0.095];

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
    update_camera_orbit(scene.camera);

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
            ...world_to_screen_space(scene, scene.camera, [charge.pos[0]-charge.size, charge.pos[1]+charge.size, 0.1]),
            ...world_to_screen_space(scene, scene.camera, [charge.pos[0]+charge.size, charge.pos[1]-charge.size, 0.1])
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
    update_camera_orbit(scene.camera);

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
    create_rect([-5, ctx.scenes["scene_relativity"].cable_y_pos-0.44, 0], [10, 0.6]),
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
    create_rect([0, 0, 0], [0.8, 0.4]),
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

ctx.text_buffers["gamma_ray_text_wavelength"] = {text: "0.01nm              10nm                               400nm                       700nm                       1 mm                      100 km", color: [0, 0, 0], transform: mat4_mat4_mul(
                    scale_3d([0.0012, 0.0012, 0.0012]),
                    translate_3d([-1.2, -0.02, 0]))};
ctx.text_buffers["gamma_ray_text"] = {text: "Gamma rays          X rays              UV                                                           IR        Microwave        Radio waves", color: [0, 0, 0], transform: mat4_mat4_mul(
                    scale_3d([0.0012, 0.0012, 0.0012]),
                    translate_3d([-1.2, -0.245, 0]))};

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
    create_rect([0, 0, 0], [6, 2.4]),
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

let magnet_y_pos = 0.85;
let magnetic_field_drawables = update_magnetic_field([-0.25, magnet_y_pos, 0], [0.25, magnet_y_pos, 0]);
let voltmeter_transform =  mat4_mat4_mul(
    translate_3d([0, -1.5, 0.3]),
    scale_3d([0.4, 0.4, 0.4]),
)
let coil = ctx.create_drawable("shader_shaded", null, [0.722, 0.451, 0.200], voltmeter_transform);
let voltmeter = ctx.create_drawable("shader_shaded", null, [0.6, 0.6, 0.6], voltmeter_transform);
let voltmeter_screen = ctx.create_drawable("shader_basic", null, [0.9, 0.9, 0.9], voltmeter_transform);
let voltmeter_arrow = ctx.create_drawable("shader_shaded", null, [0.1, 0.1, 0.1], mat4_mat4_mul(
    mat4_mat4_mul(
        rotate_3d(axis_angle_to_quat(vec3_normalize([0, 0, 1]), rad(0))),
        translate_3d([0, 0.3, 4]),
    ),
    voltmeter_transform,
)
);

let magnet_north = ctx.create_drawable("shader_shaded",
    create_box(0.75, 0.75, 0.75), red, translate_3d([-0.375, magnet_y_pos, 0]));
let magnet_south = ctx.create_drawable("shader_shaded",
    create_box(0.75, 0.75, 0.75), blue, translate_3d([0.375, magnet_y_pos, 0]));
let magnet_pos_average = [];
let magnet_pos = 0;

let show_magnetic_field = false;

document.getElementById("show-field-checkbox").checked = show_magnetic_field;
document.getElementById("show-field-checkbox").addEventListener("change", function(e){
    show_magnetic_field = this.checked;
});
document.getElementById("magnet-input").value = magnet_pos;
document.getElementById("magnet-input").addEventListener("input", function(e){
    magnet_pos = parseFloat(e.target.value);
    
    if(magnet_pos_average.length < 10){
        magnet_pos_average.push(magnet_pos);
    }
    else{
        magnet_pos_average.push(magnet_pos);
        magnet_pos_average.shift();
    }

    magnet_south.transform = translate_3d([0.375+magnet_pos*2, magnet_y_pos, 0]);
    magnet_north.transform = translate_3d([-0.375+magnet_pos*2, magnet_y_pos, 0]);

    for(let line of magnetic_field_drawables){
        line.transform = translate_3d([magnet_pos*2, 0, 0]);
    }
});
setInterval(function(){
    if(magnet_pos_average.length < 10){
        magnet_pos_average.push(0);
    }
    else{
        magnet_pos_average.push(0);
        magnet_pos_average.shift();
    }

    let average = 0;
    for(let i = 0; i < magnet_pos_average.length; i++){
        average += magnet_pos_average[i];
    }
    average /= magnet_pos_average.length;

    voltmeter_arrow.transform = mat4_mat4_mul(
        mat4_mat4_mul(
            rotate_3d(axis_angle_to_quat(vec3_normalize([0, 0, 1]), rad(remap_value(average, -1, 1, 85, -85)))),
            translate_3d([0, 0.3, 4]),
        ),
        voltmeter_transform,
    );
}, 10);
// scene_induction setup

// scene_ampere setup
let ampere_transform = mat4_mat4_mul(
    translate_3d([0, 0, 0]),
    scale_3d([0.4, 0.4, 0.4]),
);

let coil_ampere = ctx.create_drawable("shader_shaded", null, [0.722, 0.451, 0.200], ampere_transform);
let battery1 = ctx.create_drawable("shader_shaded", null, [0.3, 0.3, 0.3], mat4_identity());
let battery2 = ctx.create_drawable("shader_shaded", null, [0.841, 0.500, 0.189], mat4_identity());
let battery_cap1 = ctx.create_drawable("shader_shaded", null, [0.7, 0.7, 0.7], mat4_mat4_mul(
    mat4_mat4_mul(
        scale_3d([0.5, 0.5, 0.5]),
        translate_3d([1.75, 2.2, 0]),
    ),
    ampere_transform,
));
let battery_cap2 = ctx.create_drawable("shader_shaded", null, [0.7, 0.7, 0.7], mat4_mat4_mul(
    mat4_mat4_mul(
        scale_3d([0.5, 0.5, 0.5]),
        translate_3d([-0.95, 2.2, 0]),
    ),
    ampere_transform,
));
let magnet_transform = mat4_mat4_mul(
    mat4_mat4_mul(
        translate_3d([4.5, 0, -1]),
        rotate_3d(axis_angle_to_quat(vec3_normalize([1, 0, 0]), rad(90))),
    ),
    scale_3d([0.7, 0.7, 0.7]),
);
let magnet = ctx.create_drawable("shader_shaded", null, [0.4, 0.4, 0.4], magnet_transform);
let magnet_arrow1 = ctx.create_drawable("shader_shaded", null, [0.9, 0.9, 0.9], mat4_identity());
let magnet_arrow2 = ctx.create_drawable("shader_shaded", null, red, mat4_identity());

function update_ampere_scene(voltage, average){
    battery1.transform = mat4_mat4_mul(
        rotate_3d(axis_angle_to_quat(vec3_normalize([0, 1, 0]), rad(voltage < 0 ? 180 : 0))),
        ampere_transform);
    battery2.transform = mat4_mat4_mul(
            mat4_mat4_mul(ampere_transform, translate_3d([0.644, 0, 0])),
            rotate_3d(axis_angle_to_quat(vec3_normalize([0, 1, 0]), rad(voltage < 0 ? 180 : 0))),
        );

    let magnet_rotation = lerp(0, 180, remap_value(average, -1, 1, 1, 0));
    magnet_arrow1.transform = mat4_mat4_mul(
        mat4_mat4_mul(
            translate_3d([0, 0, -0.2]),
            rotate_3d(axis_angle_to_quat(vec3_normalize([0, 1, 0]), rad(magnet_rotation+90))),
        ), magnet_transform);
    magnet_arrow2.transform = mat4_mat4_mul(
        mat4_mat4_mul(
            translate_3d([0, 0, -0.2]),
            rotate_3d(axis_angle_to_quat(vec3_normalize([0, 1, 0]), rad(magnet_rotation-90))),
        ), magnet_transform);
}

let ampere_voltage = 0;
let average_ampere_voltage = [0];
document.getElementById("voltage-input-ampere").value = ampere_voltage;
document.getElementById("voltage-input-ampere").addEventListener("input", function(e){
    let new_voltage = parseFloat(e.target.value);
    ampere_voltage = new_voltage;
    document.getElementById("voltage-display").innerHTML = Math.floor(new_voltage*10);
});
setInterval(function(){
    if(average_ampere_voltage.length < 10){
        average_ampere_voltage.push(ampere_voltage > 0 ? 1 : -1);
    }
    else{
        average_ampere_voltage.push(ampere_voltage > 0 ? 1 : -1);
        average_ampere_voltage.shift();
    }
    let average = 0;
    for(let i = 0; i < average_ampere_voltage.length; i++){
        average += average_ampere_voltage[i];
    }
    average /= average_ampere_voltage.length;
    update_ampere_scene(ampere_voltage, average);
}, 10);
// scene_ampere setup

// scene_transport
let apple_transform_transport = mat4_mat4_mul(
    translate_3d([0, -1, 0]),
    scale_3d([0.5, 0.5, 0.5])
);
let sun = ctx.create_drawable("shader_basic", create_uv_sphere(0.5, 32, 32, true), [1, 1, 0], translate_3d([-2.8, 1, 0]),
[
    { name: "position_attrib", size: 3 },
    { name: "normal_attrib", size: 3 },
    { name: "texcoord_attrib", size: 2 },
]);
let eye = ctx.create_drawable("shader_eye", create_uv_sphere(0.4, 32, 32, true), [1, 1, 0], mat4_mat4_mul(
    mat4_mat4_mul(
        rotate_3d(axis_angle_to_quat(vec3_normalize([0, 1, 0]), rad(20))),
        rotate_3d(axis_angle_to_quat(vec3_normalize([0, 0, 1]), rad(20))),
    ),
    translate_3d([2, 1, 0]),
),
[
    { name: "position_attrib", size: 3 },
    { name: "normal_attrib", size: 3 },
    { name: "texcoord_attrib", size: 2 },
]);
let eye_texture = null;

let wave_param_sun_to_apple = {
    num_points: 500,
    width: 3,
    amplitude: 0.1,
    frequency: 6,
    thickness: 0.02,
    z_range: 0,
    time: 0,
};
let wave_sun_to_apple = {vertex_buffer: null, shader: "shader_basic"};
wave_sun_to_apple.transform = mat4_mat4_mul(
    rotate_3d(axis_angle_to_quat(vec3_normalize([0, 0, 1]), rad(-30))),
    translate_3d([-3, 1, 0]),
);

let wave_param_apple_to_eye = {
    num_points: 500,
    width: 2,
    amplitude: 0.1,
    frequency: 6,
    thickness: 0.02,
    z_range: 0,
    time: 0,
};
let wave_apple_to_eye = {vertex_buffer: null, shader: "shader_basic"};
wave_apple_to_eye.transform = mat4_mat4_mul(
    rotate_3d(axis_angle_to_quat(vec3_normalize([0, 0, 1]), rad(40))),
    translate_3d([0.3, -0.4, 0]),
);
// scene_transport
// scene_apple
let apple_transform = mat4_identity();
let apple = ctx.create_drawable("shader_apple", null, [1, 0, 0], apple_transform);
let apple_stem = ctx.create_drawable("shader_apple", null, [0.467, 0.318, 0.251], apple_transform);
let apple_leaf = ctx.create_drawable("shader_apple", null, [0.380, 0.627, 0.149], apple_transform);

let wave_param_apple = {
    num_points: 500,
    width: 3.7,
    amplitude: 0.1,
    frequency: 6,
    thickness: 0.02,
    z_range: 0,
    time: 0,
};
let wave_param_2_apple = {
    num_points: 500,
    width: 3.7,
    amplitude: 0.1,
    frequency: 6,
    thickness: 0.02,
    z_range: 0,
    time: 0,
};
let wave_blue_3d = {vertex_buffer: null, shader: "shader_basic"};
let wave_violet_3d = {vertex_buffer: null, shader: "shader_basic"};
let wave_red_3d = {vertex_buffer: null, shader: "shader_basic"};
let wave_red_2_3d = {vertex_buffer: null, shader: "shader_basic"};
let wave_green_3d = {vertex_buffer: null, shader: "shader_basic"};
let wave_1_pos = [0.6, 0.0, 0];
wave_red_2_3d.transform =
mat4_mat4_mul(
    rotate_3d(axis_angle_to_quat(vec3_normalize([0, 0, 1]), rad(-20))),
    translate_3d([0.5, 0.3, 0]),
    );

wave_blue_3d.transform =
mat4_mat4_mul(
mat4_mat4_mul(
    translate_3d([0.0, 0.08, 0.0]),
    rotate_3d(axis_angle_to_quat(vec3_normalize([0, 0, 1]), rad(45))),
    ),
    translate_3d(vec3_add(wave_1_pos, [0.0, 0.0, 0.0])),
    );
wave_violet_3d.transform =
mat4_mat4_mul(
mat4_mat4_mul(
    translate_3d([0.0, 0.1, 0.0]),
    rotate_3d(axis_angle_to_quat(vec3_normalize([0, 0, 1]), rad(45))),
    ),
    translate_3d(vec3_add(wave_1_pos, [0.0, 0.0, 0.0])),
    );
wave_green_3d.transform =
mat4_mat4_mul(
mat4_mat4_mul(
    translate_3d([0.0, 0.04, 0.0]),
    rotate_3d(axis_angle_to_quat(vec3_normalize([0, 0, 1]), rad(45))),
    ),
    translate_3d(vec3_add(wave_1_pos, [0.0, 0.0, 0.0])),
    );
wave_red_3d.transform =
mat4_mat4_mul(
mat4_mat4_mul(
    translate_3d([0.0, 0.00, 0.0]),
    rotate_3d(axis_angle_to_quat(vec3_normalize([0, 0, 1]), rad(45))),
    ),
    translate_3d(vec3_add(wave_1_pos, [0.0, 0.0, 0.0])),
    );
// scene_apple
// scene_bulb_graphs
let voltage_graph_position = [-2.4, -0.5, 0];
let scene_bulb_graph_x_axis = ctx.create_drawable("shader_basic", create_arrow([0, 0, 0], [1.4, 0, 0], [0.02, 0.04]), [0.4, 0.4, 0.4], translate_3d(voltage_graph_position));
let scene_bulb_graph_y_axis = ctx.create_drawable("shader_basic", create_arrow([0, 0, 0], [0, 1, 0], [0.02, 0.04]), [0.4, 0.4, 0.4], translate_3d(voltage_graph_position));
let voltage_graph_num_points = 400;
let voltage_graph = [];
for(let i = 0; i < voltage_graph_num_points; i++){
    voltage_graph.push(0.1);
}
let voltage_graph_drawable_points = [];
for(let i = 0; i < voltage_graph.length; i++){
    let x = i * 1.3 / (voltage_graph_num_points-1);
    voltage_graph_drawable_points.push([x, voltage_graph[i], 0]);
}
let voltage_graph_drawable = ctx.create_drawable("shader_basic", null, blue, translate_3d(voltage_graph_position));
ctx.update_drawable_mesh(voltage_graph_drawable, create_line(voltage_graph_drawable_points, 0.03, false));

let current_voltage = 0;
let current_current = 0;
let current_brightness = 0;
let current_temperature = 20;
document.getElementById("voltage-input").value = 0;
document.getElementById("voltage-input").addEventListener("input", (e) => {
    current_voltage = parseFloat(e.target.value);
});
ctx.text_buffers["graph_voltage_y_axis"] = {text: "Voltage", color: [0, 0, 0], transform: mat4_mat4_mul(
                    scale_3d([0.0025, 0.0025, 0.0025]),
                    translate_3d(vec3_add(voltage_graph_position, [-0.22, 1.05, 0])))};
ctx.text_buffers["graph_voltage_y_max"] = {text: "220 V", color: [0, 0, 0], transform: mat4_mat4_mul(
                    scale_3d([0.0025, 0.0025, 0.0025]),
                    translate_3d(vec3_add(voltage_graph_position, [-0.35, 0.75, 0])))};
ctx.text_buffers["graph_voltage_y_min"] = {text: "0 V", color: [0, 0, 0], transform: mat4_mat4_mul(
                    scale_3d([0.0025, 0.0025, 0.0025]),
                    translate_3d(vec3_add(voltage_graph_position, [-0.21, 0.1, 0])))};

let temperature_graph_position = [-0.5, -0.5, 0];
let scene_bulb_graph_x_axis_temperature = ctx.create_drawable("shader_basic", create_arrow([0, 0, 0], [1.4, 0, 0], [0.02, 0.04]), [0.4, 0.4, 0.4], translate_3d(temperature_graph_position));
let scene_bulb_graph_y_axis_temperature = ctx.create_drawable("shader_basic", create_arrow([0, 0, 0], [0, 1, 0], [0.02, 0.04]), [0.4, 0.4, 0.4], translate_3d(temperature_graph_position));
let temperature_graph_num_points = 400;
let temperature_graph = [];
for(let i = 0; i < temperature_graph_num_points; i++){
    temperature_graph.push(0.1);
}
let temperature_graph_drawable_points = [];
for(let i = 0; i < temperature_graph.length; i++){
    let x = i * 1.3 / (temperature_graph_num_points-1);
    temperature_graph_drawable_points.push([x, temperature_graph[i], 0]);
}
let temperature_graph_drawable = ctx.create_drawable("shader_basic", null, red, translate_3d(temperature_graph_position));
ctx.update_drawable_mesh(temperature_graph_drawable, create_line(temperature_graph_drawable_points, 0.03, false));

ctx.text_buffers["graph_temperature_y_axis"] = {text: "Temperature", color: [0, 0, 0], transform: mat4_mat4_mul(
                    scale_3d([0.0025, 0.0025, 0.0025]),
                    translate_3d(vec3_add(temperature_graph_position, [-0.22, 1.05, 0])))};
ctx.text_buffers["graph_temperature_y_max"] = {text: "2500°C", color: [0, 0, 0], transform: mat4_mat4_mul(
                    scale_3d([0.0025, 0.0025, 0.0025]),
                    translate_3d(vec3_add(temperature_graph_position, [-0.45, 0.75, 0])))};
ctx.text_buffers["graph_temperature_y_min"] = {text: "20°C", color: [0, 0, 0], transform: mat4_mat4_mul(
                    scale_3d([0.0025, 0.0025, 0.0025]),
                    translate_3d(vec3_add(temperature_graph_position, [-0.32, 0.1, 0])))};
let current_graph_position = [1.4, -0.5, 0];
let scene_bulb_graph_x_axis_current = ctx.create_drawable("shader_basic", create_arrow([0, 0, 0], [1.4, 0, 0], [0.02, 0.04]), [0.4, 0.4, 0.4], translate_3d(current_graph_position));
let scene_bulb_graph_y_axis_current = ctx.create_drawable("shader_basic", create_arrow([0, 0, 0], [0, 1, 0], [0.02, 0.04]), [0.4, 0.4, 0.4], translate_3d(current_graph_position));
let current_graph_num_points = 400;
let current_graph = [];
for(let i = 0; i < current_graph_num_points; i++){
    current_graph.push(0.1);
}
let current_graph_drawable_points = [];
for(let i = 0; i < current_graph.length; i++){
    let x = i * 1.3 / (current_graph_num_points-1);
    current_graph_drawable_points.push([x, current_graph[i], 0]);
}
let current_graph_drawable = ctx.create_drawable("shader_basic", null, green, translate_3d(current_graph_position));
ctx.update_drawable_mesh(current_graph_drawable, create_line(current_graph_drawable_points, 0.03, false));

ctx.text_buffers["graph_current_y_axis"] = {text: "Current", color: [0, 0, 0], transform: mat4_mat4_mul(
                    scale_3d([0.0025, 0.0025, 0.0025]),
                    translate_3d(vec3_add(current_graph_position, [-0.22, 1.05, 0])))}; 
ctx.text_buffers["graph_current_y_max"] = {text: "2 A", color: [0, 0, 0], transform: mat4_mat4_mul(
                    scale_3d([0.0025, 0.0025, 0.0025]),
                    translate_3d(vec3_add(current_graph_position, [-0.24, 0.75, 0])))}; 
ctx.text_buffers["graph_current_y_min"] = {text: "0 A", color: [0, 0, 0], transform: mat4_mat4_mul(
                    scale_3d([0.0025, 0.0025, 0.0025]),
                    translate_3d(vec3_add(current_graph_position, [-0.24, 0.1, 0])))}; 
// scene_bulb_graphs
// scene_led
let led_transform =
mat4_mat4_mul(
    translate_3d([0, -2, 0]),
    scale_3d([1.5, 1.5, 1.5])
);
let led_metal = ctx.create_drawable("shader_shaded", null, [0.5, 0.5, 0.5], led_transform);
let led_epoxy_case = ctx.create_drawable("shader_glass", null, [1, 1, 1], led_transform);
let led_reflective_case = ctx.create_drawable("shader_shaded", null, [0.5, 0.5, 0.5], led_transform);
// scene_led
// scene_sun
let sun_surface = ctx.create_drawable("shader_sun_surface", null, [1.000, 0.605, 0.020], mat4_identity());
let sun_cross = ctx.create_drawable("shader_sun_cross", null, [0.826, 0.344, 0.000], mat4_identity());
let sun_core = ctx.create_drawable("shader_basic", create_uv_sphere(0.4, 32, 32, true), [1.000, 0.948, 0.880], mat4_identity(),
[
    { name: "position_attrib", size: 3 },
    { name: "normal_attrib", size: 3 },
    { name: "texcoord_attrib", size: 2 },
]);

let core_position = [0, 0, 0, 1];
let core_text_position = [1.72, 0.83, 0];
let line_core = ctx.create_drawable("shader_basic", create_line([], 0.01), [0.8, 0.8, 0.8], translate_3d([0, 0, 0]));
ctx.text_buffers["sun_core"] = {text: "Core", color: [0.8, 0.8, 0.8], transform: mat4_mat4_mul(scale_3d([0.0025, 0.0025, 0.0025]), translate_3d(core_text_position))};

let radiativezone_position = [0.1, 0.6, 0, 1];
let radiativezone_text_position = [0.8, 1.0, 0];
let line_radiativezone = ctx.create_drawable("shader_basic", create_line([], 0.01), [0.8, 0.8, 0.8], translate_3d([0, 0, 0]));
ctx.text_buffers["sun_radiativezone"] = {text: "Radiative Zone", color: [0.8, 0.8, 0.8], transform: mat4_mat4_mul(scale_3d([0.0025, 0.0025, 0.0025]), translate_3d(radiativezone_text_position))};

let convectivezone_position = [0, 0.5, 0.75, 1];
let convectivezone_text_position = [-1.5, 1.0, 0];
let line_convectivezone = ctx.create_drawable("shader_basic", create_line([], 0.01), [0.8, 0.8, 0.8], translate_3d([0, 0, 0]));
ctx.text_buffers["sun_convectivezone"] = {text: "Convective Zone", color: [0.8, 0.8, 0.8], transform: mat4_mat4_mul(scale_3d([0.0025, 0.0025, 0.0025]), translate_3d(convectivezone_text_position))};

let photosphere_position = [...vec3_normalize(vec3_sub([0.2, -0.1, 0.3], [0, 0, 0])), 1];
let photosphere_text_position = [1.5, -0.4, 0];
let line_photosphere = ctx.create_drawable("shader_basic", create_line([], 0.01), [0.8, 0.8, 0.8], translate_3d([0, 0, 0]));
ctx.text_buffers["sun_photosphere"] = {text: "Photosphere", color: [0.8, 0.8, 0.8], transform: mat4_mat4_mul(scale_3d([0.0025, 0.0025, 0.0025]), translate_3d(photosphere_text_position))};

let ui_camera_sun = {
    fov: 50, z_near: 0.1, z_far: 1000,
    position: [0, 0, 0], rotation: [0, 0, 0],
    up_vector: [0, 1, 0],
    view_matrix: mat4_identity(),
    orbit: {rotation: [0, 0, 0], pivot: [0, 0, 0], zoom: 3.0}
};
update_camera_orbit(ui_camera_sun);
update_camera_projection_matrix(ui_camera_sun, ctx.scenes["scene_sun"].width/ctx.scenes["scene_sun"].height);

function generate_random_photon_walk(){
    const random_points = [[0, 0, 0]];
    let current_position = [0, 0, 0];
    const max_steps = 100;
    const step_size = 0.05;
    const forward_bias = 0.4;
    for (let i = 0; i < max_steps; i++) {
        let theta;
        
        if (Math.random() < forward_bias) {
            theta = Math.random() * Math.PI * 0.5;
        } else {
            theta = Math.random() * Math.PI * 2;
        }
        
        const dx = Math.cos(theta) * step_size;
        const dy = Math.sin(theta) * step_size;
        
        const new_x = current_position[0] + dx;
        const new_y = current_position[1] + dy;
        
        if (new_x >= 0 && new_y >= 0) {
            current_position = [new_x, new_y, 0];
            random_points.push([...current_position]);
        } else {
            i--;
            continue;
        }
        
        const distance = Math.sqrt(
            current_position[0] * current_position[0] + 
            current_position[1] * current_position[1]
        );
        
        if (distance > 1) {
            const normalized = [
                current_position[0] / distance,
                current_position[1] / distance,
                0
            ];
            random_points[random_points.length - 1] = normalized;
            break;
        }
    }
    return random_points;
}

const num_rays = 5;
const photon_rays = [];
const photon_walks = [];
const photon_steps = [];
const photon_waits = [];
const ejected_spheres = [];
const sphere_positions = [];
const sphere_velocities = [];
const sphere_active = [];

for (let i = 0; i < num_rays; i++) {
    let line_ray = ctx.create_drawable("shader_basic", create_line_3d([0, 0, 0], 0.01, 16), [1, 1, 1], translate_3d([0, 0, 0]));
    photon_rays.push(line_ray);
    photon_walks.push(generate_random_photon_walk());
    photon_steps.push(1);
    photon_waits.push(0);
    
    let sphere = ctx.create_drawable("shader_basic", create_uv_sphere(0.02, 16, 16, true), [1, 1, 1], mat4_identity(),
    [
        { name: "position_attrib", size: 3 },
        { name: "normal_attrib", size: 3 },
        { name: "texcoord_attrib", size: 2 },
    ]);
    ejected_spheres.push(sphere);
    sphere_positions.push([0, 0, 0]);
    sphere_velocities.push([0, 0, 0]);
    sphere_active.push(false);
}

setInterval(function() {
    for (let i = 0; i < num_rays; i++) {
        if (photon_steps[i] < photon_walks[i].length) {
            photon_steps[i]++;
            ctx.update_drawable_mesh(photon_rays[i], create_line_3d(photon_walks[i].slice(0, photon_steps[i]), 0.01, 16));
            
            if (photon_steps[i] === photon_walks[i].length - 1) {
                const exit_point = photon_walks[i][photon_walks[i].length - 1];
                sphere_positions[i] = [...exit_point];
                sphere_velocities[i] = [exit_point[0] * 0.02, exit_point[1] * 0.02, exit_point[2] * 0.02];
                sphere_active[i] = true;
                ejected_spheres[i].transform = translate_3d(sphere_positions[i]);
            }
        } else {
            photon_waits[i]++;
            if (photon_waits[i] > 40) {
                photon_walks[i] = generate_random_photon_walk();
                photon_steps[i] = 1;
                photon_waits[i] = 0;
            }
        }
        
        if (sphere_active[i]) {
            sphere_positions[i][0] += sphere_velocities[i][0];
            sphere_positions[i][1] += sphere_velocities[i][1];
            sphere_positions[i][2] += sphere_velocities[i][2];
            ejected_spheres[i].transform = translate_3d(sphere_positions[i]);
            
            const distance = Math.sqrt(
                sphere_positions[i][0] * sphere_positions[i][0] + 
                sphere_positions[i][1] * sphere_positions[i][1] + 
                sphere_positions[i][2] * sphere_positions[i][2]
            );
            
            if (distance > 2) {
                sphere_active[i] = false;
                sphere_positions[i] = [0, 0, 0];
                sphere_velocities[i] = [0, 0, 0];
                ejected_spheres[i].transform = translate_3d([10, 10, 10]);
            }
        }
    }
}, 10);

// scene_sun
// scene_bulb
let bulb_transform =
mat4_mat4_mul(
    translate_3d([-0.5, 0, 0]),
    scale_3d([1.3, 1.3, 1.3])
);
let bulb = ctx.create_drawable("shader_glass", null, [1, 1, 1], bulb_transform);
let bulb2 = ctx.create_drawable("shader_glass", null, [1, 1, 1], bulb_transform);
let bulb_screw = ctx.create_drawable("shader_shaded", null, [0.8, 0.8, 0.8], bulb_transform);
let bulb_screw_black = ctx.create_drawable("shader_shaded", null, [0.3, 0.3, 0.3], bulb_transform);
let bulb_wire = ctx.create_drawable("shader_shaded", null, [0.2, 0.2, 0.2], bulb_transform);
let bulb_wire_holder = ctx.create_drawable("shader_shaded", null, [0.2, 0.2, 0.2], bulb_transform);
let zoom_circle_pos = [1.4, 0, 0];
let zoom_circle_radius = 0.9;
let zoom_circle = ctx.create_drawable("shader_basic", create_circle_stroke(zoom_circle_pos, zoom_circle_radius, 64, 0.01), [0.4, 0.4, 0.4], translate_3d([0, 0, 0]));
let mask_circle = ctx.create_drawable("shader_basic", create_circle(zoom_circle_pos, zoom_circle_radius, 64), [0, 0, 0], translate_3d([0, 0, 0]));
let zoom_point = [-0.6, 0.545, 0];
let dx = zoom_circle_pos[0] - zoom_point[0];
let dy = zoom_circle_pos[1] - zoom_point[1];
let dist = Math.sqrt(dx*dx + dy*dy);
let angle = Math.acos(zoom_circle_radius/dist);
let base_angle = Math.atan2(dy, dx);
let tangent1_angle = base_angle + angle;
let tangent2_angle = base_angle - angle;
let tangent1_point = [
    zoom_circle_pos[0] - zoom_circle_radius * Math.cos(tangent1_angle),
    zoom_circle_pos[1] - zoom_circle_radius * Math.sin(tangent1_angle),
    zoom_circle_pos[2]
];
let tangent2_point = [
    zoom_circle_pos[0] - zoom_circle_radius * Math.cos(tangent2_angle),
    zoom_circle_pos[1] - zoom_circle_radius * Math.sin(tangent2_angle),
    zoom_circle_pos[2]
];
let zoom_line_1 = ctx.create_drawable("shader_basic", create_line_dashed([tangent1_point, zoom_point], 0.01, 0.03, 0.015), [0.4, 0.4, 0.4], translate_3d([0, 0, 0]));
let zoom_line_2 = ctx.create_drawable("shader_basic", create_line_dashed([tangent2_point, zoom_point], 0.01, 0.03, 0.015), [0.4, 0.4, 0.4], translate_3d([0, 0, 0]));
let ui_camera = {
    fov: 50, z_near: 0.1, z_far: 1000,
    position: [0, 0, 0], rotation: [0, 0, 0],
    up_vector: [0, 1, 0],
    view_matrix: mat4_identity(),
    orbit: {rotation: [0, 0, 0], pivot: [0, 0, 0], zoom: 3.0}
};
update_camera_orbit(ui_camera);
update_camera_projection_matrix(ui_camera, ctx.scenes["scene_bulb"].width/ctx.scenes["scene_bulb"].height);

function update_particle_pos(particle){
    particle.particle.transform = translate_3d(particle.pos);
    particle.particle_background.transform = translate_3d(particle.pos);
}

function add_particle(scene, pos, particle_size = 0.25, border_size = 0.21, particle_type){
    let particle_background_color;
    if(particle_type == "tungsten"){
        particle_background_color = [0.7, 0.7, 0.7];
    }
    else if(particle_type == "electron"){
        particle_background_color = [0.000, 0.625, 1.000];
    }

    let particle_background = ctx.create_drawable("shader_basic", create_circle([0, 0, 0], particle_size, 32), [0.1, 0.1, 0.1], mat4_identity());
    let particle = ctx.create_drawable("shader_basic", create_circle([0, 0, 0], border_size, 32), particle_background_color, mat4_identity());

    let id = scene.particles.length;

    let text_id = "";
    if(particle_type == "tungsten"){
        text_id = "tungsten_w_"+id;
        ctx.text_buffers["tungsten_w_"+id] = {text: "W", color: [0, 0, 0], transform: mat4_mat4_mul(
            scale_3d([0.0025, 0.0025, 0.0025]),
            translate_3d(vec3_sub(pos, [0.06, 0.04, 0.0])),
        )};
    }
    else if(particle_type == "electron"){
        text_id = "electron_w_"+id;
        ctx.text_buffers["electron_w_"+id] = {text: "e", color: [0, 0, 0], transform: mat4_mat4_mul(
                        scale_3d([0.0025, 0.0025, 0.0025]),
                        translate_3d(vec3_sub(pos, [0.032, 0.03, 0.0])),
                    )};
    }

    scene.particles.push({id: id, particle: particle, particle_background: particle_background, pos: pos, size: particle_size, text_id: text_id});
    update_particle_pos(scene.particles[scene.particles.length-1]);
    return id;
}

let spacing = 0.2;
let start_x = zoom_circle_pos[0] - zoom_circle_radius + spacing;
let start_y = zoom_circle_pos[1] - zoom_circle_radius + spacing;

let tungsten_particles = [];
for(let i = 0; i < 9; i++) {
    for(let j = 0; j < 4; j++) {
        let x = start_x + spacing * i;
        let y = start_y + spacing * j;

        tungsten_particles.push(add_particle(
            ctx.scenes["scene_bulb"],
            [x-0.15, y-0.1, 0.1],
            0.1,
            0.08,
            "tungsten"
        ));
    }
}
let electron_particles = [];
for(let i = 0; i < 9; i++) {
    for(let j = 0; j < 3; j++) {
        let x = start_x - 0.2 + spacing * i + (Math.random() - 0.5) * 0.05;
        let y = start_y + 0.1 + spacing * j + (Math.random() - 0.5) * 0.09;
        electron_particles.push(add_particle(
            ctx.scenes["scene_bulb"],
            [x-0.15, y-0.1, 0.1],
            0.07,
            0.05,
            "electron"
        ));
    }
}

let photon_waves = [];
let photon_wave_param = {
    num_points: 500,
    width: 0.4,
    amplitude: 0.05,
    frequency: 20,
    thickness: 0.013,
    z_range: 0,
    time: 0,
};
let number_photons = 9;
for (let i = 0; i < number_photons; i++) {
    let photon_wave = {vertex_buffer: null, shader: "shader_basic"};
    let random_angle = rad(74 + Math.random() * 20);
    let random_pos;
    let overlap;
    do {
        overlap = false;
        random_pos = [
            zoom_circle_pos[0] + (Math.random() - 0.5) * zoom_circle_radius * 2,
            zoom_circle_pos[1] + (Math.random() - 0.5) * 0.4 - 0.4,
            zoom_circle_pos[2]
        ];
        for (let j = 0; j < photon_waves.length; j++) {
            let dx = random_pos[0] - photon_waves[j].transform[12];
            let dy = random_pos[1] - photon_waves[j].transform[13];
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 0.2) {
                overlap = true;
                break;
            }
        }
    } while (overlap);
    photon_wave.transform = mat4_mat4_mul(
        rotate_3d(axis_angle_to_quat([0, 0, 1], random_angle)),
        translate_3d(random_pos),
    );
    photon_wave.angle = random_angle;
    photon_wave.color = [1.000, 0.885, 0.000];
    ctx.update_wave_3d(photon_wave, photon_wave_param, lines_segments_3d);
    photon_waves.push(photon_wave);
}
// scene_bulb
let fullscreen_quad = ctx.create_drawable("shader_postprocess", {
    vertices: [
        -1, -1, 0, 0, 0,
         1, -1, 0, 1, 0,
         1,  1, 0, 1, 1,
        -1,  1, 0, 0, 1
    ],
    indices: [
        0, 1, 2,
        0, 2, 3
    ]
}, [1, 0, 1], mat4_identity(), [
    { name: "position_attrib", size: 3 },
    { name: "texcoord_attrib", size: 2 }
]);

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
    gl.depthFunc(gl.LESS);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ctx.font_texture);

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
            ctx.draw(ctx.text_buffers["gamma_ray_text_wavelength"]);
            ctx.draw(ctx.text_buffers["gamma_ray_text"]);
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
            ctx.draw(voltmeter);
            ctx.draw(voltmeter_screen);
            ctx.draw(voltmeter_arrow);
            ctx.draw(magnet_south);
            ctx.draw(magnet_north);
            if(show_magnetic_field){
                for(let line of magnetic_field_drawables){
                    ctx.draw(line);
                }
            }
        }
        else if(scene_id == "scene_ampere"){
            ctx.draw(coil_ampere);
            ctx.draw(battery1);
            ctx.draw(battery2);
            ctx.draw(battery_cap1);
            ctx.draw(battery_cap2);
            ctx.draw(magnet);
            ctx.draw(magnet_arrow1);
            ctx.draw(magnet_arrow2);
        }
        else if(scene_id == "scene_transport"){
            apple.transform = apple_transform_transport;
            ctx.draw(apple);
            apple_stem.transform = apple_transform_transport;
            ctx.draw(apple_stem);
            apple_leaf.transform = apple_transform_transport;
            ctx.draw(apple_leaf);
            
            ctx.draw(sun);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, eye_texture);
            ctx.draw(eye);

            wave_sun_to_apple.color = [1, 1, 0];
            wave_param_sun_to_apple.time -= 0.05;
            ctx.update_wave_3d(wave_sun_to_apple, wave_param_sun_to_apple, lines_segments_3d);
            ctx.draw(wave_sun_to_apple);
            ctx.draw(eye);

            wave_apple_to_eye.color = [1, 0, 0];
            wave_param_apple_to_eye.time -= 0.05;
            ctx.update_wave_3d(wave_apple_to_eye, wave_param_apple_to_eye, lines_segments_3d);
            ctx.draw(wave_apple_to_eye);
        }
        else if(scene_id == "scene_apple"){
            wave_red_2_3d.color = red;
            wave_red_3d.color = red;
            wave_blue_3d.color = [0.000, 0.493, 1.000];
            wave_green_3d.color = green;
            wave_violet_3d.color = [0.557, 0.000, 1.000];
            wave_param_apple.time += 0.05;
            wave_param_2_apple.time -= 0.05;
            ctx.update_wave_3d(wave_red_2_3d, wave_param_2_apple, lines_segments_3d);
            ctx.update_wave_3d(wave_red_3d, wave_param_apple, lines_segments_3d);
            ctx.update_wave_3d(wave_green_3d, wave_param_apple, lines_segments_3d);
            ctx.update_wave_3d(wave_blue_3d, wave_param_apple, lines_segments_3d);
            ctx.update_wave_3d(wave_violet_3d, wave_param_apple, lines_segments_3d);
            ctx.draw(wave_red_2_3d);
            ctx.draw(wave_red_3d);
            ctx.draw(wave_green_3d);
            ctx.draw(wave_blue_3d);
            ctx.draw(wave_violet_3d);
            apple.transform = apple_transform;
            ctx.draw(apple);
            apple_stem.transform = apple_transform;
            ctx.draw(apple_stem);
            apple_leaf.transform = apple_transform;
            ctx.draw(apple_leaf);
        }
        else if(scene_id == "scene_bulb_graphs"){
            ctx.draw(scene_bulb_graph_x_axis);
            ctx.draw(scene_bulb_graph_y_axis);

            let current_voltage_mapped = remap_value(current_voltage, 0, 220, 0.1, 0.8);
            voltage_graph.push(current_voltage_mapped);
            voltage_graph.shift();

            voltage_graph_drawable_points = [];
            for(let i = 0; i < voltage_graph.length; i++){
                let x = i * 1.3 / (voltage_graph_num_points-1);
                voltage_graph_drawable_points.push([x, voltage_graph[i], 0]);
            }
            ctx.update_drawable_mesh(voltage_graph_drawable, create_line(voltage_graph_drawable_points, 0.03, false));

            ctx.draw(voltage_graph_drawable);
            ctx.draw(ctx.text_buffers["graph_voltage_y_axis"]);
            ctx.draw(ctx.text_buffers["graph_voltage_y_max"]);
            ctx.draw(ctx.text_buffers["graph_voltage_y_min"]);

            ctx.draw(scene_bulb_graph_x_axis_temperature);
            ctx.draw(scene_bulb_graph_y_axis_temperature);

            current_temperature = 20 + 0.759 * Math.pow(current_voltage, 1.5);
            let current_temperature_mapped = remap_value(current_temperature, 20, 2500, 0.1, 0.8);
            temperature_graph.push(current_temperature_mapped);
            temperature_graph.shift();

            temperature_graph_drawable_points = [];
            for(let i = 0; i < temperature_graph.length; i++){
                let x = i * 1.3 / (temperature_graph_num_points-1);
                temperature_graph_drawable_points.push([x, temperature_graph[i], 0]);
            }
            ctx.update_drawable_mesh(temperature_graph_drawable, create_line(temperature_graph_drawable_points, 0.03, false));

            ctx.draw(temperature_graph_drawable);
            ctx.draw(ctx.text_buffers["graph_temperature_y_axis"]);
            ctx.draw(ctx.text_buffers["graph_temperature_y_max"]);
            ctx.draw(ctx.text_buffers["graph_temperature_y_min"]);

            ctx.draw(scene_bulb_graph_x_axis_current);
            ctx.draw(scene_bulb_graph_y_axis_current);

            let current_resistance = 10 * (1 + 0.0045 * (current_temperature - 20));
            current_current = current_voltage / current_resistance;
            let current_current_mapped = remap_value(current_current, 0, 2.3, 0.1, 0.8);
            current_graph.push(current_current_mapped);
            current_graph.shift();

            current_graph_drawable_points = [];
            for(let i = 0; i < current_graph.length; i++){
                let x = i * 1.3 / (current_graph_num_points-1);
                current_graph_drawable_points.push([x, current_graph[i], 0]);
            }
            ctx.update_drawable_mesh(current_graph_drawable, create_line(current_graph_drawable_points, 0.03, false));

            ctx.draw(current_graph_drawable);
            ctx.draw(ctx.text_buffers["graph_current_y_axis"]);
            ctx.draw(ctx.text_buffers["graph_current_y_max"]);
            ctx.draw(ctx.text_buffers["graph_current_y_min"]);
        }
        else if(scene_id == "scene_sun"){
            gl.depthFunc(gl.LESS);

            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            sun_core.transform = scale_3d([1, 1, 1]);
            ctx.draw(sun_surface);
            ctx.draw(sun_cross);
            ctx.draw(sun_core);

            for(let ray of photon_rays){
                ctx.draw(ray);
            }

            for(let sphere of ejected_spheres){
                ctx.draw(sphere);
            }

            ctx.gl.bindFramebuffer(ctx.gl.FRAMEBUFFER, postprocess_framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.scissor(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            sun_core.transform = scale_3d([1.5, 1.5, 1.5]);
            gl.colorMask(false, false, false, false);
            ctx.draw(sun_surface);
            ctx.draw(sun_cross);
            gl.colorMask(true, true, true, true);
            ctx.draw(sun_core);
            ctx.gl.bindFramebuffer(ctx.gl.FRAMEBUFFER, null);
            
            gl.useProgram(ctx.shaders["shader_postprocess"].program);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, postprocess_texture);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.uniform1i(ctx.shaders["shader_postprocess"].uniforms["framebuffer_texture"].location, 1);
            const u_min = left / gl.canvas.width;
            const v_min = bottom / gl.canvas.height;
            const u_max = (left + width) / gl.canvas.width;
            const v_max = (bottom + height) / gl.canvas.height;
            gl.uniform4f(ctx.shaders["shader_postprocess"].uniforms["scissor_texcoords"].location, u_min, v_min, u_max, v_max);

            gl.bindVertexArray(fullscreen_quad.vertex_buffer.vao);
            ctx.set_shader_uniform(ctx.shaders["shader_postprocess"], "p", mat4_identity());
            ctx.set_shader_uniform(ctx.shaders["shader_postprocess"], "v", mat4_identity());
            ctx.set_shader_uniform(ctx.shaders["shader_postprocess"], "brightness", 1);
            ctx.set_shader_uniform(ctx.shaders["shader_postprocess"], "lod", 1.0);
            gl.drawElements(gl.TRIANGLES, fullscreen_quad.vertex_buffer.draw_count, gl.UNSIGNED_SHORT, 0);

            gl.depthFunc(gl.ALWAYS);

            function weird_thing(point){
                let tmp = world_to_screen_space(scene, scene.camera, point);
                let tmp2 = screen_to_world_space(scene, tmp, ui_camera_sun.orbit.zoom, ui_camera_sun);
                return [tmp2[0], tmp2[1], 0];
            }

            ctx.draw(line_core, {"metallic": 0}, ui_camera_sun);
            ctx.update_drawable_mesh(line_core, create_line_dashed([
                vec3_add(core_text_position, [-0.04, 0, 0]),
                weird_thing(core_position)
            ], 0.01, 0.03, 0.015));
            ctx.draw(ctx.text_buffers["sun_core"], {}, ui_camera_sun);

            ctx.draw(line_radiativezone, {"metallic": 0}, ui_camera_sun);
            ctx.update_drawable_mesh(line_radiativezone, create_line_dashed([
                vec3_add(radiativezone_text_position, [-0.03, -0.05, 0]),
                weird_thing(radiativezone_position)
            ], 0.01, 0.03, 0.015));
            ctx.draw(ctx.text_buffers["sun_radiativezone"], {}, ui_camera_sun);

            ctx.draw(line_convectivezone, {"metallic": 0}, ui_camera_sun);
            ctx.update_drawable_mesh(line_convectivezone, create_line_dashed([
                vec3_add(convectivezone_text_position, [0.35, -0.05, 0]),
                weird_thing(convectivezone_position)
            ], 0.01, 0.03, 0.015));
            ctx.draw(ctx.text_buffers["sun_convectivezone"], {}, ui_camera_sun);

            ctx.draw(line_photosphere, {"metallic": 0}, ui_camera_sun);
            ctx.update_drawable_mesh(line_photosphere, create_line_dashed([
                vec3_add(photosphere_text_position, [0.35, -0.05, 0]),
                weird_thing(photosphere_position)
            ], 0.01, 0.03, 0.015));
            ctx.draw(ctx.text_buffers["sun_photosphere"], {}, ui_camera_sun);
        }
        else if(scene_id == "scene_led"){
            ctx.draw(led_metal);
            ctx.draw(led_epoxy_case, {"alpha": 0.5});
            ctx.draw(led_reflective_case);
        }
        else if(scene_id == "scene_bulb"){
            ctx.draw(bulb_screw, {"metallic": 1});
            ctx.draw(bulb_screw_black, {"metallic": 0});
            ctx.draw(bulb_wire, {"metallic": 0});
            ctx.draw(bulb_wire_holder, {"metallic": 0});
            ctx.draw(bulb2, {"alpha": 0.4});
            ctx.draw(bulb, {"alpha": 0.4});
            
            gl.clear(gl.STENCIL_BUFFER_BIT);
            gl.enable(gl.STENCIL_TEST);

            gl.stencilMask(0xFF);
            gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
            gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);

            gl.colorMask(false, false, false, false);
            gl.depthMask(false);
            ctx.draw(mask_circle, { "metallic": 0 }, ui_camera);

            gl.colorMask(true, true, true, true);
            gl.depthMask(true);
            gl.stencilFunc(gl.EQUAL, 1, 0xFF);
            gl.stencilMask(0x00);

            gl.depthFunc(gl.ALWAYS);

            for (const particle_id of tungsten_particles) {
                const particle = scene.particles[particle_id];
                ctx.draw(particle.particle_background, { "metallic": 0 }, ui_camera);
                ctx.draw(particle.particle, { "metallic": 0 }, ui_camera);
                ctx.draw(ctx.text_buffers[particle.text_id], {"metallic": 0}, ui_camera);
                particle.particle.color = vec3_lerp([0.7, 0.7, 0.7], [0.961, 0.550, 0.351], remap_value(current_temperature, 20, 2500, 0, 1));
            }

            for (const particle_id of electron_particles) {
                const particle = scene.particles[particle_id];
                ctx.draw(particle.particle_background, { "metallic": 0 }, ui_camera);
                ctx.draw(particle.particle, { "metallic": 0 }, ui_camera);
                ctx.draw(ctx.text_buffers[particle.text_id], {"metallic": 0}, ui_camera);

                let dx = particle.pos[0] - zoom_circle_pos[0];
                let dy = particle.pos[1] - zoom_circle_pos[1];
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (particle.pos[0] > zoom_circle_pos[0] + zoom_circle_radius) {
                    particle.pos[0] = zoom_circle_pos[0] - zoom_circle_radius;
                } else {
                    particle.pos[0] += remap_value(current_current, 0, 2, 0, 0.1) * delta_time;
                }

                update_particle_pos(particle);

                ctx.text_buffers[particle.text_id].transform = mat4_mat4_mul(
                    scale_3d([0.0025, 0.0025, 0.0025]),
                    translate_3d(vec3_sub(particle.pos, [0.032, 0.03, 0.0])),
                );
            }

            for (let photon_wave of photon_waves) {
                let skip_rate = Math.floor(remap_value(current_voltage, 80, 220, 6, 0));
                if (skip_rate < 0) skip_rate = 0;
                if (skip_rate > number_photons) skip_rate = number_photons;
                if (current_voltage < 80) continue;
                if (photon_waves.indexOf(photon_wave) % (skip_rate + 1) !== 0) continue;

                photon_wave_param.time += 0.04;
                let direction = vec3_normalize([Math.sin(photon_wave.angle), Math.cos(photon_wave.angle), 0]);
                let speed = 0.05;
                let translation = vec3_scale(direction, speed * delta_time);
                photon_wave.transform = mat4_mat4_mul(translate_3d(translation), photon_wave.transform);

                let dx = photon_wave.transform[12] - zoom_circle_pos[0];
                let dy = photon_wave.transform[13] - zoom_circle_pos[1];
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > zoom_circle_radius && dy > 0) {
                    let random_angle = rad(85 + Math.random() * 20);
                    let random_pos;
                    let overlap;
                    do {
                        overlap = false;
                        random_pos = [
                            zoom_circle_pos[0] + (Math.random() - 0.5) * zoom_circle_radius * 2,
                            zoom_circle_pos[1] + (Math.random() - 0.5) * 0.4 - 0.4,
                            zoom_circle_pos[2]
                        ];
                        for (let j = 0; j < photon_waves.length; j++) {
                            let dx = random_pos[0] - photon_waves[j].transform[12];
                            let dy = random_pos[1] - photon_waves[j].transform[13];
                            let distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance < 0.2) {
                                overlap = true;
                                break;
                            }
                        }
                    } while (overlap);
                    photon_wave.transform = mat4_mat4_mul(
                        rotate_3d(axis_angle_to_quat([0, 0, 1], random_angle)),
                        translate_3d(random_pos),
                    );
                    photon_wave.angle = random_angle;
                }

                ctx.update_wave_3d(photon_wave, photon_wave_param, lines_segments_3d);
                ctx.draw(photon_wave, {}, ui_camera);
            }

            gl.stencilFunc(gl.EQUAL, 0, 0xFF);
            ctx.draw(zoom_circle, {"metallic": 0}, ui_camera);
            ctx.draw(zoom_line_1, {"metallic": 0}, ui_camera);
            ctx.draw(zoom_line_2, {"metallic": 0}, ui_camera);

            gl.disable(gl.STENCIL_TEST);

            gl.depthFunc(gl.ALWAYS);

            ctx.gl.bindFramebuffer(ctx.gl.FRAMEBUFFER, postprocess_framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.scissor(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            ctx.draw(bulb, {"color": [1.000, 0.577, 0.000], "m": bulb_transform}, null, "shader_basic");
            ctx.gl.bindFramebuffer(ctx.gl.FRAMEBUFFER, null);
            
            gl.useProgram(ctx.shaders["shader_postprocess"].program);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, postprocess_texture);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.uniform1i(ctx.shaders["shader_postprocess"].uniforms["framebuffer_texture"].location, 1);
            const u_min = left / gl.canvas.width;
            const v_min = bottom / gl.canvas.height;
            const u_max = (left + width) / gl.canvas.width;
            const v_max = (bottom + height) / gl.canvas.height;
            gl.uniform4f(ctx.shaders["shader_postprocess"].uniforms["scissor_texcoords"].location, u_min, v_min, u_max, v_max);

            gl.bindVertexArray(fullscreen_quad.vertex_buffer.vao);
            ctx.set_shader_uniform(ctx.shaders["shader_postprocess"], "p", mat4_identity());
            ctx.set_shader_uniform(ctx.shaders["shader_postprocess"], "v", mat4_identity());
            current_brightness = remap_value(current_voltage, 0, 220, 0, 0.2);
            ctx.set_shader_uniform(ctx.shaders["shader_postprocess"], "brightness", current_brightness);
            gl.drawElements(gl.TRIANGLES, fullscreen_quad.vertex_buffer.draw_count, gl.UNSIGNED_SHORT, 0);
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
};
const meshes = [
    { path: "led_metal.mesh", drawable: led_metal },
    { path: "led_epoxy_case.mesh", drawable: led_epoxy_case },
    { path: "led_reflective_case.mesh", drawable: led_reflective_case },
    { path: "bulb.mesh", drawable: bulb },
    { path: "bulb2.mesh", drawable: bulb2 },
    { path: "bulb_screw.mesh", drawable: bulb_screw },
    { path: "bulb_screw_black.mesh", drawable: bulb_screw_black },
    { path: "bulb_wire.mesh", drawable: bulb_wire },
    { path: "bulb_wire_holder.mesh", drawable: bulb_wire_holder },
    { path: "apple.mesh", drawable: apple },
    { path: "apple_stem.mesh", drawable: apple_stem },
    { path: "apple_leaf.mesh", drawable: apple_leaf },
    { path: "coil.mesh", drawable: coil },
    { path: "voltmeter.mesh", drawable: voltmeter },
    { path: "voltmeter_screen.mesh", drawable: voltmeter_screen },
    { path: "voltmeter_arrow.mesh", drawable: voltmeter_arrow },
    { path: "coil.mesh", drawable: coil },
    { path: "coil_ampere.mesh", drawable: coil_ampere },
    { path: "battery.mesh", drawable: battery1 },
    { path: "battery.mesh", drawable: battery2 },
    { path: "battery.mesh", drawable: battery_cap1 },
    { path: "battery.mesh", drawable: battery_cap2 },
    { path: "magnet.mesh", drawable: magnet },
    { path: "magnet_arrow.mesh", drawable: magnet_arrow1 },
    { path: "magnet_arrow.mesh", drawable: magnet_arrow2 },
    { path: "sun_surface.mesh", drawable: sun_surface },
    { path: "sun_cross.mesh", drawable: sun_cross },
];

meshes.forEach(mesh => {
    get_mesh_from_file(mesh.path).then(function(data) {
        mesh.drawable.vertex_buffer = ctx.create_vertex_buffer(data.vertices, data.attribs, data.indices);
    });
});

async function get_texture(ctx, url){
    const gl = ctx.gl;
    try {
        let res = await fetch(url);
        let blob = await res.blob();
        let image = await createImageBitmap(blob);
        
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
      
        return texture;
    } catch (err) {
        console.error(err);
    }
};

get_texture(ctx, "eye_texture.jpg").then(function(data) {
    eye_texture = data;
});


function parse_fnt(fnt_text) {
    const lines = fnt_text.split("\n").map(line => line.trim()).filter(line => line);
    const font_data = {
        info: {},
        common: {},
        pages: [],
        chars: [],
        kernings: []
    };
    const key_value_regex = /(\w+)="?([^"\s]+)"?(?=\s|$)|(\w+)=(-?\d+)/g;

    lines.forEach(line => {
        const parts = line.split(/\s+/);
        const type = parts[0];

        switch(type) {
            case "info":
            case "common": {
                const obj = {};
                let match;
                while ((match = key_value_regex.exec(line)) !== null) {
                    const key = match[1] || match[3];
                    const value = match[2] || match[4];
                    obj[key] = isNaN(value) ? value : parseInt(value);
                }
                font_data[type] = obj;
                break;
            }
            case "page": {
                const page = {};
                let match;
                while ((match = key_value_regex.exec(line)) !== null) {
                    const key = match[1] || match[3];
                    const value = match[2] || match[4];
                    page[key] = key === "file" ? value.replace(/"/g, "") : parseInt(value);
                }
                font_data.pages.push(page.file);
                break;
            }
            case "char": {
                const char = {};
                let match;
                while ((match = key_value_regex.exec(line)) !== null) {
                    const key = match[1] || match[3];
                    const value = match[2] || match[4];
                    char[key] = isNaN(value) ? value : parseInt(value);
                }
                char.char = String.fromCharCode(char.id);
                font_data.chars.push(char);
                break;
            }
            case "kerning": {
                const kerning = {};
                let match;
                while ((match = key_value_regex.exec(line)) !== null) {
                    const key = match[1] || match[3];
                    const value = match[2] || match[4];
                    kerning[key] = parseInt(value);
                }
                font_data.kernings.push(kerning);
                break;
            }
        }
    });

    return font_data;
}

async function get_font(ctx, fnt_path, bitmap_path) {
    const gl = ctx.gl;
    try {
        let res = await fetch(fnt_path);
        let fnt_data = await res.text();
        res = await fetch(bitmap_path);
        let bitmap_data = await res.arrayBuffer();

        const image = new Image();
        image.src = bitmap_path;

        await new Promise((resolve, reject) => {
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, ctx.font_texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.generateMipmap(gl.TEXTURE_2D);
                resolve();
            };
            image.onerror = reject;
        });


        const font_data = parse_fnt(fnt_data);

        ctx.font = { chars: {} };
        font_data.chars.forEach(char => {
            ctx.font.chars[char.char] = char;
        });

        ctx.font.data = {
            scale_w: font_data.common.scaleW,
            scale_h: font_data.common.scaleH,
            line_height: font_data.common.lineHeight,
            base: font_data.common.base
        };

        let custom_vertex_attribs = [
            { name: "position_attrib", size: 2 },
            { name: "texcoord_attrib", size: 2 }
        ];

        for(let key in ctx.text_buffers){
            ctx.text_buffers[key] = ctx.create_drawable("shader_text", create_text_buffer(ctx, ctx.text_buffers[key].text, 0, 0), ctx.text_buffers[key].color,
                ctx.text_buffers[key].transform, custom_vertex_attribs);
        }
    } catch (err) {
        console.error(err);
    }
};

get_font(ctx, "inter.fnt", "inter.png");