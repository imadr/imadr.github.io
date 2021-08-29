let css_file = document.createElement("link");
css_file.rel = "stylesheet";
css_file.type = "text/css";
css_file.href = location.pathname == "/" ? "css/style-theme.css" : "../css/style-theme.css";
document.head.appendChild(css_file);

document.getElementById("menu").innerHTML += ` <button id="light">Dark Mode</button>`;
let theme_button = document.getElementById("light");
let theme = localStorage.getItem("theme") == null ? "light" : localStorage.getItem("theme");
theme_button.innerHTML = theme == "light" ? "Dark Mode" : "Light Mode";
document.body.setAttribute("data-theme", theme);

let svgs = document.getElementsByTagName("object");
for(let svg of svgs){
    (function(){
        svg.onload = function(){
            let style = document.createElement("style");
            style.textContent = `
[data-theme="light"]{
    --color-fg-1: black;
}
[data-theme="dark"]{
    --color-fg-1: white;
}
svg{
    color: var(--color-fg-1);
}`;
            svg.contentDocument.activeElement.appendChild(style);
        }
    })();
}

theme_button.onclick = function(){
    theme = (theme == "light") ? "dark" : "light";
    localStorage.setItem("theme", theme);
    document.body.setAttribute("data-theme", theme);
    this.innerHTML = theme == "light" ? "Dark Mode" : "Light Mode";
    for(let svg of svgs){
        svg.contentDocument.activeElement.setAttribute("data-theme", theme);
    }
}