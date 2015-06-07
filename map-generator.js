TileType = {
    NONE : 0,
    FLOOR : 1,
    OBSTACLE : 2
}

function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

var rand = function(from, to) {
    if (arguments.length == 1) {
        return Math.floor((Math.random() * arguments[0]))
    } else {
        return Math.floor((Math.random() * arguments[1]) + arguments[0])
    }
}

function Room(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.doors = [];

    for (var y = 0; y < height; y++) {
        this.tiles[y] = [];
        for (var x = 0; x < width; x++) {
            this.tiles[y][x] = TileType.FLOOR;
        }
    }

    this.get = function(x, y) {
        return this.tiles[y][x];
    }

    /*
     * Returns a random tile immediately outside of the perimiter
     */
    this.randomExitPos = function() {
        var circumference = this.width * 2 + this.height * 2;
        var exitOrdinal = rand(circumference);

        if (exitOrdinal < width) { // above the top row
            return [this.x + exitOrdinal, this.y - 1];
        } else if (exitOrdinal < width * 2) { // below the bottom row
            return [this.x + exitOrdinal - this.width, this.y + this.height];
        } else if (exitOrdinal < width * 2 + height) { // to the right
            return [this.x + this.width, this.y + exitOrdinal - 2 * this.width];
        } else { // to the left
            return [this.x - 1, this.y + exitOrdinal - 2 * this.width - this.height];
        }
    }

    this.addDoor = function(pos) {
        this.doors.push(pos);
    }

    this.toString = function() {
        return "x: " + this.x + ", y: " + this.y + ", width: " + this.width + ", height: " + this.height;
    }

    this.draw = function(painter) {
        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                painter.drawTile(this.x + x, this.y + y, this.tiles[y][x]);

                if (x == 0) {
                    painter.drawWall(this.x + x, this.y + y, this.x + x - 1, this.y + y);
                }
                if (y == 0) {
                    painter.drawWall(this.x + x, this.y + y, this.x + x, this.y + y - 1);
                }
                if (x == this.width - 1) {
                    painter.drawWall(this.x + x, this.y + y, this.x + x + 1, this.y + y);
                }
                if (y == this.height - 1) {
                    painter.drawWall(this.x + x, this.y + y, this.x + x, this.y + y + 1);
                }
            }
        }

        for (var i = 0; i < this.doors.length; i++) {
            var exitTile = {x: this.doors[i][0], y: this.doors[i][1] };
            if (exitTile.x < this.x) {
                painter.drawDoor(exitTile.x, exitTile.y, exitTile.x + 1, exitTile.y);
            } else if (exitTile.x == this.x + this.width) {
                painter.drawDoor(exitTile.x, exitTile.y, exitTile.x - 1, exitTile.y);
            } else if (exitTile.y < this.y) {
                painter.drawDoor(exitTile.x, exitTile.y, exitTile.x, exitTile.y + 1);
            } else {
                assert(exitTile.y == this.y + this.height, "invalid exit tile: " + exitTile);
                painter.drawDoor(exitTile.x, exitTile.y, exitTile.x, exitTile.y - 1);
            }
        }
    }
}

function Map(width, height) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.rooms = [];

    this.collides = function(width, height, x, y) {
        if (x + width > this.width || y + height > this.height || x < 0 || y < 0) {
            // going off the map
            return true;
        }

        for (var i = x; i < x + width; i++) {
            for (var j = y; j < y + height; j++) {
                if (this.get(i, j) != TileType.NONE) {
                    // some tile's already defined here, collision
                    return true;
                }
            }
        }

        return false;
    }

    this.insert = function(room) {
        for (var y = 0; y < room.height; y++) {
            var mapY = room.y + y;
            if (this.tiles[mapY] == undefined) {
                this.tiles[mapY] = [];
            }
            for (var x = 0; x < room.width; x++) {
                var mapX = room.x + x;
                this.tiles[mapY][mapX] = room.get(x, y);
            }
        }

        this.rooms.push(room);
    }

    this.findFit = function(x, y, width, height) {
        for (var i = 0; i < width; i++) {
            for (var j = 0; j < height; j++) {
                if (!(this.collides(width, height, x - i, y - j))) {
                    return [x - i, y - j];
                }
            }
        }

        return undefined;
    }

    this.get = function(x, y) {
        if (this.tiles[y] == undefined) {
            return TileType.NONE;
        }

        var tile = this.tiles[y][x];
        if (tile == undefined) {
            return TileType.NONE;
        } else {
            return tile;
        }
    }

    this.draw = function(painter) {
        // first hack - the last room doesn't know its exit so draw it first (the exit will be drawn by an earlier room)
        for (var i = this.rooms.length - 1; i >= 0; i--) {
            this.rooms[i].draw(painter);
        }
    }
}

