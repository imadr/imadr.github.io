let canvas = document.getElementById("line-canvas");
let ctx = canvas.getContext("2d");
let width = 500;
let height = 300;
canvas.width = width;
canvas.height = height;
let image_data = ctx.getImageData(0, 0, width, height);
let data = image_data.data;
let keyboard = {};

function clear_canvas(color){
    for(let y = 0; y < height; y++){
        for(let x = 0; x < width; x++){
            let index = (y*width+x)*4;
            data[index] = color.r;
            data[index+1] = color.g;
            data[index+2] = color.b;
            data[index+3] = color.a;
        }
    }
    ctx.putImageData(image_data, 0, 0);
}

function swap(a_, b_){
    let a = {...a_};
    let b = {...b_};
    let tmp = a;
    a = b;
    b = tmp;
    return [a, b];
}

function point(p, color){
    if(p.x > width || p.x < 0 || p.y > height || p.y < 0) return;
    let index = (Math.floor(p.y)*width+Math.floor(p.x))*4;
    data[index] = color.r;
    data[index+1] = color.g;
    data[index+2] = color.b;
    data[index+3] = color.a;
}

function line(p1_, p2_, color){
    let p1 = {...p1_};
    let p2 = {...p2_};
    if(p1.x == p2.x){
        if(p2.y < p1.y){
            [p1.y, p2.y] = [p2.y, p1.y];
        }
        for(let y = p1.y; y < p2.y; y++){
            point({x: p1.x, y: y}, color);
        }
        return;
    }
    if(p1.y == p2.y){
        if(p2.x < p1.x){
            [p1.x, p2.x] = [p2.x, p1.x];
            y = p2.y;
        }
        for(let x = p1.x; x < p2.x; x++){
            point({x: x, y: p1.y}, color);
        }
        return;
    }

    let dy = p2.y-p1.y;
    let dx = p2.x-p1.x;

    let slope = dy/dx;
    let slope_error = 0;

    let inc = slope < 0 ? -1 : 1;

    if(Math.abs(slope) < 1){
        let y = p1.y;
        let x_start = p1.x;
        let x_end = p2.x;
        if(p2.x < p1.x){
            x_start = p2.x;
            x_end = p1.x;
            y = p2.y;
        }
        for(let x = x_start; x < x_end; x++){
            point({x: x, y: y}, color);
            slope_error += slope;
            if(Math.abs(slope_error) >= 0.5){
                slope_error -= inc;
                y += inc;
            }
        }
    }
    else{
        slope = dx/dy;
        let x = p1.x;
        let y_start = p1.y;
        let y_end = p2.y;
        if(p2.y < p1.y){
            y_start = p2.y;
            y_end = p1.y;
            x = p2.x;
        }
        for(let y = y_start; y < y_end; y++){
            point({x: x, y: y}, color);
            slope_error += slope;
            if(Math.abs(slope_error) >= 0.5){
                slope_error -= inc;
                x += inc;
            }
        }
    }
}

function triangle(p1_, p2_, p3_, color){
    let p1 = {...p1_};
    let p2 = {...p2_};
    let p3 = {...p3_};
    if(p1.y > p2.y) [p1, p2] = swap(p1, p2);
    if(p2.y > p3.y) [p2, p3] = swap(p2, p3);
    if(p1.y > p2.y) [p1, p2] = swap(p1, p2);

    line(p1, p2, color);
    line(p2, p3, color);
    line(p3, p1, color);

//     let slope1 = (p2.x-p1.x)/(p2.y-p1.y);
//     let slope2 = (p3.x-p1.x)/(p3.y-p1.y);
//     let x1 = p1.x;
//     let x2 = p1.x;
//     for(let y = p1.y; y < p2.y; y++){
//         for(let x = x2; x < x1; x++){
//             if(x > width || x < 0 || y > height || y < 0) continue;
//             let index = (Math.floor(y)*width+Math.floor(x))*4;
//             data[index] = color.r;
//             data[index+1] = color.g;
//             data[index+2] = color.b;
//             data[index+3] = color.a;
//         }
//         x1 += slope1;
//         x2 += slope2;
//     }
//     slope1 = (p3.x-p2.x)/(p3.y-p2.y);
//     for(let y = p2.y; y < p3.y; y++){
//         for(let x = x2; x < x1; x++){
//             if(x > width || x < 0 || y > height || y < 0) continue;
//             let index = (Math.floor(y)*width+Math.floor(x))*4;
//             data[index] = color.r;
//             data[index+1] = color.g;
//             data[index+2] = color.b;
//             data[index+3] = color.a;
//         }
//         x1 += slope1;
//         x2 += slope2;
//     }
}

function blit(){
    ctx.putImageData(image_data, 0, 0);
}

