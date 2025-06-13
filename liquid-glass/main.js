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

ctx.canvas = document.getElementById("main-canvas");
ctx.gl = ctx.canvas.getContext("webgl2", {stencil: true});
ctx.font_texture = ctx.gl.createTexture();
ctx.font = {chars:{}, data: {}};
ctx.text_buffers = {};
ctx.drawables = [];

ctx.scenes = {
    "scene_shape": {id: "scene_shape", el: null, ratio: 1.5, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
        },
        cursor_pos: [0.5, 0.5]
    },
    "scene_normal": {id: "scene_normal", el: null, ratio: 1.5, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
        },
        cursor_pos: [0.5, 0.5]
    },
    "scene_refraction": {id: "scene_refraction", el: null, ratio: 1.5, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
        },
        cursor_pos: [0.5, 0.5]
    },
    "scene_reflection": {id: "scene_reflection", el: null, ratio: 1.5, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
        },
        cursor_pos: [0.5, 0.5]
    },
    "scene_reflection_tex": {id: "scene_reflection_tex", el: null, ratio: 1.5, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
        },
        cursor_pos: [0.5, 0.5]
    },
    "scene_refraction_reflection_tex": {id: "scene_refraction_reflection_tex", el: null, ratio: 1.5, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
        },
        cursor_pos: [0.5, 0.5]
    },
    "scene_sdf_mix": {id: "scene_sdf_mix", el: null, ratio: 1.5, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
        },
        cursor_pos: [0.5, 0.5]
    },
    "scene_refraction_tex": {id: "scene_refraction_tex", el: null, ratio: 1.5, camera: null, dragging_rect: null, draggable_rects: {"scene": []},
        camera: {
            fov: 40, z_near: 0.1, z_far: 1000,
            position: [0, 0, 0], rotation: [0, 0, 0],
            up_vector: [0, 1, 0],
            view_matrix: mat4_identity(),
        },
        cursor_pos: [0.5, 0.5]
    },
};

ctx.update_drawable_mesh = function(drawable, mesh){
    const gl = this.gl;
    if(drawable.vertex_buffer != null){
        gl.deleteVertexArray(drawable.vertex_buffer.vao);
        gl.deleteBuffer(drawable.vertex_buffer.vbo);
        gl.deleteBuffer(drawable.vertex_buffer.ebo);
    }
    drawable.vertex_buffer = this.create_vertex_buffer(mesh.vertices, [
                            { name: 'position_attrib', size: 3 },
                            { name: 'normal_attrib', size: 3 }
                        ], mesh.indices);
}

