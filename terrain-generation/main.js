let texture_size = 128;
let grid_size = [100, 100];

let noise_texture;

let canvas_noise_1 = document.getElementById("canvas_noise_1");
canvas_noise_1.width = texture_size;
canvas_noise_1.height = texture_size;
let ctx_noise_1 = canvas_noise_1.getContext("2d");

let canvas_noise_2 = document.getElementById("canvas_noise_2");
canvas_noise_2.width = texture_size;
canvas_noise_2.height = texture_size;
let ctx_noise_2 = canvas_noise_2.getContext("2d");

let canvas_normal = document.getElementById("canvas_gl_normal");
canvas_normal.width = texture_size;
canvas_normal.height = texture_size;
let gl_normal = canvas_normal.getContext("webgl2");

let seed = Math.floor(Math.random()*10000)+"";
let octaves = 4;
let height_multiplier = 20;
let seed_input = document.getElementById("seed");
let ocataves_input = document.getElementById("octaves");
let height_multiplier_input = document.getElementById("height_multiplier");
let rand = xmur3(seed);
let noise = get_noise_function(generate_permutation_table(rand));
seed_input.value = seed;
ocataves_input.value = octaves;
height_multiplier_input.value = height_multiplier;
seed_input.onchange = update;
ocataves_input.onchange = update;
height_multiplier_input.oninput = update;

function draw_texture(){
    for(let j = 0; j < canvas_noise_2.height; j++){
        for(let i = 0; i < canvas_noise_2.width; i++){
            freq = 0.01;
            amplitude = 1;
            let col = noise(i*freq, j*freq, 0)*amplitude;

            col2 = Math.abs(col)*255;
            ctx_noise_1.fillStyle = "rgb("+col2+", "+col2+", "+col2+")";
            ctx_noise_1.fillRect(i, j, 1, 1);

            for(let k = 0; k < octaves; k++){
                freq *= 2;
                amplitude /= 2;
                col += noise(i*freq, j*freq, 0)*amplitude;
            }
            col = Math.abs(col)*255;
            ctx_noise_2.fillStyle = "rgb("+col+", "+col+", "+col+")";
            ctx_noise_2.fillRect(i, j, 1, 1);
        }
    }
    noise_texture = ctx_noise_2.getImageData(0, 0, canvas_noise_2.width, canvas_noise_2.height);
}

let canvas_id = ["canvas_grid", "canvas_terrain", "canvas_terrain_color"];
let canvas_count = canvas_id.length;
let canvas_s = [];
let gl_s = [];
let objects_to_draw_s = [];
let shaders_files = [];
for(let i = 0; i < canvas_id.length; i++){
    let canvas = document.getElementById(canvas_id[i]);
    canvas.width = 530;
    canvas.height = 280;
    let gl = canvas.getContext("webgl2");
    canvas_s.push(canvas);
    gl_s.push(gl);
    objects_to_draw_s[i] = [];
    objects_to_draw_s[i].push({
        vertex_shader: canvas_id[i]+"_vertex.glsl",
        fragment_shader: canvas_id[i]+"_fragment.glsl",
        transform: {
            position: [-grid_size[0]/2, 0, -grid_size[1]/2],
            scale: [1, 1, 1],
            rotation: quat_id()
        },
        shader: {
            program: null,
            uniforms: {}
        },
        draw_count: null,
        vao: null,
        texture: null,
        lines: i == 0
    });

    shaders_files.push([i, canvas_id[i]+"_vertex.glsl"]);
    shaders_files.push([i, canvas_id[i]+"_fragment.glsl"]);
}

let main_camera = {
    fov: 60,
    near_plane: 0.1,
    far_plane: 10000,
    position: [0, 50, -70],
    rotation: [Math.PI/2, -Math.PI/4, 0]
};

let shaders_s = [];

let vertices = [];
let indices = [];

function init_grid_vertex(){
    let vertex_count = (grid_size[0]+1)*(grid_size[1]+1);
    let x_count = 0, y_count = 0;
    for(let i = 0; i < vertex_count*6; i+=6){
        vertices[i] = x_count;
        vertices[i+1] = 0.0;
        vertices[i+2] = y_count;

        vertices[i+3] = 0;
        vertices[i+4] = 1;
        vertices[i+5] = 0;
        x_count++;
        if(x_count%(grid_size[0]+1) == 0){
            x_count = 0;
            y_count++;
        }
    }
    for(let j = 0; j < grid_size[1]; j++){
        for(let i = 0; i < grid_size[0]; i++){
            let quad = i+j*grid_size[0];
            indices[(quad*6)] = quad+j;
            indices[(quad*6)+1] = indices[quad*6+4] = (quad+j)+grid_size[0]+1;
            indices[(quad*6)+2] = indices[quad*6+3] = quad+j+1;
            indices[(quad*6)+5] = (quad+j)+grid_size[0]+2;
        }
    }
}

function grid_vertex_buffer(gl){
    let vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    let index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    return [vertex_buffer, index_buffer, indices.length];
}

