
let  snippet = require('../LIB/modelSnippet.js')
let  mathLib = require('../LIB/mathLib.js')
let  Index = require('../LIB/indices')
let  fmin = require('fmin')

/** Main entry point to user interface
 */
TrajMatch = function (params, populationData, birthrateData, dataCases, times, index, deltaT) {
  console.log('b4')
  let t =new Date()
  TrajPopulation = mathLib.interpolator(populationData)
  TrajBirthrate = mathLib.interpolator(birthrateData)
  console.log(new Date - t)
  return TrajMain(params, TrajPopulation, TrajBirthrate, dataCases, times, index, deltaT)
}

/** Main entry point to user interface
 *  Note* previously traj_match
 */
TrajMain = function (params, interpolPopulation, interpolBirth, dataCases, times, index, deltaT) {
  let lastProgressUpdate = Date.now();
  let psudoProgress = 0;
  let tempIndex = 0,
      estimated = [],
      place = [],
      solution

  progress(0)
  
  //*Change the initial values of estimating parameters(with index one) to the log or logit scale.
  // From those Index.amplitude and rho are in logit scale and the rest are in log scale
  for (let i = 0; i < params.length; i++) {
    params[i] = Number(params[i])
    if (index[i] === Index.amplitude) {
      place.push(i);
      if ((i === Index.amplitude) || (i === index.rho)) {
        estimated.push(Math.log(params[i] / (1 - params[i]))) //logit scale
      } else {
        estimated.push(Math.log(params[i])) //log scale
      }
    }
  }
  
  
  //* Optimizer function using Nelder Mead method
  solution = fmin.nelderMead(logLik, estimated)
  for (let j = 0;j < params.length; j++) {
    if (index[j] === Index.amplitude) { // Using exp and expit to get back to the regular scale.
      if ((j === Index.amplitude) || (j === Index.rho)){
        params[j] = 1/ (1 + Math.exp(-solution.x[tempIndex]))
      } else {
        params[j] = Math.exp(solution.x[tempIndex])
      }
      tempIndex++
    }
  }

  progress(1)

  //* calculate log likelihood
  function logLik (estimated) {
    var likvalue = 0
    var loglik = 0
    var rho
    var psi
    for (let i = 0; i < estimated.length; i++) {
      if ((place[i] === Index.amplitude) || (place[i] === Index.rho)) { //Change to the exp scale and let optimizer to search all real numbers.
        params[place[i]] = 1 / (1 + Math.exp(-estimated[i]))
      } else {
        params[place[i]] = Math.exp(estimated[i])
      }
    }
    rho = params[5]
    psi = params[6]

    var simH = TrajIntegrate(params, interpolPopulation, interpolBirth, dataCases, times, deltaT)
    for (let i = 0; i < simH.length; i++) {
      likvalue = snippet.dmeasure(rho, psi, simH[i], dataCases[i][1], 1)
      loglik = loglik + likvalue
    }

    // Send progress updates every 5 seconds.
    if(Date.now() - lastProgressUpdate > 5000) {
      if(psudoProgress < 0.70) {
        psudoProgress += 0.01
      }

      lastProgressUpdate = Date.now()
      progress(0.20 + psudoProgress);
    }
    console.log(params, loglik)
    return [-(loglik).toFixed(6)]
  }
  console.log('returns??', params, solution.fx)
  return [...params, -solution.fx]
}

//* ODE solver
 TrajIntegrate = function (params, interpolPopulation, interpolBirth, dataCases, times, deltaT) {
  var steps = 200 // Total number of steps in the each interval.
  var t0 = times[0]
  var dataStartTime = times[1]
  var dataEndTime = times[2]
  var arr = []
  var pop 
  var birthrate
  var timetemp
  var Npre

  var N = snippet.initz(interpolPopulation(t0), params[7], params[8], params[9], params[10])
  var k = t0 , count
  var flag = 0
  dt = deltaT
  while ( flag === 0 ) {
    Npre = N
    for (let stp = 0; stp < steps; stp++) { 
      pop = interpolPopulation(k + stp / steps * dt)
      birthrate = interpolBirth(k + stp / steps * dt)
      N = mathLib.odeMethod('rkf45', snippet.skeleton, N, k + stp / steps * dt, 1 / steps * dt, params, pop, birthrate)
    }
    timetemp = k
    k += dt
    if (k > dataStartTime) {
      k = timetemp;
      dt = dataStartTime - timetemp ;
      N = Npre
    }
    if (k >= dataStartTime) {  
      k = timetemp + dt
      flag = 1
      arr.push(N[4])
    }
  }
  count = 0
  while (k < dataEndTime) {
    
    if (Number(dataCases[count + 1][0]) !== "undefined") {
      dt = Number(dataCases[count + 1][0]) - Number(dataCases[count][0])
    } else {
      dt = deltaT
    }
    N[4] = 0
    for (let stp = 0; stp < steps; stp++) { 
      pop = interpolPopulation(k + stp / steps * dt)
      birthrate = interpolBirth(k + stp / steps * dt)
      N = mathLib.odeMethod('rkf45', snippet.skeleton, N, k + stp / steps * dt, 1 / steps * dt, params, pop, birthrate)
      H = N[4]
    }
    k += dt
    count++
    arr.push(H)
  }
  return arr
}


module.exports = TrajMatch;
