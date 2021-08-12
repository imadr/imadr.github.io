#version 300 es
precision highp float;

in vec3 position;

uniform float aspect_ratio;

out vec4 frag_color;

int march_max_iterations = 100;
float min_march_dist = 0.001;
float max_march_dist = 1000.;

float sphere(vec3 point, vec3 position, float radius){
    return length(point-position)-radius;
}

float box(vec3 point, vec3 position, vec3 size){
    vec3 d = abs(point-position)-size;
    return min(max(d.x, max(d.y, d.z)), 0.0)+length(max(d, 0.0));
}

float scene(vec3 point){
    float sphere1 = sphere(point, vec3(-0.7, 0., 2.), 0.5);
    float box1 = box(point, vec3(0.7, 0., 2.), vec3(0.4, 0.4, 0.4));
    return min(sphere1, box1);
}

float march(vec3 ray_origin, vec3 ray_direction){
    vec3 current_point = ray_origin;
    float total_dist = 0.;
    for(int i = 0; i < march_max_iterations; i++){
        current_point = ray_origin+ray_direction*total_dist;
        float dist = scene(current_point);
        total_dist += dist;
        if(dist < min_march_dist){
            break;
        }
        if(total_dist > max_march_dist){
            break;
        }
    }
    return total_dist;
}

void main(){
    vec2 uv = vec2(position.x, position.y*aspect_ratio);

    vec3 ray_origin = vec3(0.);
    vec3 ray_direction = normalize(vec3(uv.x, uv.y, 1.)-ray_origin);
    float dist = march(ray_origin, ray_direction);
    dist /= 3.;
    frag_color = vec4(vec3(dist), 1.);
}