#version 300 es

layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec3 normal_attrib;
layout(location = 2) in vec2 texcoord_attrib;

uniform mat3 m;

out vec3 position;
out vec3 normal;
out vec2 texcoord;

void main(){
    gl_Position = vec4(m*vec3(position_attrib.x, position_attrib.y, 1), 1);
    position = position_attrib;
    normal = normal_attrib;
    texcoord = texcoord_attrib;
}