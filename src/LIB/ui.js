/**
 *  @file       Magic.js
 */
let Index = require('./indices'); 
let sobolSeq = require('traj_match').sobolSeq
let traj_match = require('traj_match').traj_match
let generateSets = require('traj_match').generateSets
let combinedTables = require('traj_match').combinedTables


var inputArr = [], init = [], res = [], index = Array(6).fill(0)
let dataCovar = [], dataCases = []
let initalRefinPoints = [], resR0 = [], resAmplitude = [], resMu = [], resRho = [], resPsi = []
let interpolPopulation, interpolBirth, times, modelTimestep, modelt0
let data1, data2;

// Control settings
const trajPackageName = "TrajectoryMatching";
const trajPackageJSFile = "trajMatch";
const isLocalExec = false;// vs: generator.exec(0.01)
const pricePerSlice = 0.001;// eg: generator.exec(pricePerSlice * generatedSet.length)
const quickRun = false;// use [0,0,0,0,0,0] instead of like [1,1,0,0,1,0]

function getIndicies(type) {
  if(quickRun) {
    return [0,0,0,0,0,0,0];
  } else {
    switch (type) {
      case 'SOBOL':
        return [1,1,0,1,0,1,1];
        break;
      case 'R0':
        return [0,1,0,1,0,1,1];
        break;
      case 'AMP':
        return [1,0,0,1,0,1,1];
        break;
      case 'MU':
        return [1,1,0,0,0,1,1];
        break;
      case 'RHO':
        return [1,1,0,1,0,0,1];
        break;
      case 'PSI':
        return [1,1,0,1,0,1,0];
        break;
      default:
        return [0,0,0,0,0,0,0];
    }
  }
}

var covUploaded = 0;
var caseUploaded = 0;
function checkUploaded() {
  if(covUploaded == 1 && caseUploaded == 1) {
    $('#cov-and-case').removeClass('failure');
    $('#cov-and-case').addClass('success');
  }
}

function dropHandlerRef(ev) {

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();
        initalRefinPoints = []
        var reader = new FileReader ()
        reader.onload = function () {
          var lines = this.result.split('\n')
          for (var line = 0; line < lines.length; line++) {
            if(lines[line].length) {
              initalRefinPoints.push(lines[line].split(','))
            }
          }
          for ( let i = 0; i <initalRefinPoints.length; i++) {
            for (let j = 0; j < initalRefinPoints[0].length; j++) {
              initalRefinPoints[i][j] = Number(initalRefinPoints[i][j])
            }
          }
        }
        reader.readAsText(file)
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)

  }
  jQuery('#ref-file').addClass('uploaded');
  jQuery('#ref-init-points').removeClass('failure');
  jQuery('#ref-init-points').addClass('success');

}
function dragOverHandlerRef(ev) {
console.log('File(s) in drop zone');

// Prevent default behavior (Prevent file from being opened)
ev.preventDefault();
}

function dropHandlerCov(ev) {

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();
        var reader = new FileReader()
        reader.onload = function () {
          var lines = this.result.split('\n')
          for (var line = 1; line < lines.length; line++) {
            if(lines[line].length) {
              dataCovar.push(lines[line].split(','))
            }
          }
        }
        reader.readAsText(file)
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)

  }
  jQuery('#covariates-file').addClass('uploaded');
  covUploaded = 1;
  checkUploaded();
}
function dragOverHandlerCov(ev) {
console.log('File(s) in drop zone');

// Prevent default behavior (Prevent file from being opened)
ev.preventDefault();
}

