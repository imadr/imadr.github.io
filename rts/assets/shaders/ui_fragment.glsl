#version 300 es
precision highp float;

out vec4 frag_color;

uniform sampler2D tex;

in vec3 position;
in vec3 normal;
in vec2 texcoord;

void main(){
    frag_color = vec4(texture(tex, texcoord));
}