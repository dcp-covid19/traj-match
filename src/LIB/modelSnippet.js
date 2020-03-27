
snippet = {}
let mathLib = require('./mathLib');
let Index = require('./indices'); 

snippet.skeleton = function (t, N, params, pop, birthrate) {
  let seas, dy = []
  let R0 = params[Index.R0], amplitude = params[Index.amplitude], gamma = params[Index.gamma], mu = params[Index.mu], sigma = params[Index.sigma] 
  let beta0 = R0 * (gamma + mu) * (sigma + mu) / sigma
  let S = N[0], E = N[1], I = N[2], R = N[3]
  let va
  if (t < 1968)
    va = 0
  else if (t >= 1968 && t <= 1969)
    va = 0.33
  else if (t >= 1969 && t <= 1970)
    va = 0.46
  else if (t >= 1970 && t <= 1971)
    va = 0.51
  else if (t >= 1971 && t <= 1972)
    va = 0.53
  else if (t >= 1972 && t <= 1973)
    va = 0.52
  else if (t >= 1973 && t <= 1974)
    va = 0.46
  else if (t >= 1974 && t <= 1975)
    va = 0.46
  else if (t >= 1975 && t <= 1976)
    va = 0.48
  else if (t >= 1976 && t <= 1977)
    va = 0.48
  else if (t >= 1977 && t <= 1978)
    va = 0.51
  else if (t >= 1978 && t <= 1979)
    va = 0.53;
  else if (t >= 1979 && t <= 1980)
    va = 0.55;
  else if (t >= 1980 && t <= 1981)
    va = 0.58;
  else if (t >= 1981 && t <= 1982)
    va = 0.60
  else if (t >= 1982 && t <= 1983)
    va = 0.63
  else if (t >= 1983 && t <= 1984)
    va = 0.68
  else if (t >= 1984 && t <= 1985)
    va = 0.71
  else if (t >= 1985 && t <= 1988)
    va = 0.76
  else if (t >= 1988 && t <= 1989)
    va = 0.814
  else if (t >= 1989 && t <= 1990)
    va = 0.9488
  else if (t >= 1990 && t <= 1991)
    va = 0.9818
  else if (t >= 1991 && t <= 1992)
    va = 0.90
  else if (t >= 1992 && t <= 1993)
    va = 0.92
  else if (t >= 1993 && t <= 1994)
    va = 0.91
  else if (t >= 1994 && t <= 1995)
    va = 0.91
  else if (t >= 1995 && t <= 1996)
    va = 0.92
  else if (t >= 1996 && t <= 1997)
    va = 0.92
  else if (t >= 1997 && t <= 1998)
    va = 0.91
  else if (t >= 1998 && t <= 1999)
    va = 0.88
  else if (t >= 1999 && t <= 2000)
    va = 0.88
  else if (t >= 2000 && t <= 2001)
    va = 0.87
  else if (t >= 2001 && t <= 2002)
    va = 0.84
  else if (t >= 2002 && t <= 2003)
    va = 0.82
  else if (t >= 2003 && t <= 2004)
    va = 0.80
  else if (t >= 2004 && t <= 2005)
    va = 0.81
  else if (t >= 2005 && t <= 2006)
    va = 0.84
  else if (t >= 2006 && t <= 2007)
    va = 0.85
  else if (t >= 2007 && t <= 2008)
    va = 0.85
  else if (t >= 2008 && t <= 2009)
    va = 0.85
  else if (t >= 2009 && t <= 2010)
    va = 0.88
  else
    va = 0.89
  var tt = (t - Math.floor(t)) * 365.25
  if ((tt >= 7 && tt <= 100) || (tt >= 115 && tt <= 199) || (tt >= 252 && tt <= 300) || (tt >= 308 && tt <= 356)) {
    seas = 1 + amplitude * 0.2411 / 0.7589
  } else {
    seas = 1 - amplitude
  }
  var Beta = beta0 * seas / pop
  dy[0] = birthrate * (1 - va) - Beta * S * I - mu * S
  dy[1] = Beta * S * I - (sigma + mu) * E
  dy[2] = sigma * E - (gamma + mu) * I
  dy[3] = gamma * I - mu * R + birthrate * va
  dy[4] = gamma * I
  return dy
}

snippet.initz = function(pop, S, E, I, R) {
  var m = pop / (S + E + R + I),
    S = Math.round(m * S),
    E = Math.round(m * E),
    I = Math.round(m * I),
    R = Math.round(m * R),
    H = 0
  return [S, E, I, R, H]
}

snippet.dmeasure = function (rho, psi, H, dCases, giveLog) {
  var lik
  var mn = rho * H
  var v = mn * (1.0 - rho + psi * psi * mn)
  var tol = 1.0e-18
  var modelCases = Number(dCases)
  if(!isNaN(modelCases)){
    if (modelCases > 0.0) {
      lik = mathLib.pnorm(modelCases + 0.5, mn, Math.sqrt(v) + tol, 1, 0) - mathLib.pnorm(modelCases - 0.5, mn, Math.sqrt(v) + tol, 1, 0) + tol
    } else {
      lik = mathLib.pnorm((modelCases + 0.5, mn, Math.sqrt(v) + tol)) + tol
    }
  } else {
    lik = 1
  }
  if (giveLog) {
    lik = Math.log(lik)
  }
  return lik
}

snippet.rmeasure = function (H, rho, psi) {
  var mn = rho * H
  var v = mn * (1.0 - rho + psi * psi * mn)
  var tol = 1.0e-18
  var cases = mathLib.rnorm(mn, Math.sqrt(v) + tol)
  if (cases > 0) {
    cases = Math.round(cases)
  } else {
    cases = 0
  }
  return cases
}


module.exports = snippet