#version 300 es

layout(location = 0) in vec3 position_attrib;
layout(location = 1) in vec2 texcoord_attrib;

uniform mat4 mvp;

out vec3 position;
out vec2 texcoord;

void main(){
    gl_Position = mvp*vec4(position_attrib, 1);
    position = position_attrib;
    texcoord = texcoord_attrib;
}