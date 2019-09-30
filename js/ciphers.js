function get(i){
    return document.getElementById(i);
}
function getc(c){
    return document.getElementsByClassName(c);
}

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

function affine(input, alphabet, a, b, casesensitive, cipher){
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
        var output = "";
        a = parseInt(a);
        b = parseInt(b);

        for(var i = 0; i < input.length; i++){
            var current_char = input[i];
            var current_char_i = alphabet.indexOf(input[i].toUpperCase());

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
                    output += sub_char.toLowerCase();
                }
                else{
                    output += sub_char;
                }
            }
            else{
                output += input[i];
            }
        }
        return output;
    }
    else{
        return "";
    }
}

function caesar(input, shift, casesensitive, cipher){
    if(typeof shift != "undefined"){
        var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        shift = parseInt(shift);
        if(!cipher){
            shift = -shift;
        }
        if(shift < 0){
            shift = 26-Math.abs(shift)%26;
        }
        var output = "";

        for(var i = 0; i < input.length; i++){
            var current_char = input[i];
            var current_char_i = alphabet.indexOf(input[i].toUpperCase());
            var sub_char = alphabet[(current_char_i+shift)%26];

            if(current_char_i > -1){
                if(casesensitive && current_char != current_char.toUpperCase()){
                    output += sub_char.toLowerCase();
                }
                else{
                    output += sub_char;
                }
            }
            else{
                output += input[i];
            }
        }
        return output;
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

function alphabetsub(input, alphabet_sub, casesensitive, cipher){
    var output = "";
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    if(!cipher){
        tmp = alphabet;
        alphabet = alphabet_sub;
        alphabet_sub = tmp;
    }

    for(var i = 0; i < input.length; i++){
        var current_char = input[i];
        var current_char_i = alphabet.indexOf(input[i].toUpperCase());
        var sub_char = alphabet_sub[current_char_i];

        if(current_char_i > -1){
            if(casesensitive && current_char != current_char.toUpperCase()){
                output += sub_char.toLowerCase();
            }
            else{
                output += sub_char;
            }
        }
        else{
            output += current_char;
        }
    }
    return output;
}

function morse(input, dash, dot, space, cipher){
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var morse_table = ["01", "1000", "1010", "100", "0", "0010", "110", "0000", "00", "0111", "101", "0100", "11", "10", "111", "0110", "1101", "010", "000", "1", "001", "0001", "011", "1001", "1011", "1100"];
    if(cipher){
        var output = "";
        input = input.toUpperCase();
        for(var i = 0; i < input.length; i++){
            if(input[i] == " "){
                output += space+" ";
            }
            else if(alphabet.indexOf(input[i]) > -1){
                var m = morse_table[alphabet.indexOf(input[i])];
                m = m.replace(new RegExp(/1/, "g"), dash).replace(new RegExp(/0/, "g"), dot);
                output += m+" ";
            }
        }
        output = output.subinput(0, output.length-1);
        return output;
    }
    else{
        var output = "";
        var words = input.split(space);
        for(var i = 0; i < words.length; i++){
            var chars = words[i].split(" ");
            for(var j = 0; j < chars.length; j++){
                var char = chars[j];
                console.log(char);
                char = char.replace(new RegExp(dash, "g"), "1").replace(new RegExp("\\"+dot, "g"), "0");
                console.log(char);
                if(morse_table.indexOf(char) > -1) output += alphabet[morse_table.indexOf(char)];
            }
            if(i < words.length-1) output += " ";
        }
        return output;
    }
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

function base64(input, encode){
    // rework this
    if(encode){
        return btoa(input);
    }
    else{
        return atob(input);
    }
}

function ascii(input, encode){
    switch(get("ascii_base").innerHTML){
        case "Binary":
            var base = 2;
            break;
        case "Octal":
            var base = 8;
            break;
        case "Decimal":
            var base = 10;
            break;
        case "Hexadecimal":
            var base = 16;
            break;
    }
    if(encode){
        var output = "";
        for(var i = 0; i < input.length; i++){
            output += input.charCodeAt(i).toString(base);
            if(i < input.length-1) output += " ";
        }
        return output;
    }
    else{
        var output = "";
        var words = input.split(" ");
        for(var i = 0; i < words.length; i++){
            output += String.fromCharCode(parseInt(words[i], base));
        }
        return output;
    }
}

function vigenere(input, key, alphabet, casesensitive, cipher){
    if(key.length > 0){
        var output = "";
        var key_index = 0;
        var key = key.repeat(Math.ceil(input.length/key.length)).substring(0, input.length);

        for(var i = 0; i < input.length; i++){
            var current_char = input[i];
            var current_char_i = alphabet.indexOf(input[i].toUpperCase());
            var shift = alphabet.indexOf(key[key_index].toUpperCase());

            if(shift > -1){
                if(!cipher){
                    shift = -shift;
                }
                if(shift < 0){
                    shift = 26-Math.abs(shift)%26;
                }
                var sub_char = alphabet[(current_char_i+shift)%26];

                if(current_char_i > -1){
                    if(casesensitive && current_char != current_char.toUpperCase()){
                        output += sub_char.toLowerCase();
                    }
                    else{
                        output += sub_char;
                    }
                    key_index++;
                }
                else{
                    output += input[i];
                }
            }
        }
        return output;
    }
}

function random_alphabet(){
    return shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
}

var ciphers = [
    ["caesar", ["id:caesar_in:value", "id:caesar_shift:value", "id:caesar_casesensitive:checked", "cipher"]],
    ["alphabetsub", ["id:alphabetsub_in:value", "id:alphabetsub_alphabet:value", "id:alphabetsub_casesensitive:checked", "cipher"]],
    ["affine", ["id:affine_in:value", "id:affine_alphabet:value", "id:affine_a:value", "id:affine_b:value", "id:affine_casesensitive:checked", "cipher"]],
    ["morse", ["id:morse_in:value", "id:morse_dash:value", "id:morse_dot:value", "id:morse_space:value", "cipher"]],
    ["base64", ["id:base64_in:value", "cipher"]],
    ["ascii", ["id:ascii_in:value", "cipher"]],
    ["vigenere", ["id:vigenere_in:value", "id:vigenere_key:value", "id:vigenere_alphabet:value", "id:vigenere_casesensitive:checked", "cipher"]],
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

get("alphabetsub_alphabet").value = random_alphabet();
get("generate_alphabetsub").addEventListener("click", function(){
    get("alphabetsub_alphabet").value = random_alphabet();
});
get("generate_vigenere").addEventListener("click", function(){
    get("vigenere_alphabet").value = random_alphabet();
});