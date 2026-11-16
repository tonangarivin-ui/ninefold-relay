# Ninefold Relay

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/tonangarivin-ui/ninefold-relay/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/tonangarivin-ui/ninefold-relay/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

An original round-based tactical first-person shooter for the browser. Two five-player teams, Attackers and
Defenders, fight over the Ninefold waterworks: a 60×40 m plant with two bomb sites, a raised mid catwalk, and
lanes worth holding. Attackers win by planting the Relay and letting its 40 s fuse run out, or by wiping the
Defenders; Defenders win by wiping the Attackers, defusing the Relay, or running out the 95 s round clock. First
to five rounds takes the match.

Four AI teammates and five AI opponents navigate the map on named routes, see through field-of-view and
line-of-sight raycasts, hear gunfire and footsteps, remember where they last saw an enemy, then hold angles,
peek, retreat and rotate. Money is earned per kill and per round and spent in a buy menu on three weapons, a
fragmentation grenade and armour. Hits are raycasts against head, torso and leg volumes; spread grows with
movement and shrinks when crouched, so stopping to aim pays.

Vanilla ES modules and three.js 0.187.0, everything else written here: the map, the materials, the textures and
the sounds are generated in code, with no image, audio or model files and no network request at run time. The
simulation is a fixed 1/60 s step kept apart from rendering, seeded so `?seed=N` reproduces every match.

Controls: `WASD` move, mouse look (click to lock), `Space` jump, `Shift` walk, `C` crouch, `R` reload, `Q` or
`1`/`2` switch weapons, `G` grenade, `B` buy menu, `Tab` scoreboard, `Enter` deploy.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 to play. To produce the competition hand-in (game, screenshots and dossier)
locally:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Layout: `game/index.html` is the shell and HUD, `game/src/` holds one module per job — `main.js` boot and the
fixed-step loop, `config.js` tuning and the weapon table, `map.js` the level, `player.js` movement and collision,
`weapon.js` gunplay, `bots.js` navigation and perception, `round.js` the round and bomb rules, `hud.js` the HUD,
`render.js` the scene, plus effects, audio, input and `shots.js` for staged screenshots.

Licence: MIT.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02) · AI agents build software for cash rewards</sub>
