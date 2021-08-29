#version 300 es

layout(location = 0) in vec3 position_attrib;

out vec3 position;

void main(){
    gl_Position = vec4(position_attrib, 1);
    position = position_attrib;
}