let teams = [{
  name: "GoodGuys",
  color: "#FFD700"
}]

/* Unit Template JSON
  {
    name : "",
    avatar : "",
    move : 30,    //move in ft
    HD : 1,
    hp : 4,
    AC : 10,  //ascending AC
    //array of attacks
    attacks : [
      {
        name : "",
        b : "",      //bonus in string format - separted by a "/" for multiple attacks
        rng : 0,    // range in ft
        area : 0,
        dmg : ""    //damage in string format - use dice (ndx+b) notation - separate multiple roles with "/"
      }
    ]  
  }

*/

let units = [{
    name: "Goblin",
    avatar: "sphere",
    move: 20,
    hp : 4,
    AC : 10,
    attacks : [
      {
        name : "Knife",
        b: "1",
        dmg: "1d6"
      }
    ]
  },
  {
    name: "Tiger",
    avatar: "sphere",
    move: 40,
    hp : 9,
    AC : 14,
    attacks : [
      {
        name : "Claws/Bite",
        b: "3/1",
        dmg: "1d4,1d4/1d8"
      }
    ]
  },
  {
    name: "Knight",
    avatar: "sphere",
    move: 30,
    hp : 6,
    AC : 13,
    attacks : [
      {
        name : "Sword",
        b: "1",
        dmg: "1d8"
      }
    ]
  },
]

let unitFactory = (app) => {
  let RNG = app.chance
  
  class Unit {
    constructor (u) {
      this._id = u.id || RNG.hash()
      this.type = "unit"
      this.inScene = false
      this.action = 0
      
      this._team = -1
      
      this._name = ""
      this._avatar = "sphere"
      this._move = 6
      this._AC = 10
      this._maxHP = 4
      
      this._attacks = [
        {
          name : "Strike",
          b: "1",
          dmg: "1d3"
        }
      ]
      
      this._saveData = {
        _name : "name",
        _avatar : "avatar",
        _move : "move",
        _maxHP : "hp",
        _AC : "AC",
        _attacks : "attacks"
      }
      
      for(let x in this._saveData){
        this[x] = u[this._saveData[x]] || this[x]
      }
      
      //set hp
      this._hp = this._maxHP
    }
    get name () { return this._name }
    set name (name) { this._name = name }
    set team (id) {
      this._team = id
    }
    get team () {
      return this._team > -1 ? app.teams[this._team].name : ""
    }
    get color () {
      return this._team > -1 ? app.teams[this._team].color : "#000000"
    }
    set AC (AC) { this._AC = AC }
    get AC () { return this._AC }
    set hp (hp) { this._hp = hp } 
    get hp () { return this._hp } 
    get attacks () { return this._attacks }
    //available attacks
    get availableAttacks () {
      if(!this.inScene) return []
      //check for attacks
      let O = this.opposition
      let P = this.positions
      let atks = this.attacks.reduce((all,atk,i)=>{
        let r = atk.rng ? Math.floor(atk.rng/5) : 1
        
        app.map.fov.compute(...this.p, r, function(cx, cy, vr, visibility) {
          let j = P.indexOf(cx+","+cy)
          if(j>-1) {
            all.push({
              i : i,
              unit : O[i]
            })
          }
        })
        
        return all
      },[])
      
      return atks
    }
    //remove from scene
    dispose() {
      this.mesh.dispose()
      this.rect.dispose()
    }
    //find opposition
    get opposition () {
      return app.teams.reduce((OT,t,i)=> {
        if(i !== this._team) OT = OT.concat(t.units)
        return OT
      },[])
    }
    //positions of opposition
    get positions () {
      return this.opposition.map(o => o.p ? o.p.join(",") : "-1,-1")
    }
    moveTo (map, x, y) {
      this.p = [x, y]
      this.mesh.position.x = (x * 5 + 2.5) - map._width * 5 / 2
      this.mesh.position.z = map._height * 5 / 2 - (y * 5 + 2.5)
    }
    makeAttack (i,target) {
      let h = this.name+" VS "+target.name
      let ATK = this.attacks[i]
      let R = ATK.b.split("/").map(b => RNG.d20() + Number(b)) 
      let dmg = ATK.dmg.split("/").map((d,i) => R[i] > target.AC ? RNG.rpgString(d) : 0)
      let dSum = dmg.reduce((sum,val)=>sum+val,0)
      //check AC
      if (dSum > 0) {
        let newhp = target._hp-dSum
        newhp = newhp < 0 ? 0 : newhp
        
        //check for 0 hp 
        if(newhp === 0) target.label.color = "red"
        
        let text = `<div align="center">` + ATK.name + " ["+R.join(", ")+"]: " + dSum + " damage</div>" 
        text += `<div align="center">` + target.name + " HP: " + target.hp + "-" +dSum + " = " +newhp+ "</div>" 
        
        //update hp
        target.hp = newhp
        //change bar
        target.hpb.width = Math.round(100*newhp/target._maxHP) + "px"
        
        app.notify({
          type : "success",
          h : h,
          text : text 
        })
      } else {
        //notify of failure
        app.notify({
          type : "error",
          h : h,
          text : ATK.name + " ["+R.join(", ")+"]"
        })
      }
    }
    get raw () {
      let data = {}
      
      for(let x in this._saveData){
        data[this._saveData[x]] = this[x]
      }
      
      return data
    }
  }
    
  app.DB.getItem('teams').then(function(data) {
    data = data || []
    data.map(t=> {
      t.units = []
      return t
    })
    
    app.teams = data.length > 0 ? data : teams.map(t => {
      t._id = RNG.hash()
      t.units = []
      return t
    })
  }).catch(function(err) {
      console.log(err);
  })
  
  app.DB.getItem('units').then(function(data) {
    data = data || []
    
    app.UI.unitEditor.units = units.map(u=>{
      u.core = true
      return u
    }).concat(data)
    app.UI.unitEditor.units.sort((a,b) => {
          return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
        })
    
  }).catch(function(err) {
      console.log(err);
  });
  
  return {
    Unit
  }
}



export {unitFactory}