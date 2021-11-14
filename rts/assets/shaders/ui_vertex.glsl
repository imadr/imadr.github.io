#version 300 es

layout(location = 0) in vec3 position_attrib;

uniform mat3 m;

out vec3 position;

void main(){
    gl_Position = vec4(m*vec3(position_attrib.x, position_attrib.y, 1), 1);
    position = position_attrib;
}