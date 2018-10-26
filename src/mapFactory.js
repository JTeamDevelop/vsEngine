const mapFactory = (app) => {
  
  class Map {
    constructor (map) {
      Object.assign(this,map)
      
      this._name = ""
      this._notes = []
      
      // input callback
      var lightPasses = (x, y) => {
          //var key = x+","+y;
          if (this._map[x][y] === 1) { return true }
          return false
      }

      this.fov = new ROT.FOV.PreciseShadowcasting(lightPasses)
      
      this._saveData = {
        "_name" : "name",
        "_seed" : "seed",
        "_width" : "w",
        "_height" : "h",
        "_type" : "type",
        "_notes" : "notes"
      }
    }
    get name () { return this._name }
    set name (name) { this._name = name }
    get saveData () {
      let data = {}
      for(let x in this._saveData){
        data[this._saveData[x]] = this[x]
      }
      return data
    }
  }
  
  let createFlatPlane = (w,h) => {
    w = w || 48
    h = h || 48
    
    let map = {
      _type : "flatPlane",
      _seed : null,
      _width : w,
      _height : h,
      _map : Array.from({length: w}, (v, i) => {
        return Array.from({length: h}, (w, j) => 1)
      })
    }
    
    return new Map(map)
  }
  
  let createDungeon = (w, h, seed, opts) => {
    w = w || 80
    h = h || 40
    //check for seed
    seed = seed || Date.now()
    ROT.RNG.setSeed(seed)
    // create a connected map where the player can reach all non-wall sections 
    let map = new ROT.Map.Digger(w, h, {dugPercentage:0.4})
    let _map = Array.from({length: w}, (v, i) => [])
    
    map.create((x,y,val)=>{
      _map[x].push(1-val)
    })
    
    map._map = _map
    map._seed = seed
    map._type = "dungeon"

    return new Map(map)
  }
  
  let createCellular = (w, h, seed) => {
    w = w || 80
    h = h || 40
    //check for seed
    seed = seed || Date.now()
    ROT.RNG.setSeed(seed)
    // create a connected map where the player can reach all non-wall sections 
    let map = new ROT.Map.Cellular(w, h, {
      connected: true
    })

    // cells with 1/2 probability 
    map.randomize(0.5);

    // make a few generations 
    for (let i = 0; i < 4; i++) map.create();
    //now connect
    map.connect(null, 1)
    
    map._type = "cellular"
    map._seed = seed

    return new Map(map)
  }
  
  app.DB.getItem('maps').then(function(data) {
    app.UI.header.savedMaps = data || []
  }).catch(function(err) {
      console.log(err);
  })
  
  
  return {
    createFlatPlane,
    createCellular,
    createDungeon
  }
}

export {mapFactory}



