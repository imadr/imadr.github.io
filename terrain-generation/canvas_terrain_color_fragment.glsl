#version 300 es
precision highp float;

out vec4 frag_color;

uniform sampler2D heightmap;
uniform sampler2D normal;
uniform float height_multiplier;

in vec3 position;

#define PI 3.1415926535897932384626433832795

void main(){
    float height = texture(heightmap, position.xz/100.).r;
    vec3 normal = normalize(texture(normal, position.xz/100.).xyz*2.0-1.0);

    vec3 color = vec3(0.431, 0.258, 0.090); // normal slope mountain
    float slope = abs(acos(dot(normal, vec3(0., 0., 1.))));
    if(slope < PI/3.8){
        color = vec3(0.278, 0.839, 0); // grass
    }
    if(slope > PI/2.8){
        color = vec3(0.341, 0.207, 0.078); // high slope mountain
    }

    if(height < 0.07){
        color = vec3(0.949, 0.839, 0.450); // sand
    }
    if(height < 0.03){
        color = vec3(0.066, 0.533, 0.733); // water
    }
    if(height > 0.4 && slope < PI/4.){
        color = vec3(1); // snow
    }

    frag_color = vec4(color, 1);
}