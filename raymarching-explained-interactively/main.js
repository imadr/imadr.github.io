let canvas_circle_sdf = document.getElementById("canvas-circle-sdf");
let ctx_circle_sdf = canvas_circle_sdf.getContext("2d");
let canvas_square_sdf = document.getElementById("canvas-square-sdf");
let ctx_square_sdf = canvas_square_sdf.getContext("2d");
let canvas_raymarching1 = document.getElementById("canvas-raymarching1");
let ctx_raymarching1 = canvas_raymarching1.getContext("2d");
let canvas_raymarching2 = document.getElementById("canvas-raymarching2");
let ctx_raymarching2 = canvas_raymarching2.getContext("2d");

let cursor_position = [];
for(let i = 0; i < 4; i++){
    cursor_position.push([400, 150]);
}

let raymarching_step = parseFloat(document.getElementById("raymarching-step").value);
document.getElementById("raymarching-step").onchange = function(){
    raymarching_step = parseFloat(document.getElementById("raymarching-step").value);
}

function draw_arrow(ctx, from, to){
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

function draw_line(ctx, from, to){
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
}

function draw_circle(ctx, center, radius, fill){
    ctx.beginPath();
    ctx.arc(center[0], center[1], radius, 0, 2*Math.PI);
    if(!fill) ctx.stroke();
    if(fill) ctx.fill();
}

function draw_rect(ctx, pos, size, stroke){
    ctx.beginPath();
    ctx.rect(
        pos[0],
        pos[1],
        size[0],
        size[1],
    );
    ctx.stroke();
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

function draw_ctx_circle_sdf(){
    ctx_circle_sdf.clearRect(0, 0, canvas_circle_sdf.width, canvas_circle_sdf.height);
    let radius = 60;
    let center = [canvas_circle_sdf.width/2, canvas_circle_sdf.height/2];
    let cursor = cursor_position[0];


    let [closest_point, min_dist] = point_circle_dist(cursor, center, radius);

    ctx_circle_sdf.lineWidth = 4;

    ctx_circle_sdf.strokeStyle = "#29c643";
    ctx_circle_sdf.fillStyle = "#29c643";

    draw_arrow(ctx_circle_sdf, center, closest_point);

    ctx_circle_sdf.fillStyle = "#ea3333";
    ctx_circle_sdf.strokeStyle = "#ea3333";
    draw_arrow(ctx_circle_sdf, cursor, closest_point);

    ctx_circle_sdf.strokeStyle = "#000";
    draw_circle(ctx_circle_sdf, center, radius, false);

    ctx_circle_sdf.fillStyle = "#000";
    draw_circle(ctx_circle_sdf, center, 5, true);
    draw_circle(ctx_circle_sdf, cursor, 5, true);
    document.querySelector("#circle-distance").innerHTML = Math.round(min_dist);
    document.querySelector("#radius").innerHTML = radius;
}

function draw_ctx_square_sdf(){
    ctx_square_sdf.clearRect(0, 0, canvas_square_sdf.width, canvas_square_sdf.height);
    ctx_square_sdf.lineWidth = 4;
    ctx_square_sdf.strokeStyle = "#000";

    let rect_size = [100, 100];
    let rect_pos = [
        canvas_circle_sdf.width/2-rect_size[0]/2,
        canvas_circle_sdf.height/2-rect_size[1]/2
    ];

    draw_rect(ctx_square_sdf, rect_pos, rect_size, true);

    let cursor = cursor_position[1];

    ctx_square_sdf.fillStyle = "#ea3333";
    ctx_square_sdf.strokeStyle = "#ea3333";

    let [closest_point, min_dist] = point_rect_dist(cursor, rect_pos, rect_size);
    document.querySelector("#square-distance").innerHTML = Math.round(min_dist);
    draw_arrow(ctx_square_sdf, cursor, closest_point);

    ctx_square_sdf.fillStyle = "#000";
    draw_circle(ctx_square_sdf, cursor, 5, true);
}

function draw_ctx_raymarching2(){
    ctx_raymarching2.clearRect(0, 0, canvas_raymarching2.width, canvas_raymarching2.height);
    let cursor = cursor_position[3];
    ctx_raymarching2.strokeStyle = "#000";
    ctx_raymarching2.fillStyle = "#000";
    ctx_raymarching2.lineWidth = 4;

    let shapes = [];

    let rect_size = [100, 100];
    let rect_pos = [470, 150];
    shapes.push(["rect", rect_size, rect_pos]);
    draw_rect(ctx_raymarching2, rect_pos, rect_size, true);

    let circle_radius = 50;
    let circle_pos = [360, 60];
    shapes.push(["circle", circle_pos, circle_radius]);
    draw_circle(ctx_raymarching2, circle_pos, circle_radius, false);

    circle_radius = 80;
    circle_pos = [250, 250];
    shapes.push(["circle", circle_pos, circle_radius]);
    draw_circle(ctx_raymarching2, circle_pos, circle_radius, false);

    let camera = [30, canvas_raymarching2.height/2];
    draw_circle(ctx_raymarching2, camera, 8, true);

    draw_circle(ctx_raymarching2, cursor, 5, true);

    draw_line(ctx_raymarching2, camera, cursor);

    ctx_raymarching2.strokeStyle = "#ea3333";
    ctx_raymarching2.lineWidth = 2;

    for(let t = 0; t < 1; t += raymarching_step){
        let current_point = vec2_lerp(camera, cursor, t)

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
        draw_circle(ctx_raymarching2, current_point, dist, false);
    }
}

function draw_ctx_raymarching1(){
    ctx_raymarching1.clearRect(0, 0, canvas_raymarching1.width, canvas_raymarching1.height);
    let cursor = cursor_position[2];
    ctx_raymarching1.strokeStyle = "#000";
    ctx_raymarching1.fillStyle = "#000";
    ctx_raymarching1.lineWidth = 4;

    let shapes = [];

    let rect_size = [100, 100];
    let rect_pos = [470, 150];
    shapes.push(["rect", rect_size, rect_pos]);
    draw_rect(ctx_raymarching1, rect_pos, rect_size, true);

    rect_size = [90, 150];
    rect_pos = [40, 30];
    shapes.push(["rect", rect_size, rect_pos]);
    draw_rect(ctx_raymarching1, rect_pos, rect_size, true);

    let circle_radius = 50;
    let circle_pos = [360, 60];
    shapes.push(["circle", circle_pos, circle_radius]);
    draw_circle(ctx_raymarching1, circle_pos, circle_radius, false);

    circle_radius = 80;
    circle_pos = [250, 250];
    shapes.push(["circle", circle_pos, circle_radius]);
    draw_circle(ctx_raymarching1, circle_pos, circle_radius, false);

    draw_circle(ctx_raymarching1, cursor, 5, true);

    ctx_raymarching1.strokeStyle = "#ea3333";

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
    draw_circle(ctx_raymarching1, cursor, dist, false);
}

let canvas_draw_function = [
    draw_ctx_circle_sdf,
    draw_ctx_square_sdf,
    draw_ctx_raymarching1,
    draw_ctx_raymarching2,
];

document.querySelectorAll("canvas").forEach(function(canvas, i){
    canvas.width = 600;
    canvas.height = 300;

    (function(i, canvas){
        canvas.addEventListener("mousemove", function(e){
            let rect = e.target.getBoundingClientRect();
            let x = e.clientX-rect.left;
            let y = e.clientY-rect.top;
            cursor_position[i] = [x, y];
            canvas_draw_function[i]();
        });
    })(i, canvas);
    canvas_draw_function[i]();
});