let fps = document.getElementById("fps");

let mesh = [
    0.0, 0.0, 0.0,
0.0, 1.0, 0.0,
1.0, 1.0, 0.0,
0.0, 0.0, 0.0,
1.0, 1.0, 0.0,
1.0, 0.0, 0.0,
1.0, 0.0, 0.0,
1.0, 1.0, 0.0,
1.0, 1.0, 1.0,
1.0, 0.0, 0.0,
1.0, 1.0, 1.0,
1.0, 0.0, 1.0,
1.0, 0.0, 1.0,
1.0, 1.0, 1.0,
0.0, 1.0, 1.0,
1.0, 0.0, 1.0,
0.0, 1.0, 1.0,
0.0, 0.0, 1.0,
0.0, 0.0, 1.0,
0.0, 1.0, 1.0,
0.0, 1.0, 0.0,
0.0, 0.0, 1.0,
0.0, 1.0, 0.0,
0.0, 0.0, 0.0,
0.0, 1.0, 0.0,
0.0, 1.0, 1.0,
1.0, 1.0, 1.0,
0.0, 1.0, 0.0,
1.0, 1.0, 1.0,
1.0, 1.0, 0.0,
1.0, 0.0, 1.0,
0.0, 0.0, 1.0,
0.0, 0.0, 0.0,
1.0, 0.0, 1.0,
0.0, 0.0, 0.0,
1.0, 0.0, 0.0,
];

let camera = {
    position: [ 0.1, 1, 0 ],
    rotation: {x: 0, y: 0},
    fov: 90,
    z_near: 0.1,
    z_far: 1000
};
let aspect_ratio = width/height;
let camera_move_speed = 0.1;

let p = perspective_projection(rad(camera.fov), aspect_ratio, camera.z_near, camera.z_far);

function handle_input(){
    if(keyboard["w"]) camera.position[2] += camera_move_speed;
    if(keyboard["s"]) camera.position[2] -= camera_move_speed;
    if(keyboard["d"]) camera.position[0] += camera_move_speed;
    if(keyboard["a"]) camera.position[0] -= camera_move_speed;
    draw()
}

function draw(){
    // handle_input();
    let time = performance.now();

    let x = camera.rotation.x;
    let y = camera.rotation.y;
    let forward = [
        Math.cos(x)*Math.cos(y),
        Math.sin(y),
        Math.sin(x)*Math.cos(y)
    ];
    let v = lookat_matrix(camera.position, vec3_add(camera.position, forward), [0, 1, 0]);
    clear_canvas({r: 0, g: 0, b: 0, a: 255});

    for(let i = 0; i < mesh.length; i+=9){
        let m = mat4_identity();
        // m = mat4_mat4_mul(rotate_3d(objects_to_draw[i].transform.rotation), m);
        // m = mat4_mat4_mul(translate_3d(objects_to_draw[i].transform.position), m);
        // m = mat4_mat4_mul(scale_3d(objects_to_draw[i].transform.scale), m);
        let mvp = mat4_identity();
        mvp = mat4_mat4_mul(m, mat4_mat4_mul(v, p));

        let vertices = [
            [mesh[i], mesh[i+1], mesh[i+2], 1],
            [mesh[i+3], mesh[i+4], mesh[i+5], 1],
            [mesh[i+6], mesh[i+7], mesh[i+8], 1]];

        for(let j = 0; j < vertices.length; j++){
            // vertices[j] = vec4_add(vertices[j], [0, 0, -3, 0]);
            vertices[j] = mat4_vec4_mul(mvp, vertices[j]);
            if(i==0)console.log(vertices[j][3])
            if(vertices[j][3] > 0.1) vertices[j] = vec4_scale(vertices[j], 1/vertices[j][3]);
            vertices[j] = vec4_add(vertices[j], [1, 1, 0, 0]);
            vertices[j] = vec4_hadamard(vertices[j], [0.5*width, 0.5*height, 1, 1]);
        }

        // if(i==0)console.log(vertices[0])

        triangle(
            {x: vertices[0][0], y: vertices[0][1]},
            {x: vertices[1][0], y: vertices[1][1]},
            {x: vertices[2][0], y: vertices[2][1]},
            {r: 255, g: 255, b: 255, a: 255}
        );
    }

    blit();
    fps.innerHTML = (Math.floor(1000/(performance.now()-time)))+"fps";
    // window.requestAnimationFrame(draw);
}

window.addEventListener("keydown", function(e){
    keyboard[e.key] = true;handle_input()
});

window.addEventListener("keyup", function(e){
    keyboard[e.key] = false;handle_input()
});

// document.addEventListener("blur", function(e){
//     keyboard = {};
// });

draw();