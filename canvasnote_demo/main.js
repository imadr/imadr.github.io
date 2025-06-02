/////0 UTILS
function choose_random_element(array) {
    if (array.length == 0) {
        return undefined;
    }
    const random_index = Math.floor(Math.random() * array.length);
    return array[random_index];
}
function random_float(min, max) {
    return Math.random() * (max - min) + min;
}
function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
}
function rad(deg) {
    return (deg * Math.PI) / 180;
}
function vec3_cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function vec3_magnitude(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
function vec3_lerp(a, b, t) {
    t = t < 0 ? 0 : t;
    t = t > 1 ? 1 : t;
    return vec3_add(vec3_scale(b, t), vec3_scale(a, 1 - t));
}
function vec3_dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function vec3_normalize(v) {
    let m = vec3_magnitude(v);
    if (m == 0)
        return [0, 0, 0];
    return [v[0] / m, v[1] / m, v[2] / m];
}
function vec3_add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function vec3_sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function vec3_scale(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
}
function vec4_scale(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s, v[3] * s];
}
function vec3_hadamard(a, b) {
    return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}
function vec2_magnitude(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}
function vec2_normalize(v) {
    let m = vec2_magnitude(v);
    if (m == 0)
        return [0, 0];
    return [v[0] / m, v[1] / m];
}
function vec2_add(a, b) {
    return [a[0] + b[0], a[1] + b[1]];
}
function vec2_sub(a, b) {
    return [a[0] - b[0], a[1] - b[1]];
}
function vec2_scale(v, s) {
    return [v[0] * s, v[1] * s];
}
function vec2_hadamard(a, b) {
    return [a[0] * b[0], a[1] * b[1]];
}
function vec2_dot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
}
function lerp(a, b, t) {
    t = t < 0 ? 0 : t;
    t = t > 1 ? 1 : t;
    return b * t + a * (1 - t);
}
function vec2_lerp(a, b, t) {
    t = t < 0 ? 0 : t;
    t = t > 1 ? 1 : t;
    return vec2_add(vec2_scale(b, t), vec2_scale(a, 1 - t));
}
function vec2_distance(a, b) {
    return Math.sqrt(Math.pow((a[0] - b[0]), 2) + Math.pow((a[1] - b[1]), 2));
}
function mat4_mat4_mul(a, b) {
    return [
        a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12],
        a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + a[3] * b[13],
        a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14],
        a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15],
        a[4] * b[0] + a[5] * b[4] + a[6] * b[8] + a[7] * b[12],
        a[4] * b[1] + a[5] * b[5] + a[6] * b[9] + a[7] * b[13],
        a[4] * b[2] + a[5] * b[6] + a[6] * b[10] + a[7] * b[14],
        a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7] * b[15],
        a[8] * b[0] + a[9] * b[4] + a[10] * b[8] + a[11] * b[12],
        a[8] * b[1] + a[9] * b[5] + a[10] * b[9] + a[11] * b[13],
        a[8] * b[2] + a[9] * b[6] + a[10] * b[10] + a[11] * b[14],
        a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11] * b[15],
        a[12] * b[0] + a[13] * b[4] + a[14] * b[8] + a[15] * b[12],
        a[12] * b[1] + a[13] * b[5] + a[14] * b[9] + a[15] * b[13],
        a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14],
        a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15]
    ];
}
function mat4_transpose(m) {
    let t = mat4_identity();
    for (let i = 0; i < 16; i++) {
        t[i] = m[(i % 4) * 4 + Math.floor(i / 4)];
    }
    return t;
}
function mat4_identity() {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function translate_3d(t) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, t[0], t[1], t[2], 1];
}
function scale_3d(s) {
    return [s[0], 0, 0, 0, 0, s[1], 0, 0, 0, 0, s[2], 0, 0, 0, 0, 1];
}
function rotate_3d(q) {
    let xx = q[0] * q[0];
    let yy = q[1] * q[1];
    let zz = q[2] * q[2];
    return [
        1 - 2 * yy - 2 * zz,
        2 * q[0] * q[1] + 2 * q[2] * q[3],
        2 * q[0] * q[2] - 2 * q[1] * q[3],
        0,
        2 * q[0] * q[1] - 2 * q[2] * q[3],
        1 - 2 * xx - 2 * zz,
        2 * q[1] * q[2] + 2 * q[0] * q[3],
        0,
        2 * q[0] * q[2] + 2 * q[1] * q[3],
        2 * q[1] * q[2] - 2 * q[0] * q[3],
        1 - 2 * xx - 2 * yy,
        0,
        0,
        0,
        0,
        1
    ];
}
function perspective_projection(fov, aspect_ratio, z_near, z_far) {
    let f = Math.tan(fov / 2);
    return [
        1 / (f * aspect_ratio),
        0,
        0,
        0,
        0,
        1 / f,
        0,
        0,
        0,
        0,
        z_far / (z_near - z_far),
        -1,
        0,
        0,
        -(z_far * z_near) / (z_far - z_near),
        0
    ];
}
function orthographic_projection(left, right, bottom, top, z_near, z_far) {
    return [
        2 / (right - left),
        0,
        0,
        0,
        0,
        2 / (top - bottom),
        0,
        0,
        0,
        0,
        1 / (z_near - z_far),
        0,
        (left + right) / (left - right),
        (top + bottom) / (bottom - top),
        z_near / (z_near - z_far),
        1
    ];
}
function mat4_det(m) {
    return (m[3] * m[6] * m[9] * m[12] -
        m[2] * m[7] * m[9] * m[12] -
        m[3] * m[5] * m[10] * m[12] +
        m[1] * m[7] * m[10] * m[12] +
        m[2] * m[5] * m[11] * m[12] -
        m[1] * m[6] * m[11] * m[12] -
        m[3] * m[6] * m[8] * m[13] +
        m[2] * m[7] * m[8] * m[13] +
        m[3] * m[4] * m[10] * m[13] -
        m[0] * m[7] * m[10] * m[13] -
        m[2] * m[4] * m[11] * m[13] +
        m[0] * m[6] * m[11] * m[13] +
        m[3] * m[5] * m[8] * m[14] -
        m[1] * m[7] * m[8] * m[14] -
        m[3] * m[4] * m[9] * m[14] +
        m[0] * m[7] * m[9] * m[14] +
        m[1] * m[4] * m[11] * m[14] -
        m[0] * m[5] * m[11] * m[14] -
        m[2] * m[5] * m[8] * m[15] +
        m[1] * m[6] * m[8] * m[15] +
        m[2] * m[4] * m[9] * m[15] -
        m[0] * m[6] * m[9] * m[15] -
        m[1] * m[4] * m[10] * m[15] +
        m[0] * m[5] * m[10] * m[15]);
}
function mat4_scale(m, s) {
    return [
        s * m[0],
        s * m[1],
        s * m[2],
        s * m[3],
        s * m[4],
        s * m[5],
        s * m[6],
        s * m[7],
        s * m[8],
        s * m[9],
        s * m[10],
        s * m[11],
        s * m[12],
        s * m[13],
        s * m[14],
        s * m[15]
    ];
}
function mat4_invert(m) {
    let det = mat4_det(m);
    // prettier-ignore
    m = [
        m[6] * m[11] * m[13] - m[7] * m[10] * m[13] + m[7] * m[9] * m[14] - m[5] * m[11] * m[14] - m[6] * m[9] * m[15] + m[5] * m[10] * m[15],
        m[3] * m[10] * m[13] - m[2] * m[11] * m[13] - m[3] * m[9] * m[14] + m[1] * m[11] * m[14] + m[2] * m[9] * m[15] - m[1] * m[10] * m[15],
        m[2] * m[7] * m[13] - m[3] * m[6] * m[13] + m[3] * m[5] * m[14] - m[1] * m[7] * m[14] - m[2] * m[5] * m[15] + m[1] * m[6] * m[15],
        m[3] * m[6] * m[9] - m[2] * m[7] * m[9] - m[3] * m[5] * m[10] + m[1] * m[7] * m[10] + m[2] * m[5] * m[11] - m[1] * m[6] * m[11],
        m[7] * m[10] * m[12] - m[6] * m[11] * m[12] - m[7] * m[8] * m[14] + m[4] * m[11] * m[14] + m[6] * m[8] * m[15] - m[4] * m[10] * m[15],
        m[2] * m[11] * m[12] - m[3] * m[10] * m[12] + m[3] * m[8] * m[14] - m[0] * m[11] * m[14] - m[2] * m[8] * m[15] + m[0] * m[10] * m[15],
        m[3] * m[6] * m[12] - m[2] * m[7] * m[12] - m[3] * m[4] * m[14] + m[0] * m[7] * m[14] + m[2] * m[4] * m[15] - m[0] * m[6] * m[15],
        m[3] * m[6] * m[8] - m[2] * m[7] * m[8] + m[3] * m[4] * m[10] - m[0] * m[7] * m[10] - m[2] * m[4] * m[11] + m[0] * m[6] * m[11],
        m[5] * m[11] * m[12] - m[7] * m[9] * m[12] + m[7] * m[8] * m[13] - m[4] * m[11] * m[13] - m[5] * m[8] * m[15] + m[4] * m[9] * m[15],
        m[3] * m[9] * m[12] - m[1] * m[11] * m[12] - m[3] * m[8] * m[13] + m[0] * m[11] * m[13] + m[1] * m[8] * m[15] - m[0] * m[9] * m[15],
        m[1] * m[7] * m[12] - m[3] * m[5] * m[12] + m[3] * m[4] * m[13] - m[0] * m[7] * m[13] - m[1] * m[4] * m[15] + m[0] * m[5] * m[15],
        m[3] * m[5] * m[8] - m[1] * m[7] * m[8] - m[3] * m[4] * m[9] + m[0] * m[7] * m[9] + m[1] * m[4] * m[11] - m[0] * m[5] * m[11],
        m[6] * m[9] * m[12] - m[5] * m[10] * m[12] - m[6] * m[8] * m[13] + m[4] * m[10] * m[13] + m[5] * m[8] * m[14] - m[4] * m[9] * m[14],
        m[1] * m[10] * m[12] - m[2] * m[9] * m[12] + m[2] * m[8] * m[13] - m[0] * m[10] * m[13] - m[1] * m[8] * m[14] + m[0] * m[9] * m[14],
        m[2] * m[5] * m[12] - m[1] * m[6] * m[12] - m[2] * m[4] * m[13] + m[0] * m[6] * m[13] + m[1] * m[4] * m[14] - m[0] * m[5] * m[14],
        m[1] * m[6] * m[8] - m[2] * m[5] * m[8] + m[2] * m[4] * m[9] - m[0] * m[6] * m[9] - m[1] * m[4] * m[10] + m[0] * m[5] * m[10]
    ];
    return mat4_scale(m, 1 / det);
}
function mat4_vec4_mul(m, v) {
    return [
        v[0] * m[0] + v[1] * m[1] + v[2] * m[2] + v[3] * m[3],
        v[0] * m[4] + v[1] * m[5] + v[2] * m[6] + v[3] * m[7],
        v[0] * m[8] + v[1] * m[9] + v[2] * m[10] + v[3] * m[11],
        v[0] * m[12] + v[1] * m[13] + v[2] * m[14] + v[3] * m[15]
    ];
}
function axis_angle_to_quat(axis, angle) {
    let s = Math.sin(angle / 2);
    return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
}
function euler_to_quat(e) {
    let cx = Math.cos(e[0] / 2);
    let sx = Math.sin(e[0] / 2);
    let cy = Math.cos(e[1] / 2);
    let sy = Math.sin(e[1] / 2);
    let cz = Math.cos(e[2] / 2);
    let sz = Math.sin(e[2] / 2);
    return [
        sx * cy * cz - cx * sy * sz,
        cx * sy * cz + sx * cy * sz,
        cx * cy * sz - sx * sy * cz,
        cx * cy * cz + sx * sy * sz
    ];
}
function update_camera_projection_matrix(camera, aspect_ratio) {
    let height = camera.sv.zoom;
    let width = camera.sv.zoom * aspect_ratio;
    let left = -width / 2;
    let right = width / 2;
    let bottom = -height / 2;
    let top = height / 2;
    camera.projection_matrix = orthographic_projection(left, right, bottom, top, camera.z_near, camera.z_far);
    camera.inv_projection_matrix = mat4_transpose(mat4_invert(camera.projection_matrix));
}
function update_camera_view(camera) {
    let m = mat4_identity();
    m = mat4_mat4_mul(translate_3d(camera.sv.position), m);
    camera.view_matrix = mat4_invert(m);
    camera.inv_view_matrix = mat4_transpose(mat4_invert(camera.view_matrix));
}
var ColliderType;
(function (ColliderType) {
    ColliderType[ColliderType["Plane"] = 0] = "Plane";
})(ColliderType || (ColliderType = {}));
var GameObjectState;
(function (GameObjectState) {
    GameObjectState[GameObjectState["Idle"] = 0] = "Idle";
    GameObjectState[GameObjectState["Hovered"] = 1] = "Hovered";
    GameObjectState[GameObjectState["Dragged"] = 2] = "Dragged";
    GameObjectState[GameObjectState["Deleting"] = 3] = "Deleting";
})(GameObjectState || (GameObjectState = {}));
function compile_shader(ctx, shader_source, shader_type) {
    let gl = ctx.gl;
    let shader = gl.createShader(shader_type);
    gl.shaderSource(shader, shader_source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("couldn't compile shader: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
function link_shader_program(ctx, vertex_shader_source, fragment_shader_source) {
    let gl = ctx.gl;
    let vertex_shader = compile_shader(ctx, vertex_shader_source, gl.VERTEX_SHADER);
    if (vertex_shader == null)
        return null;
    let fragment_shader = compile_shader(ctx, fragment_shader_source, gl.FRAGMENT_SHADER);
    if (fragment_shader == null)
        return null;
    let shader_program = gl.createProgram();
    gl.attachShader(shader_program, vertex_shader);
    gl.attachShader(shader_program, fragment_shader);
    gl.linkProgram(shader_program);
    if (!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
        console.error("couldn't link shader program: " + gl.getProgramInfoLog(shader_program));
        return null;
    }
    return shader_program;
}
function create_shader(ctx, vertex_shader_source, fragment_shader_source) {
    let gl = ctx.gl;
    let program = link_shader_program(ctx, vertex_shader_source, fragment_shader_source);
    if (program == null)
        return null;
    let shader = {
        program: program,
        uniforms: {},
        attributes: {}
    };
    let n_uniforms = gl.getProgramParameter(shader.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n_uniforms; i++) {
        let uniform = gl.getActiveUniform(shader.program, i);
        shader.uniforms[uniform.name] = {
            type: uniform.type,
            location: gl.getUniformLocation(shader.program, uniform.name)
        };
    }
    let n_attributes = gl.getProgramParameter(shader.program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < n_attributes; i++) {
        let attribute = gl.getActiveAttrib(shader.program, i);
        shader.attributes[attribute.name] = {
            type: attribute.type,
            location: gl.getAttribLocation(shader.program, attribute.name)
        };
    }
    return shader;
}
function set_shader_uniform(ctx, shader, uniform, value) {
    let gl = ctx.gl;
    gl.useProgram(shader.program);
    if (!shader.uniforms.hasOwnProperty(uniform))
        return;
    switch (shader.uniforms[uniform].type) {
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
function create_mesh(ctx, vertices, indices, attributes) {
    let gl = ctx.gl;
    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    let vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    let stride = 0;
    for (let attribute of attributes) {
        stride += attribute.size * Float32Array.BYTES_PER_ELEMENT;
    }
    let offset = 0;
    let attribs_with_offset = [];
    for (let i = 0; i < attributes.length; i++) {
        let attribute = attributes[i];
        let attr_offset = offset;
        gl.vertexAttribPointer(i, attribute.size, gl.FLOAT, false, stride, offset);
        gl.enableVertexAttribArray(i);
        offset += attribute.size * Float32Array.BYTES_PER_ELEMENT;
        attribs_with_offset.push(Object.assign(Object.assign({}, attribute), { offset: attr_offset }));
    }
    let ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
    return {
        vao,
        vbo,
        ebo,
        draw_count: indices.length,
        vertices: vertices,
        indices: indices,
        attributes: attribs_with_offset
    };
}
function update_gameobject_mesh(ctx, object, mesh) {
    let gl = ctx.gl;
    if (object.mesh !== null) {
        gl.deleteVertexArray(object.mesh.vao);
        gl.deleteBuffer(object.mesh.vbo);
        gl.deleteBuffer(object.mesh.ebo);
    }
    object.mesh = create_mesh(ctx, mesh.vertices, mesh.indices, mesh.attributes);
}
function draw(ctx, obj) {
    if (obj.mesh == null)
        return;
    let gl = ctx.gl;
    let shader = ctx.shaders[obj.shader];
    set_shader_uniform(ctx, shader, "p", ctx.camera.projection_matrix);
    set_shader_uniform(ctx, shader, "v", ctx.camera.view_matrix);
    if (ctx.previous_shader != obj.shader) {
        gl.useProgram(shader.program);
        ctx.previous_shader = obj.shader;
    }
    set_shader_uniform(ctx, shader, "time", ctx.time);
    gl.bindVertexArray(obj.mesh.vao);
    set_shader_uniform(ctx, shader, "color", obj.color);
    if (!obj.not_animated)
        update_gameobject_smooth(ctx, obj);
    obj.transform = mat4_mat4_mul(scale_3d(obj.scale), mat4_mat4_mul(rotate_3d(euler_to_quat(obj.rotation)), translate_3d(obj.sv.position)));
    set_shader_uniform(ctx, shader, "m", obj.transform);
    if (obj.state == GameObjectState.Hovered || obj.state == GameObjectState.Dragged) {
        set_shader_uniform(ctx, shader, "hovered", 1);
    }
    else {
        set_shader_uniform(ctx, shader, "hovered", 0);
    }
    gl.drawElements(obj.wireframe ? gl.LINES : gl.TRIANGLES, obj.mesh.draw_count, gl.UNSIGNED_SHORT, 0);
}
/////3 GEOMETRY
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
    return [nx, ny, nz];
}
function create_icosphere(radius, subdivisions = 1, smooth = true) {
    let vertices = [];
    let indices = [];
    let cache = {};
    let golden_ratio = (1 + Math.sqrt(5)) / 2;
    let initial_vertices = [
        -1,
        golden_ratio,
        0,
        1,
        golden_ratio,
        0,
        -1,
        -golden_ratio,
        0,
        1,
        -golden_ratio,
        0,
        0,
        -1,
        golden_ratio,
        0,
        1,
        golden_ratio,
        0,
        -1,
        -golden_ratio,
        0,
        1,
        -golden_ratio,
        golden_ratio,
        0,
        -1,
        golden_ratio,
        0,
        1,
        -golden_ratio,
        0,
        -1,
        -golden_ratio,
        0,
        1
    ];
    let initial_indices = [
        0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 8,
        9, 3, 6, 8, 3, 2, 6, 3, 4, 2, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1
    ];
    function get_midpoint(p1, p2) {
        let key = p1 < p2 ? `${p1},${p2}` : `${p2},${p1}`;
        if (cache[key] !== undefined)
            return cache[key];
        let x = (vertices[p1 * 3] + vertices[p2 * 3]) / 2;
        let y = (vertices[p1 * 3 + 1] + vertices[p2 * 3 + 1]) / 2;
        let z = (vertices[p1 * 3 + 2] + vertices[p2 * 3 + 2]) / 2;
        let [nx, ny, nz] = vec3_normalize([x, y, z]);
        let index = vertices.length / 3;
        vertices.push(nx, ny, nz);
        cache[key] = index;
        return index;
    }
    for (let i = 0; i < initial_vertices.length; i += 3) {
        let [x, y, z] = vec3_normalize([initial_vertices[i], initial_vertices[i + 1], initial_vertices[i + 2]]);
        vertices.push(x, y, z);
    }
    indices = initial_indices.slice();
    for (let i = 0; i < subdivisions; i++) {
        let new_indices = [];
        cache = {};
        for (let j = 0; j < indices.length; j += 3) {
            let a = indices[j];
            let b = indices[j + 1];
            let c = indices[j + 2];
            let ab = get_midpoint(a, b);
            let bc = get_midpoint(b, c);
            let ca = get_midpoint(c, a);
            new_indices.push(a, ab, ca);
            new_indices.push(b, bc, ab);
            new_indices.push(c, ca, bc);
            new_indices.push(ab, bc, ca);
        }
        indices = new_indices;
    }
    let output_vertices = [];
    if (smooth) {
        for (let i = 0; i < vertices.length; i += 3) {
            let x = vertices[i];
            let y = vertices[i + 1];
            let z = vertices[i + 2];
            let length = Math.sqrt(x * x + y * y + z * z);
            output_vertices.push(x, y, z, x / length, y / length, z / length);
        }
    }
    else {
        for (let i = 0; i < indices.length; i += 3) {
            let a = indices[i];
            let b = indices[i + 1];
            let c = indices[i + 2];
            let ax = vertices[a * 3], ay = vertices[a * 3 + 1], az = vertices[a * 3 + 2];
            let bx = vertices[b * 3], by = vertices[b * 3 + 1], bz = vertices[b * 3 + 2];
            let cx = vertices[c * 3], cy = vertices[c * 3 + 1], cz = vertices[c * 3 + 2];
            let ux = bx - ax, uy = by - ay, uz = bz - az;
            let vx = cx - ax, vy = cy - ay, vz = cz - az;
            let nx = uy * vz - uz * vy;
            let ny = uz * vx - ux * vz;
            let nz = ux * vy - uy * vx;
            let length = Math.sqrt(nx * nx + ny * ny + nz * nz);
            nx = nx / length;
            ny = ny / length;
            nz = nz / length;
            output_vertices.push(ax, ay, az, nx, ny, nz, bx, by, bz, nx, ny, nz, cx, cy, cz, nx, ny, nz);
        }
        indices = Array.from({ length: output_vertices.length / 6 }, (_, i) => i);
    }
    return [
        new Float32Array(output_vertices),
        new Uint16Array(indices),
        [
            { name: "position_attrib", size: 3 },
            { name: "normal_attrib", size: 3 }
        ]
    ];
}
function create_rounded_rect(width, height, radius) {
    let hw = width / 2;
    let hh = height / 2;
    let segments = 8;
    let corner_angles = [Math.PI, 1.5 * Math.PI, 0, 0.5 * Math.PI];
    let cx = [-hw + radius, hw - radius, hw - radius, -hw + radius];
    let cy = [-hh + radius, -hh + radius, hh - radius, hh - radius];
    let vertices = [];
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j <= segments; j++) {
            let angle = corner_angles[i] + (j / segments) * (Math.PI / 2);
            let x = cx[i] + radius * Math.cos(angle);
            let y = cy[i] + radius * Math.sin(angle);
            vertices.push(x, y, 0);
        }
    }
    let inner_vertices = [
        -hw + radius,
        -hh,
        hw - radius,
        -hh,
        hw,
        -hh + radius,
        hw,
        hh - radius,
        hw - radius,
        hh,
        -hw + radius,
        hh,
        -hw,
        hh - radius,
        -hw,
        -hh + radius
    ];
    for (let i = 0; i < inner_vertices.length; i += 2) {
        vertices.push(inner_vertices[i], inner_vertices[i + 1], 0);
    }
    let center_index = vertices.length / 3;
    vertices.push(0, 0, 0);
    let indices = [];
    for (let i = 0; i < vertices.length / 3 - 1; i++) {
        indices.push(center_index, i, (i + 1) % (vertices.length / 3 - 1));
    }
    let output_vertices = [];
    for (let i = 0; i < indices.length; i++) {
        let idx = indices[i];
        let x = vertices[idx * 3];
        let y = vertices[idx * 3 + 1];
        let z = vertices[idx * 3 + 2];
        output_vertices.push(x, y, z, 0, 0, 0);
    }
    indices = Array.from({ length: output_vertices.length / 6 }, (_, i) => i);
    return [
        new Float32Array(output_vertices),
        new Uint16Array(indices),
        [
            { name: "position_attrib", size: 3 },
            { name: "normal_attrib", size: 3 }
        ]
    ];
}
function create_plane(width, height) {
    let hw = width / 2;
    let hh = height / 2;
    let vertices = [-hw, -hh, 0, hw, -hh, 0, hw, hh, 0, -hw, hh, 0];
    let indices = [0, 1, 2, 0, 2, 3];
    let output_vertices = [];
    for (let i = 0; i < indices.length; i++) {
        let idx = indices[i];
        let x = vertices[idx * 3];
        let y = vertices[idx * 3 + 1];
        let z = vertices[idx * 3 + 2];
        output_vertices.push(x, y, z, 0, 0, 0);
    }
    indices = Array.from({ length: output_vertices.length / 6 }, (_, i) => i);
    return [
        new Float32Array(output_vertices),
        new Uint16Array(indices),
        [
            { name: "position_attrib", size: 3 },
            { name: "normal_attrib", size: 3 }
        ]
    ];
}
function create_wireframe_mesh(original_vertices, original_indices, attributes, edge_thickness = 0.01) {
    let wireframe_vertices = [];
    let wireframe_indices = [];
    let unique_edges = new Set();
    function get_edge_key(a, b) {
        return a < b ? `${a}-${b}` : `${b}-${a}`;
    }
    for (let i = 0; i < original_indices.length; i += 3) {
        let v1 = original_indices[i];
        let v2 = original_indices[i + 1];
        let v3 = original_indices[i + 2];
        let edges = [
            [v1, v2],
            [v2, v3],
            [v3, v1]
        ];
        for (let [a, b] of edges) {
            let edge_key = get_edge_key(a, b);
            if (!unique_edges.has(edge_key)) {
                unique_edges.add(edge_key);
                let x1 = original_vertices[a * 6];
                let y1 = original_vertices[a * 6 + 1];
                let z1 = original_vertices[a * 6 + 2];
                let x2 = original_vertices[b * 6];
                let y2 = original_vertices[b * 6 + 1];
                let z2 = original_vertices[b * 6 + 2];
                let dx = x2 - x1;
                let dy = y2 - y1;
                let dz = z2 - z1;
                let length = Math.sqrt(dx * dx + dy * dy + dz * dz);
                let nx = dx / length;
                let ny = dy / length;
                let nz = dz / length;
                let ux = ny * nz - nz * ny;
                let uy = nz * nx - nx * nz;
                let uz = nx * ny - ny * nx;
                let vx = ny * uz - nz * uy;
                let vy = nz * ux - nx * uz;
                let vz = nx * uy - ny * ux;
                let half_thickness = edge_thickness / 2;
                let base_index = wireframe_vertices.length / 6;
                wireframe_vertices.push(x1 + ux * half_thickness, y1 + uy * half_thickness, z1 + uz * half_thickness, nx, ny, nz, x1 + vx * half_thickness, y1 + vy * half_thickness, z1 + vz * half_thickness, nx, ny, nz, x2 + ux * half_thickness, y2 + uy * half_thickness, z2 + uz * half_thickness, nx, ny, nz, x2 + vx * half_thickness, y2 + vy * half_thickness, z2 + vz * half_thickness, nx, ny, nz);
                wireframe_indices.push(base_index, base_index + 1, base_index + 2, base_index + 1, base_index + 3, base_index + 2);
            }
        }
    }
    return [
        new Float32Array(wireframe_vertices),
        new Uint16Array(wireframe_indices),
        [
            { name: "position_attrib", size: 3 },
            { name: "normal_attrib", size: 3 }
        ]
    ];
}
/////5 INPUT
function get_event_coordinates(ctx, e) {
    let rect = ctx.canvas.getBoundingClientRect();
    let is_touch = "touches" in e;
    let client_x = is_touch ? e.touches[0].clientX : e.clientX;
    let client_y = is_touch ? e.touches[0].clientY : e.clientY;
    return [client_x - rect.left, client_y - rect.top];
}
function handle_interaction_end(ctx, e) {
    ctx.is_dragging_canvas = false;
    ctx.is_dragging_object = false;
    if (ctx.dragging_object != null) {
        ctx.dragging_object.target_scale = [1, 1, 1];
        ctx.dragging_object.target_rotation = [0, 0, 0];
    }
    ctx.dragging_object = null;
    ctx.last_pos = null;
    save_objects(ctx);
    save_camera(ctx);
}
function create_new_gameobject(ctx, coord) {
    const rect = ctx.canvas.getBoundingClientRect();
    let x = coord[0];
    let y = coord[1];
    x -= rect.left;
    y -= rect.top;
    const ndc_x = (x / rect.width) * 2 - 1;
    const ndc_y = -((y / rect.height) * 2 - 1);
    const clip_near = [ndc_x, ndc_y, 0, 1];
    let view_near = mat4_vec4_mul(ctx.camera.inv_projection_matrix, clip_near);
    view_near = [
        view_near[0] / view_near[3],
        view_near[1] / view_near[3],
        view_near[2] / view_near[3],
        view_near[3] / view_near[3]
    ];
    let world_near = mat4_vec4_mul(ctx.camera.inv_view_matrix, view_near);
    let world_pos = [world_near[0], world_near[1], world_near[2]];
    let new_obj = create_default_gameobject(ctx);
    new_obj.sv.position = world_pos;
    new_obj.target_position = world_pos;
    ctx.objects.push(new_obj);
    save_objects(ctx);
    let new_hovered_object = new_obj;
    if (new_hovered_object != null) {
        if (ctx.hovered_object != null) {
            go_to_state(ctx.hovered_object, GameObjectState.Idle);
        }
        go_to_state(new_hovered_object, GameObjectState.Hovered);
        ctx.hovered_object = new_hovered_object;
    }
    else {
        if (ctx.hovered_object != null) {
            go_to_state(ctx.hovered_object, GameObjectState.Idle);
        }
        ctx.hovered_object = null;
    }
}
function delete_hovered_gameobject(ctx) {
    if (ctx.hovered_object != null) {
        const obj = ctx.hovered_object;
        obj.delete_timer = 100;
        go_to_state(obj, GameObjectState.Deleting);
        ctx.objects_to_delete.push(obj);
    }
}
function setup_listeners(ctx) {
    const handle_move = (e) => {
        if ("touches" in e)
            e.preventDefault();
        let coords = get_event_coordinates(ctx, e);
        let hovered = true;
        ctx.canvas.style.cursor = hovered ? "move" : "default";
    };
    const handle_start = (e) => {
        e.preventDefault();
        let coords = get_event_coordinates(ctx, e);
        let mouse_event = e;
        if (mouse_event.button === 1) {
            ctx.is_dragging_canvas = true;
        }
        else if (mouse_event.button === 2) {
            if (ctx.hovered_object != null) {
                delete_hovered_gameobject(ctx);
            }
        }
        else if (mouse_event.button === 0) {
            if (ctx.hovered_object != null) {
                ctx.is_dragging_object = true;
                ctx.dragging_object = ctx.hovered_object;
                go_to_state(ctx.dragging_object, GameObjectState.Dragged);
            }
            else {
                if (new Date().getTime() - ctx.double_click_timer.getTime() <= 500 &&
                    vec2_distance(ctx.double_click_pos, coords) < 10) {
                    create_new_gameobject(ctx, coords);
                }
                ctx.double_click_timer = new Date();
                ctx.double_click_pos = coords;
            }
        }
        ctx.last_pos = coords;
    };
    if (ctx.event_listener_mousemove)
        ctx.canvas.removeEventListener("mousemove", ctx.event_listener_mousemove);
    if (ctx.event_listener_touchmove)
        ctx.canvas.removeEventListener("touchmove", ctx.event_listener_touchmove);
    if (ctx.event_listener_mousedown)
        ctx.canvas.removeEventListener("mousedown", ctx.event_listener_mousedown);
    if (ctx.event_listener_touchstart)
        ctx.canvas.removeEventListener("touchstart", ctx.event_listener_touchstart);
    ctx.event_listener_mousemove = handle_move;
    ctx.event_listener_touchmove = handle_move;
    ctx.event_listener_mousedown = handle_start;
    ctx.event_listener_touchstart = handle_start;
    ctx.canvas.addEventListener("mousemove", ctx.event_listener_mousemove);
    ctx.canvas.addEventListener("touchmove", ctx.event_listener_touchmove);
    ctx.canvas.addEventListener("mousedown", ctx.event_listener_mousedown);
    ctx.canvas.addEventListener("touchstart", ctx.event_listener_touchstart);
}
function handle_global_move(ctx, e) {
    if (!ctx.is_dragging_object) {
        let new_hovered_object = get_hovered_object(ctx, e);
        if (new_hovered_object != null) {
            if (ctx.hovered_object != null) {
                go_to_state(ctx.hovered_object, GameObjectState.Idle);
            }
            go_to_state(new_hovered_object, GameObjectState.Hovered);
            ctx.hovered_object = new_hovered_object;
        }
        else {
            if (ctx.hovered_object != null) {
                go_to_state(ctx.hovered_object, GameObjectState.Idle);
            }
            ctx.hovered_object = null;
        }
    }
    if ("touches" in e)
        e.preventDefault();
    if (!ctx.last_pos)
        return;
    let current_pos = get_event_coordinates(ctx, e);
    let pos_delta = vec2_sub(current_pos, ctx.last_pos);
    let aspect = ctx.canvas.width / ctx.canvas.height;
    let world_dx = -(pos_delta[0] / ctx.canvas.width) * ctx.camera.target_zoom * aspect;
    let world_dy = (pos_delta[1] / ctx.canvas.height) * ctx.camera.target_zoom;
    if (ctx.is_dragging_canvas) {
        ctx.camera.target_position[0] += world_dx;
        ctx.camera.target_position[1] += world_dy;
    }
    else if (ctx.is_dragging_object) {
        let old_position = [
            ctx.dragging_object.target_position[0],
            ctx.dragging_object.target_position[1],
            ctx.dragging_object.target_position[2]
        ];
        ctx.dragging_object.target_position[0] -= world_dx;
        ctx.dragging_object.target_position[1] -= world_dy;
        let velocity_x = vec3_sub(old_position, ctx.dragging_object.target_position)[0] * 1500.0;
        let velocity_y = vec3_sub(old_position, ctx.dragging_object.target_position)[1] * 1500.0;
        ctx.dragging_object.target_rotation = [rad(clamp(velocity_y, -45, 45)), rad(clamp(velocity_x, -45, 45)), 0];
    }
    ctx.last_pos = current_pos;
}
function handle_scroll_zoom(ctx, e) {
    e.preventDefault();
    const canvas = ctx.canvas;
    const aspect_ratio = canvas.width / canvas.height;
    const scroll_sensitivity = 0.01;
    const min_zoom = 2;
    const zoom_scale_factor = 0.1;
    const old_zoom = ctx.camera.target_zoom;
    const zoom_delta = e.deltaY * scroll_sensitivity * (old_zoom * zoom_scale_factor);
    let new_zoom = old_zoom + zoom_delta;
    if (new_zoom < min_zoom)
        new_zoom = min_zoom;
    const rect = canvas.getBoundingClientRect();
    const cursor_x = (e.clientX - rect.left) / canvas.width;
    const cursor_y = (e.clientY - rect.top) / canvas.height;
    const world_x_before = ctx.camera.target_position[0] + (cursor_x - 0.5) * old_zoom * aspect_ratio;
    const world_y_before = ctx.camera.target_position[1] + (0.5 - cursor_y) * old_zoom;
    ctx.camera.target_zoom = new_zoom;
    const world_x_after = ctx.camera.target_position[0] + (cursor_x - 0.5) * new_zoom * aspect_ratio;
    const world_y_after = ctx.camera.target_position[1] + (0.5 - cursor_y) * new_zoom;
    ctx.camera.target_position[0] += world_x_before - world_x_after;
    ctx.camera.target_position[1] += world_y_before - world_y_after;
}
function update_camera_smooth(ctx, smooth_speed = 0.1) {
    ctx.camera.sv.position[0] += (ctx.camera.target_position[0] - ctx.camera.sv.position[0]) * smooth_speed;
    ctx.camera.sv.position[1] += (ctx.camera.target_position[1] - ctx.camera.sv.position[1]) * smooth_speed;
    ctx.camera.sv.zoom += (ctx.camera.target_zoom - ctx.camera.sv.zoom) * smooth_speed;
    update_camera_view(ctx.camera);
    update_camera_projection_matrix(ctx.camera, ctx.canvas.width / ctx.canvas.height);
    save_camera(ctx);
}
function go_to_state(obj, state) {
    if (obj.state !== GameObjectState.Deleting) {
        obj.state = state;
    }
}
function update_gameobject_smooth(ctx, obj, scale_smooth_speed = 0.1, position_smooth_speed = 0.25, rotation_smooth_speed = 0.1) {
    if (obj.state === GameObjectState.Idle) {
        obj.target_scale = [1, 1, 1];
    }
    else if (obj.state === GameObjectState.Hovered) {
        obj.target_scale = [1.1, 1.1, 1.1];
    }
    else if (obj.state === GameObjectState.Dragged) {
        obj.target_scale = [1.1, 1.1, 1.1];
    }
    else if (obj.state === GameObjectState.Deleting) {
        obj.target_scale = [1.5, 1.5, 1.5];
    }
    for (let i = 0; i < 3; i++) {
        obj.scale[i] += (obj.target_scale[i] - obj.scale[i]) * scale_smooth_speed;
        if (Math.abs(obj.target_scale[i] - obj.scale[i]) < 0.001)
            obj.scale[i] = obj.target_scale[i];
        obj.sv.position[i] += (obj.target_position[i] - obj.sv.position[i]) * position_smooth_speed;
        if (Math.abs(obj.target_position[i] - obj.sv.position[i]) < 0.001)
            obj.sv.position[i] = obj.target_position[i];
        obj.rotation[i] += (obj.target_rotation[i] - obj.rotation[i]) * rotation_smooth_speed;
        if (Math.abs(obj.target_rotation[i] - obj.rotation[i]) < 0.001)
            obj.rotation[i] = obj.target_rotation[i];
    }
}
function get_picking_ray(ctx, e) {
    const rect = ctx.canvas.getBoundingClientRect();
    let x = "touches" in e ? e.touches[0].clientX : e.clientX;
    let y = "touches" in e ? e.touches[0].clientY : e.clientY;
    x -= rect.left;
    y -= rect.top;
    const ndc_x = (x / rect.width) * 2 - 1;
    const ndc_y = -((y / rect.height) * 2 - 1);
    const clip_near = [ndc_x, ndc_y, -1, 1];
    let view_near = mat4_vec4_mul(ctx.camera.inv_projection_matrix, clip_near);
    view_near = [
        view_near[0] / view_near[3],
        view_near[1] / view_near[3],
        view_near[2] / view_near[3],
        view_near[3] / view_near[3]
    ];
    let world_near = mat4_vec4_mul(ctx.camera.inv_view_matrix, view_near);
    return {
        origin: [world_near[0], world_near[1], world_near[2]],
        direction: [0, 0, -1]
    };
}
function raycast_object(ray, obj) {
    if (obj.collider.collider_type !== ColliderType.Plane)
        return null;
    const transform = obj.transform;
    const inv_transform = mat4_transpose(mat4_invert(transform));
    const local_origin4 = mat4_vec4_mul(inv_transform, [...ray.origin, 1]);
    const local_dir4 = mat4_vec4_mul(inv_transform, [...ray.direction, 0]);
    const local_origin = [local_origin4[0], local_origin4[1], local_origin4[2]];
    const local_dir = [local_dir4[0], local_dir4[1], local_dir4[2]];
    if (Math.abs(local_dir[2]) < 1e-6)
        return null;
    const t = -local_origin[2] / local_dir[2];
    if (t < 0)
        return null;
    const hit_local_x = local_origin[0] + t * local_dir[0];
    const hit_local_y = local_origin[1] + t * local_dir[1];
    const half_size = obj.collider.plane_collider_size.map(s => s / 2);
    if (Math.abs(hit_local_x) > half_size[0] || Math.abs(hit_local_y) > half_size[1])
        return null;
    return t;
}
function get_hovered_object(ctx, e) {
    const ray = get_picking_ray(ctx, e);
    let closest_t = Infinity;
    let hovered = null;
    for (const obj of ctx.objects) {
        if (obj.collider == null)
            continue;
        const t = raycast_object(ray, obj);
        if (t !== null && t < closest_t) {
            closest_t = t;
            hovered = obj;
        }
    }
    return hovered;
}
function resize_event(ctx) {
    let width = window.innerWidth;
    let height = window.innerHeight;
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.canvas.style.width = `${width}px`;
    ctx.canvas.style.height = `${height}px`;
    setup_listeners(ctx);
}
/////6 SETUP
let main_camera = {
    sv: {
        position: [0, 0, 0],
        zoom: 4
    },
    target_position: [0, 0, 0],
    target_zoom: 4,
    z_near: 0,
    z_far: 1,
    up_vector: [0, 1, 0],
    inv_view_matrix: mat4_identity(),
    view_matrix: mat4_identity(),
    projection_matrix: mat4_identity(),
    inv_projection_matrix: mat4_identity()
};
let ctx = {
    gl: null,
    canvas: document.getElementById("main-canvas"),
    is_dragging_canvas: false,
    is_dragging_object: false,
    last_pos: null,
    double_click_timer: new Date(),
    double_click_pos: [0, 0],
    objects: [],
    camera: main_camera,
    shaders: {},
    time: 0,
    last_time: 0,
    framebuffers: {},
    textures: {},
    hovered_object: null,
    dragging_object: null,
    default_gameobject_counter: -1,
    objects_to_delete: []
};
ctx.gl = ctx.canvas.getContext("webgl2", { stencil: true });
const ext = ctx.gl.getExtension("EXT_color_buffer_float");
const ext2 = ctx.gl.getExtension("EXT_float_blend");
ctx.shaders["shader_simple"] = create_shader(ctx, `#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec3 normal_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec3 local_position;
out vec3 normal;

void main(){
    vec4 world_pos = m*vec4(position_attrib, 1);
    gl_Position = p*v*world_pos;
    position = world_pos.xyz;
    local_position = position_attrib;
    normal = normalize(transpose(inverse(mat3(v * m))) * normal_attrib);
}`, `#version 300 es
precision highp float;

uniform vec3 color;
uniform int hovered;
uniform float time;

layout(location = 0) out vec4 frag_color;

in vec3 position;
in vec3 local_position;
in vec3 normal;

mat2 Rot(float a){
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

vec2 hash( vec2 p ){
    p = vec2( dot(p,vec2(2127.1,81.17)), dot(p,vec2(1269.5,283.37)) );
    return fract(sin(p)*43758.5453);
}

float noise( in vec2 p ){
    vec2 i = floor( p );
    vec2 f = fract( p );
    vec2 u = f*f*(3.0-2.0*f);

    float n = mix( mix( dot( -1.0+2.0*hash( i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
                        dot( -1.0+2.0*hash( i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                   mix( dot( -1.0+2.0*hash( i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
                        dot( -1.0+2.0*hash( i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
    return 0.5 + 0.5*n;
}

void main(){
    vec2 uv = local_position.xy;
    uv -= .5;
    float x = noise(vec2(time*1.0, uv.x*uv.y));
    vec3 col_1 = vec3(0.310, 0.510, 0.8);
    vec3 col_2 = vec3(0.950, 0.71, 0.95);
    vec3 final_color = mix(col_1, col_2, x);

    if(hovered == 1){
        final_color = pow(final_color, vec3(0.7));
    }

    frag_color = vec4(final_color, 1.0);
}`);
ctx.shaders["shader_grid"] = create_shader(ctx, `#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec3 normal_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec3 normal;

void main(){
    vec4 world_pos = m*vec4(position_attrib, 1);
    gl_Position = p*v*world_pos;
    position = (world_pos).xyz;
    normal = normalize(transpose(inverse(mat3(v * m))) * normal_attrib);
}`, `#version 300 es
precision highp float;

layout(location = 0) out vec4 frag_color;

in vec3 position;
in vec3 normal;

void main() {
    float grid_size = 5.0;
    float line_thickness = 0.02;

    vec4 view_pos = vec4(position, 1.0);
    vec2 pos = vec2(view_pos.x, view_pos.y);

    float line = step(line_thickness, abs(fract(pos.x * grid_size) - 0.5)) *
                 step(line_thickness, abs(fract(pos.y * grid_size) - 0.5));
    line = clamp(line, 0.9, 1.0);

    frag_color = vec4(vec3(line), 1.0);
}`);
let grid = {
    name: "grid",
    shader: "shader_grid",
    mesh: create_mesh(ctx, ...create_plane(10000, 10000)),
    color: [0, 0, 0],
    collider: null,
    scale: [1, 1, 1],
    target_scale: [1, 1, 1],
    target_position: [0, 0, 0],
    rotation: [0, 0, 0],
    target_rotation: [0, 0, 0],
    not_animated: true,
    sv: {
        position: [0, 0, 0]
    },
    transform: mat4_identity(),
    wireframe: false,
    delete_timer: 0,
    state: GameObjectState.Idle
};
function create_default_gameobject(ctx, sv) {
    if (sv == null) {
        sv = {
            position: [0, 0, 0]
        };
    }
    ctx.default_gameobject_counter++;
    return {
        name: "default_gameobject_" + ctx.default_gameobject_counter,
        shader: "shader_simple",
        mesh: create_mesh(ctx, ...create_rounded_rect(1, 1, 0.05)),
        color: [0, 0, 0],
        collider: {
            collider_type: ColliderType.Plane,
            plane_collider_size: [1, 1]
        },
        not_animated: false,
        scale: [1, 1, 1],
        target_scale: [1, 1, 1],
        target_position: sv.position,
        rotation: [0, 0, 0],
        target_rotation: [0, 0, 0],
        sv: sv,
        transform: mat4_identity(),
        wireframe: false,
        delete_timer: 0,
        state: GameObjectState.Idle
    };
}
function save_camera(ctx) {
    localStorage.setItem("camera", JSON.stringify(ctx.camera.sv));
}
function save_objects(ctx) {
    localStorage.setItem("gameobjects", JSON.stringify(ctx.objects.map(o => o.sv)));
}
function load_stuff(ctx) {
    let saved_objects_storage = localStorage.getItem("gameobjects");
    if (saved_objects_storage == null) {
        ctx.objects.push(create_default_gameobject(ctx));
        save_objects(ctx);
    }
    else {
        let saved_objects = JSON.parse(saved_objects_storage);
        for (let obj of saved_objects) {
            ctx.objects.push(create_default_gameobject(ctx, obj));
        }
    }
    for (let obj of ctx.objects) {
        obj.transform = mat4_mat4_mul(scale_3d(obj.scale), mat4_mat4_mul(translate_3d(obj.sv.position), rotate_3d(euler_to_quat(obj.rotation))));
    }
    let saved_camera_storage = localStorage.getItem("camera");
    if (saved_camera_storage != null) {
        let saved_camera = JSON.parse(saved_camera_storage);
        ctx.camera.sv = saved_camera;
        ctx.camera.target_zoom = ctx.camera.sv.zoom;
        ctx.camera.target_position = [...saved_camera.position];
    }
}
load_stuff(ctx);
document.addEventListener("wheel", function (e) {
    handle_scroll_zoom(ctx, e);
}, { passive: false });
document.addEventListener("mousemove", function (e) {
    handle_global_move(ctx, e);
});
document.addEventListener("touchmove", function (e) {
    handle_global_move(ctx, e);
});
document.addEventListener("mouseup", function (e) {
    handle_interaction_end(ctx, e);
});
document.addEventListener("touchend", function (e) {
    handle_interaction_end(ctx, e);
});
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});
setup_listeners(ctx);
resize_event(ctx);
addEventListener("resize", () => resize_event(ctx));
function update_deleted_objects(ctx, delta_time) {
    for (let obj of ctx.objects_to_delete) {
        if (obj.delete_timer > 0) {
            obj.delete_timer -= delta_time * 1000;
        }
    }
    const to_delete_now = ctx.objects_to_delete.filter(obj => obj.delete_timer <= 0);
    for (let obj of to_delete_now) {
        const index = ctx.objects.indexOf(obj);
        if (index !== -1) {
            ctx.objects.splice(index, 1);
            if (ctx.hovered_object === obj) {
                ctx.hovered_object = null;
            }
            save_objects(ctx);
        }
    }
    ctx.objects_to_delete = ctx.objects.filter(o => o.delete_timer > 0);
}
/////7 MAIN_LOOP
function update(current_time) {
    let delta_time = (current_time - ctx.last_time) / 1000;
    ctx.last_time = current_time;
    delta_time = Math.min(delta_time, 0.1);
    ctx.time += delta_time;
    update_camera_smooth(ctx);
    update_deleted_objects(ctx, delta_time);
    const gl = ctx.gl;
    gl.enable(gl.CULL_FACE);
    let rect = ctx.canvas.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;
    let left = rect.left - ctx.canvas.getBoundingClientRect().left;
    let bottom = ctx.canvas.clientHeight - (rect.bottom - ctx.canvas.getBoundingClientRect().top);
    gl.viewport(left, bottom, width, height);
    gl.scissor(left, bottom, width, height);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    draw(ctx, grid);
    for (let obj of ctx.objects) {
        draw(ctx, obj);
    }
    requestAnimationFrame(update);
}
requestAnimationFrame(update);
