
var mathLib = {}
var seedrandom = require('seedrandom')
var erf = require('math-erf')
var rng = seedrandom('43553')

/** Distribution function for the normal distribution with mean equal to mean and standard deviation equal to sd
  *  x : vector of quantiles.
  *  lower_tail :logical, if TRUE (default), probabilities are P[X ≤ x] otherwise, P[X > x].
  *  give_log : logical, if TRUE, probabilities p are given as log(p).
  */
mathLib.pnorm = function (x, mu = 0, sd = 1, lower_tail = true, give_log = false) {
  if (sd < 0) {
    return NaN
  }
  let ans = 1 / 2 * (1 + erf((x - mu) / sd / Math.sqrt(2)))
  if (!lower_tail) {
    ans = 1 - ans
  }
  if (give_log) {
    ans = Math.log(ans)
  }
  return ans
}

// random generation for the normal distribution
mathLib.rnorm = function (mu = 0, sd = 1) {
  var val = Math.sqrt(-2 * Math.log(rng())) * Math.cos(2 * Math.PI * rng())
  return val * sd + mu
}

/** Density function for the Poisson distribution with parameter lambda.
  *  x : vector of (non-negative integer) quantiles.
  *  lambda : vector of (non-negative) means.
  */
mathLib.dpois = function (x, lambda) {
  let ans, total = 0
  if (isNaN(x) || isNaN(lambda) || lambda < 0) {
    return NaN
  }
  if (!Number.isInteger(x)) {
    return 0
  }
  if (x < 0 || !isFinite(x)) {
    return 0
  }
  x = Math.round(x)
  ans = -lambda + x * Math.log(lambda)
  for (let i = 1; i <= x; i++) {
    total += Math.log(i)
  }
  let logAns = ans - total
  return Math.exp(logAns)
}
/** Vector calculus
  * sum: adding; sp: scalar product; abs : Euclidean norm.
  */
sum = function (array) {
  var sum = []
  for(i = 0; i < array[0].length; i++){
    var s= 0
    for (j = 0; j < array.length; j++) {
       s += array[j][i]
    }
    sum.push(s)
  }
  return sum
}

sp = function (scalar, array) {
  var sum = []
  for(i = 0; i < array.length; i++){
   sum.push(scalar * array[i]);
  }
  return sum
}
abs = function (array) {
  var sum = 0
  for(i = 0; i < array.length; i++){
   sum += Math.pow(Math.abs(array[i]), 2)
  }
  return Math.sqrt(sum)
}
mathLib.sortAscendingByKey = function(array, key) {
  return array.sort(function(a, b) {
    if (Number(a[key]) === Number(b[key])) {
      return 0;
    } else {
      return (Number(a[key]) < Number(b[key])) ? -1 : 1;
    }
  });
}

mathLib.sortFunction = function(a, b) {
  if (Number(a[a.length - 1]) === Number(b[a.length - 1])) {
    return 0
  }
  else {
    return (Number(a[a.length - 1]) < Number(b[a.length - 1])) ? 1 : -1;
  }
}

/** Methods for integrate.
  * method : Includes euler, rk4, rkf45.
  * func : ODE function.
  * N : Initial point
  * t: time
  * h: time step
  * Note: variables "params, pop, birthrate" are added to have consistancy with my specific integrate function.
 */
