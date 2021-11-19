let canvas = document.getElementById("line-canvas");
let ctx = canvas.getContext("2d");
let width = 500;
let height = 300;
canvas.width = width;
canvas.height = height;
let image_data = ctx.getImageData(0, 0, width, height);
let data = image_data.data;

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

function vec2_add(a, b){
    return [a[0]+b[0], a[1]+b[1]];
}

function vec2_scale(v, s){
    return [v[0]*s, v[1]*s];
}

function vec2_lerp(a, b, t){
    t = t < 0 ? 0 : t;
    t = t > 1 ? 1 : t;
    return vec2_add(vec2_scale(a, t), vec2_scale(b, 1-t));
}

function triangle(p1_, p2_, p3_, color){
	let p1 = {...p1_};
	let p2 = {...p2_};
	let p3 = {...p3_};
	if(p1.y > p2.y) [p1, p2] = swap(p1, p2);
	if(p2.y > p3.y) [p2, p3] = swap(p2, p3);
	if(p1.y > p2.y) [p1, p2] = swap(p1, p2);

	let slope1 = (p2.x-p1.x)/(p2.y-p1.y);
	let slope2 = (p3.x-p1.x)/(p3.y-p1.y);
	let x1 = p1.x;
	let x2 = p1.x;
	for(let y = p1.y; y < p2.y; y++){
		line({x: x1, y: y}, {x: x2, y: y}, color);
		x1 += slope1;
		x2 += slope2;
	}
 	slope1 = (p3.x-p2.x)/(p3.y-p2.y);
	for(let y = p2.y; y < p3.y; y++){
		line({x: x1, y: y}, {x: x2, y: y}, color);
		x1 += slope1;
		x2 += slope2;
	}
}

function blit(){
	ctx.putImageData(image_data, 0, 0);
}

let fps = document.getElementById("fps");

function draw(){
	let time = performance.now();
	clear_canvas({r: 0, g: 0, b: 0, a: 255});
	triangle(
		{x: 50, y: 50},
		{x: 250, y: 150},
		{x: 40, y: 200},
		{r: 255, g: 255, b: 255, a: 255}
	);
	blit();
	fps.innerHTML = (performance.now()-time)+"ms";
	window.requestAnimationFrame(draw);
}


draw();