#version 300 es
precision highp float;

out vec4 frag_color;

uniform sampler2D heightmap;

in vec3 position;

#define color1 vec3(0.317, 0.964, 0.949)
#define color2 vec3(0.003, 0.101, 0.976)

void main(){
    float height = texture(heightmap, position.xz/100.).r;
    if(height > 0.07) discard;
    height *= 8.;
    frag_color = vec4(mix(color1, color2, 1.-height), 1.);
}