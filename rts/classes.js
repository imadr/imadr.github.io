let Shader = class{
    constructor(gl, vertex_shader_source, fragment_shader_source){
        let program = link_shader_program(gl,
            vertex_shader_source,
            fragment_shader_source);
        this.program = program;
        this.uniforms = {};
        gl.useProgram(program);

        let n_uniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for(let i = 0; i < n_uniforms; i++){
            let uniform = gl.getActiveUniform(program, i);
            this.uniforms[uniform.name] = {
                type: uniform.type,
                location: gl.getUniformLocation(program, uniform.name)
            };
        }
    }
};

let Mesh = class{
    constructor(gl, vertices, shader, attribs, attribs_n){
        this.shader = shader;
        this.draw_count = vertices.length/attribs_n;
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        let vertex_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        let position_attrib_location = gl.getAttribLocation(shader.program, "position_attrib");
        gl.enableVertexAttribArray(position_attrib_location);
        gl.vertexAttribPointer(position_attrib_location, attribs[0], gl.FLOAT, false,
                                attribs_n*Float32Array.BYTES_PER_ELEMENT, 0);
        if(attribs.length <= 1) return;

        let texcoord_attrib_location = gl.getAttribLocation(shader.program, "texcoord_attrib");
        gl.enableVertexAttribArray(texcoord_attrib_location);
        gl.vertexAttribPointer(texcoord_attrib_location, attribs[1], gl.FLOAT, false,
                                attribs_n*Float32Array.BYTES_PER_ELEMENT,
                                attribs[0]*Float32Array.BYTES_PER_ELEMENT);
    }
}

let Texture = class{
    constructor(gl, img){
        let texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height,
                    0, gl.RGBA, gl.UNSIGNED_BYTE, img.data);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        this.texture = texture;
    }
}

let Renderable = class{
    constructor(gl, transform, mesh, texture){
        this.gl = gl;
        this.transform = transform;
        this.mesh = mesh;
        if(this.mesh.shader.uniforms["tex"]){
            gl.uniform1i(this.mesh.shader.uniforms["tex"].location, 0);
            this.texture = texture;
        }
    }

    draw(v, p){
        this.gl.useProgram(this.mesh.shader.program);
        let m = mat4_identity();
        m = mat4_mat4_mul(rotate_3d(this.transform.rotation), m);
        m = mat4_mat4_mul(translate_3d(this.transform.position), m);
        m = mat4_mat4_mul(scale_3d(this.transform.scale), m);
        let mvp = mat4_identity();
        mvp = mat4_mat4_mul(m, mat4_mat4_mul(v, p));
        set_shader_uniform(gl, this.mesh.shader, "mvp", mvp);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture.texture);
        gl.bindVertexArray(this.mesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, this.mesh.draw_count);
    }
}

let Renderable2D = class{
    constructor(gl, transform2D, mesh, texture){
        this.gl = gl;
        this.transform2D = transform2D;
        this.mesh = mesh;
        if(this.mesh.shader.uniforms["tex"]){
            gl.uniform1i(this.mesh.shader.uniforms["tex"].location, 0);
            this.texture = texture;
        }
    }

    draw(width, height){
        this.gl.useProgram(this.mesh.shader.program);
        let m = mat3_identity();
        m = mat3_mat3_mul(translate_2d([-1, 1]), m);
        m = mat3_mat3_mul(scale_2d([2/width, -2/height]), m);
        m = mat3_mat3_mul(rotate_2d(this.transform2D.rotation), m);
        m = mat3_mat3_mul(translate_2d(this.transform2D.position), m);
        m = mat3_mat3_mul(scale_2d(this.transform2D.scale), m);
        set_shader_uniform(gl, this.mesh.shader, "m", m);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture.texture);
        gl.bindVertexArray(this.mesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, this.mesh.draw_count);
    }
}