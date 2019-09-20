function get(i){
    return document.getElementById(i);
}
function getc(c){
    return document.getElementsByClassName(c);
}

var collapse_arrows = getc("collapse_arrow");
for(var i = 0; i < collapse_arrows.length; i++){
    (function(){
        collapse_arrows[i].addEventListener("click", function(){
            this.innerHTML = this.innerHTML == "▲" ? "▼" : "▲";
            var div = get(this.id.split("_")[1]);
            div.classList.toggle("invisible");
        });
    }());
}

function set_error(id, errors){
    for(var i = 0; i < errors.length; i++){
        var class_error = errors[i][1] == 0 ? "error" : "warning";
        get(id+"_error").innerHTML += "<span class=\""+class_error+"\">"+errors[i][0]+"</span>";
        if(i < errors.length-1) get(id+"_error").innerHTML += "<br>";
    }
    if(errors.length > 0) get(id+"_error").innerHTML += "<br class=\"tenpx\">";
}

function clear_error(id){
    get(id+"_error").innerHTML = "";
}

function egcd(a, b){
    var x1 = 1, x2 = 0, y1 = 0, y2 = 1;

    while(b != 0){
        var q = Math.floor(a/b);
        var r = a%b;

        var tmp = x1-q*x2;
        x1 = x2;
        x2 = tmp;

        tmp = y1-q*y2;
        y1 = y2;
        y2 = tmp;

        tmp = a%b;
        a = b;
        b = tmp;
    }
    return [a, x1, y1];
}

function affine(string, alphabet, a, b, casesensitive, cipher){
    clear_error("affine");
    var errors = [], fatal_error = false;
    var g = egcd(a, 26);
    var s = alphabet.length;

    if(typeof a == "undefined"){
        errors.push(["'a' is undefined", 0]);
        fatal_error = true;
    }
    if(typeof b == "undefined"){
        errors.push(["'b' is undefined", 0]);
        fatal_error = true;
    }
    if(a <= 0){
        errors.push(["'a' have to be strictly positive", 0]);
        fatal_error = true;
    }
    if(b <= 0){
        errors.push(["'b' have to be strictly positive", 0]);
        fatal_error = true;
    }
    if(g[0] != 1){
        errors.push(["'a' have to be coprime with 26", 0]);
        fatal_error = true;
    }
    set_error("affine", errors);

    if(!fatal_error){
        var new_string = "";
        a = parseInt(a);
        b = parseInt(b);

        for(var i = 0; i < string.length; i++){
            var current_char = string[i];
            var current_char_i = alphabet.indexOf(string[i].toUpperCase());

            if(cipher){
                var sub_char = alphabet[(current_char_i*a+b)%s];
            }
            else{
                var a_inverse = (g[1]%s+s)%s;
                var sub_char_i = (a_inverse*(current_char_i-b))%s;
                sub_char_i = (sub_char_i%s+s)%s;
                var sub_char = alphabet[sub_char_i];
            }

            if(current_char_i > -1){
                if(casesensitive && current_char != current_char.toUpperCase()){
                    new_string += sub_char.toLowerCase();
                }
                else{
                    new_string += sub_char;
                }
            }
            else{
                new_string += string[i];
            }
        }
        return new_string;
    }
    else{
        return "";
    }
}

function caesar(string, shift, casesensitive, cipher){
    if(typeof shift != "undefined"){
        var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        shift = parseInt(shift);
        if(!cipher){
            shift = -shift;
        }
        if(shift < 0){
            shift = 26-Math.abs(shift)%26;
        }
        var new_string = "";

        for(var i = 0; i < string.length; i++){
            var current_char = string[i];
            var current_char_i = alphabet.indexOf(string[i].toUpperCase());
            var sub_char = alphabet[(current_char_i+shift)%26];

            if(current_char_i > -1){
                if(casesensitive && current_char != current_char.toUpperCase()){
                    new_string += sub_char.toLowerCase();
                }
                else{
                    new_string += sub_char;
                }
            }
            else{
                new_string += string[i];
            }
        }
        return new_string;
    }
}

function shuffle(input){
    var output = [];
    if(typeof input == "string") input = input.split("");
    var len = input.length;
    for(var i = 0; i < len; i++){
        output[i] = input.splice(Math.floor(Math.random()*input.length), 1);
    }
    return output.join("");
}

function alphabetsub(string, alphabet_sub, casesensitive, cipher){
    var new_string = "";
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    if(!cipher){
        tmp = alphabet;
        alphabet = alphabet_sub;
        alphabet_sub = tmp;
    }

    for(var i = 0; i < string.length; i++){
        var current_char = string[i];
        var current_char_i = alphabet.indexOf(string[i].toUpperCase());
        var sub_char = alphabet_sub[current_char_i];

        if(current_char_i > -1){
            if(casesensitive && current_char != current_char.toUpperCase()){
                new_string += sub_char.toLowerCase();
            }
            else{
                new_string += sub_char;
            }
        }
        else{
            new_string += current_char;
        }
    }
    return new_string;
}

function cipher_button_click(e, i){
    var args = [];
    for(var j = 0; j < ciphers[i][1].length; j++){
        var watdo = ciphers[i][1][j].split(":")[0];
        var current_arg = ciphers[i][1][j].split(":")[1];
        var attribute = ciphers[i][1][j].split(":")[2];

        if(watdo == "id"){
            args[j] = get(current_arg)[attribute];
        }
        else if(watdo == "cipher"){
            args[j] = e.id.startsWith("cipher_button");
        }
    }
    get(ciphers[i][0]+"_out").value = window[ciphers[i][0]].apply(null, args);
}

var ciphers = [
    ["caesar", ["id:caesar_in:value", "id:caesar_shift:value", "id:caesar_casesensitive:checked", "cipher"]],
    ["alphabetsub", ["id:alphabetsub_in:value", "id:alphabetsub_alphabet:value", "id:alphabetsub_casesensitive:checked", "cipher"]],
    ["affine", ["id:affine_in:value", "id:affine_alphabet:value", "id:affine_a:value", "id:affine_b:value", "id:affine_casesensitive:checked", "cipher"]]
];
for(var i = 0; i < ciphers.length; i++){
    (function(i){
        get("cipher_button_"+ciphers[i][0]).addEventListener("click", function(){
            cipher_button_click(this, i);
        });
        get("decipher_button_"+ciphers[i][0]).addEventListener("click", function(){
            cipher_button_click(this, i);
        });
    }(i));
}

get("alphabetsub_alphabet").value = shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
get("generate_alphabetsub").addEventListener("click", function(){
    get("alphabetsub_alphabet").value = shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
});