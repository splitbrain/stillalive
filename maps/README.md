# Map and campaign files

A level is a JSON map file. A campaign is a folder in `maps` with a campaign file and the map files of its levels.

## Level editor

The level editor sets the tiles, the bodies and the background of a map, and it chooses the wall images from the
neighbors of each wall. The editor cannot set `title`, `text`, `abilities`, `events`, `labels` and `boss`, so these
properties come from a text editor. The editor keeps these properties unchanged in the save slots, in the export and in
the test run. The Clear button removes them.

## Map files

A map file is a JSON object with these properties:

| Property    | Required | Description                                                                   |
|-------------|----------|-------------------------------------------------------------------------------|
| `format`    | yes      | The version of the map format, currently always 1.                            |
| `tiles`     | yes      | The 768 tile ids of the 32 x 24 tiles, row by row from the top left corner.   |
| `bg`        | yes      | The background, from 0 to 10. The value n shows `gfx/backgrounds/level{n+1}.svg`. |
| `title`     | no       | The name of the level in the level selection.                                 |
| `text`      | no       | The narrator text at the level start.                                         |
| `abilities` | no       | The abilities of the player that are disabled at the level start.             |
| `events`    | no       | A list of events, e.g. narrator texts at a given time or position.            |
| `labels`    | no       | A list of texts that show on the playfield.                                   |
| `boss`      | no       | The boss of the level, from 1 to 4. The default is 0, a level without a boss. |

All positions in a map file are tile positions. The columns go from 0 at the left to 31 at the right, and the rows go
from 0 at the top to 23 at the bottom.

The tile ids in a map file are in three ranges: the tiles from 0 to 60, the bodies from 100 to 111, and the tube of
the boss with the id 120. The game rejects a map file with an id outside these ranges.

### Tiles

The ids from 0 to 60 are the tiles of the tile set. The maps use these ids:

| Id      | Tile                                                                                              |
|---------|---------------------------------------------------------------------------------------------------|
| 0       | Empty                                                                                             |
| 1 to 16 | Wall. A wall is solid and takes portals. The id selects the image of the wall.                    |
| 17      | Warning stripes. The stripes are solid and take no portals.                                       |
| 18      | Warning stripes, mirrored                                                                         |
| 19      | Switch. It opens all switch doors while the player or a crate stands on it.                       |
| 20      | Plasma emitter. It shoots a plasma ball away from the walls around it. A level has one emitter.   |
| 21      | Plasma receiver. A plasma ball that hits it opens all plasma doors.                               |
| 22      | Exit. It opens when the player has eaten all cakes. A level without cakes has an open exit.       |
| 23      | Switch door. It is solid until a switch opens it.                                                 |
| 29      | Plasma door. It is solid until a plasma ball hits the receiver.                                   |
| 36      | Razor wheel. It kills the player, breaks turrets and sends crates back. Portal shots go through it. |
| 38      | Acid surface. It kills the player, breaks turrets and sends crates and plasma balls back.         |
| 40      | Red energy wall. It is solid, and portal shots go through it.                                     |
| 46      | Icy wall. It reflects portal shots, and the player slips on it.                                   |
| 47      | Acid pool. It goes below the acid surface and acts the same as the acid surface.                  |
| 49      | Force field. It removes the portals when the player goes through it, and it destroys crates.      |
| 55      | Conveyor belt. It moves the player, crates and turrets to the right.                              |
| 57      | Conveyor belt. It moves the player, crates and turrets to the left.                               |
| 58      | Boss block, only in boss levels                                                                   |

The other ids from 0 to 60 are animation frames, cracked boss blocks and the closed exit. The game sets them itself.

The wall image shows an edge on each open side of the wall. A side is open when the neighbor tile is not a wall,
warning stripes or a conveyor belt. The edge of the playfield counts as a closed side.

| Id | Open sides               | Id | Open sides                 |
|----|--------------------------|----|----------------------------|
| 1  | none                     | 9  | top and right              |
| 2  | left                     | 10 | top and bottom             |
| 3  | top                      | 11 | left and right             |
| 4  | right                    | 12 | left, right and bottom     |
| 5  | bottom                   | 13 | left, right and top        |
| 6  | right and bottom         | 14 | top, right and bottom      |
| 7  | left and bottom          | 15 | top, left and bottom       |
| 8  | left and top             | 16 | all four sides             |

### Bodies

A body is a thing with a position and a size that is not part of the tile grid, e.g. the player, a crate or a platform.
The ids from 100 to 111 are bodies. At the level start, the game removes them from the map and creates the bodies.
Some bodies are larger than one tile. The id of a body goes on its top left tile, and the other tiles that the body
covers are empty (0).

| Id  | Body                                                                                | Tiles (w x h) |
|-----|-------------------------------------------------------------------------------------|---------------|
| 100 | Turret that faces left. It shoots the player in its line of sight, and the player can carry it. | 1 x 2 |
| 101 | Turret that faces right                                                             | 1 x 2         |
| 102 | Crate                                                                               | 1 x 1         |
| 103 | Cake                                                                                | 1 x 1         |
| 104 | Player start. A map has one player start.                                           | 1 x 2         |
| 105 | Platform that moves to the right. A platform turns around at walls and at the playfield edges. | 3 x 1 |
| 106 | Platform that moves to the left                                                     | 3 x 1         |
| 107 | Gravitational pipe that carries the player, crates and turrets to the right        | 1 x 2         |
| 108 | Gravitational pipe that carries the player, crates and turrets to the left         | 1 x 2         |
| 109 | Gravitational pipe that carries the player, crates and turrets up                  | 2 x 1         |
| 110 | Gravitational pipe that carries the player, crates and turrets down                | 2 x 1         |
| 111 | Player launch up. A player start where the player jumps in upward, e.g. from below the bottom edge. | 1 x 1 |

