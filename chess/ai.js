importScripts("game.js");

class AI{
    constructor(){
        this.search_depth = 3;
        this.searched_nodes = 0;
    }

    tree(board, depth, color){
        this.searched_nodes++;
        let gameover = is_gameover(color, board);

        if(depth == 0 || gameover != ""){
            if(gameover == "checkmate"){
                if(color == this.ai_color){
                    return [Infinity, []];
                }
                else{
                    return [-Infinity, []];
                }
            }

            return [evaluate(board), []];
        }
        else{
            let valid_moves = [];
            for(let i = 0; i < 8; i++){
                for(let j = 0; j < 8; j++){
                    if(board[i][j] != "" && get_piece_color(board[i][j]) == color){
                        let tmp_valid_moves = get_valid_moves([i, j], false, board, color);
                        for(let k = 0; k < tmp_valid_moves.length; k++){
                            valid_moves.push([[i, j], tmp_valid_moves[k]]);
                        }
                    }
                }
            }

            let outcomes = [];
            for(let i = 0; i < valid_moves.length; i++){
                let board_after_move = get_board_after_move(board, valid_moves[i][0], valid_moves[i][1]);
                outcomes.push([this.tree(board_after_move, depth-1, color == "w" ? "b" : "w")[0], valid_moves[i]]);
            }

            outcomes = outcomes.sort(function(a, b){
                return a[0] - b[0];
            });

            if(depth == 3){
                console.log(outcomes[0]);
            }

            if(color == "w"){
                return [outcomes[outcomes.length-1][0], outcomes[outcomes.length-1][1]];
            }
            else{
                return [outcomes[0][0], outcomes[0][1]];
            }
        }
    }

    set_search_depth(search_depth){
        if(search_depth < 1) search_depth = 1;
        this.search_depth = search_depth;
    }

    play(game){
        this.searched_nodes = 0;
        let color = invert(game.player_color);
        this.ai_color = color;
        let board = game.board;

        let best_move = this.tree(board, this.search_depth, color)[1];

        if(best_move.length == 2){
            postMessage({"cmd": "play", "data": [best_move[0], best_move[1]]});
            postMessage({"cmd": "info", "data": [this.searched_nodes]});
        }
    }
}

let ai = new AI();
let timer = 0;

self.addEventListener("message", function(e){
    let cmd = e.data["cmd"];
    let data = e.data["data"];
    switch(cmd){
        case "play":
            ai.play(data);
            break;
        case "set_search_depth":
            ai.set_search_depth(data);
            break;
    }
});