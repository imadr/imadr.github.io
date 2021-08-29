#version 300 es
precision highp float;

out vec4 frag_color;

uniform sampler2D heightmap;

in vec3 position;

void main(){
    vec2 uv = vec2(position.x, position.y);
    frag_color = texture(heightmap, uv);
}