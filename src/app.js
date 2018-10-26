//localforage
import "../lib/localforage.1.7.1.min.js"
//bootstrap needs
import "../lib/jquery-3.2.1.slim.min.js"
import "../lib/bootstrap.v4.0.0-beta.2.min.js"
//chance
import "../lib/chance.min.js"

import {
  chanceMixins
} from "./chanceMixins.js"
import {
  mapFactory
} from "./mapFactory.js"
import {
  UI
} from "./UI.js"

//configure localforage 
let LFDB = localforage.createInstance({
  name: "vsEngine"
})

let app = {
  DB: LFDB,
  chance: new Chance(Math.random() * Date.now()),
  selectedUnit: null,
  teams: [],
  units: [],
}
app.mapFactory = mapFactory(app)
UI(app)
chanceMixins(app.chance)

let scene = null
let highlightTx = null
let BGUI = null
let map = null
let cells = {}

window.addEventListener('DOMContentLoaded', function() {
  // All the following code is entered here.
  var canvas = document.getElementById('renderCanvas');
  var engine = new BABYLON.Engine(canvas, true);

  var createScene = function() {
    // Create a basic BJS Scene object.
    scene = new BABYLON.Scene(engine);

    // Parameters: alpha, beta, radius, target position, scene
    var camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 10, new BABYLON.Vector3(0, 0, 0), scene);

    // Positions the camera overwriting alpha, beta, radius
    camera.setPosition(new BABYLON.Vector3(50, 50, 200));

    // Attach the camera to the canvas.
    camera.attachControl(canvas, true);

    // Create a basic light, aiming 0,1,0 - meaning, to the sky.
    var light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);

    //Babylon GUI
    BGUI = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI")
    // in the foreground
    BGUI.isForeground = true
    //apply observable
    applySceneObservable()
  }

  app.drawMap = (w,h,type,seed) => {
    w = w || 48
    h = h || 48
    type = type || "createFlatPlane"
    //create the scene
    if(scene) {
      scene.dispose()
      scene = null
    }
    //now create
    createScene()
    
    app.map = map = app.mapFactory[type](w,h,seed)
    app.UI.header.map = app.map.saveData
    //create plane to display map
    let basePlane = BABYLON.MeshBuilder.CreateGround("base-plane", {
      width: 5 * w,
      height: 5 * h
    }, scene)
    basePlane.metadata = {
      type: "plane"
    }
    let highlightPlane = BABYLON.MeshBuilder.CreateGround("highlight-plane", {
      width: 5 * w,
      height: 5 * h
    }, scene)
    highlightPlane.metadata = {
      type: "plane"
    }

    //dynamic texture
    let dynamicTextureBase = new BABYLON.DynamicTexture("cell-texture", {
      width: 5 * w,
      height: 5 * h
    }, scene)
    let ctx = dynamicTextureBase.getContext()
    highlightTx = new BABYLON.DynamicTexture("highlight-texture", {
      width: 5 * w,
      height: 5 * h
    }, scene)

    let cellMaterial = new BABYLON.StandardMaterial("cell-material", scene)
    cellMaterial.diffuseTexture = dynamicTextureBase
    cellMaterial.diffuseTexture.hasAlpha = true
    //apply to plane
    basePlane.material = cellMaterial
    //highlight material
    let highlightMaterial = new BABYLON.StandardMaterial("highlight-material", scene)
    highlightMaterial.diffuseTexture = highlightTx
    highlightMaterial.diffuseTexture.hasAlpha = true
    //apply to plane
    highlightPlane.material = highlightMaterial

    //now write map to canvas
    //loop through map
    let x = null
    let y = null

    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        x = i * 5
        y = j * 5

        if (map._map[i][j] === 1) {
          ctx.beginPath()
          //ctx.globalAlpha = 0.5
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(x, y, 5, 5)
          //ctx.fillStyle = "#F5F5F5"
          //ctx.fillRect(x+0.3, y+0.3, 4.3, 4.3)
          //ctx.globalAlpha = 1
          ctx.strokeStyle = "#000000"
          ctx.lineWidth = 0.1
          ctx.rect(x + .1, y + .1, 4.8, 4.8)
          ctx.stroke()
        } else {
          ctx.globalAlpha = 0;
          ctx.fillRect(x, y, 5, 5)
          ctx.globalAlpha = 1.0
        }
      }
    }
    dynamicTextureBase.update()

    //highlight texture
    ctx = highlightTx.getContext()
    highlightTx.update()
    
    //show map data
    app.UI.header.showMapInfo = true
  }

  app.addUnitToScene = (unit) => {
    if (unit.inScene) return
    unit.inScene = true

    unit.mesh = BABYLON.MeshBuilder.CreateSphere(unit.name, {
      segments: 16,
      diameter: 3,
    }, scene)

    // Move the sphere upward 1/2 of its height.
    unit.mesh.position.y = 1;

    //now add label
    unit.rect = new BABYLON.GUI.Rectangle()
    unit.rect.width = "100px";
    unit.rect.height = "30px";
    unit.rect.cornerRadius = 1;
    unit.rect.color = "Black";
    unit.rect.thickness = 1;
    unit.rect.background = "lightgray";
    unit.rect.isPointerBlocker = true
    unit.rect.skipNextObservers = true
    BGUI.addControl(unit.rect)
    //link with mesh
    unit.rect.linkWithMesh(unit.mesh);
    unit.rect.linkOffsetY = -30;
    
    //grid for inner controls
    var grid = new BABYLON.GUI.Grid();
    grid.addRowDefinition(0.8)
    grid.addColumnDefinition(0.2)
    grid.addColumnDefinition(0.8)
    //add to rect
    unit.rect.addControl(grid)

    // This rect will be on first row and first column
    let tr = new BABYLON.GUI.Rectangle()
    tr.width = "15px"
    tr.height = "15px"
    tr.paddingLeft = "2px"
    tr.color = "black"
    tr.thickness = 1
    tr.background = unit.color
    grid.addControl(tr, 0, 0)
    //this will be the text label
    unit.label = new BABYLON.GUI.TextBlock();
    unit.label.text = unit.name;
    unit.label.isPointerBlocker = true
    grid.addControl(unit.label, 0, 1)
    
    //now add hp bar
    let bar = new BABYLON.GUI.Rectangle()
    bar.width = "100px"
    bar.height = "5px"
    bar.background = "black"
    bar.thickness = 0
    bar.horizontalAlignment = "left"
    bar.top = "14px"
    //add to grid
    unit.rect.addControl(bar)
    //hp green bar
    unit.hpb = new BABYLON.GUI.Rectangle()
    unit.hpb.width = "100px"
    unit.hpb.height = "5px"
    unit.hpb.background = "green"
    unit.hpb.horizontalAlignment = "left"
    unit.hpb.thickness = 0
    bar.addControl(unit.hpb)
    
    //add click
    unit.rect.isPointerBlocker = true
    unit.rect.onPointerClickObservable.add(function(coord) {
      console.log(unit)

      app.UI.unitPopup.unit = unit
      app.UI.unitPopup.p = [coord.x, coord.y-30]
    })

    unit.mesh.metadata = unit
  }

  engine.runRenderLoop(function() {
    scene.render();
  });

  // the canvas/window resize event handler
  window.addEventListener('resize', function() {
    engine.resize();
  });

  //highlight cells
  app.highlightCells = (x, y, r) => {
    //clear the highlight plane
    let ctx = highlightTx.getContext()
    ctx.clearRect(0, 0, map._width * 5, map._height * 5)

    let redBase = (x, y) => {
      if (map._map[x][y] === 1) {
        ctx.beginPath()
        ctx.globalAlpha = 0.5
        ctx.fillStyle = "#FF0000"
        ctx.fillRect(x * 5, y * 5, 5, 5)
        ctx.globalAlpha = 1
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = "0.2"
        ctx.rect(x * 5, y * 5, 5, 5)
        ctx.stroke()
      }
    }

    let highlight = (x, y, r) => {
      map.fov.compute(x, y, r, function(cx, cy, vr, visibility) {
        if (map._map[cx][cy] === 1) {
          ctx.beginPath()
          ctx.globalAlpha = 0.5
          ctx.fillStyle = "#228B22"
          ctx.fillRect(cx * 5, cy * 5, 5, 5)
          ctx.globalAlpha = 1
          ctx.strokeStyle = "#000000"
          ctx.lineWidth = "0.1"
          ctx.rect(cx * 5, cy * 5, 5, 5)
          ctx.stroke()
        }
      })
    }

    if (r > 0) highlight(x, y, r)

    redBase(x, y)
    highlightTx.update()
  }

  //When click event is raised
  let pickedCell = null
  let highlightedCell = []
  
  let applySceneObservable = () => {
    scene.onPointerObservable.add(sceneObservable)
  }

  let sceneObservable = (pointerInfo) => {
    let T = [BABYLON.PointerEventTypes.POINTERPICK,BABYLON.PointerEventTypes.POINTERTAP]
    if (T.includes(pointerInfo.type)) {
      // We try to pick an object
      let pickResult = scene.pick(scene.pointerX, scene.pointerY)
      // if the click hits the wall object, we change the impact picture position

      if (pickResult.hit) {
        //clear the highlight plane
        let ctx = highlightTx.getContext()
        ctx.clearRect(0, 0, map._width * 5, map._height * 5)
        //get the positions
        let x = Math.floor((map._width * 5 / 2 + pickResult.pickedPoint.x) / 5)
        let y = Math.floor((map._height * 5 / 2 - pickResult.pickedPoint.z) / 5)
        console.log(x, y, map._map[x][y])
        //data from what is hit
        let data = pickResult.pickedMesh.metadata

        if (data && data.type === "plane") {
          //check if there is a unit to add
          if (app.UI.header.uAdd && map._map[x][y] === 1) {
            let unit = app.UI.header.uAdd
            //adds unit
            app.addUnitToScene(unit)
            //moves to position
            unit.moveTo(map, x, y)

            app.UI.header.uAdd = null
            //recompute
            app.UI.header.unitsToAdd = app.teams.reduce((all,t) =>{
              return all.concat(t.units.filter(u=>!u.inScene))
            },[])
          }
          //move unit if selected
          if (app.selectedUnit && app.selectedUnit.action === 0 && map._map[x][y] === 1) {
            //moves to position
            app.selectedUnit.moveTo(map, x, y)
            app.selectedUnit = null
          }

          app.highlightCells(x, y, 0)
        } else if (data && data.type === "unit") {
          console.log(data)

          //selected unit is attacking
          if (app.selectedUnit) {
            if (app.selectedUnit._id === data._id) {} else {
              //attack
              if (app.selectedUnit.action > 0) {
                app.selectedUnit.makeAttack(data)
                app.selectedUnit.action = 0
                app.selectedUnit = null
              }
            }
          }
          //select new unit
          else {
            app.selectedUnit = data
          }

          //get r for highlight
          let i = data.action
          let r = i === 0 ? Math.floor(data._move / 5) : data.attacks[i - 1].rng ? Math.floor(data.attacks[i - 1].rng / 5) : 1
          app.highlightCells(x, y, r)
        }
      }
    }
  }
  
  //do the work
  app.drawMap()
})