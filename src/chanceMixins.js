let chanceMixins = (chance) => {
  chance.mixin({
    'dF': function(sum) {
      let roll = chance.rpg("4d3").map(r => r - 2)
      return sum ? roll.reduce((t, v) => t + v, 0) : roll
    },
    'd3': function() {
      return chance.integer({
        min: 1,
        max: 3
      })
    },
    'rpgString': function(str) {
      let all = str.split(",")

      return all.reduce((sum, d) => {
        let nstr = d.split("+")
        //check for bonus
        let b = nstr.length === 2 ? Number(nstr[1]) : 0

        return sum + chance.rpgSum(nstr[0]) + b
      }, 0)
    },
    'rpgSum': function(n) {
      return chance.rpg(n, {
        sum: true
      })
    },
    'stressRoll': function(n) {
      let max = 0
      if (n > 0) {
        let roll = chance.rpg(n + 'd6')
        //sort greatest to least then reduce
        max = roll.sort((a, b) => b - a).reduce((max, r) => {
          if (r > max)
            max = r
          else if (r == max)
            max++
            return max
        }, 0)
      } else {
        //not max but lesser of two rolls
        let a = chance.d6()
        let b = chance.d6()
        max = a > b ? b : a
      }

      return max
    },
    'bladesRoll': function(n) {
      let crit = false
      let six = 0
      let pass = 0

      const check = (n) => {
        if (n == 6)
          six++
          else if (n > 3)
            pass++
      }

      for (let i = 0; i < n; i++) {
        check(chance.d6())
      }

      //if n = 0
      if (n === 0) {
        let a = chance.d6()
        let b = chance.d6()
        check(a > b ? b : a)
      }

      if (six > 1)
        crit = true
      return {
        crit,
        six,
        pass
      }
    }
  })
}

export {chanceMixins}