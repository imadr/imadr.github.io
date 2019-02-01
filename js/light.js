var theme = "light";
document.body.innerHTML += "<div id=\"light\">💡</div>";
document.getElementById("light").onclick = function(){
	theme = (theme == "light") ? "dark" : "light";
	document.getElementById("css").setAttribute("href", "css/"+theme+".css");
}