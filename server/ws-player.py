import socketio
import sys


player = sys.argv[1]
playerType = None
myGameData = None
sio = socketio.Client(handle_sigint=True)
gameName = "tictactoe"
gameId = "a"
roomId = f'{gameName}-{gameId}'

def play_move():
    position = input("Give a pos 0 to 8: ")
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


def pretty_print_board(board):
    toXO = lambda x: 'X' if x == 'cross' else 'O' 
    symbols = [toXO(board[str(x)]) if str(x) in board else ' ' for x in range(9)]

    for j in range(3):
        print("|".join(symbols[j*3:(j+1)*3]))
        if j == 2:
            break
        print("-"*5)


def handle_new_data(gameData):
    match gameData:
        case {"winner": x} if x is not None:
            print(f"Game over with result: {x}")
            sio.disconnect()
        case x:
            global myGameData
            global playerType
            myGameData = x
            print(gameData)
            pretty_print_board(myGameData["board"])
            if myGameData["currentPlayer"] == playerType:
                play_move()
        

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
    sio.disconnect()

# sio.connect('ws://localhost:3000')
sio.connect('https://test-lilgames.onrender.com')
sio.wait()