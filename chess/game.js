function play(pos, target, game){
    let piece = game.board[pos[0]][pos[1]];
    let target_piece = game.board[target[0]][target[1]];

    let capture = target_piece == "" ? "" : "x";
    let check = "";

    game.board = get_board_after_move(game.board, pos, target);

    let promotion = "";
    if(piece.toLowerCase() == "p" && (target[0] == 0 || target[0] == 7)){
        promotion = "=Q";
    }

    game.current_turn = invert(game.current_turn);

    let in_check = is_in_check(game.current_turn, game.board);
    game.check = in_check;

    if(in_check.length > 0){
        check = "+";
    }

    let gameover = is_gameover(game.current_turn, game.board, true);

    if(gameover == "checkmate"){
        check = "#";
        game.checkmate = invert(game.current_turn);
    }
    else if(gameover == "stalemate"){
        game.stalemate = true;
        game.check = [];
    }

    let algebraic = figurine(piece)+file(pos[1])+(8-pos[0])+capture+file(target[1])+(8-target[0])+promotion+check;
    game.moves.push(algebraic);

    gui.update_gui();

    if(game.stalemate || game.checkmate != "") return;

    if(game.current_turn != game.player_color) ai.play();
}

function is_gameover(color, board, flag){
    for(let i = 0; i < 8; i++){
        for(let j = 0; j < 8; j++){
            let current_piece = board[i][j];
            if(current_piece != "" && get_piece_color(current_piece) == color){
                if(get_valid_moves([i, j], false, board, color).length != 0){
                    return "";
                }
            }
        }
    }

    let in_check = is_in_check(color, board);

    if(in_check.length > 0){
        return "checkmate";
    }
    else{
        return "stalemate";
    }
}

function figurine(piece){
    let f = {"k": "♔", "q": "♕", "r": "♖", "b": "♗", "n": "♘", "p": "♙"};
    return f[piece.toLowerCase()];
}

function get_piece_color(piece){
    if(piece == "") return "";
    return piece.toLowerCase() == piece ? "b" : "w";
}

function valid(pos){
    if(pos[0] > 7 || pos[0] < 0 || pos[1] > 7 || pos[1] < 0) return false;
    return true;
}

function file(n){
    return String.fromCharCode(n+97);
}

function get_board_after_move(board, pos, target){
    let piece = board[pos[0]][pos[1]];
    let target_piece = board[target[0]][target[1]];
    let new_board = JSON.parse(JSON.stringify(board));
    new_board[pos[0]][pos[1]] = "";
    new_board[target[0]][target[1]] = piece;

    if(piece.toLowerCase() == "p"){
        if(target[0] == 0){
            new_board[target[0]][target[1]] = "Q";
        }
        else if(target[0] == 7){
            new_board[target[0]][target[1]] = "q";
        }
    }

    return new_board;
}

function invert(turn){
    return turn == "w" ? "b" : "w";
}

function is_in_check(turn, board){
    let invert_turn = invert(turn);
    for(let i = 0; i < 8; i++){
        for(let j = 0; j < 8; j++){
            let current_piece = board[i][j];
            if(current_piece != "" && get_piece_color(current_piece) == invert_turn){
                let current_piece_valid_moves = get_valid_moves([i, j], true, board, invert_turn);
                for(let k = 0; k < current_piece_valid_moves.length; k++){
                    let king = turn == "w" ? "K" : "k";
                    if(board[current_piece_valid_moves[k][0]][current_piece_valid_moves[k][1]] == king){
                        return [current_piece_valid_moves[k][0], current_piece_valid_moves[k][1]];
                    }
                }
            }
        }
    }
    return [];
}

function diagonal(pos, board){
    let valid_moves = [];
    let piece = board[pos[0]][pos[1]];
    for(let i = pos[0]+1, j = pos[1]+1; i < 8 && j < 8; i++, j++){
        let target = [i, j];
        if(get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])) valid_moves.push(target);
        if(board[target[0]][target[1]] != "") break;
    }
    for(let i = pos[0]-1, j = pos[1]+1; i >= 0 && j < 8; i--, j++){
        let target = [i, j];
        if(get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])) valid_moves.push(target);
        if(board[target[0]][target[1]] != "") break;
    }
    for(let i = pos[0]-1, j = pos[1]-1; i >= 0 && j >= 0; i--, j--){
        let target = [i, j];
        if(get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])) valid_moves.push(target);
        if(board[target[0]][target[1]] != "") break;
    }
    for(let i = pos[0]+1, j = pos[1]-1; i < 8 && j >= 0; i++, j--){
        let target = [i, j];
        if(get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])) valid_moves.push(target);
        if(board[target[0]][target[1]] != "") break;
    }
    return valid_moves;
}

