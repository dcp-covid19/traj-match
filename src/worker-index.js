/**
 * @author  Ryan Rossiter, ryan@kingsds.network
 * @date    Sep 2019
 * @file    index.js   
 *          This is the entry into the worker module that will load
 *          from the a.out.js and a.out.wasm Emscripten outputs.
 */

const trajMatch = require('./trajMatch/runTrajHtml.js');

// Add the workerfn to the self namespace so it can be called by whatever wraps the output bundle
const workerfn = self.workerfn = (...args) => {

  let result;
  let date = new Date();
  try {
    progress();
    console.error("STARTING TRAJMATCH");
    result = trajMatch(...args);
    if (isNaN(result[result.length - 1])) {
      result = [...new Array(args[0].length).fill(0), NaN];
    }
  } catch (e) {
    console.error(e);
    result = [...new Array(args[0].length).fill(0), NaN];
  }
  console.debug(new Date() - date);
  return result;
}

export default workerfn;
