/**
 *  @file         generateSets.js     This function can generate set as initial parameters for calculation in trajMatch. 
 *  @return                           Considering the dataset and the number of elements in paramIndexArray, it generates
 *                                    a table as a csv file for each element.
 *                                    
 *                                    dataset : The set which all the sets will be generate from;(DeterministicSEIR_all.csv)
 *                                    determineRunProperties : Function that defines logScale, paramLimits and flagBound for each parameter.
 *                                    paramObject : [R0Index, AMPLITUDE, ... ,LogLik]
 *                                    paramIndex :          the index of the parameter that we want to generate sets for it.
 *                                    tolerance : Determine how far from the best liklihood is acceptable.
 *                                    number of profile : Number of points to be consider in the interval of paramLimits.
 *                                    number of points : Number of  points to be generated.
 *                                    s : The value that is used to add noice in the best set and generate more points.
 *                                    indexMult : Defines how to generate new values ('divide & multiply' or 'subtract & add')
 *                                    indexInc : Defines how to generate new values (divide or multiply or both)(subtract or add or both)
 *                                    paramLimits : Lower and upper bound.
 *                                    logScale : If we consider calculation in the log scale, this value equals one.
 *                                    flagBound : If the generated values should be in the interval (0,1), this value equals one.
 *                                                If the generated values should be in the interval (0,Inf), this value equals two.
 *                                      
 *
 *  @author       Nazila Akhavan
 *  @date         March 2019
 *  @reference                        Aaron A. King.
 */


let generateSets ={}
let paramObject = require('../LIB/indices') 

generateSets.generateSet = function (data, paramIndex, logScale, paramLimits, flagBound, numberOfPoints) {
  let dataset = []

  for ( let i = 0; i < data.length; i++) {
    if(data[i].length) {
      dataset.push(data[i])
    }
  }
  let tolerance = 50
  let numberOfProfile = 50
    
  let indexInc = 0
  let indexMult = 1
  let s = 0.01
  let step = 0, ltemp = 0, temp = [], temp2 = []
  let newDataset =[], paramArray = []
  let set1 = [], paramProfile = []
  let Maxloglik
  let flag = 0
  
  // Reorder dataset descending based on LogLik column and find the maximum LogLik
  dataset.sort(sortFunction)
  Maxloglik = dataset[0][paramObject.LogLik]
  
  // Start calculation for the parameter(generating parameter) and generate a set based on this parameter.
  // Calculate the step size for the generating parameter limits interval 
  if (logScale === 1) {
    if (paramLimits[0] <= 0 || paramLimits[1] <= 0) {
      throw "The lower(upper) bound for the parameter is not positive."
    }
    step = (Math.log(paramLimits[1]) - Math.log(paramLimits[0])) / (numberOfProfile - 1)
    ltemp = Math.log(paramLimits[0])
  } else {
    step = (paramLimits[1] - paramLimits[0]) / (numberOfProfile - 1)
    ltemp = paramLimits[0]
  }
  // newDataset include rows that has LogLik in [LogLik - tolerance, LogLik] from which Paramprofile will be made. 
  // temp and tem2 are temperory matrix that include noise to the generating parameter in different ways.
  for (i = 0; i < dataset.length; i++ ) { 
    if (dataset[i][paramObject.LogLik] > Maxloglik - tolerance && dataset[i][paramObject.LogLik] < 0) {
      newDataset.push((dataset[i]).map(Number))
    } else {
      i = dataset.length
    }
  }    
  // Create a sequence of points in the interval of the generating parameter
  for (i = 0; i < numberOfProfile; i++) {
    if (logScale === 1) {
      paramArray.push(Math.exp(ltemp))
    } else {
      paramArray.push(Number(ltemp))
    }
    ltemp += step
  }    
  for (q = 1; q < paramArray.length; q++) {
    set1 = []
    for (j =0; j < newDataset.length; j++) {
      if (newDataset.length > 0){
        if (newDataset[j][paramIndex] >= paramArray[q - 1] && newDataset[j][paramIndex] <= paramArray[q]) {
          set1.push(newDataset[j])
        }
      }
    }
    if(set1.length > 0) {
      set1.sort(sortFunction) 
      paramProfile.push(set1[0])
      flag = 1
    } 
  } 
  
  if(flag === 0) {
    specialLog('#special-log-sobol', 'refinment interval for parameter'+paramIndex+' is not correct! ');
    return [Array(dataset[0].length).fill(0)];
  }
  temp = paramProfile.map(row => [].concat(row))
  temp2 = paramProfile.map(row => [].concat(row))    
  for (q = 1; q <= Math.ceil(numberOfPoints / temp.length); q++) {
    if (indexMult === 1) {
      if (indexInc === -1) {
        nextDivide(temp2, paramIndex, s, paramProfile)
      } else if (indexInc === 1) {
        nextMultiply(temp, paramIndex, s, paramProfile)
      } else {
        if (q % 2 === 1) {
          nextDivide(temp2, paramIndex, s, paramProfile)
        } else {
          nextMultiply(temp, paramIndex, s, paramProfile)
        }
      }
    } else {
      if (indexInc === -1) {
        nextSubtract(temp2, paramIndex, s, paramProfile)
      } else if (indexInc === 1) {
        nextAdd(temp, paramIndex, s, paramProfile)
      } else {
        if (q % 2 === 1) {
          nextSubtract(temp2, paramIndex, s, paramProfile)
        } else {
          nextAdd(temp, paramIndex, s, paramProfile)
        }
      }
    }
  }
// We need exactly 'numberOfPoints' rows
  paramProfile.splice(numberOfPoints)  
// Delete LogLik column and check the flagBounds
  for (i = 0; i < paramProfile.length; i++) {
     paramProfile[i].pop()
  }
  
  if (flagBound === 1) {
    for (i = 0; i < paramProfile.length; i++) {
      if(paramProfile[i][paramIndex] > 1 - 1e-6) {
        paramProfile[i][paramIndex] = 1 - 1e-6
      } else if (paramProfile[i][paramIndex] < 1e-6) {
      paramProfile[i][paramIndex] = 1e-6
      }
    }
  } else if (flagBound === 2) {
    for (i = 0; i < paramProfile.length; i++) {
      if (paramProfile[i][paramIndex] < 1e-6)
        paramProfile[i][paramIndex] =  1e-6
    }
  }
  return(paramProfile)
} 

