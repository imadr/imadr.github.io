function draw_arrow(ctx, from, to, color){
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    let head = 17;
    let dx = to[0]-from[0];
    let dy = to[1]-from[1];
    let angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    let direction = vec2_normalize(vec2_sub(from, to));
    let to_ = vec2_add(to, vec2_scale(direction, 10));
    ctx.lineTo(to_[0], to_[1]);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(to[0]-head*Math.cos(angle-Math.PI/6),
               to[1]-head*Math.sin(angle-Math.PI/6));
    ctx.lineTo(to[0], to[1]);
    ctx.lineTo(to[0]-head*Math.cos(angle+Math.PI/6),
             to[1]-head*Math.sin(angle+Math.PI/6));
    ctx.fill();
}

function draw_line(ctx, from, to, color){
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
}

function draw_circle(ctx, center, radius, fill, color){
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(center[0], center[1], radius, 0, 2*Math.PI);
    if(!fill) ctx.stroke();
    if(fill) ctx.fill();
}

function draw_rect(ctx, pos, size, fill, color){
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.rect(
        pos[0],
        pos[1],
        size[0],
        size[1],
    );
    if(!fill) ctx.stroke();
    if(fill) ctx.fill();
}

function point_rect_dist(point, rect_pos, rect_size){
    let points = [];
    let cond1 = point[1] >= rect_pos[1] && point[1] <= rect_pos[1]+rect_size[1];
    let cond2 = point[0] >= rect_pos[0] && point[0] <= rect_pos[0]+rect_size[0];
    if(cond1){
        points = points.concat([[rect_pos[0], point[1]],
                       [rect_pos[0]+rect_size[0], point[1]]]);
    }
    if(cond2){
        points = points.concat([[point[0], rect_pos[1]],
                       [point[0], rect_pos[1]+rect_size[1]]]);
    }

    points = points.concat([rect_pos,
        [rect_pos[0]+rect_size[0], rect_pos[1]],
        [rect_pos[0], rect_pos[1]+rect_size[1]],
        [rect_pos[0]+rect_size[0], rect_pos[1]+rect_size[1]]]);

    let closest_point;
    let min_dist = Number.POSITIVE_INFINITY;
    for(let point_ of points){
        let dist = distance(point, point_);
        if(dist < min_dist){
            min_dist = dist;
            closest_point = point_;
        }
    }
    if(cond1 && cond2) min_dist *= -1;
    return [closest_point, min_dist];
}

function point_circle_dist(point, circle_pos, circle_radius){
    let dir = vec2_normalize(vec2_sub(point, circle_pos));
    let closest_point = vec2_add(circle_pos, vec2_scale(dir, circle_radius));
    return [closest_point, distance(circle_pos, point)-circle_radius];
}

function draw_canvas_circle_sdf(ctx, i){
    draw_rect(ctx, [0, 0], [ctx.canvas.width, ctx.canvas.height], true, "#fff");
    let radius = 60;
    let center = [ctx.canvas.width/2, ctx.canvas.height/2];
    let cursor = cursor_position[i];
    let [closest_point, min_dist] = point_circle_dist(cursor, center, radius);

    ctx.lineWidth = 4;

    draw_arrow(ctx, center, closest_point, "#29c643");
    draw_arrow(ctx, cursor, closest_point, "#ea3333");
    draw_circle(ctx, center, radius, false, "#000");
    draw_circle(ctx, center, 5, true, "#29c643");
    draw_circle(ctx, cursor, 6, true, "#2c66c9");

    document.querySelector("#circle-distance").innerHTML = Math.round(min_dist);
    document.querySelector("#radius").innerHTML = radius;
}

