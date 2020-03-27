
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
// Index.names = ['p', 'omega', 'delta', 'mu_e', 'mu_ql', 'mu_el', 'mu_qn', 'mu_en', 'mu_qa', 'mu_ea', 'mu_h', 'beta_nh', 'beta_hl',
//                'beta_hn', 'tau', 'lambda_l', 'lambda_n', 'lambda_a', 'alpha', 'f_l', 'f_n', 'f_a', 'kappa', 'c', 'Tf', 'obsprob',
//                 'T_min_l', 'gamma', 'E0', 'QL0', 'EL_s0', 'EL_i0', 'QN_s0', 'QN_i0', 'EN_s0', 'EN_i0', 'QA_s0', 'QA_i0', 'EA0', 'H_s0', 'H_i0']

// Print parameter names based on the array of indicies.
Index.param = function(array) {
  for ( let i =0; i < array.length; i ++) {
    console.log(Object.keys(Index)[array[i]])
  }
  console.log(";")
}

module.exports = Index