// Helper functions
function sortFunction(a, b) {
  if (Number(a[a.length - 1]) === Number(b[a.length - 1])) {
    return 0
  }
  else {
    return (Number(a[a.length - 1]) < Number(b[a.length - 1])) ? 1 : -1;
  }
}

function nextDivide(temp, paramIndex, s, paramProfile) {
  for (i = 0; i < temp.length; i++) { 
    temp[i][paramIndex] /= (1 + s)
  }
  paramProfile.push(...[].concat(temp.map(row => [].concat(row))))
}

function nextMultiply(temp, paramIndex, s, paramProfile) {
  for (i = 0; i < temp.length; i++) {
    temp[i][paramIndex] *= (1 + s)
  }
  paramProfile.push(...[].concat(temp.map(row => [].concat(row))))
}

function nextAdd (temp, paramIndex, s, paramProfile) {
  for (i = 0; i < temp.length; i++) {
    temp[i][paramIndex] += s
  }
  paramProfile.push(...[].concat(temp.map(row => [].concat(row))))
}

function nextSubtract (temp, paramIndex, s, paramProfile) {
  for (i = 0; i < temp.length; i++) {
    temp[i][paramIndex] -= s
  }
  paramProfile.push(...[].concat(temp.map(row => [].concat(row))))
}
function specialLog(parentId, result, percent=false) {
  let area = document.querySelector(parentId);
  if (typeof result === 'string') {
    area.value += result + '\n';
  } else {
    area.value += `Received result for point ${result.sliceNumber}${percent? '(' + (percent * 100).toFixed(1) + '% done)' : ''}: `;
    if (result.result[result.result.length - 1] === null) {
      area.value += 'Unsuccessful search.\n';
    } else {
      area.value += JSON.stringify(result.result) + ';\n';
    }
  }
  area.scrollTop = area.scrollHeight;
}

module.exports = generateSets 
