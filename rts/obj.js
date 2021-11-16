function parse_obj(text){
	let lines = text.split("\n");
	let skip = ["o", "s", "#"];
	let vertices = [];
	let texcoords = [];
	let normals = [];
	let faces = [];
	for(let i = 0; i < lines.length; i++){
		let line = lines[i];
		if(skip.indexOf(line[0]) > -1) continue;
		if(line.length == 0) continue;
		if(line.indexOf("v ") == 0){
			line = line.replace("v ", "");
			line = line.split(" ").map(function(n){
				return parseFloat(n);
			});
			vertices.push(line);
		}
		else if(line.indexOf("vt ") == 0){
			line = line.replace("vt ", "");
			line = line.split(" ").map(function(n){
				return parseFloat(n);
			});
			texcoords.push(line);
		}
		else if(line.indexOf("vn ") == 0){
			line = line.replace("vn ", "");
			line = line.split(" ").map(function(n){
				return parseFloat(n);
			});
			normals.push(line);
		}
		else if(line.indexOf("f ") == 0){
			line = line.replace("f ", "");
			line = line.split(" ").map(function(n){
				return n.split("/").map(function(n){
					return parseInt(n-1);
				});
			});
			faces.push(line);
		}
	}

	let tmp = []
	for(let i = 0; i < faces.length; i++){
		for(let j = 0; j < faces[i].length; j++){
			let vertex = faces[i][j];
			tmp = tmp.concat(vertices[vertex[0]].concat(normals[vertex[2]]).concat(texcoords[vertex[1]]))
		}
	}
	return tmp;
}