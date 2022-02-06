#version 300 es
precision highp float;

in vec3 position;

uniform float aspect_ratio;

out vec4 frag_color;

void main(){
    vec2 uv = vec2(position.x, position.y*aspect_ratio);
    frag_color = vec4(uv.x, uv.y, 0, 1);
}