function dropHandlerCase(ev) {

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
  let modelp = document.getElementById('modelParameter')
  let modelParameter = modelp.value.split(',')
  let models= document.getElementById('modelStates')
  let modelStates = models.value.split(',')
  let modelz = document.getElementById('zeroName')
  let zeroName = modelz.value.split(',')
  let modelt = document.getElementById('modelt0')
  modelt0= Number(modelt.value)
  modelTimestep = Number(document.getElementById('modelTimestep').value)

  let paramsInitial = modelStates
  data1 = []
  data2 = []
  var res = [['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']]
  for (let i = 0; i < dataCovar.length; i++) {
    data1.push([Number(dataCovar[i][0]), Number(dataCovar[i][1])])
    data2.push([Number(dataCovar[i][0]), Number(dataCovar[i][2])])
  }
  
  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();
        var reader = new FileReader ()
        reader.onload = function () {
          var lines = this.result.split('\n')
          for (var line = 1; line < lines.length; line++) {
            if(lines[line].length) {
              dataCases.push(lines[line].split(','))
            }
          }
        }
        reader.readAsText(file)
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)

  }
  jQuery('#cases-file').addClass('uploaded');
  caseUploaded = 1;
  checkUploaded();

}
function dragOverHandlerCase(ev) {
console.log('File(s) in drop zone');

// Prevent default behavior (Prevent file from being opened)
ev.preventDefault();
}

