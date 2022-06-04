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

function link_shader_program(gl, vertex_shader_source, fragment_shader_source, transform_feedback){
    let vertex_shader = compile_shader(gl, vertex_shader_source, gl.VERTEX_SHADER);
    if(vertex_shader == null) return null;

    let fragment_shader = compile_shader(gl, fragment_shader_source, gl.FRAGMENT_SHADER);
    if(fragment_shader == null) return null;


    let shader_program = gl.createProgram();
    gl.attachShader(shader_program, vertex_shader);
    gl.attachShader(shader_program, fragment_shader);

    if(transform_feedback != null){
        gl.transformFeedbackVaryings(shader_program, transform_feedback, gl.INTERLEAVED_ATTRIBS);
    }

    gl.linkProgram(shader_program);
    if(!gl.getProgramParameter(shader_program, gl.LINK_STATUS)){
        console.error("couldn't link shader program: "+gl.getProgramInfoLog(shader_program));
        return null;
    }
    return shader_program;
}

function create_shader(gl, vertex_shader_source, fragment_shader_source, transform_feedback){
    let program = link_shader_program(gl, vertex_shader_source, fragment_shader_source, transform_feedback);
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

function create_vertex_buffer(gl, buffer, attributes, indexed, indices){
    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    let vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buffer), gl.STATIC_DRAW);
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

    if(indexed){
        let index_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        draw_count = indices.length;
    }
    else{
        draw_count = buffer.length/attribs_stride;
    }

    return {vao: vao, vbo: vertex_buffer, draw_count: draw_count, indexed: indexed};
}

function draw_buffer(gl, vertex_buffer, primitive){
    gl.bindVertexArray(vertex_buffer.vao);
    if(vertex_buffer.indexed){
        gl.drawElements(primitive, vertex_buffer.draw_count, gl.UNSIGNED_SHORT, 0);
    }
    else{
        gl.drawArrays(primitive, 0, vertex_buffer.draw_count);
    }
}

function create_texture(gl, data, width, height, interpolation){
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, interpolation);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, interpolation);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function create_framebuffer(gl, texture){
    let framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    let attachment_point = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment_point, gl.TEXTURE_2D, texture, 0);
    return framebuffer;
}

function create_transform_feedback(gl, buffer){
    let transform_feedback = gl.createTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transform_feedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return transform_feedback;
}

function create_drawable(gl, transform, vertex_buffer, shader, primitive, depth_func, cull_face){
    if(depth_func == undefined) depth_func = gl.LESS;
    if(cull_face == undefined) cull_face = gl.BACK;
    return {
        transform: transform,
        vertex_buffer: vertex_buffer,
        shader: shader,
        primitive: primitive,
        depth_func: depth_func,
        cull_face: cull_face,
    };
}

function draw(gl, drawable, camera){
    if(drawable.depth_func == false){
        gl.disable(gl.DEPTH_TEST);
    }
    else{
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(drawable.depth_func);
    }

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.useProgram(drawable.shader.program);

    let m = mat4_identity();
        m = mat4_mat4_mul(translate_3d(drawable.transform.position), m);
        m = mat4_mat4_mul(rotate_3d(drawable.transform.rotation), m);
        m = mat4_mat4_mul(scale_3d(drawable.transform.scale), m);

    set_shader_uniform(gl, drawable.shader, "m", m);
    set_shader_uniform(gl, drawable.shader, "v", camera.view_matrix);
    set_shader_uniform(gl, drawable.shader, "p", camera.projection_matrix);

    draw_buffer(gl, drawable.vertex_buffer, drawable.primitive);
}

// @Note remove {cache: "no-store"}
function load_assets_and_objects(gl, assets_to_load, assets, objects, callback){
    (async function(){
        for(let asset of assets_to_load){
            if(asset.type == "asset_mesh"){
                let res = await fetch(asset.path, {cache: "no-store"});
                let json = await res.json();
                if(json.indices != undefined){
                    assets[asset.name] = create_vertex_buffer(gl, json.buffer, json.attributes, true, json.indices);
                }
                else{
                    assets[asset.name] = create_vertex_buffer(gl, json.buffer, json.attributes, false);
                }
            }
            else if(asset.type == "asset_shader"){
                let res_vert = await fetch(asset.path[0], {cache: "no-store"});
                let text_vert = await res_vert.text();
                let res_frag = await fetch(asset.path[1], {cache: "no-store"});
                let text_frag = await res_frag.text();
                assets[asset.name] = create_shader(gl, text_vert, text_frag);
            }
        }

        let primitives = {
            "lines": gl.LINES,
            "triangles": gl.TRIANGLES,
        }

        for(var key in objects){
            let object = objects[key];
            if(object.type == "drawable"){
                objects[key] = create_drawable(gl, object.transform,
                    assets[object.mesh],
                    assets[object.shader],
                    primitives[object.primitive == undefined ? "triangles" : object.primitive],
                    object.depth_func,
                    object.cull_face,
                );
            }
            else if(object.type == "camera"){
                objects[key] = create_camera(object.fov, object.near_plane, object.far_plane,
                    object.position, object.target, object.rotation, object.up_vector);
            }
        }
        callback();
    })();
}

function create_camera(fov, near_plane, far_plane, position, target, rotation, up_vector){
    return {
        fov: fov,
        near_plane: near_plane,
        far_plane: far_plane,
        position: position,
        target: target,
        rotation: rotation,
        view_matrix: mat4_identity(),
        projection_matrix: mat4_identity(),
        up_vector: up_vector,
        orbit: {
            pivot: [0, 0, 0],
            zoom: 5,
            angle: [-Math.PI, Math.PI/3]
        }
    };
}

function camera_get_forward(camera){
    return vec3_normalize(camera.view_matrix.slice(8, 11));
}

function camera_get_up(camera){
    return vec3_normalize(camera.view_matrix.slice(4, 7));
}

function camera_get_right(camera){
    return vec3_normalize(camera.view_matrix.slice(0, 3));
}

function update_camera_projection_matrix(gl, camera){
    let aspect_ratio = gl.canvas.width/gl.canvas.height;
    let projection_matrix = perspective_projection(rad(camera.fov),
                                aspect_ratio,
                                camera.near_plane,
                                camera.far_plane);
    camera.projection_matrix = projection_matrix;
}

function update_camera_view_matrix(gl, camera){
    let view_matrix = lookat_matrix(camera.position, camera.target, camera.up_vector);
    camera.view_matrix = view_matrix;
}

function update_camera_orbit(gl, camera){
    camera.position = [
        Math.sin(camera.orbit.angle[1])*Math.sin(camera.orbit.angle[0]),
        Math.cos(camera.orbit.angle[1]),
        Math.sin(camera.orbit.angle[1])*Math.cos(camera.orbit.angle[0]),
    ];
    camera.position = vec3_scale(vec3_normalize(vec3_add(camera.position, camera.orbit.pivot)), camera.orbit.zoom);
    update_camera_view_matrix(gl, camera);
}

function update_camera_lookat(gl, camera){
    let x = camera.rotation[0];
    let y = camera.rotation[1];
    let forward = [
        Math.cos(x)*Math.cos(y),
        Math.sin(y),
        Math.sin(x)*Math.cos(y)
    ];
    camera.target = vec3_add(camera.position, forward);
    update_camera_view_matrix(gl, camera);
}