function MapGenerator() {
    this.generateRoom = function(map, entryX, entryY) {
        // TODO find better distribution
        width = Math.floor((Math.random() * 5) + 2);
        height = Math.floor((Math.random() * 5) + 2);

        fit = map.findFit(entryX, entryY, width, height);
        if (fit == undefined) {
            return undefined;
        } else {
            return new Room(fit[0], fit[1], width, height);
        }
    }

    /*
     * width and height as number of tiles
     */
    this.generateMap = function(width, height, noOfRooms) {
        var map = new Map(width, height);
        map.insert(this.generateRoom(map, rand(0, map.width), rand(0, map.height)));

        for (var i = 0; i < noOfRooms; i++) {
            var safety = 0;
            while (true) {
                if (safety > 1000) {
                    alert("Can't do it :(")
                    break;
                }
                safety++;
                var randRoom = map.rooms[rand(map.rooms.length)];
                var exit = randRoom.randomExitPos();
                var newRoom = this.generateRoom(map, exit[0], exit[1]);

                if (newRoom != undefined) {
                    randRoom.addDoor(exit);
                    map.insert(newRoom);
                    break;
                }
            }
        }

        return map;
    }
}

function MapPainter() {
    var TILE_SIZE = 50;
    this.canv = $("#board").get(0);
    this.ctx = this.canv.getContext("2d");

    this.drawGrid = function(width, height) {
        this.canv.width = width * TILE_SIZE;
        this.canv.height = height * TILE_SIZE;
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = '#b2b2b2';
        for (var i = 0; i < height; i++) {
            this.ctx.moveTo(0, i * TILE_SIZE + 0.5);
            this.ctx.lineTo(width * TILE_SIZE, i * TILE_SIZE + 0.5);
            this.ctx.stroke();
        }

        for (var i = 0; i < width; i++) {
            this.ctx.moveTo(i * TILE_SIZE + 0.5, 0);
            this.ctx.lineTo(i * TILE_SIZE + 0.5, height * TILE_SIZE);
            this.ctx.stroke();
        }
    }

    this.drawTile = function(x, y, type) {
        if (type == TileType.NONE) {
            return;
        }

        if (type == TileType.FLOOR) {
           this.ctx.fillStyle = "#B6CAF4";
        }
        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    /*
     * Draws a boundary (e.g. wall or door) between the two tiles
     * NOTE: assumes desired style has been set prior to the call
     */
    this.drawBoundary = function(x1, y1, x2, y2) {
        this.ctx.beginPath();
        if (x1 == x2) { // horizontal boundary
            this.ctx.moveTo(x1 * TILE_SIZE, Math.max(y1, y2) * TILE_SIZE);
            this.ctx.lineTo((x1 + 1) * TILE_SIZE, Math.max(y1, y2) * TILE_SIZE);
        } else { // vertical
            assert(y1 == y2, "misaligned boundary");
            this.ctx.moveTo(Math.max(x1, x2) * TILE_SIZE, y1 * TILE_SIZE);
            this.ctx.lineTo(Math.max(x1, x2) * TILE_SIZE, (y1 + 1) * TILE_SIZE);
        }

        this.ctx.stroke();
    }

    this.drawDoor = function(x1, y1, x2, y2) {
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#95E595';
        this.drawBoundary(x1, y1, x2, y2);
    }

    this.drawWall = function(x1, y1, x2, y2) {
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#000000';
        this.drawBoundary(x1, y1, x2, y2);
    }

    this.drawMap = function(map) {
        this.drawGrid(map.width, map.height);
        map.draw(this);
    }    
}