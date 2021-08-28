#version 300 es
precision highp float;

out vec4 frag_color;

uniform sampler2D heightmap;
uniform float height_multiplier;

in vec3 position;

void main(){
    float height = texture(heightmap, position.xz/100.).r;
    vec3 color = mix(vec3(1, 0.9, 0.65), vec3(0.1, 1, 0), max(0., height*height_multiplier-5.));
    frag_color = vec4(color, 1);
}