function init(id){
    let gl = gl_s[id];
    let objects_to_draw = objects_to_draw_s[id];
    let shaders = shaders_s[id];
    for(let i = 0; i < objects_to_draw.length; i++){
        let shader_program = link_shader_program(gl,
            shaders[objects_to_draw[i].vertex_shader],
            shaders[objects_to_draw[i].fragment_shader]);
        objects_to_draw[i].shader.program = shader_program;
        let n_uniforms = gl.getProgramParameter(shader_program, gl.ACTIVE_UNIFORMS);

        for(let j = 0; j < n_uniforms; j++){
            let uniform = gl.getActiveUniform(shader_program, j);
            if(uniform.type == gl.SAMPLER_2D) continue;
            objects_to_draw[i].shader.uniforms[uniform["name"]] = {
                type: uniform["type"],
                location: gl.getUniformLocation(shader_program, uniform["name"])
            };
        }

        let vao = gl.createVertexArray();
        objects_to_draw[i].vao = vao;
        gl.bindVertexArray(vao);

        let vertex_buffer = grid_vertex_buffer(gl);
        objects_to_draw[i].draw_count = vertex_buffer[2];

        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer[0]);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertex_buffer[1]);
        let position_attrib_location = gl.getAttribLocation(shader_program, "position_attrib");
        let normal_attrib_location = gl.getAttribLocation(shader_program, "normal_attrib");
        gl.enableVertexAttribArray(position_attrib_location);
        gl.vertexAttribPointer(position_attrib_location, 3, gl.FLOAT, false,
                                6*Float32Array.BYTES_PER_ELEMENT, 0);
        gl.vertexAttribPointer(normal_attrib_location, 3, gl.FLOAT, false,
                                6*Float32Array.BYTES_PER_ELEMENT, 3*Float32Array.BYTES_PER_ELEMENT);

        let texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, noise_texture.width, noise_texture.height,
                    0, gl.RGBA, gl.UNSIGNED_BYTE, noise_texture.data);
        gl.generateMipmap(gl.TEXTURE_2D);
        objects_to_draw[i].texture = texture;
    }
}

function draw_3d(id){
    let gl = gl_s[id];
    let camera = main_camera;
    let objects_to_draw = objects_to_draw_s[id];

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
        m = mat4_mat4_mul(rotate_3d(objects_to_draw[i].transform.rotation), m);
        m = mat4_mat4_mul(translate_3d(objects_to_draw[i].transform.position), m);
        m = mat4_mat4_mul(scale_3d(objects_to_draw[i].transform.scale), m);
        let mvp = mat4_identity();
        mvp = mat4_mat4_mul(m, mat4_mat4_mul(v, p));
        set_shader_uniform(gl, objects_to_draw[i].shader, "mvp", mvp);
        if("height_multiplier" in objects_to_draw[i].shader.uniforms){
            set_shader_uniform(gl, objects_to_draw[i].shader, "height_multiplier", height_multiplier);
        }

        if(objects_to_draw[i].texture != null){
            gl.bindTexture(gl.TEXTURE_2D, objects_to_draw[i].texture);
        }
        gl.bindVertexArray(objects_to_draw[i].vao);
        let draw_type = gl.TRIANGLES;
        if(objects_to_draw[i].lines) draw_type = gl.LINE_STRIP;
        gl.drawElements(draw_type, objects_to_draw[i].draw_count, gl.UNSIGNED_SHORT, 0);
    }
}

function update(){
    seed = seed_input.value+"";
    octaves = parseInt(ocataves_input.value);
    height_multiplier = parseFloat(height_multiplier_input.value);
    rand = xmur3(seed);
    noise = get_noise_function(generate_permutation_table(rand));
    draw_texture();
    for(let i = 0; i < canvas_count; i++){
        let gl = gl_s[i];
        let texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, noise_texture.width, noise_texture.height,
                    0, gl.RGBA, gl.UNSIGNED_BYTE, noise_texture.data);
        gl.generateMipmap(gl.TEXTURE_2D);
        objects_to_draw_s[i][0].texture = texture;
        draw_3d(i);
    }
};

function xmur3(str){
    for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
        h = h << 13 | h >>> 19;
    return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

(async function(){
    for(let shader of shaders_files){
        let res = await fetch(shader[1]);
        let text = await res.text();
        if(shader[0] >= shaders_s.length) shaders_s.push({});
        shaders_s[shader[0]][shader[1]] = text;
    }
    draw_texture();
    init_grid_vertex();
    for(let i = 0; i < canvas_count; i++){
        init(i);
    }
    update();
})();

let dragging = -1;
for(let i = 0; i < canvas_count; i++){
    (function(i){
        canvas_s[i].addEventListener("mousedown", function(e){
            dragging = i;
        });
    })(i);
}
document.addEventListener("mouseup", function(e){
    dragging = -1;
});
document.addEventListener("mousemove", function(e){
    if(dragging > -1){
        let x = e.movementX;
        let y = e.movementY;
        objects_to_draw_s[dragging][0].transform.rotation = quat_mul(
            objects_to_draw_s[dragging][0].transform.rotation,
            euler_to_quat([0, -x/100, 0]));
        draw_3d(dragging);
    }
});
document.addEventListener("keydown", function(e){
    if(e.keyCode == 71){
        seed_input.value = Math.floor(Math.random()*10000)+"";
        update();
    }
});