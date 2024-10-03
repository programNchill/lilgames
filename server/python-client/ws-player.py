import socketio
import sys


gameName = sys.argv[1]
player = sys.argv[2]
gameId = sys.argv[3]

if gameName not in ["connect4", "tictactoe"]: raise "BAD GAME NAME!"


playerType = None
myGameData = None
sio = socketio.Client(handle_sigint=True)
roomId = f'{gameName}-{gameId}'

max_position = 6 if gameName == "connect4" else 8

def play_move():
    position = input(f"Give a pos 0 to {max_position}: ")
    global playerType
    sio.emit(roomId, 
    {
        "move": {
            "player": playerType,
            "position": position
        }
    })

def send_verify_data():
    global myGameData
    sio.emit(roomId, {
        "verifyGameData": myGameData
    })

@sio.event
def connect():
    print(f'{player=} connection established')
    sio.emit('join', 
    {
        "gameName": gameName,
        "gameId": gameId,
        "playerId": player
    })


@sio.event
async def message(data):
    print(f'I received a message! {data}')


@sio.on('initialGameData')
def start_game(data):
    print("starting game")

    startingPlayerIdx = None
    for i, x in enumerate(data):
        if "ownPlayer" in x:
            startingPlayerIdx = i
            break

    startingPlayer = data[startingPlayerIdx]
    secondPlayer = data[1 - startingPlayerIdx]
    global myGameData
    global playerType

    if startingPlayer["ownPlayer"] == player:
        myGameData = startingPlayer
        playerType = myGameData["playerType"]
        print(f"You are {playerType}")
        del myGameData["ownPlayer"]
        del myGameData["playerType"]
        play_move()
    else:
        myGameData = secondPlayer
        playerType = myGameData["playerType"]
        print(f"You are {playerType}")
        del myGameData["playerType"]


@sio.on(roomId)
def handle_all(data):
    match data:
        case {"initialGameData": initData}:
            start_game(initData)
        case {"gameData": gameData}:
            handle_new_data(gameData)
        case {"message": message}:
            handle_message(message)


def pretty_print_board_connect4(board):
    # Define the dimensions of the board
    num_rows = 6
    num_cols = 7
    
    # Create a 2D grid to represent the board visually
    grid = [[" " for _ in range(num_cols)] for _ in range(num_rows)]
    
    # Fill the grid based on the board data
    for x, col in board.items():
        for y, player in col.items():
            y = int(y)
            x = int(x)
            if player == 'first':
                grid[5 - y][x] = 'X'  # 'X' for 'first' player
            elif player == 'second':
                grid[5 - y][x] = 'O'  # 'O' for 'second' player

    # Print the board row by row
    for row in grid[::-1]:
        print("| " + " | ".join(row) + " |")

    # Print the column indices at the bottom
    print("  " + "   ".join(str(i) for i in range(num_cols)))


def pretty_print_board_tictactoe(board):
    toXO = lambda x: 'X' if x == 'cross' else 'O' 
    symbols = [toXO(board[str(x)]) if str(x) in board else ' ' for x in range(9)]
    print()
    for j in range(3):
        print("|".join(symbols[j*3:(j+1)*3]))
        if j == 2:
            break
        print("-"*5)
    print()


pp_board = pretty_print_board_connect4 if gameName == "connect4" else pretty_print_board_tictactoe


def handle_new_data(gameData):
    match gameData:
        case {"winner": x} if x is not None:
            print(f"Game over with result: {x}")
            pp_board(gameData["board"])
            sio.disconnect()
        case x:
            global myGameData
            global playerType
            myGameData = x
            pp_board(myGameData["board"])
            if myGameData["currentPlayer"] == playerType:
                play_move()
            else:
                print("Opponent's turn")
        

def handle_message(message):
    global myGameData
    global playerType
    match message:
        case "verifyGameData":
            send_verify_data()
        case "badMove" if playerType == myGameData["currentPlayer"]:
            print("Bad move play again!")
            play_move()
        case "invalidGameData":
            print("Somebody cheated bye.")
            sio.disconnect()


@sio.event
def disconnect():
    print(f'{player=} disconnected from server')

sio.connect('ws://localhost:3000')
# sio.connect('https://test-lilgames.onrender.com')
sio.wait()


