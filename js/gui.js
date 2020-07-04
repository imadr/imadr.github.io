var $ = function(selector){
    if(selector[0] == "."){
        return document.querySelectorAll(selector);
    }
    else{
        return document.querySelector(selector);
    }
};

document.addEventListener("click", function(e){
    var options = $(".select_option");
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

var collapse = $(".collapse");
for(var i = 0; i < collapse.length; i++){
    (function(){
        collapse[i].addEventListener("click", function(){
            var arrow = this.querySelector("span");
            arrow.innerHTML = arrow.innerHTML == "▲" ? "▼" : "▲";
            var div = $("#"+this.id.split("_")[1]);
            div.classList.toggle("invisible");
        });
    }());
}