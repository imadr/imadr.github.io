#version 300 es
precision highp float;

out vec4 frag_color;

uniform sampler2D tex;

in vec3 position;

void main(){
    frag_color = vec4(texture(tex, position.xy));
}