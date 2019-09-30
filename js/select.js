document.addEventListener("click", function(e){
    var options = document.getElementsByClassName("select_option");
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