function line(pos, board){
    let valid_moves = [];
    let piece = board[pos[0]][pos[1]];
    for(let i = pos[0]+1, j = pos[1]; i < 8; i++){
        let target = [i, j];
        if(get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])) valid_moves.push(target);
        if(board[target[0]][target[1]] != "") break;
    }
    for(let i = pos[0]-1, j = pos[1]; i >= 0; i--){
        let target = [i, j];
        if(get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])) valid_moves.push(target);
        if(board[target[0]][target[1]] != "") break;
    }
    for(let i = pos[0], j = pos[1]+1; j < 8; j++){
        let target = [i, j];
        if(get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])) valid_moves.push(target);
        if(board[target[0]][target[1]] != "") break;
    }
    for(let i = pos[0], j = pos[1]-1; j >= 0; j--){
        let target = [i, j];
        if(get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])) valid_moves.push(target);
        if(board[target[0]][target[1]] != "") break;
    }
    return valid_moves;
}

function get_valid_moves(pos, skip_check, board, turn){
    let piece = board[pos[0]][pos[1]];
    let valid_moves = [];

    if(piece.toLowerCase() == "p"){
        let color = piece.toLowerCase() == piece ? 1 : -1;
        let first_rank = color == 1 ? 1 : 6;
        let target = [pos[0]+1*color, pos[1]];

        let empty_firstsquare = false;

        if(valid(target)){
            empty_firstsquare = board[target[0]][target[1]] == "";
        }

        if(valid(target) && empty_firstsquare){
            valid_moves.push(target);
        }

        target = [pos[0]+2*color, pos[1]];
        if(valid(target) && board[target[0]][target[1]] == "" && pos[0] == first_rank && empty_firstsquare){
            valid_moves.push(target);
        }

        target = [pos[0]+1*color, pos[1]+1];
        if(valid(target) && board[target[0]][target[1]] != "" && get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])){
            valid_moves.push(target);
        }

        target = [pos[0]+1*color, pos[1]-1];
        if(valid(target) && board[target[0]][target[1]] != "" && get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])){
            valid_moves.push(target);
        }
    }
    else if(piece.toLowerCase() == "b"){
        let diagonal_moves = diagonal(pos, board);
        for(let i = 0; i < diagonal_moves.length; i++){
            valid_moves.push(diagonal_moves[i]);
        }
    }
    else if(piece.toLowerCase() == "r"){
        let line_moves = line(pos, board);
        for(let i = 0; i < line_moves.length; i++){
            valid_moves.push(line_moves[i]);
        }
    }
    else if(piece.toLowerCase() == "n"){
        let targets = [[pos[0]+1, pos[1]+2], [pos[0]+1, pos[1]-2], [pos[0]-1, pos[1]-2], [pos[0]-1, pos[1]+2],
        [pos[0]+2, pos[1]+1], [pos[0]+2, pos[1]-1], [pos[0]-2, pos[1]-1], [pos[0]-2, pos[1]+1]];
        for(let i = 0; i < targets.length; i++){
            let target = targets[i];
            if(valid(target) && get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])){
                valid_moves.push(target);
            }
        }
    }
    else if(piece.toLowerCase() == "k"){
        let targets = [[pos[0]+1, pos[1]], [pos[0]-1, pos[1]], [pos[0], pos[1]+1], [pos[0], pos[1]-1],
        [pos[0]+1, pos[1]+1], [pos[0]-1, pos[1]-1], [pos[0]-1, pos[1]+1], [pos[0]+1, pos[1]-1]];
        for(let i = 0; i < targets.length; i++){
            let target = targets[i];
            if(valid(target) && get_piece_color(piece) != get_piece_color(board[target[0]][target[1]])){
                valid_moves.push(target);
            }
        }
    }
    else if(piece.toLowerCase() == "q"){
        let diagonal_moves = diagonal(pos, board);
        for(let i = 0; i < diagonal_moves.length; i++){
            valid_moves.push(diagonal_moves[i]);
        }

        let line_moves = line(pos, board);
        for(let i = 0; i < line_moves.length; i++){
            valid_moves.push(line_moves[i]);
        }
    }

    if(skip_check) return valid_moves;

    let valid_moves_not_check = [];
    for(let i = 0; i < valid_moves.length; i++){
        let board_after_move = get_board_after_move(board, pos, valid_moves[i]);
        if(is_in_check(turn, board_after_move).length == 0){
            valid_moves_not_check.push(valid_moves[i]);
        }
    }

    return valid_moves_not_check;
}

function evaluate(board){
    let evaluationWhite = 0;
    let evaluationBlack = 0;
    for(let i = 0; i < 8; i++){
        for(let j = 0; j < 8; j++){
            let tmp = 0;
            switch(board[i][j].toLowerCase()){
                case "p":
                    tmp = 1;
                    break;
                case "n":
                case "b":
                    tmp = 3;
                    break;
                case "r":
                    tmp = 5;
                    break;
                case "q":
                    tmp = 9;
                    break;
                case "k":
                    tmp = 1000;
                    break;
            }
            if(get_piece_color(board[i][j]) == "w"){
                evaluationWhite += tmp;
            }
            else{
                evaluationBlack += tmp;
            }
        }
    }
    return evaluationWhite-evaluationBlack;
}