mathLib.odeMethod = function (method, func, N, t, h, params, pop, birthrate) {
  let tempArray
  let k1, k2, k3, k4, k5, k6, y, z, s
  let a, b, b2, c, d, out

  switch (method) {
  case 'euler':
    tempArray = func(t, N, params, pop, birthrate)
    return sum ([N,sp(h,tempArray)])

  case 'rk4':
    c = [0, 1/3, 2/3, 1]
    a21 = 1/3 ,a31 = -1/3 ,a32 = 1, a41 = 1 ,a42 = -1 , a43 = 1
    b = [0, 1/8, 3/8, 3/8, 1/8]
    k1 = func(t          , N, params, pop, birthrate)
    k2 = func(t + c[2] * h , sum([N , sp(h * a21 , k1)]), params, pop, birthrate)
    k3 = func(t + c[3] * h , sum([N , sp(h * a31 , k1), sp(h * a32, k2)]), params, pop, birthrate)
    k4 = func(t + c[4] * h , sum([N , sp(h * a41, k1),  sp(h *a42, k2), sp(h *a43, k3)]), params, pop, birthrate)
    return sum ([N, sp (h *  b[1] , sum ([k2 , k3])) ,sp(h * b[2] ,sum ([k1 , k2]))])

  case 'rkf45':
    c = [0,0, 1/4, 3/8, 12/13, 1, 1/2]
    a = [[0, 0, 0, 0, 0],
             [0,0, 0, 0, 0, 0],
             [0,1/4, 0, 0, 0, 0],
             [0,3/32, 9/32, 0, 0, 0],
             [0,1932/2197, -7200/2197, 7296/2197, 0, 0],
             [0,439/216, -8, 3680/513, -845/4104, 0],
             [0,-8/27, 2, -3544/2565, 1859/4104, -11/40]]
    b = [0,25/216, 0, 1408/2565, 2197/4104, -1/5, 0]
    b2 = [0,16/135,   0,  6656/12825,   28561/56430,  -9/50,  2/55]
    k1 = func(t          , N, params, pop, birthrate)
    k2 = func(t + c[2] * h , sum([N , sp(h * a[2][1] , k1)]), params, pop, birthrate)
    k3 = func(t + c[3] * h , sum([N , sp(h * a[3][1] , k1), sp(h * a[3][2], k2)]), params, pop, birthrate)
    k4 = func(t + c[4] * h , sum([N , sp(h * a[4][1], k1),  sp(h *a[4][2], k2), sp(h *a[4][3], k3)]), params, pop, birthrate)
    k5 = func(t + c[5] * h , sum([N , sp(h * a[5][1], k1), sp(h *a[5][2], k2), sp(h *a[5][3], k3), sp(h *a[5][4], k4)]), params, pop, birthrate)
    k6 = func(t + c[6] * h , sum([N , sp(h * a[6][1], k1), sp(h *a[6][2], k2), sp(h *a[6][3], k3), sp(h *a[6][4], k4), sp(h *a[6][5], k5)]), params, pop, birthrate)
    y = sum ([N, sp (h *  b[1], k1), sp (h * b[2], k2) ,sp(h * b[3], k3), sp (h *  b[4], k4), sp (h * b[5], k5) ,sp(h * b[6], k6)])
    z = sum ([N, sp (h *  b2[1], k1), sp (h * b2[2], k2) ,sp(h * b2[3], k3), sp (h *  b2[4], k4), sp (h * b2[5], k5) ,sp(h * b2[6], k6)])
    return z
  }
}

//* ODE solver
mathLib.TrajIntegrate = function (params, populationData, birthrateData, dataCases, times, deltaT) {
  var steps = 200 // Total number of steps in the each interval.
  var t0 = times[0]
  var dataStartTime = times[1]
  var dataEndTime = times[2]
  var rho = params[5]
  var psi = params[6]
  var arr = []
  var pop 
  var birthrate
  var timetemp
  var Npre
  let interpolPopulation = mathLib.interpolator(populationData)
  let interpolBirth = mathLib.interpolator(birthrateData)
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

mathLib.interpolator = function interpolator(points) {
  var first, n = points.length - 1,
    interpolated,
    leftExtrapolated,
    rightExtrapolated;
  if (points.length === 0) {
    return function () {
      return 0
    }
  }
  if (points.length === 1) {
    return function () {
      return points[0][1]
    }
  }
  points = points.sort(function (a, b) {
    return a[0] - b[0]
  })
  first = points[0]

  leftExtrapolated = function (x) {
    var a = points[0], b = points[1];
    return a[1] + (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0])
  }
  interpolated = function (x, a, b) {
    return a[1] + (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0])
  }
  rightExtrapolated = function (x) {
    var a = points[n - 1], b = points[n];
    return b[1] + (x - b[0]) * (b[1] - a[1]) / (b[0] - a[0])
  }
  return function (x) {
    var i
    if (x <= first[0]) {
      return leftExtrapolated(x)
    }
    for (i = 0; i < n; i += 1) {
      if (x > points[i][0] && x <= points[i + 1][0]) {
        return interpolated(x, points[i], points[i + 1])
      }
    }
    return rightExtrapolated(x);
  }
}

module.exports = mathLib
