class GUI{
    constructor(id, game){
        this.board = document.getElementById(id);
        this.game = game;
        this.previous_selected = null;

        this.generate_cells();
        this.update_gui();
    }

    generate_cells(){
        let color = false;
        let to_add = "";
        for(let i = 0; i < 8; i++){
            to_add += "<div class=\"row\">";
            for(let j = 0; j < 8; j++){
                to_add += "<div id=\""+i+"-"+j+"\" class=\"cell "+(color ? "cell-dark" : "")+"\">";
                to_add += "<span class=\"indicator-target-empty\"></span>";
                to_add += "<span class=\"indicator-target-piece\"></span>";
                to_add += "<span class=\"pos\">";
                if(j == 7) to_add += "<span class=\"rank\">"+(8-i)+"</span>";
                if(i == 7) to_add += "<span class=\"file\">"+String.fromCharCode(j+97)+"</span>";
                to_add += "</span></div>";
                color = !color;
            }
            to_add += "</div>";
            color = !color;
        }
        this.board.innerHTML = to_add;

        let cells = document.querySelectorAll(".cell");
        for(let i = 0; i < cells.length; i++){
            (function(gui, game){
                cells[i].addEventListener("click", function(){
                    if(game.checkmate != "" || game.stalemate || game.current_turn != game.player_color){
                        gui.remove_targets_cells();
                        return;
                    }

                    let pos = [parseInt(this.id.split("-")[0]), parseInt(this.id.split("-")[1])];

                    if(this.classList.contains("target")){
                        let previous_pos = [parseInt(gui.previous_selected.id.split("-")[0]), parseInt(gui.previous_selected.id.split("-")[1])]
                        play(previous_pos, pos, game);
                        gui.remove_targets_cells();
                        gui.previous_selected.classList.remove("selected");
                        return;
                    }

                    gui.remove_targets_cells();
                    let piece = game.board[pos[0]][pos[1]];
                    let piece_color = piece == piece.toLowerCase() ? "b" : "w";
                    if(this.classList.contains("empty") || piece_color != game.current_turn || gui.previous_selected == this){
                        if(gui.previous_selected != null) gui.previous_selected.classList.remove("selected");
                        gui.previous_selected = null;
                        return;
                    }
                    if(gui.previous_selected != null){
                        gui.previous_selected.classList.remove("selected");
                    }
                    this.classList.add("selected");
                    gui.previous_selected = this;

                    let valid_moves = get_valid_moves(pos, false, game.board, game.current_turn);
                    for(let i = 0; i < valid_moves.length; i++){
                        let cell_id = valid_moves[i][0]+"-"+valid_moves[i][1];
                        document.getElementById(cell_id).classList.add("target");
                        if(game.board[valid_moves[i][0]][valid_moves[i][1]] == ""){
                            document.getElementById(cell_id).classList.add("target-empty");
                        }
                        else{
                            document.getElementById(cell_id).classList.add("target-piece");
                        }
                    }
                });
            })(this, this.game);
        }
    }

    remove_targets_cells(){
        let targets = document.querySelectorAll(".target");
        for(let j = 0; j < targets.length; j++){
            targets[j].classList.remove("target");
        }
        targets = document.querySelectorAll(".target-empty");
        for(let j = 0; j < targets.length; j++){
            targets[j].classList.remove("target-empty");
        }
        targets = document.querySelectorAll(".target-piece");
        for(let j = 0; j < targets.length; j++){
            targets[j].classList.remove("target-piece");
        }
    }

    update_gui(){
        let checks = document.querySelectorAll(".check");
        for(let j = 0; j < checks.length; j++){
            checks[j].classList.remove("check");
        }
        if(this.game.check.length > 0){
            document.getElementById(this.game.check[0]+"-"+this.game.check[1]).classList.add("check");
        }

        for(let i = 0; i < this.game.board.length; i++){
            for(let j = 0; j < this.game.board[i].length; j++){
                let current_cell = i+"-"+j;
                if(this.game.board[i][j] != ""){
                    document.getElementById(current_cell).classList.remove("empty");
                    let bg = "";
                    if(this.game.board[i][j].toUpperCase() == this.game.board[i][j]){
                        bg = "url(img/w"+this.game.board[i][j].toLowerCase()+".svg)";
                    }
                    else{
                        bg = "url(img/b"+this.game.board[i][j].toLowerCase()+".svg)";
                    }
                    if(document.getElementById(current_cell).classList.contains("check")){
                        document.getElementById(current_cell).style.backgroundImage = bg+", radial-gradient(rgb(235, 1, 1) 30%, rgba(255, 255, 255, 0) 90%)";
                    }
                    else{
                        document.getElementById(current_cell).style.backgroundImage = bg;
                    }
                }
                else{
                    document.getElementById(current_cell).style.backgroundImage = "";
                    document.getElementById(current_cell).classList.add("empty");
                }
            }
        }

        if(this.game.checkmate != ""){
            document.getElementById("current_turn").innerHTML = "Checkmate, "+(this.game.checkmate == "b" ? "Black" : "White")+" is victorious";
        }
        else if(this.game.stalemate){
            document.getElementById("current_turn").innerHTML = "Stalemate";
        }
        else{
            if(this.game.current_turn == "w"){
                document.getElementById("current_turn").innerHTML = "White turn to play";
            }
            else{
                document.getElementById("current_turn").innerHTML = "Black turn to play";
            }
        }

        if(this.game.current_turn != this.game.player_color){
            document.getElementById("thinking").innerHTML = "Computer is thinking...";
        }
        else{
            document.getElementById("thinking").innerHTML = "Computer is waiting";
        }

        let moves_table = "";
        for(let i = 0; i < game.moves.length; i+=2){
            moves_table += "<tr>";
            moves_table += "<td>"+((i/2)+1)+".</td>";
            moves_table += "<td>"+game.moves[i]+"</td>";
            moves_table += "<td>"+(game.moves[i+1] !== undefined ? game.moves[i+1] : "")+"</td>";
            moves_table += "</tr>";
        }
        document.getElementById("moves").innerHTML = "<table>"+moves_table+"</table>";
        let move_container = document.getElementById("moves_container");
        move_container.scrollTop = move_container.scrollHeight;

        document.getElementById("evaluation").innerHTML = evaluate(game.board);
    }
}