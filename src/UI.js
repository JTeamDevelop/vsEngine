import {unitFactory} from "./unitFactory.js"
import {COLORS} from "./colors.js"

let UI = (app) => {
  let Unit = unitFactory(app).Unit
  
  app.UI = {}
  
  /* Notify Using Noty
  
  */
  
  app.notify = (opts) => {
    opts.type = opts.type || "warning"
    opts.layout = opts.layout || "center"
    opts.h = opts.h ? `<h2 class="markerFont" align="center">` + opts.h + `</h2>` : ""
    opts.text = opts.text ? `<p align="center">` + opts.text + `</p>` : ""
    
    //let roll = 
    let roll = ""
    if(opts.roll) {
      roll = opts.roll.map(v => {
        let r = ["media/icons/minus.svg", "media/icons/blank.svg", "media/icons/plus.svg"][v + 1]
        return `<img src="`+r+`" height="30" width="30">`      
      }) 
      roll = `<div align="center">`+roll+"</div>"
    }
    
    //notify
    new Noty({
      theme: "relax",
      type: opts.type,
      layout: opts.layout,
      text: opts.h + opts.text + roll,
    }).show();
  }
  
  /* Header
  
  */
  
   //creates the VUE js instance
  let unitPopup = new Vue({
    el: '#unitPopup',
    data: {
      p : [-1,-1],
      unit : null
    },
    mounted () {
      app.UI.unitPopup = this
    },
    computed : {
      ranges () {
        let R = ["Range - Move"].concat(this.unit.attacks.map(atk=> "Range - "+atk.name))
        return this.unit.inScene ? R : []
      },
      attacks () {        
        let u = this.unit
        let atks = this.unit.attacks
        let opts = u.availableAttacks.map(atk => atks[atk.i].name + " vs " + atk.unit.name)
        
        return u.inScene ? opts : []
      }
    },
    methods : {
      highlight(i) {
        let U = this.unit
        let r = i === 0 ? Math.floor(U._move/5) : U.attacks[i - 1].rng ? Math.floor(U.attacks[i - 1].rng/5) : 1
        app.highlightCells(...U.p, r)
      },
      makeAttack (i) {
        let U = this.unit
        let aa = U.availableAttacks[i]
        U.makeAttack(aa.i,aa.unit)
      }
    }
  })
  
  /* Header
  
  */
  
   //creates the VUE js instance
  let header = new Vue({
    el: '#header',
    data: {
      unitsToAdd : [],
      uAdd : null,
      showMapTools : false,
      showMapInfo : false,
      mapTypeNames : ["Flat Plane","Caves","Dungeon"],
      mapData : [48,48,0],
      savedMaps : [],
      mapToLoad : -1,
      loadedMap : -1,
      seed : 0,
      map : null,
    },
    mounted () {
      app.UI.header = this
      this.seed = Date.now()
    },
    methods : {
      showEditor() {
        app.UI.unitEditor.show = !app.UI.unitEditor.show
      },
      addUnitToScene (unit) {
        this.uAdd = unit
      },
      createMap () {
        let mt = ["createFlatPlane","createCellular","createDungeon"][this.mapData[2]]                    
        let wh = this.mapData.slice(0,2)
        
        app.drawMap(...wh,mt,this.seed)
        //no units in teams
        app.teams.forEach(t => t.units = [])
        //no show
        this.showMapTools = false
        this.showMapInfo = true
        //no loaded map
        this.loadedMap = -1
      },
      saveMap () {
        //check if map has index
        if(this.loadedMap>-1){
          let i = this.loadedMap
          this.savedMaps[i] = Object.assign({},this.map)
        }
        else {
          this.savedMaps.push(this.map)
        }
        //save
        app.DB.setItem("maps",this.savedMaps.slice())
        //set loaded map
        this.loadedMap = this.savedMaps.length-1
      },
      //create the map based upon saved info
      loadMap (){
        let i = this.mapToLoad
        let mt = {
          "flatPlane" : "createFlatPlane",
          "cellular" : "createCellular",
          "dungeon" : "createDungeon"
        }
        let map = this.savedMaps[i]
        //check for errors
        map.w = map.w || 48
        map.h = map.h || 48
        
        app.drawMap(map.w,map.h,mt[map.type],map.seed)
        //set info from save
        this.map.i = i
        this.map.name = map.name
        //no units in teams
        app.teams.forEach(t => t.units = [])
        //no show
        this.showMapTools = false
        this.showMapInfo = true
        this.loadedMap = i
      },
      deleteMap () {
        if(this.loadedMap > -1) {
          this.savedMaps.splice(this.loadedMap,1)
          //save
          app.DB.setItem("maps",this.savedMaps.slice())
          this.loadedMap = -1
        }
        
        //create empty map
        app.drawMap()
      }
    }
  })
  
  /* Unit Editor and Sub Components
  
  */
  
  
  
  Vue.component('ui-teams', {
    template:"#ui-teams",
    data : function() {
      return {
        teams : [],
        tu : [],
        qU : [-1,0]
      }
    },
    mounted () {
      app.UI.teams = this
      
      app.UI.teams.teams = app.teams.slice()
    },
    computed : {
      colors () { return COLORS },
      units () { return app.UI.unitEditor.units },
      qUnit () { 
        let qU = this.qU
        return qU.length>0 ? this.teams[qU[0]].units[qU[1]] : null
      }
    },
    methods : {
      removeUnit (i,j) {
        let U = this.teams[i].units[j]
        if(U.inScene){
          U.dispose()
        }
        this.teams[i].units.splice(j,1)
      },
      newTeam() {
        this.teams.push({
          _id : app.chance.hash(),
          name : "",
          color : "#000000",
          units : []
        })
      },
      addUnit(ti) {
        let u = this.tu[ti]
        let ui = this.teams[ti].units.length
        
        this.teams[ti].units.push(new Unit(u))
        this.teams[ti].units[ui].team = ti
      },
      save () {
        app.teams = this.teams.slice()
        app.UI.header.unitsToAdd = this.teams.reduce((all,t) =>{
          return all.concat(t.units.filter(u=>!u.inScene))
        },[])
        
        let data = this.teams.map(t => {
          let nu = Object.assign({},t)
          delete nu.units
          return nu
        })
        
        app.DB.setItem("teams",data)
      }
    }
  })
  
  let unitEditor = new Vue({
    el: '#unitEditor',
    data: {
      show: false,
      subUI : "teams",
      showAtkInfo : false,
      units : [],
      uid : -1
    },
    mounted() {
      app.UI.unitEditor = this
    },
    computed : {
      unit () {
        return this.units[this.uid]
      }
    },
    methods : {
      push(u) {
        //push to units
        this.units.push(u)
        this.units = this.units.sort((a,b) => {
          return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
        })
      },
      addUnit () {
        let nu = {
          name: "New",
          avatar: "sphere",
          move: 30,
          hp : 6,
          AC : 13,
          attacks : [
            {
              name : "Strike",
              rng: 5,
              b: "1",
              dmg: "1d3"
            }
          ]
        }
        
        //push
        this.push(nu)
      },
      clone(u) {
        let nu = Object.assign({},u)
        nu.name += " New"
        //delete core
        if(nu.hasOwnProperty("core")) delete nu.core
        //push
        this.push(nu)
      },
      save () {
        let data = this.units.filter(u => !u.hasOwnProperty("core"))
        app.DB.setItem("units",data)
      }  
    }
  })
  

}

export {
  UI
}