A player launch is a player start with a speed. The launch tile is the first cell that the player passes: the player
starts one tile behind it, against the launch direction, and moves in the launch direction. So a launch tile on the
edge of the map lets the player come in from outside the playfield. Only the launch up exists. A map has one player
start or player launch, and the editor does not offer the launch.

### Tube of the boss

The id 120 is the tube of the boss. It is valid only in a boss level. The tube is an image of 4 x 3 tiles over the
tiles of the map. Its id goes on its top left tile, and the other tiles under the tube are empty (0). At the level
start, the game removes the id from the map and shows the image.

### Abilities

The object `abilities` disables abilities of the player at the level start. The keys are `jump` and `portals`, and the
value `false` disables the ability. All abilities are enabled by default. An event with `unlock` enables an ability
again.

The tutorial uses the abilities to introduce jumping and the portal gun one after the other. A level can also disable
an ability for the whole level, e.g. a level without jumping, where the player moves only with portals.

```json
"abilities": { "portals": false }
```

### Events

An event shows a narrator text, waits for a click, enables an ability or places portals. Each event fires once, when
its trigger happens. An event is an object with these properties:

| Property  | Required      | Description                                                              |
|-----------|---------------|--------------------------------------------------------------------------|
| `on`      | yes           | The trigger of the event, from the next table.                           |
| `x`       | for `playerX` | The column.                                                              |
| `seconds` | for `time`    | The level time in seconds. Decimals are allowed, e.g. `2.5`.             |
| `text`    | no            | The new narrator text. An empty text removes the narrator text.          |
| `wait`    | no            | The value `"click"` stops the level time until the player clicks.        |
| `unlock`  | no            | The value `"jump"` or `"portals"` enables this ability.                  |
| `portals` | no            | Two portals to place, as `[[column, row, side], [column, row, side]]`.   |

| Trigger       | The event fires when                                                       |
|---------------|----------------------------------------------------------------------------|
| `start`       | the level starts.                                                          |
| `playerX`     | the center of the player enters column `x` or a column to the right of it. |
| `time`        | the level time reaches `seconds`.                                          |
| `bossArrived` | the boss arrives at its place.                                             |
| `bossDied`    | the life of the boss reaches 0.                                            |
| `exit`        | the player reaches the exit.                                               |

The click of a `wait` removes the narrator text, and the events that come after a `wait` in the list fire only after
the click. The narrator text disappears when the level ends, so the text of an `exit` event shows only with
`"wait": "click"`.

The property `text` of the map is a short form of a `start` event with this text, and it fires before all other events.

A text can contain the placeholders `{KeyW}`, `{KeyA}`, `{KeyS}`, `{KeyD}` and `{KeyE}`. The game shows the label of
the key on the keyboard of the player in place of the placeholder.

Each portal of the property `portals` goes on the wall tile at the given column and row. The side is `up`, `down`,
`left` or `right`, the side of the wall tile that the portal opens to. A portal covers two wall tiles. On the side
`left` or `right`, it covers the given tile and the tile below it. On the side `up` or `down`, it covers the given
tile and the tile to the right of it. For example, `[9, 14, "left"]` is a portal on the left side of the wall tiles at
column 9, rows 14 and 15.

```json
"events": [
	{ "on": "start", "text": "Your portal gun is ready. Click to continue...", "wait": "click", "unlock": "portals" },
	{ "on": "playerX", "x": 16, "text": "Jump over the acid." },
	{ "on": "time", "seconds": 30, "text": "Thirty seconds already?" },
	{ "on": "exit", "text": "Well done.", "wait": "click" }
]
```

### Labels

A label is a text on the playfield. Each label is an object with `x`, `y` and `text`, and the game centers the text on
the tile at column `x` and row `y`. A position can be a half tile, e.g. `"x": 16.5` centers the text between the
columns 16 and 17. A line break `\n` in the text starts a new line.

```json
"labels": [
	{ "x": 4, "y": 16.5, "text": "Portal\nHere" }
]
```

### Boss levels

A boss level has the property `boss` with the number of the boss from 1 to 4. The level editor cannot open a boss
level. Each boss has its own attacks and a fixed place at the right side of the playfield, so the map must fit the
boss. The boss levels of the story campaign are the levels 7, 14, 21 and 28 in `maps/story`.

A boss level can contain the tube of the boss (id 120) and boss blocks (tile 58). The boss blocks protect the boss.
A crate that hits a boss block cracks all boss blocks, and the third hit removes them. After the boss takes a hit, the
boss blocks come back.

## Campaign files

Each campaign folder contains the file `campaign.json`, which is a JSON object with these properties:

| Property | Required | Description                                                                          |
|----------|----------|--------------------------------------------------------------------------------------|
| `levels` | yes      | The file names of the map files, in the order of play.                               |
| `title`  | no       | The name of the campaign in the main menu. The default is the folder name.           |
| `sort`   | no       | The position in the main menu, low numbers first. The default is 0.                  |
| `parent` | no       | The folder name of a different campaign. The main menu shows this campaign below it. |
| `format` | no       | The version of the campaign format, currently always 1.                              |
| `name`   | no       | The folder name of the campaign.                                                     |

```json
{
	"format": 1,
	"name": "mycampaign",
	"title": "My Campaign",
	"sort": 6,
	"levels": ["level01.json", "level02.json", "level03.json"]
}
```

The player must finish the levels in order, and each finished level unlocks the next one.

The game loads only the campaign folders in the list `CAMPAIGN_FOLDERS` in `js/stage/constants.js`. The game stores
the progress, the best times and the replays of the players by campaign folder and level number. A new folder name or
a new order of the levels does not match the stored progress, best times and replays.
