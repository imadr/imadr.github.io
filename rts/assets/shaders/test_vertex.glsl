#version 300 es

layout(location = 0) in vec3 position_attrib;

uniform mat4 mvp;

out vec3 position;

void main(){
    gl_Position = mvp*vec4(position_attrib, 1);
    position = position_attrib;
}