function draw_canvas_square_sdf(ctx, i){
    draw_rect(ctx, [0, 0], [ctx.canvas.width, ctx.canvas.height], true, "#fff");
    ctx.lineWidth = 4;

    let rect_size = [100, 100];
    let rect_pos = [
        ctx.canvas.width/2-rect_size[0]/2,
        ctx.canvas.height/2-rect_size[1]/2
    ];

    draw_rect(ctx, rect_pos, rect_size, false, "#000");

    let cursor = cursor_position[i];

    let [closest_point, min_dist] = point_rect_dist(cursor, rect_pos, rect_size);
    document.querySelector("#square-distance").innerHTML = Math.round(min_dist);
    draw_arrow(ctx, cursor, closest_point, "#ea3333");

    draw_circle(ctx, cursor, 6, true, "#2c66c9");
}

function draw_canvas_shapes_sdf(ctx, i){
    draw_rect(ctx, [0, 0], [ctx.canvas.width, ctx.canvas.height], true, "#fff");
    let cursor = cursor_position[i];

    ctx.lineWidth = 4;

    let shapes = [];

    let rect_size = [100, 100];
    let rect_pos = [470, 150];
    shapes.push(["rect", rect_size, rect_pos]);
    draw_rect(ctx, rect_pos, rect_size, false, "#000");

    rect_size = [90, 150];
    rect_pos = [40, 30];
    shapes.push(["rect", rect_size, rect_pos]);
    draw_rect(ctx, rect_pos, rect_size, false, "#000");

    let circle_radius = 50;
    let circle_pos = [360, 60];
    shapes.push(["circle", circle_pos, circle_radius]);
    draw_circle(ctx, circle_pos, circle_radius, false, "#000");

    circle_radius = 80;
    circle_pos = [250, 250];
    shapes.push(["circle", circle_pos, circle_radius]);
    draw_circle(ctx, circle_pos, circle_radius, false, "#000");

    let dist = Number.POSITIVE_INFINITY;
    let closest_point;
    for(let shape of shapes){
        let tmp_closest_point, tmp_dist;
        if(shape[0] == "circle"){
            [tmp_closest_point, tmp_dist] = point_circle_dist(cursor, shape[1], shape[2]);
        }
        else if(shape[0] == "rect"){
            [tmp_closest_point, tmp_dist] = point_rect_dist(cursor, shape[2], shape[1]);
        }
        if(tmp_dist < dist){
            dist = tmp_dist;
            closest_point = tmp_closest_point;
        }
    }
    if(dist < 0) return;

    draw_circle(ctx, cursor, dist, false, "#ea3333");
    draw_arrow(ctx, cursor, closest_point, "#ea3333");
    draw_circle(ctx, cursor, 6, true, "#2c66c9");
}

function draw_canvas_raymarching_1(ctx, i){
    draw_rect(ctx, [0, 0], [ctx.canvas.width, ctx.canvas.height], true, "#fff");
    let cursor = cursor_position[i];

    ctx.lineWidth = 4;

    let shapes = [];

    let rect_size = [100, 100];
    let rect_pos = [470, 150];
    shapes.push(["rect", rect_size, rect_pos]);
    draw_rect(ctx, rect_pos, rect_size, false, "#000");

    let circle_radius = 50;
    let circle_pos = [360, 60];
    shapes.push(["circle", circle_pos, circle_radius]);
    draw_circle(ctx, circle_pos, circle_radius, false, "#000");

    circle_radius = 80;
    circle_pos = [250, 250];
    shapes.push(["circle", circle_pos, circle_radius]);
    draw_circle(ctx, circle_pos, circle_radius, false, "#000");

    let camera = [30, ctx.canvas.height/2];
    draw_circle(ctx, camera, 8, true, "#000");

    ctx.lineWidth = 3;

    let current_point = camera;
    let path = vec2_normalize(vec2_sub(cursor, camera));
    let dist_sum = 0;
    for(let t = 0; t < 100; t++){
        let dist = Number.POSITIVE_INFINITY;
        let closest_point;

        for(let shape of shapes){
            let tmp_closest_point, tmp_dist;
            if(shape[0] == "circle"){
                [tmp_closest_point, tmp_dist] = point_circle_dist(current_point, shape[1], shape[2]);
            }
            else if(shape[0] == "rect"){
                [tmp_closest_point, tmp_dist] = point_rect_dist(current_point, shape[2], shape[1]);
            }
            if(tmp_dist < dist){
                dist = tmp_dist;
                closest_point = tmp_closest_point;
            }
        }
        if(dist <= 3) break;
        if(dist >= 500) break;
        draw_circle(ctx, current_point, dist, false, "#ea3333");
        dist_sum += dist;
        current_point = vec2_add(camera, vec2_scale(path, dist_sum));
    }

    ctx.lineWidth = 3;
    draw_line(ctx, camera, current_point, "#000");
    draw_circle(ctx, cursor, 6, true, "#2c66c9");
}

