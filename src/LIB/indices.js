
// Indices and names of all parametrs
const Index = {
  R0 : 0,
  amplitude : 1,
  gamma : 2,
  mu : 3,
  sigma : 4,
  rho : 5,
  psi : 6,
  S_0 : 7,
  E_0 : 8,
  I_0 : 9,
  R_0 : 10,
  LogLik : 11
}

// Print parameter names based on the array of indicies.
Index.param = function(array) {
  for ( let i =0; i < array.length; i ++) {
    console.log(Object.keys(Index)[array[i]])
  }
  console.log(";")
}

module.exports = Index
