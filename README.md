# lilgames


Turnbased games webapp communicating with websockets! Concensus verified distributed game state! 


## Games to implement?
checkers, chess, battleship, la battaille


## Server

## Start the nestjs server
what you're probably going to need to work on the project.

1. `cd server`
2. `npm run start:dev` 

### python test client for WS

To install all python dependencies you can use this command from the server folder:

`python -m pip install -r .\python-client\requirements.txt`

then

1. `cd server/python-client`
2. `python ./ws-player.py PLAYERID`   where PLAYERID is a number. for now 0 or 1. 