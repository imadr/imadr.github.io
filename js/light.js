let theme_button = document.getElementById("light");
let theme = localStorage.getItem("theme") == null ? "light" : localStorage.getItem("theme");
theme_button.innerHTML = theme == "light" ? "Dark Mode" : "Light Mode";
document.body.setAttribute("data-theme", theme);

theme_button.onclick = function(){
	theme = (theme == "light") ? "dark" : "light";
	localStorage.setItem("theme", theme);
	document.body.setAttribute("data-theme", theme);
    this.innerHTML = theme == "light" ? "Dark Mode" : "Light Mode";
}