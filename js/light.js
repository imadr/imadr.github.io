var theme = localStorage.getItem("theme") == null ? "light" : localStorage.getItem("theme");
document.getElementById("css").setAttribute("href", "css/"+theme+".css");

document.getElementById("menu-icons").innerHTML += " <i id=\"light\" class=\"fas fa-lightbulb\"></i>";
document.getElementById("light").onclick = function(){
	theme = (theme == "light") ? "dark" : "light";
	localStorage.setItem("theme", theme);
	document.getElementById("css").setAttribute("href", "css/"+theme+".css");
}