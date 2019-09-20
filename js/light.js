var theme = localStorage.getItem("theme") == null ? "light" : localStorage.getItem("theme");
document.getElementById("css").setAttribute("href", "css/"+theme+".css");

document.body.innerHTML += "<div id=\"light\">💡</div>";
document.getElementById("light").onclick = function(){
	theme = (theme == "light") ? "dark" : "light";
	localStorage.setItem("theme", theme);
	document.getElementById("css").setAttribute("href", "css/"+theme+".css");
}