ctx.shaders = {};
ctx.shaders["shader_shape"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec2 texcoord_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec2 texcoord;

void main(){
    gl_Position = vec4(position_attrib, 1.0);
    position = position_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 scene_offset;
uniform vec2 cursor_pos;

out vec4 frag_color;

in vec3 position;
in vec2 texcoord;

float sdf_rounded_rect(vec2 center, vec2 size, vec2 p, float r)
{
    vec2 p_rel = p - center;
    vec2 q = abs(p_rel) - size;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main(){
    vec2 frag_coord_scene = gl_FragCoord.xy - scene_offset;
    vec2 uv = frag_coord_scene / resolution;
    uv = uv - 0.5;
    uv.x *= resolution.x / resolution.y;

    vec2 pos = (cursor_pos*vec2(1, -1)) + vec2(-0.5, 0.5);

    float sdf = sdf_rounded_rect(pos, vec2(0.1, 0.1), uv, 0.1)*5.0;
    frag_color = vec4(vec3(sdf), 1);
}`);
ctx.shaders["shader_normal"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec2 texcoord_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec2 texcoord;

void main(){
    gl_Position = vec4(position_attrib, 1.0);
    position = position_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 scene_offset;
uniform vec2 cursor_pos;

out vec4 frag_color;

in vec3 position;
in vec2 texcoord;

float sdf_rounded_rect(vec2 center, vec2 size, vec2 p, float r)
{
    vec2 p_rel = p - center;
    vec2 q = abs(p_rel) - size;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 get_normal(float sdf, float thickness)
{
    float dx = dFdx(sdf);
    float dy = dFdy(sdf);

    float n_cos = max(thickness + sdf, 0.0) / thickness;
    float n_sin = sqrt(1.0 - n_cos * n_cos);

    return normalize(vec3(dx * n_cos, dy * n_cos, n_sin));
}

void main(){
    vec2 frag_coord_scene = gl_FragCoord.xy - scene_offset;
    vec2 uv = frag_coord_scene / resolution;
    uv = uv - 0.5;
    uv.x *= resolution.x / resolution.y;

    vec2 pos = (cursor_pos*vec2(1, -1)) + vec2(-0.5, 0.5);

    float sdf = sdf_rounded_rect(pos, vec2(0.1, 0.1), uv, 0.1)*200.0;
    frag_color = vec4(get_normal(sdf, 20.0), 1);
}`);
ctx.shaders["shader_refraction"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec2 texcoord_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec2 texcoord;

void main(){
    gl_Position = vec4(position_attrib, 1.0);
    position = position_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 scene_offset;
uniform vec2 cursor_pos;

out vec4 frag_color;

in vec3 position;
in vec2 texcoord;

float sdf_rounded_rect(vec2 center, vec2 size, vec2 p, float r)
{
    vec2 p_rel = p - center;
    vec2 q = abs(p_rel) - size;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 get_normal(float sdf, float thickness)
{
    float dx = dFdx(sdf);
    float dy = dFdy(sdf);

    float n_cos = max(thickness + sdf, 0.0) / thickness;
    float n_sin = sqrt(1.0 - n_cos * n_cos);

    return normalize(vec3(dx * n_cos, dy * n_cos, n_sin));
}

void main(){
    vec2 frag_coord_scene = gl_FragCoord.xy - scene_offset;
    vec2 uv = frag_coord_scene / resolution;
    uv = uv - 0.5;
    uv.x *= resolution.x / resolution.y;

    vec2 pos = (cursor_pos*vec2(1, -1)) + vec2(-0.5, 0.5);

    float sdf = sdf_rounded_rect(pos, vec2(0.1, 0.1), uv, 0.1)*200.0;

    vec3 normal = get_normal(sdf, 20.0);

    float ior = 1.0/1.5;
    vec3 incident_vector = vec3(0.0, 0.0, -1.0);

    vec3 refracted_vector = refract(incident_vector, normal, ior);

    frag_color = vec4(refracted_vector, 1);
}`);
ctx.shaders["shader_reflection"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec2 texcoord_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec2 texcoord;

void main(){
    gl_Position = vec4(position_attrib, 1.0);
    position = position_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 scene_offset;
uniform vec2 cursor_pos;

out vec4 frag_color;

in vec3 position;
in vec2 texcoord;

float sdf_rounded_rect(vec2 center, vec2 size, vec2 p, float r)
{
    vec2 p_rel = p - center;
    vec2 q = abs(p_rel) - size;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 get_normal(float sdf, float thickness)
{
    float dx = dFdx(sdf);
    float dy = dFdy(sdf);

    float n_cos = max(thickness + sdf, 0.0) / thickness;
    float n_sin = sqrt(1.0 - n_cos * n_cos);

    return normalize(vec3(dx * n_cos, dy * n_cos, n_sin));
}

void main(){
    vec2 frag_coord_scene = gl_FragCoord.xy - scene_offset;
    vec2 uv = frag_coord_scene / resolution;
    uv = uv - 0.5;
    uv.x *= resolution.x / resolution.y;

    vec2 pos = (cursor_pos*vec2(1, -1)) + vec2(-0.5, 0.5);

    float sdf = sdf_rounded_rect(pos, vec2(0.1, 0.1), uv, 0.1)*200.0;

    vec3 normal = get_normal(sdf, 20.0);

    vec3 incident_vector = vec3(0.0, 0.0, -1.0);

    vec3 reflected_vector = reflect(incident_vector, normal);

    frag_color = vec4(reflected_vector, 1);
}`);
ctx.shaders["shader_reflection_tex"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec2 texcoord_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec2 texcoord;

void main(){
    gl_Position = vec4(position_attrib, 1.0);
    position = position_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 scene_offset;
uniform sampler2D bg;
uniform vec2 cursor_pos;

out vec4 frag_color;

in vec3 position;
in vec2 texcoord;

float sdf_rounded_rect(vec2 center, vec2 size, vec2 p, float r)
{
    vec2 p_rel = p - center;
    vec2 q = abs(p_rel) - size;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 get_normal(float sdf, float thickness)
{
    float dx = dFdx(sdf);
    float dy = dFdy(sdf);

    float n_cos = max(thickness + sdf, 0.0) / thickness;
    float n_sin = sqrt(1.0 - n_cos * n_cos);

    return normalize(vec3(dx * n_cos, dy * n_cos, n_sin));
}

void main(){
    vec2 frag_coord_scene = gl_FragCoord.xy - scene_offset;
    vec2 uv = frag_coord_scene / resolution;
    uv = uv - 0.5;
    uv.x *= resolution.x / resolution.y;

    vec2 uv_bg = uv;
    uv_bg += vec2(1.0, 0.5);
    uv_bg *= 0.5;

    vec2 pos = (cursor_pos*vec2(1, -1)) + vec2(-0.5, 0.5);

    float sdf = sdf_rounded_rect(pos, vec2(0.1, 0.1), uv, 0.1)*200.0;

    vec3 normal = get_normal(sdf, 10.0);

    float ior = 1.0/1.5;
    vec3 incident_vector = vec3(0.0, 0.0, -1.0);

    vec3 reflected_vector = reflect(incident_vector, normal);
    float reflected_corner = abs(reflected_vector.x - reflected_vector.y);
    float reflected_color = max(0.0001, abs(reflected_corner));

    frag_color = vec4(texture(bg, uv_bg).rgb+vec3(reflected_color), 1.0);
}`);
ctx.shaders["shader_refraction_reflection_tex"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec2 texcoord_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec2 texcoord;

void main(){
    gl_Position = vec4(position_attrib, 1.0);
    position = position_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 scene_offset;
uniform sampler2D bg;
uniform vec2 cursor_pos;

out vec4 frag_color;

in vec3 position;
in vec2 texcoord;

float sdf_rounded_rect(vec2 center, vec2 size, vec2 p, float r)
{
    vec2 p_rel = p - center;
    vec2 q = abs(p_rel) - size;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 get_normal(float sdf, float thickness)
{
    float dx = dFdx(sdf);
    float dy = dFdy(sdf);

    float n_cos = max(thickness + sdf, 0.0) / thickness;
    float n_sin = sqrt(1.0 - n_cos * n_cos);

    return normalize(vec3(dx * n_cos, dy * n_cos, n_sin));
}

void main(){
    vec2 frag_coord_scene = gl_FragCoord.xy - scene_offset;
    vec2 uv = frag_coord_scene / resolution;
    uv = uv - 0.5;
    uv.x *= resolution.x / resolution.y;

    vec2 uv_bg = uv;
    uv_bg += vec2(1.0, 0.5);
    uv_bg *= 0.5;

    vec2 pos = (cursor_pos*vec2(1, -1)) + vec2(-0.5, 0.5);

    float sdf = sdf_rounded_rect(pos, vec2(0.1, 0.1), uv, 0.1)*200.0;

    vec3 normal = get_normal(sdf, 10.0);

    float ior = 1.0/1.5;
    vec3 incident_vector = vec3(0.0, 0.0, -1.0);

    vec3 refracted_vector = refract(incident_vector, normal, ior);

    vec3 reflected_vector = reflect(incident_vector, normal);
    float reflected_corner = abs(reflected_vector.x - reflected_vector.y);
    float reflected_color = max(0.0001, abs(reflected_corner));

    vec3 refracted_color = texture(bg, uv_bg+refracted_vector.xy).rgb;

    frag_color = vec4(refracted_color + reflected_color, 1.0);
}`);
ctx.shaders["shader_sdf_mix"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec2 texcoord_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec2 texcoord;

void main(){
    gl_Position = vec4(position_attrib, 1.0);
    position = position_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 scene_offset;
uniform sampler2D bg;
uniform vec2 cursor_pos;

out vec4 frag_color;

in vec3 position;
in vec2 texcoord;

float sdf_rounded_rect(vec2 center, vec2 size, vec2 p, float r)
{
    vec2 p_rel = p - center;
    vec2 q = abs(p_rel) - size;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 get_normal(float sdf, float thickness)
{
    float dx = dFdx(sdf);
    float dy = dFdy(sdf);

    float n_cos = max(thickness + sdf, 0.0) / thickness;
    float n_sin = sqrt(1.0 - n_cos * n_cos);

    return normalize(vec3(dx * n_cos, dy * n_cos, n_sin));
}

float smooth_union( float d1, float d2, float k )
{
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

void main(){
    vec2 frag_coord_scene = gl_FragCoord.xy - scene_offset;
    vec2 uv = frag_coord_scene / resolution;
    uv = uv - 0.5;
    uv.x *= resolution.x / resolution.y;

    vec2 uv_bg = uv;
    uv_bg += vec2(1.0, 0.5);
    uv_bg *= 0.5;

    vec2 pos = (cursor_pos*vec2(1, -1)) + vec2(-0.5, 0.5);

    float sdf = sdf_rounded_rect(pos, vec2(0.1, 0.1), uv, 0.1)*200.0;

    sdf = smooth_union(sdf, sdf_rounded_rect(vec2(-0.3, 0.2), vec2(0.1, 0.1), uv, 0.1)*200.0, 20.0);

    vec3 normal = get_normal(sdf, 10.0);

    float ior = 1.0/1.5;
    vec3 incident_vector = vec3(0.0, 0.0, -1.0);

    vec3 refracted_vector = refract(incident_vector, normal, ior);

    vec3 reflected_vector = reflect(incident_vector, normal);
    float reflected_corner = abs(reflected_vector.x - reflected_vector.y);
    float reflected_color = max(0.0001, abs(reflected_corner));

    vec3 refracted_color = texture(bg, uv_bg+refracted_vector.xy).rgb;

    frag_color = vec4(refracted_color + reflected_color, 1.0);
}`);
ctx.shaders["shader_refraction_tex"] = ctx.create_shader(`#version 300 es
layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec2 texcoord_attrib;

uniform mat4 m;
uniform mat4 v;
uniform mat4 p;

out vec3 position;
out vec2 texcoord;

void main(){
    gl_Position = vec4(position_attrib, 1.0);
    position = position_attrib;
    texcoord = texcoord_attrib;
}`,
`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 scene_offset;
uniform sampler2D bg;
uniform vec2 cursor_pos;

out vec4 frag_color;

in vec3 position;
in vec2 texcoord;

float sdf_rounded_rect(vec2 center, vec2 size, vec2 p, float r)
{
    vec2 p_rel = p - center;
    vec2 q = abs(p_rel) - size;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 get_normal(float sdf, float thickness)
{
    float dx = dFdx(sdf);
    float dy = dFdy(sdf);

    float n_cos = max(thickness + sdf, 0.0) / thickness;
    float n_sin = sqrt(1.0 - n_cos * n_cos);

    return normalize(vec3(dx * n_cos, dy * n_cos, n_sin));
}

void main(){
    vec2 frag_coord_scene = gl_FragCoord.xy - scene_offset;
    vec2 uv = frag_coord_scene / resolution;
    uv = uv - 0.5;
    uv.x *= resolution.x / resolution.y;

    vec2 uv_bg = uv;
    uv_bg += vec2(1.0, 0.5);
    uv_bg *= 0.5;

    vec2 pos = (cursor_pos*vec2(1, -1)) + vec2(-0.5, 0.5);

    float sdf = sdf_rounded_rect(pos, vec2(0.1, 0.1), uv, 0.1)*200.0;

    vec3 normal = get_normal(sdf, 10.0);

    float ior = 1.0/1.5;
    vec3 incident_vector = vec3(0.0, 0.0, -1.0);

    vec3 refracted_vector = refract(incident_vector, normal, ior);

    frag_color = vec4(texture(bg, uv_bg+refracted_vector.xy).rgb, 1);
}`);

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
        let current_pos = [coords.x/scene.width, coords.y/scene.height];
        scene.cursor_pos = current_pos;
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
            ctx.set_shader_uniform(shader, "p", custom_camera.projection_matrix);
            ctx.set_shader_uniform(shader, "v", custom_camera.view_matrix);
        }
        else{
            update_camera_projection_matrix(scene.camera, scene.width/scene.height);
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

ctx.create_drawable = function(shader, mesh, color, transform, custom_vertex_attribs){
    let drawable = {
        shader: shader,
        vertex_buffer : mesh == null ? null : this.create_vertex_buffer(mesh.vertices, custom_vertex_attribs == null ? [
                            { name: 'position_attrib', size: 3 },
                            { name: 'normal_attrib', size: 3 }
                        ] : custom_vertex_attribs, mesh.indices),
        color: color,
        transform: transform
    };
    this.drawables.push(drawable);
    return drawable;
}

function resize_event(ctx){
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

}
resize_event(ctx);
addEventListener("resize", () => resize_event(ctx));

ctx.texture_bg = ctx.gl.createTexture();

let fullscreen_quad = ctx.create_drawable("shader_shape", {
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

        if(scene_id == "scene_shape"){
            fullscreen_quad.shader = "shader_shape";
            ctx.draw(fullscreen_quad, {"cursor_pos": [scene.cursor_pos[0], scene.cursor_pos[1]], "scene_offset": [left, bottom], "resolution": [width, height]});
        }
        else if(scene_id == "scene_normal"){
            fullscreen_quad.shader = "shader_normal";
            ctx.draw(fullscreen_quad, {"cursor_pos": [scene.cursor_pos[0], scene.cursor_pos[1]], "scene_offset": [left, bottom], "resolution": [width, height]});
        }
        else if(scene_id == "scene_refraction"){
            fullscreen_quad.shader = "shader_refraction";
            ctx.draw(fullscreen_quad, {"cursor_pos": [scene.cursor_pos[0], scene.cursor_pos[1]], "scene_offset": [left, bottom], "resolution": [width, height]});
        }
        else if(scene_id == "scene_refraction_tex"){
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, ctx.texture_bg);
            fullscreen_quad.shader = "shader_refraction_tex";
            ctx.draw(fullscreen_quad, {"cursor_pos": [scene.cursor_pos[0], scene.cursor_pos[1]], "scene_offset": [left, bottom], "resolution": [width, height]});
        }
        else if(scene_id == "scene_reflection"){
            fullscreen_quad.shader = "shader_reflection";
            ctx.draw(fullscreen_quad, {"cursor_pos": [scene.cursor_pos[0], scene.cursor_pos[1]], "scene_offset": [left, bottom], "resolution": [width, height]});
        }
        else if(scene_id == "scene_reflection_tex"){
            fullscreen_quad.shader = "shader_reflection_tex";
            ctx.draw(fullscreen_quad, {"cursor_pos": [scene.cursor_pos[0], scene.cursor_pos[1]], "scene_offset": [left, bottom], "resolution": [width, height]});
        }
        else if(scene_id == "scene_refraction_reflection_tex"){
            fullscreen_quad.shader = "shader_refraction_reflection_tex";
            ctx.draw(fullscreen_quad, {"cursor_pos": [scene.cursor_pos[0], scene.cursor_pos[1]], "scene_offset": [left, bottom], "resolution": [width, height]});
        }
        else if(scene_id == "scene_sdf_mix"){
            fullscreen_quad.shader = "shader_sdf_mix";
            ctx.draw(fullscreen_quad, {"cursor_pos": [scene.cursor_pos[0], scene.cursor_pos[1]], "scene_offset": [left, bottom], "resolution": [width, height]});
        }
    }

    requestAnimationFrame(update);
}
requestAnimationFrame(update);


async function get_texture(){
    const image = new Image();
    image.src = "bg.jpg";

    await new Promise((resolve, reject) => {
        image.onload = () => {
            ctx.gl.bindTexture(ctx.gl.TEXTURE_2D, ctx.texture_bg);
            ctx.gl.texImage2D(ctx.gl.TEXTURE_2D, 0, ctx.gl.RGBA, ctx.gl.RGBA, ctx.gl.UNSIGNED_BYTE, image);
            ctx.gl.texParameteri(ctx.gl.TEXTURE_2D, ctx.gl.TEXTURE_MIN_FILTER, ctx.gl.LINEAR_MIPMAP_LINEAR);
            ctx.gl.texParameteri(ctx.gl.TEXTURE_2D, ctx.gl.TEXTURE_MAG_FILTER, ctx.gl.LINEAR);
            ctx.gl.generateMipmap(ctx.gl.TEXTURE_2D);
        };
        image.onerror = reject;
    });
}

get_texture();