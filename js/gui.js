function get(i){
    return document.getElementById(i);
}
function getc(c){
    return document.getElementsByClassName(c);
}

document.addEventListener("click", function(e){
    var options = getc("select_option");
    for(var i = 0; i < options.length; i++){
        if(options[i].closest(".select").contains(e.target)){
            options[i].classList.remove("invisible");
        }
        else{
            options[i].classList.add("invisible");
        }
    }

    if(e.target.className == "option"){
        e.target.closest(".select").querySelector(".select_value").innerHTML = e.target.innerHTML;
        e.target.closest(".select_option").classList.add("invisible");
    }
});

var collapse = getc("collapse");
for(var i = 0; i < collapse.length; i++){
    (function(){
        collapse[i].addEventListener("click", function(){
            var arrow = this.querySelector("span");
            arrow.innerHTML = arrow.innerHTML == "▲" ? "▼" : "▲";
            var div = get(this.id.split("_")[1]);
            div.classList.toggle("invisible");
        });
    }());
}