function start () {
  let req = new XMLHttpRequest()
  req.open('GET', './demo-compiled.js')
  req.onload = function () {
    code = req.responseText
  }

  var fileChooser = document.getElementById('tab2file1-upload')
  fileChooser.onclick = function () {
    this.value = ''
  }
  document.getElementById('tab2file1-upload').onchange = function () {
    var file = this.files[0]
    if (!file) return;
    let label = document.getElementById('label-tab2file1')
    label.innerHTML = 'Uploaded'
    label.classList.toggle('not-uploaded')
    label.classList.toggle('uploaded')
    dataCovar = []
    var reader = new FileReader()
    reader.onload = function () {
      var lines = this.result.split('\n')
      for (var line = 1; line < lines.length; line++) {
        if(lines[line].length) {
          dataCovar.push(lines[line].split(','))
        }
      }
    }
    reader.readAsText(file)
    jQuery('#covariates-file').addClass('uploaded');
    covUploaded = 1;
    checkUploaded();

  }

  var fileChooser = document.getElementById('tab2file2-upload')
  fileChooser.onclick = function () {
    this.value = ''
    // Read data from tab "Model and Data"
    let modelp = document.getElementById('modelParameter')
    let modelParameter = modelp.value.split(',')
    let models= document.getElementById('modelStates')
    let modelStates = models.value.split(',')
    let modelz = document.getElementById('zeroName')
    let zeroName = modelz.value.split(',')
    let modelt = document.getElementById('modelt0')
    modelt0= Number(modelt.value)
    modelTimestep = Number(document.getElementById('modelTimestep').value)

    let paramsInitial = modelStates
    data1 = []
    data2 = []
    var res = [['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']]
    for (let i = 0; i < dataCovar.length; i++) {
      data1.push([Number(dataCovar[i][0]), Number(dataCovar[i][1])])
      data2.push([Number(dataCovar[i][0]), Number(dataCovar[i][2])])
    }
    //interpolPopulation = interpolator(data1)
    //interpolBirth = interpolator(data2)
  }

  document.getElementById('tab2file2-upload').onchange = function () {
    var file = this.files[0]
    if (!file) return;
    let label = document.getElementById('label-tab2file2')
    label.innerHTML = 'Uploaded'
    label.classList.toggle('not-uploaded')
    label.classList.toggle('uploaded')
    dataCases = []
    var reader = new FileReader ()
    reader.onload = function () {
      var lines = this.result.split('\n')
      for (var line = 1; line < lines.length; line++) {
        if(lines[line].length) {
          dataCases.push(lines[line].split(','))
        }
      }
    }
    reader.readAsText(file)
    jQuery('#cases-file').addClass('uploaded');
    caseUploaded = 1;
    checkUploaded();

  }
  /** Tab "Initial Search"
   * Read the table and call traj_match
   */
  let sobolButton = document.getElementById('sobolButton')
  sobolButton.onclick = async function () {
    let lowerBounds = [],
     upperBounds = [],
     resSobol = [['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']]
    let sobolBoundTable = document.getElementById('sobolBound')
    let rows = sobolBoundTable.querySelectorAll('tr')
    for(i = 1; i < rows.length - 1; i++){
      let row = rows[i]
      let cols = row.querySelectorAll('td')
      let lowerBound = cols[1].querySelector('input').value
      let upperBound = cols[2].querySelector('input').value
      lowerBounds.push(Number(lowerBound))
      upperBounds.push(Number(upperBound))
    }
    let SobolNumberOfPoints = Number(document.getElementById('sobolPoint').value)
    let sobolSet = sobolSeq.sobolDesign( lowerBounds,  upperBounds, SobolNumberOfPoints)
    let len = 0;
    for ( let i = 0; i < sobolSet.length; i++) {
       len = sobolSet[i].length
       sobolSet[i].push(1- (sobolSet[i][len - 1] +sobolSet[i][len - 2] +sobolSet[i][len - 3]))// TODO
    }
    if(!dataCovar.length) {
      alert('Upload data in "Model and Data", then you can generate and run!')
    } else {
      sobolButton.innerText = 'Running'
      times = [modelt0, Number(dataCases[0][0]), Number(dataCases[dataCases.length - 1][0])];
      index = getIndicies('SOBOL');

      // Prepair rangeObject out of sobolSet for DCP
      let filler = [0];// shoehorn
      let args = [data1, data2, dataCases, times, index, modelTimestep]
      init = new MultiRangeObject(sobolSet, filler);

      // Main generator for DCP-fying TrajMatch with SobolSet
      let generator = window.generatorHandle = compute.for(init, function (init, filler, data1, data2, dataCases, times, index, modelTimestep) {
        let prog = progress;
        const trajtest = require('TrajectoryMatching/trajMatch');
        // console.log(Object.keys(trajtest));
        let trajMatch = trajtest['traj_match']['exports']['match'];

        return trajMatch(data1, data2, dataCases, init, times, index, modelTimestep, function (val) {
          prog(val)
        });
      }, args);
      
      //eddie
      window.generatorHandle = generator;

      // DCP job settings
      let accumulatedResults = [];
      generator.public = { name: 'TrajMatch' };
      // old way, works generator.requires('trajtest/trajtest');
      generator.requires(trajPackageName+'/'+trajPackageJSFile);

      generator.on('result', function(res) {
       if(typeof res != 'undefined') {
         if(res.result) {
            // Show the results come back from the workers in consule and html.
            accumulatedResults.push(res.result);
            console.log('onResult', generator.tasks, res);
            specialLogFun([res.result], document.querySelector('#special-log-sobol'));

            document.querySelector('#sobolButton').onclick = function () {
              Csv([['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(accumulatedResults),'sobol.csv');
            }
          }
        }
      });

      generator.on('complete', function(res) {
        console.log('onComplete', generator.tasks, res);
        document.querySelector('#sobolButton').innerText = "Download"
        res = [['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(res)

       $('.interact #refinements-tab').removeClass('hide-it');
        document.querySelector('#sobolButton').onclick = function () {
          Csv(res,'sobol.csv');
        }
      });/* TODO */

      // GO!!!!!!!!!
      if(isLocalExec) {
        protocol.keychain.addPrivateKey( (protocol.eth.Wallet.generate()).getPrivateKeyString(), true )
        try {
          await generator.localExec();
        } catch (er) {
          console.log(er)
        }
      } else {
        await protocol.keychain.getKeystore();
        await generator.exec(pricePerSlice * sobolSet.length);
      }
    }
  }

  // Tab "Refinments"
  var fileChooser = document.getElementById('tab4-upload')
  fileChooser.onclick = function () {
    this.value = ''
    if(!dataCases.length) {
      alert('Upload data in "Model and Data", then you can generate and run!')
    } else {
      times = [modelt0, Number(dataCases[0][0]), Number(dataCases[dataCases.length - 1][0])]
    }
  }

  fileChooser.onchange = function () {
    var file = this.files[0]
    initalRefinPoints = []
    var reader = new FileReader ()
    reader.onload = function () {
      var lines = this.result.split('\n')
      for (var line = 0; line < lines.length; line++) {
        if(lines[line].length) {
          initalRefinPoints.push(lines[line].split(','))
        }
      }
      for ( let i = 0; i <initalRefinPoints.length; i++) {
        for (let j = 0; j < initalRefinPoints[0].length; j++) {
          initalRefinPoints[i][j] = Number(initalRefinPoints[i][j])
        }
      }
      // Remove the first row if it includes names.
      if (isNaN(initalRefinPoints[0][0])) {
        initalRefinPoints.shift()
      }
    }
    reader.readAsText(file)
    jQuery('#ref-file').addClass('uploaded');
    jQuery('#ref-init-points').removeClass('failure');
    jQuery('#ref-init-points').addClass('success');
  }

  let logScale = 0, flagBound = 0
  let lowerLimit, upperLimit, NoPoints, flag, logScaleParam, generatedSet
  //  R0
  let runButtonR0 = document.getElementById('buttonRunR0')
  runButtonR0.onclick = async function () {
    if(!dataCovar.length || ! initalRefinPoints.length) {
      if((!dataCovar.length)) {
        alert('Upload data in "Model and Data", then you can generate and run!')
      } else {
        alert('Upload initial data!')
      }
    } else {
      runButtonR0.innerText = 'Running'
      logScale = 0, flagBound = 0
      let logScaleParam = document.getElementById('logScaleR0').checked
      if(logScaleParam) {
        logScale = 1
      }
      lowerLimit = Number(document.getElementById('limit1R0').value)
      upperLimit = Number(document.getElementById('limit2R0').value)
      NoPoints = Number(document.getElementById('NoPointsR0').value)
      flag = document.getElementById('flagR0').checked
      if(flag) {
        flagBound = 1
      }
      generatedSet = generateSets.generateSet(initalRefinPoints, Index.R0, logScale, [lowerLimit,upperLimit], flagBound, NoPoints)
      
      index = getIndicies('R0');
      let filler = [0];
      let args = [data1, data2, dataCases, times, index, modelTimestep]
      init = new MultiRangeObject(generatedSet, filler);

      let generator = window.generatorHandle = compute.for(init, function (init, filler, data1, data2, dataCases, times, index, modelTimestep) {
       let prog = progress;
        const trajtest = require('trajtest/trajtest');
        let trajMatch = trajtest['traj_match']['exports']['match'];

        return trajMatch(data1, data2, dataCases, init, times, index, modelTimestep, function (value) {
          return prog(value);
        });
      }, args)

      let accumulatedResults = [];
      generator.public = { name: 'TrajMatch' };
      generator.requires('trajtest/trajtest');
      generator.on('result', function(res) {
        if(typeof res != 'undefined') {
          if(res.result) {
            // Show the results come back from the workers in consule and html.
            accumulatedResults.push(res.result)
            console.log('onResult', generator.tasks, res);
            specialLogFun([res.result], document.querySelector('#special-log-R0'));

            document.querySelector('#buttonRunR0').onclick = function () {
              Csv([['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(accumulatedResults), 'R0.csv');
            }
          }
        }
      });

      generator.on('complete', function(ans) {
        console.log('onComplete', generator.tasks, ans);
        document.querySelector('#buttonRunR0').innerText = "Download";
        resR0 = ans
        ans = [['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(ans);

        runButtonR0.innerText = 'Download';
        runButtonR0.onclick = function () {Csv(ans, 'R0.csv')};
      });

      if(isLocalExec) {
        // generate fake wallet
        protocol.keychain.addPrivateKey( (protocol.eth.Wallet.generate()).getPrivateKeyString(), true )
        await generator.localExec();
      } else {
        await protocol.keychain.getKeystore();// real wallet
        allResults = await generator.exec(pricePerSlice * generatedSet.length);
        console.log(allResults)
      }
    }
  }
  
  // Amplitude
  let runButtonAmp = document.getElementById('buttonRunAmplitude')
  runButtonAmp.onclick = async function () {
    if(!dataCovar.length || ! initalRefinPoints.length) {
      if((!dataCovar.length)) {
        alert('Upload data in "Model and Data", then you can generate and run!')
      } else {
        alert('Upload initial data!')
      }
    } else {
      runButtonAmp.innerText = 'Running'
      logScale = 0, flagBound = 0
      let logScaleParam = document.getElementById('logScaleAmplitude').checked
      if(logScaleParam) {
        logScale = 1
      }
      lowerLimit = Number(document.getElementById('limit1Amplitude').value)
      upperLimit = Number(document.getElementById('limit2Amplitude').value)
      NoPoints = Number(document.getElementById('NoPointsAmplitude').value)
      flag = document.getElementById('flagAmplitude').checked
      if(flag) {
        flagBound = 1
      }
      generatedSet = generateSets.generateSet(initalRefinPoints, Index.amplitude, logScale, [lowerLimit,upperLimit], flagBound, NoPoints)
      
      index = getIndicies('AMP');
      let filler = [0];
      let args = [data1, data2, dataCases, times, index, modelTimestep]
      init = new MultiRangeObject(generatedSet, filler);

      let generator = window.generatorHandle = compute.for(init, function (init, filler, data1, data2, dataCases, times, index, modelTimestep) {
       let prog = progress;
        const trajtest = require('trajtest/trajtest');
        let trajMatch = trajtest['traj_match']['exports']['match'];

        return trajMatch(data1, data2, dataCases, init, times, index, modelTimestep, function (value) {
          return prog(value);
        });
      }, args)

      let accumulatedResults = [];
      generator.public = { name: 'TrajMatch' };
      generator.requires('trajtest/trajtest');
      generator.on('result', function(res) {
        if(typeof res != 'undefined') {
          if(res.result) {
            // Show the results come back from the workers in consule and html.
            accumulatedResults.push(res.result)
            console.log('onResult', generator.tasks, res);
            specialLogFun([res.result], document.querySelector('#special-log-Amplitude'));

            document.querySelector('#buttonRunAmplitude').onclick = function () {
              Csv([['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(accumulatedResults), 'amplitude.csv');
            }
          }
        }
      });

      generator.on('complete', function(ans) {
        console.log('onComplete', generator.tasks, ans);
        document.querySelector('#buttonRunAmplitude').innerText = "Download";
        resAmplitude = ans
        ans = [['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(ans);

        runButtonAmp.innerText = 'Download';
        runButtonAmp.onclick = function () {Csv(ans, 'amplitude.csv')};
      });

      if(isLocalExec) {
        // generate fake wallet
        protocol.keychain.addPrivateKey( (protocol.eth.Wallet.generate()).getPrivateKeyString(), true )
        await generator.localExec();
      } else {
        await protocol.keychain.getKeystore();// real wallet
        allResults = await generator.exec(pricePerSlice * generatedSet.length);
        console.log(allResults)
      }
    }
  }
  
  // Mu
  let runButtonMu = document.getElementById('buttonRunMu')
  buttonRunMu.onclick = async function () {
    if(!dataCovar.length || ! initalRefinPoints.length) {
      if((!dataCovar.length)) {
        alert('Upload data in "Model and Data", then you can generate and run!')
      } else {
        alert('Upload initial data!')
      }
    } else {
      runButtonMu.innerText = 'Running'
      logScale = 0, flagBound = 0
      let logScaleParam = document.getElementById('logScaleMu').checked
      if(logScaleParam) {
        logScale = 1
      }
      lowerLimit = Number(document.getElementById('limit1Mu').value)
      upperLimit = Number(document.getElementById('limit2Mu').value)
      NoPoints = Number(document.getElementById('NoPointsMu').value)
      flag = document.getElementById('flagMu').checked
      if(flag) {
        flagBound = 1
      }
      generatedSet = generateSets.generateSet(initalRefinPoints, Index.mu, logScale, [lowerLimit,upperLimit], flagBound, NoPoints)
      
      index = getIndicies('MU');
      let filler = [0];
      let args = [data1, data2, dataCases, times, index, modelTimestep]
      init = new MultiRangeObject(generatedSet, filler);

      let generator = window.generatorHandle = compute.for(init, function (init, filler, data1, data2, dataCases, times, index, modelTimestep) {
       let prog = progress;
        const trajtest = require('trajtest/trajtest');
        let trajMatch = trajtest['traj_match']['exports']['match'];

        return trajMatch(data1, data2, dataCases, init, times, index, modelTimestep, function (value) {
          return prog(value);
        });
      }, args)

      let accumulatedResults = [];
      generator.public = { name: 'TrajMatch' };
      generator.requires('trajtest/trajtest');
      generator.on('result', function(res) {
        if(typeof res != 'undefined') {
          if(res.result) {
            // Show the results come back from the workers in consule and html.
            accumulatedResults.push(res.result)
            console.log('onResult', generator.tasks, res);
            specialLogFun([res.result], document.querySelector('#special-log-Mu'));

            document.querySelector('#buttonRunMu').onclick = function () {
              Csv([['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(accumulatedResults), 'mu.csv');
            }
          }
        }
      });

      generator.on('complete', function(ans) {
        console.log('onComplete', generator.tasks, ans);
        document.querySelector('#buttonRunMu').innerText = "Download";
        resMu = ans
        ans = [['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(ans);

        runButtonMu.innerText = 'Download';
        runButtonMu.onclick = function () {Csv(ans,'mu.csv')};
      });

      if(isLocalExec) {
        // generate fake wallet
        protocol.keychain.addPrivateKey( (protocol.eth.Wallet.generate()).getPrivateKeyString(), true )
        await generator.localExec();
      } else {
        await protocol.keychain.getKeystore();// real wallet
        allResults = await generator.exec(pricePerSlice * generatedSet.length);
        console.log(allResults)
      }
    }
  }

  // Rho
  let runButtonRho = document.getElementById('buttonRunRho')
  runButtonRho.onclick = async function () {
    if(!dataCovar.length || ! initalRefinPoints.length) {
      if((!dataCovar.length)) {
        alert('Upload data in "Model and Data", then you can generate and run!')
      } else {
        alert('Upload initial data!')
      }
    } else {
      runButtonRho.innerText = 'Running'
      logScale = 0, flagBound = 0
      let logScaleParam = document.getElementById('logScaleRho').checked
      if(logScaleParam) {
        logScale = 1
      }
      lowerLimit = Number(document.getElementById('limit1Rho').value)
      upperLimit = Number(document.getElementById('limit2Rho').value)
      NoPoints = Number(document.getElementById('NoPointsRho').value)
      flag = document.getElementById('flagRho').checked
      if(flag) {
        flagBound = 1
      }
      generatedSet = generateSets.generateSet(initalRefinPoints, Index.rho, logScale, [lowerLimit,upperLimit], flagBound, NoPoints)
      
      index = getIndicies('RHO');
      let filler = [0];
      let args = [data1, data2, dataCases, times, index, modelTimestep]
      init = new MultiRangeObject(generatedSet, filler);

      let generator = window.generatorHandle = compute.for(init, function (init, filler, data1, data2, dataCases, times, index, modelTimestep) {
       let prog = progress;
        const trajtest = require('trajtest/trajtest');
        let trajMatch = trajtest['traj_match']['exports']['match'];

        return trajMatch(data1, data2, dataCases, init, times, index, modelTimestep, function (value) {
          return prog(value);
        });
      }, args)

      let accumulatedResults = [];
      generator.public = { name: 'TrajMatch' };
      generator.requires('trajtest/trajtest');
      generator.on('result', function(res) {
        if(typeof res != 'undefined') {
          if(res.result) {
            // Show the results come back from the workers in consule and html.
            accumulatedResults.push(res.result)
            console.log('onResult', generator.tasks, res);
            specialLogFun([res.result], document.querySelector('#special-log-Rho'));

            document.querySelector('#buttonRunRho').onclick = function () {
              Csv([['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(accumulatedResults), 'rho.csv');
            }
          }
        }
      });

      generator.on('complete', function(ans) {
        console.log('onComplete', generator.tasks, ans);
        document.querySelector('#buttonRunRho').innerText = "Download";
        resRho = ans
        ans = [['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(ans);

        runButtonRho.innerText = 'Download';
        runButtonRho.onclick = function () {Csv(ans, 'rho.csv')};
      });

      if(isLocalExec) {
        // generate fake wallet
        protocol.keychain.addPrivateKey( (protocol.eth.Wallet.generate()).getPrivateKeyString(), true )
        await generator.localExec();
      } else {
        await protocol.keychain.getKeystore();// real wallet
        allResults = await generator.exec(pricePerSlice * generatedSet.length);
        console.log(allResults)
      }
    }
  }

  // Psi
  let runButtonPsi = document.getElementById('buttonRunPsi')
  runButtonPsi.onclick = async function () {
    if(!dataCovar.length || ! initalRefinPoints.length) {
      if((!dataCovar.length)) {
        alert('Upload data in "Model and Data", then you can generate and run!')
      } else {
        alert('Upload initial data!')
      }
    } else {
      runButtonPsi.innerText = 'Running'
      logScale = 0, flagBound = 0
      let logScaleParam = document.getElementById('logScalePsi').checked
      if(logScaleParam) {
        logScale = 1
      }
      lowerLimit = Number(document.getElementById('limit1Psi').value)
      upperLimit = Number(document.getElementById('limit2Psi').value)
      NoPoints = Number(document.getElementById('NoPointsPsi').value)
      flag = document.getElementById('flagPsi').checked
      if(flag) {
        flagBound = 1
      }
      generatedSet = generateSets.generateSet(initalRefinPoints, Index.psi, logScale, [lowerLimit,upperLimit], flagBound, NoPoints)
      
      index = getIndicies('PSI');
      let filler = [0];
      let args = [data1, data2, dataCases, times, index, modelTimestep]
      init = new MultiRangeObject(generatedSet, filler);

      let generator = window.generatorHandle = compute.for(init, function (init, filler, data1, data2, dataCases, times, index, modelTimestep) {
       let prog = progress;
        const trajtest = require('trajtest/trajtest');
        let trajMatch = trajtest['traj_match']['exports']['match'];

        return trajMatch(data1, data2, dataCases, init, times, index, modelTimestep, function (value) {
          return prog(value);
        });
      }, args)

      let accumulatedResults = [];
      generator.public = { name: 'TrajMatch' };
      generator.requires('trajtest/trajtest');
      generator.on('result', function(res) {
        if(typeof res != 'undefined') {
          if(res.result) {
            // Show the results come back from the workers in consule and html.
            accumulatedResults.push(res.result)
            console.log('onResult', generator.tasks, res);
            specialLogFun([res.result], document.querySelector('#special-log-Psi'));
            
            document.querySelector('#buttonRunPsi').onclick = function () {
              Csv([['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(accumulatedResults), 'psi.csv');
            }
          }
        }
      });

      generator.on('complete', function(ans) {
        console.log('onComplete', generator.tasks, ans);
        document.querySelector('#buttonRunPsi').innerText = "Download";
        resPsi = ans
        ans = [['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(ans);
        
        runButtonPsi.innerText = 'Download';
        runButtonPsi.onclick = function () {Csv(ans,'psi.csv')};
      });

      if(isLocalExec) {
        // generate fake wallet
        protocol.keychain.addPrivateKey( (protocol.eth.Wallet.generate()).getPrivateKeyString(), true )
        await generator.localExec();
      } else {
        await protocol.keychain.getKeystore();// real wallet
        allResults = await generator.exec(pricePerSlice * generatedSet.length);
        console.log(allResults)
      }
    }
  }


  let combineButton = document.getElementById('combineButton')
  combineButton.onclick = function () {
    combinedRes = combineTables.combine([initalRefinPoints, resR0, resAmplitude, resMu, resRho, resPsi])
    combineButton.innerText = "Download"
    combinedRes = [['R0', 'amplitude', 'gamma', 'mu', 'sigma', 'rho', 'psi', 'S_0', 'E_0', 'I_0', 'R_0', 'LogLik']].concat(combinedRes)
    combineButton.onclick = function () {
      Csv(combinedRes,'all.csv')
    }
  }
  // Accordion
  var acc = document.getElementsByClassName("accordion")
  for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
      this.classList.toggle("active")
      var panel = this.nextElementSibling
      if (panel.style.maxHeight){
        panel.style.maxHeight = null;
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px"
      }
    })
  }
}

// Helper functions
function Csv (res, type) {
  var csv = ''
  res.forEach(function (row) {
    csv += row.join(',')
    csv += '\n'
  })
  var hiddenElement = document.createElement('a')
  hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv)
  hiddenElement.setAttribute('download', type)
  hiddenElement.click()
}

function interpolator(points) {
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


function specialLogFun(arg, specialLog) {
  for(let i = 0; i < arg.length;i++) {
    if(typeof arg[i] != 'undefined' && arg[i] != null) {
      specialLog.value += arg[i].toString() + '\n';
      specialLog.scrollTop = specialLog.scrollHeight;
    }
  }
}