function draw_canvas_raymarching_2(ctx, i){
    draw_rect(ctx, [0, 0], [ctx.canvas.width, ctx.canvas.height], true, "#fff");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    let camera = [30, ctx.canvas.height/2];
    let near_plane = parseInt(document.getElementById("near-plan").value);
    let fov = rad(parseInt(document.getElementById("fov").value));
    let view_length = near_plane*Math.tan(fov);
    let nb_rays = parseInt(document.getElementById("nb-rays").value);
    let raymarching_max_steps = 50;

    let circle_pos = [410, ctx.canvas.height/2];
    let circle_radius = 100;

    draw_circle(ctx, camera, 8, true, "#000");
    let ray_spacing = view_length*2/(nb_rays-1);
    ctx.lineWidth = 1;
    for(let i = 0; i < nb_rays; i++){
        let ray_point = [camera[0]+near_plane, (ctx.canvas.height/2)-view_length+i*ray_spacing];
        draw_line(ctx, camera, ray_point, "#000");
        let ray = vec2_normalize(vec2_sub(ray_point, camera));
        let current_point = ray_point;
        for(let t = 0; t < raymarching_max_steps; t++){
            let [closest_point, dist] = point_circle_dist(current_point, circle_pos, circle_radius);
            draw_circle(ctx, current_point, dist, false, "#ea3333");
            let new_point = vec2_add(current_point, vec2_scale(ray, dist));
            draw_line(ctx, current_point, new_point, "#000");
            draw_circle(ctx, new_point, 5, true, "#000");
            current_point = new_point;
            if(dist <= 3) break;
            if(dist >= 500) break;
        }
    }

    ctx.lineWidth = 4;
    draw_circle(ctx, circle_pos, circle_radius, false, "#000");
    draw_line(ctx,
        [camera[0]+near_plane, ctx.canvas.height/2-view_length],
        [camera[0]+near_plane, ctx.canvas.height/2+view_length], "#000");
}

let canvases_id = [
    "canvas-circle-sdf",
    "canvas-square-sdf",
    "canvas-shapes-sdf",
    "canvas-raymarching-1",
    "canvas-raymarching-2",
];

let canvases = [];
let ctxs = [];
let canvas_draw_function = [];
for(let canvas_id of canvases_id){
    let canvas = document.getElementById(canvas_id);
    canvases.push(canvas);
    ctxs.push(canvas.getContext("2d"));
    canvas_draw_function.push(window["draw_"+canvas_id.replaceAll("-", "_")])
}

let cursor_position = [];
for(let i = 0; i < canvas_draw_function.length; i++){
    cursor_position.push([400, 150]);
}

document.getElementById("near-plan").oninput =
document.getElementById("fov").oninput =
document.getElementById("nb-rays").oninput =
function(){
    draw_canvas_raymarching_2(ctxs[4], 4);
}

canvases.forEach(function(canvas, i){
    canvas.width = 600;
    canvas.height = 300;

    (function(i, canvas){
        canvas.addEventListener("mousemove", function(e){
            let rect = e.target.getBoundingClientRect();
            let x = e.clientX-rect.left;
            let y = e.clientY-rect.top;
            cursor_position[i] = [x, y];
            canvas_draw_function[i](ctxs[i], i);
        });
    })(i, canvas);
    canvas_draw_function[i](ctxs[i], i);
});