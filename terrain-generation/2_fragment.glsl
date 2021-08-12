#version 300 es
precision highp float;

out vec4 frag_color;

uniform sampler2D heightmap;
uniform float height_multiplier;

in vec3 position;

void main(){
    float height = texture(heightmap, position.xz/100.).r;
    height *= height_multiplier/40.;
    vec3 color = vec3(0.8, 0.8, 0.8);
    if(height < 0.1){
        color = vec3(1, 0.9, 0.65);
    }
    else if(height >= 0.1 && height < 0.2){
        color = vec3(0.6, 1, 0);
    }
    else if(height >= 0.2 && height < 0.4){
        color = vec3(0.4, 1, 0);
    }
    else if(height >= 0.4 && height < 0.6){
        color = vec3(0.1, 1, 0);
    }
    frag_color = vec4(color, 1);
}