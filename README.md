# UR7e replay of test3

Interactive results page for ten spoon-into-test-tube demonstrations recorded with a low-cost, hand-guided data-collection arm (V7) and replayed open-loop on a Universal Robots UR7e.

**View it:** https://earphonekiller-hub.github.io/ur7e-replay-test3/

For each trial the page shows:

- a 3D simulation of the original demonstration (V7 arm) and the mapped UR7e motion, drawn with three.js;
- three synchronised camera views of the UR7e replay: side view, wrist camera and tube close-up;
- the spoon-tip depth below the tube mouth, and the UR's measured spoon-tip path against the command;
- a summary table of all ten trials and notes on the method.

## Files

| Path | Content |
|---|---|
| `index.html` | the page |
| `app.js` | page logic (3D view, playback, charts, tables) |
| `data/scene.js` | robot meshes and scene geometry for the 3D view |
| `data/trials.js` | per-trial trajectories, timing and statistics |
| `clips/` | the three camera views of each trial, H.264 MP4 |

The page is static. Open `index.html` through any web server (GitHub Pages here); the 3D view loads three.js from cdn.jsdelivr.net, while the videos and charts work without it.
