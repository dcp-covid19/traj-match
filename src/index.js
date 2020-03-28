/**
 * @file         index.js
 *
 */

require('../www/styles/index.scss');
let generate = require('./generateSet/generateSets.js')
let sobolSeq = require('./generate-sobol/sobolSeq.js')
let model = require('./LIB/createModel')
let mathLib = require('./LIB/mathLib')
let Index = require('./LIB/indices')
let plotProfile = require('./plot/plotProfile.js')
let loess2 = require('./plot/loess2.js')

// Used to load emsdk module
const Module = window.Module = {};
const nameArray = ['R0' , 'amplitude', 'gamma', 'mu', 'sigma', 'pho', 'psi', 'S_0', 'E-0' , 'I_0' , 'R_0', 'LogLik'];
function start (workerFn) { 
  let dataCovarUpload = [], dataCasesUpload = [];
  let covFlag = 0, caseFlag = 0;
  let data = [], populationData = [], birthData = [], times = [];
  let initalRefinPoints = [], estimateIndices = [];
  let temp , t0;
  let fixedIndices = [];
  let covars;
  let lowerBounds = [], upperBounds = [], flagBoundArray = [];
  let generateModelFlag = 0;
  let autoFlag;
  let refineIterationNumber;
  let bestResults = [];
  let simHarranged = [];
  let jobs = {};
  let param_lims = new Array(12).fill([0,1]);
  let bandwidth = 0.5;
  let lowerBoundsInit = [], upperBoundsInit = [];
  let plotIndex = [Index.R0, Index.amplitude, Index.mu, Index.rho, Index.psi];
  let indexPlot = ['$R0 $', '$\\alpha $', '$\\gamma $', '$\\mu $', '$\\sigma $', '$\\rho $', '$\\psi$']   
  let timeExe = []
  let modelTimestep = Number(document.getElementById('modelTimestep').value)
  let indexAll

 

  // Stub for compute.for, will be replaced with DCP API later.
  const runComputeFor = function(data, ...args) {
    // Local exec
    //  for (let i = 0; i < data.length; i++) {
    //   console.log(`Set ${i}`);
    //   let progress = () => {};
    //   eval(workerFn + `(
    //     ${JSON.stringify(data[i])},
    //     ${args.map(a => JSON.stringify(a)).join(',')}
    //   )`).then(()=>{console.log('done with eval')})
    // }
    // return
    // data = data.map(a => [a]);
    let job = dcp.compute.for(data, workerFn, args);
    job.on('ETOOMANYERRORS', (e) => console.error('Got an error:', e));
    job.work.on('uncaughtException', (e) => console.error('Got an error:', e));
    job.work.on('console', (e) => {
      if (e.level === 'debug') {
        timeExe.push(parseFloat(e.message));
        console.log("Got a timing message:", e);
      } else {
        console.log('got console:', e)
      }
    });
    job.on('accepted', () => console.log("Job accepted"));
    job.on('result', (ev) => console.log(ev));
    job.public = {
      name: 'COVID-19',
      description: '',
      link: ''
    }
    job.exec(0.00001).catch((e) => {
      console.warn('Job was cancelled', e);
      job.emit('myCustomError', e);
    });

    return job;
  }

  let req = new XMLHttpRequest()
  /* File picker for uploading dataCovarUpload.csv */
  var fileChooser = document.getElementById('tab2file1-upload')
  fileChooser.onclick = function () { this.value = '' }
  fileChooser.onchange = function () {
    var file = this.files[0]
    if (!file) return;
    let label = document.getElementById('label-tab2file1')
    label.innerHTML = 'Uploaded'
    label.classList.toggle('not-uploaded')
    label.classList.toggle('uploaded')
    dataCovarUpload = []
    var reader = new FileReader()
    reader.onload = function () {
      var lines = this.result.split('\n')
      for (var line = 1; line < lines.length; line++) {
        if(lines[line].length) {
          dataCovarUpload.push(lines[line].split(','))
        }
      }
    }
    reader.readAsText(file)
    covFlag=1;
    if(caseFlag ==1 ) {
      $('#cov-and-case').addClass('success');
      $('#cov-and-case').removeClass('failure');
      $('.initial-search-1, #generateModel').removeClass('disabled');
    }
  }

  function updateRefinementsGenerateBtn(modelGenerated, initialPointsUploaded) {
    if (modelGenerated && initialPointsUploaded) {
      if(!fixedIndices.includes(Index.R0))$('#buttonRunR0').removeClass('disabled');
      if(!fixedIndices.includes(Index.amplitude))$('#buttonRunAmplitude').removeClass('disabled');
      if(!fixedIndices.includes(Index.mu))$('#buttonRunMu').removeClass('disabled');
      if(!fixedIndices.includes(Index.rho))$('#buttonRunRho').removeClass('disabled');
      if(!fixedIndices.includes(Index.psi))$('#buttonRunPsi').removeClass('disabled');
      $('#buttonRunAll').removeClass('disabled');
    }
  }

  /* File picker for uploading dataCasesUpload.csv */
  document.getElementById('tab2file2-upload').onchange = function () {
    var file = this.files[0]
    if (!file) return;
    let label = document.getElementById('label-tab2file2')
    label.innerHTML = 'Uploaded'
    label.classList.toggle('not-uploaded')
    label.classList.toggle('uploaded')
    dataCasesUpload = []
    var reader = new FileReader ()
    reader.onload = function () {
      var lines = this.result.split('\n')
      for (var line = 1; line < lines.length; line++) {
        if(lines[line].length) {
          dataCasesUpload.push(lines[line].split(','))
        }
      }
    }
    reader.readAsText(file)
    caseFlag = 1;
    if(covFlag ==1 ) {
      $('#cov-and-case').addClass('success');
      $('#cov-and-case').removeClass('failure');
      $('.initial-search-1, #generateModel').removeClass('disabled');
    }
  }

  function dropHandlerCov(ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
  dataCovarUpload = [];
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
            dataCovarUpload.push(lines[line].split(','))
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

  /* SECOND TAB: read values and pass them to sobol function */
  let generateModel = document.getElementById('generateModel')
  t0 = Number(modelt0.value)
  
  let sobolBoundTable = document.getElementById('sobolBound')
  let rows = sobolBoundTable.querySelectorAll('tr')
  /* Read values from the "Initial Search" table and check if it is interval or fraction */
  generateModel.onclick = async function () {
    if ($('#generateModel').hasClass('disabled')) return false;

    lowerBoundsInit = [], upperBoundsInit = []
    fixedIndices = [], flagBoundArray = [], indexAll = Array(indexPlot.length).fill(0);
    for(i = 1; i < rows.length; i++) {
      let row = rows[i]
      let cols = row.querySelectorAll('td')
      let flagcol = cols[3].querySelector('.flag-bound')
      for(let j = 0; j < 3; j++) {
        if (flagcol.querySelectorAll('input')[j].checked)
          flagBoundArray.push(j)
      }
      let check = cols[1].querySelector('input#p-switch')
      if(check.checked) {
        range = row.querySelector('div#rng')
        lowerBoundsInit.push(Number(range.querySelector('input#from').value))
        upperBoundsInit.push(Number(range.querySelector('input#to').value))
        indexAll[i-1] = 1
      } else{
        paramValue = row.querySelector('div#val')
        pvalue = paramValue.querySelector('input').value
        if(pvalue.split('/').length == 2 ) {
          divisionresult = pvalue.split('/')
          pvalue = Number(divisionresult[0]) / Number(divisionresult[1])
        }
        fixedIndices.push(i-1)
        lowerBoundsInit.push(Number(pvalue))
        upperBoundsInit.push(Number(pvalue))
      }
    }
    
    if (autoSwitch.checked) {
      refineIterationNumber = document.getElementById("refineIteration").value;
      refineIterationNumber = Number(refineIterationNumber);
      autoFlag = 1;
    }
    if(!(dataCovarUpload.length  && dataCasesUpload.length)) {
        alert('Upload the data first!');
    } else {
      let estimatedTab = displayEstimetedTab(fixedIndices);
    }

    /* Create populationData,birthData, and times to use in trajMatch */
    populationData = [], birthData = [];
    for (let i = 0; i < dataCovarUpload.length; i++) {
      populationData.push([Number(dataCovarUpload[i][0]), Number(dataCovarUpload[i][1])])
      birthData.push([Number(dataCovarUpload[i][0]), Number(dataCovarUpload[i][2])])
    }
    times = [t0, Number(dataCasesUpload[0][0]), Number(dataCasesUpload[dataCasesUpload.length - 1][0])];
    
    generateModelFlag = 1;
    $('.progress-item#model-ind').removeClass('failure');
    $('.progress-item#model-ind').addClass('success');
    $('#sobolButton').removeClass('disabled');
    $('#refinements-tab-').removeClass('disabled');

    updateRefinementsGenerateBtn(generateModelFlag, initalRefinPoints.length);
  }

  let runButtonSobol = document.getElementById('sobolButton');
  let downloadButtonSobol = document.getElementById('sobolButtonDownload');
  
/* Initial Search */
  runButtonSobol.onclick = function (cancelOnly=false) {
    
    if ($('#sobolButton').hasClass('disabled')) return false;
    if ($('#sobolButton').hasClass('running')) {
      jobs['sobol'].cancel();
      specialLog('#special-log-sobol', 'Cancelling job...');
      runButtonSobol.innerText = "Generate & Run";
      $('#sobolButton').removeClass('running');
      return;
    } else if (cancelOnly === 'cancelOnly') return;
    if (autoSwitch.style.checked) {

    }
    let SobolNumberOfPoints = Number(document.getElementById('sobolPoint').value);
    if(!generateModelFlag) {
        alert('Upload data and Model parameters first!');
    } else if (SobolNumberOfPoints === 0) {
      alert('Enter the number of initial points for the first search.')
    } else {
      generateModel.style.display = 'none';
      let area = document.querySelector('#special-log-sobol');
      area.value =''

      runButtonSobol.innerText = "Cancel";
      $('#sobolButton').addClass('running');
      downloadButtonSobol.style.display = '';
      let resSobol = [];

      /* Create an array of initial set of points := sobolSet
       * Use traj_match to calculate each row of sobolSet and add the results to sobolResult
       * Using DCP for each set
       */
      let sobolSet = sobolSeq.sobolDesign( lowerBoundsInit, upperBoundsInit, SobolNumberOfPoints);
      let len = 0;
      for ( let i = 0; i < sobolSet.length; i++) {
        len = sobolSet[i].length
        sobolSet[i][len - 1] = (1- (sobolSet[i][len - 2] +sobolSet[i][len - 3] +sobolSet[i][len - 4]))// TODO
      }
      var accumulatedResults = [];
      
      
      var job = jobs['sobol'] = runComputeFor(sobolSet, populationData, birthData, dataCasesUpload, times, indexAll, modelTimestep);
      job.on('myCustomError', (e) => {
        specialLog('#special-log-sobol', 'Failed to deploy job: ' + e.message);
      });
      
      specialLog('#special-log-sobol', 'Accessing Distributed Computer...');
      job.on('accepted', () => {
        specialLog('#special-log-sobol', 'Job accepted, working...');
      })
      let resultsRetrieved = 0;

      job.on('result', function(res) {
        // Show the results come back from the workers in consule and html.
        if(typeof res != 'undefined') {
          if(res.result) {
            resultsRetrieved++;
            if(res.result[0] !== 0) {
              accumulatedResults.push(res.result);
            }
            specialLog('#special-log-sobol', res, resultsRetrieved / sobolSet.length);
            $('#sobolButtonDownload').removeClass('disabled');

             downloadButtonSobol.onclick = function () {
              accumulatedResults.sort(mathLib.sortFunction);
               Csv(accumulatedResults, 'initial-results.csv');
             }
           }
        }
      });
      job.on('complete', async function(res) {
        await job.results.fetch();
        let iter = 1;
        res = job.results.values();
        console.log('onComplete', res, typeof res);
        if(autoFlag) {
          specialLog('#special-log-sobol', '\nInitial search complete!  Refining...');
        } else {
          specialLog('#special-log-sobol', '\nJob complete! Click download above for results.'); 
        }
        
        runButtonSobol.innerText = "Generate & Run"
        res = Array.from(res)
        res.sort(mathLib.sortFunction);
        res = res.filter((row) => row[0] !== 0 && row[row.length - 1] < 0);
        $('#buttonRunAll').removeClass('disabled');

        runButtonSobol.innerText = "Generate & Run";
        $('#sobolButton').removeClass('running');
        downloadButtonSobol.onclick = function () {
          Csv(res, 'initial-results.csv');
        }
        console.log("Got timing results:", timeExe);

        if(autoFlag) {
          Csv(res, 'initial-results.csv');
          initalRefinPoints = res;
          bestPoint = initalRefinPoints[0];
          updateRefinementsGenerateBtn(generateModelFlag, initalRefinPoints.length);
          for (let ii = 0; ii < refineIterationNumber; ii++) {              
            for(let i = 0; i < 5; i++) {  
              let bestValue = bestPoint[plotIndex[i]] ;  
              if(!fixedIndices.includes(plotIndex[i])){   
                document.getElementById('limit1'+ Object.keys(Index)[plotIndex[i]]).value = bestValue * 0.8;    
                if(plotIndex[i] === Index.amplitude || plotIndex[i] === Index.mu || plotIndex[i] === Index.rho) {   
                  document.getElementById('limit2'+ Object.keys(Index)[plotIndex[i]]).value = Math.min(bestValue * 1.2, 1);   
                } else {    
                  document.getElementById('limit2'+ Object.keys(Index)[plotIndex[i]]).value = bestValue * 1.2;    
                }   
              }   
            }
            await runAllButton.onclick();
            initalRefinPoints = BestResultsButton.onclick(iter);
            iter++
          } 
        }
      });
    }
  }
  
  /* Upload initial set for refinements*/
  document.getElementById('tab4-upload').onclick = function (e) {
    this.value = '';
    if(!generateModelFlag) {
        e.preventDefault();
        alert('Upload the data and Model parameters then generate the model on the Initial Search page!');
    }
    else {
      document.getElementById('tab4-upload').onchange = function () {

        var file = this.files[0]
      if (!file) return;
      let label = document.getElementById('label-tab4')
      label.innerHTML = 'Uploaded'
      label.classList.toggle('not-uploaded')
      label.classList.toggle('uploaded')
      $('#buttonResults').removeClass('disabled');
      initalRefinPoints = [];
      var reader = new FileReader ();
      reader.onload = function () {
        var lines = this.result.split('\n');
        // First row is just names. Skip first row, start at index 1.
        for (var line = 1; line < lines.length; line++) {
          if(lines[line].length) {
            initalRefinPoints.push(lines[line].split(','));
          }
        }
        for ( let i = 0; i <initalRefinPoints.length; i++) {
          for (let j = 0; j < initalRefinPoints[0].length; j++) {
            initalRefinPoints[i][j] = Number(initalRefinPoints[i][j]);
          }
        }
        
        bestResults = rmSameRow(initalRefinPoints);
        /* data in simHarranged in needed for ploting sample trajectory*/
        let simH = mathLib.TrajIntegrate(bestResults[0], populationData, birthData, dataCasesUpload, times, modelTimestep);
        simH.shift();
      
        let dataSampleTraj = []
        for (let i = 0; i < dataCasesUpload.length; i++) {
          if(!isNaN(dataCasesUpload[i][1])) {
            dataSampleTraj.push(Number(dataCasesUpload[i][1]))//time,data,simulation
          } 
        }
      
        trigerPlotTrajectory(dataCasesUpload, simH, 'plot-sampleTraj')
        let bestPonitTable = document.getElementById('bestResult-table')
        let rows = bestPonitTable.querySelectorAll('tr')
        rows[0].querySelectorAll('td')[1].querySelector('input').value = bestResults[0][Index.LogLik]
        for(i = 1; i < rows.length; i++) {
          let row = rows[i]
          let cols = row.querySelectorAll('td')
          cols[1].querySelector('input').value = bestResults[0][i]
        }
         
        /* Refreshing the plots in refinments*/ 
        for(let i = 0; i < 5; i++) {
          let bestValue = bestResults[0][plotIndex[i]]
          if(!fixedIndices.includes(plotIndex[i])){
            document.getElementById('limit1'+ Object.keys(Index)[plotIndex[i]]).value = bestValue * 0.8;
            if(plotIndex[i] === Index.f_l || plotIndex[i] === Index.f_n || plotIndex[i] === Index.f_a || 
            plotIndex[i] === Index.c || plotIndex[i] === Index.obsprob) {
              document.getElementById('limit2'+ Object.keys(Index)[plotIndex[i]]).value = Math.min(bestValue * 1.2, 1);
            } else {
              document.getElementById('limit2'+ Object.keys(Index)[plotIndex[i]]).value = bestValue * 1.2;
            }
            lowerLimit = lowerBoundsInit[plotIndex[i]] 
            upperLimit = (upperBoundsInit[plotIndex[i]] < bestValue) ? ( 1.2 * bestValue): upperBoundsInit[plotIndex[i]];
            param_lims[plotIndex[i]] = [lowerLimit,upperLimit];
            trigerPlot(bestResults, plotIndex[i], 'plot'+Object.keys(Index)[plotIndex[i]], bandwidth, param_lims[plotIndex[i]],indexPlot[i])
          }
        }
        console.log('Plots have been refreshed')

        updateRefinementsGenerateBtn(generateModelFlag, initalRefinPoints.length);
      }
      reader.readAsText(file);
      $('#ref-init-points').toggleClass('success');
      $('#ref-init-points').toggleClass('failure');
      }
    }
  }
  /*Download the csv file includes all the best results from all tabs. Also refresh plots based on this csv file*/ 
  let BestResultsButton = document.getElementById('buttonResults');
  BestResultsButton.onclick = function (iteration = 0) {
    bestResults = rmSameRow(bestResults);
    bestResults = bestResults.filter((row) => row[0] !== 0 && row[row.length - 1] < 0);
    bestPoint = bestResults[0];
    console.log('Plots have been refreshed')
    if(autoFlag) {
      Csv(bestResults, 'best-results'+ iteration + '.csv');
    } else {
      Csv(bestResults, 'best-results.csv');
    }
    for(let i = 0; i < 5; i++) {
      let bestValue = bestPoint[plotIndex[i]]
      if(!fixedIndices.includes(plotIndex[i])){
        document.getElementById('limit1'+ Object.keys(Index)[plotIndex[i]]).value = bestValue * 0.8;
        lowerLimit =  0.5 * bestValue
        if(plotIndex[i] === Index.f_l || plotIndex[i] === Index.f_n || plotIndex[i] === Index.f_a || 
        plotIndex[i] === Index.c || plotIndex[i] === Index.obsprob) {
          document.getElementById('limit2'+ Object.keys(Index)[plotIndex[i]]).value = Math.min(bestValue * 1.2, 1);
          upperLimit = (1.5 * bestValue < 1) ? ( 1.5 * bestValue): 1;
        } else {
          document.getElementById('limit2'+ Object.keys(Index)[plotIndex[i]]).value = bestValue * 1.2;
          upperLimit = 1.5 * bestValue
        }
        
        param_lims[plotIndex[i]] = [lowerLimit,upperLimit];
        setTimeout(() => {
          trigerPlot(bestResults, plotIndex[i], 'plot'+Object.keys(Index)[plotIndex[i]], bandwidth, param_lims[plotIndex[i]], indexPlot[i])
        });
      }
    }
    
    /* data in simHarranged in needed for ploting sample trajectory*/
    let simH = mathLib.TrajIntegrate(bestResults[0], populationData, birthData, dataCasesUpload, times, modelTimestep);
    simH.shift();
  
    let dataSampleTraj = []
    for (let i = 0; i < dataCasesUpload.length; i++) {
      if(!isNaN(dataCasesUpload[i][1])) {
        dataSampleTraj.push(Number(dataCasesUpload[i][1]))//time,data,simulation
      } 
    }

    trigerPlotTrajectory(dataCasesUpload, simH, 'plot-sampleTraj')
    let bestPonitTable = document.getElementById('bestResult-table')
    let rows = bestPonitTable.querySelectorAll('tr')
    rows[0].querySelectorAll('td')[1].querySelector('input').value = bestResults[0][Index.LogLik]
    for(i = 1; i < rows.length; i++) {
      let row = rows[i]
      let cols = row.querySelectorAll('td')
      cols[1].querySelector('input').value = bestResults[0][i]
    }

    return bestResults;
  }
  let runAllButton = document.getElementById('buttonRunAll');
  let runButtonR0 = document.getElementById('buttonRunR0');$('#buttonRunAll').removeClass('disabled')
  let downloadButtonR0 = document.getElementById('R0ButtonDownload');
  let runButtonAmplitude = document.getElementById('buttonRunAmplitude')
  let downloadButtonAmplitude = document.getElementById('amplitudeButtonDownload')
  let runButtonMu = document.getElementById('buttonRunMu')
  let downloadButtonMu = document.getElementById('muButtonDownload')
  let runButtonRho = document.getElementById('buttonRunRho')
  let downloadButtonRho = document.getElementById('rhoButtonDownload')
  let runButtonPsi = document.getElementById('buttonRunPsi')
  let downloadButtonPsi = document.getElementById('psiButtonDownload')
  let autoSwitch = document.getElementById('auto-switch')
/* run All*/
  runAllButton.onclick = async function () {
    if ($('#buttonRunAll').hasClass('disabled')) {
      return false;
    }
    if(autoFlag ==1 ) {
      $('#ref-init-points').addClass('success');
      $('#ref-init-points').removeClass('failure');
    }  
    $('#buttonResults').removeClass('disabled');
    if ($('#buttonRunAll').hasClass('running')) {
      runAllButton.innerText = "Run All";
      $('#buttonRunAll').removeClass('running');

      if(!fixedIndices.includes(Index.R0)) setTimeout(() => runButtonR0.onclick('cancelOnly'), 0);
      if(!fixedIndices.includes(Index.amplitude)) setTimeout(() => runButtonAmplitude.onclick('cancelOnly'), 0);
      if(!fixedIndices.includes(Index.mu)) setTimeout(() => runButtonMu.onclick('cancelOnly'), 0);
      if(!fixedIndices.includes(Index.rho)) setTimeout(() => runButtonRho.onclick('cancelOnly'), 0);
      if(!fixedIndices.includes(Index.psi)) setTimeout(() => runButtonPsi.onclick('cancelOnly'), 0);
      return;
    }
    if(!(generateModelFlag && initalRefinPoints.length)) {
        alert('Upload the data first!')
    } else {  
      runAllButton.innerText = 'Cancel All';
      $('#buttonRunAll').removeClass('disabled');
      $('#buttonRunAll').addClass('running');
      BestResultsButton.style.display = '';

      let estimbuttuns = [
        runButtonR0,
        runButtonAmplitude,
        runButtonMu,
        runButtonRho,
        runButtonPsi,
      ];
      let buttons = []
      for (let i = 0; i < estimbuttuns.length; i++) {
        if(!fixedIndices.includes(plotIndex[i])) {
          buttons.push(estimbuttuns[i])
        }
      }

      // This is cheating: to avoid creating 12 keystore modals at once,
      // send a request using the protocol which will prompt for one before continuing 
      await dcp.protocol.send('addresses');
      let completePromises = buttons.map(button => {
        return new Promise(resolve => {
          setTimeout(() => {
            let job = button.onclick();
            if (!job) console.error("JOB IS NOT RETURNED");
            job.on('complete', resolve);
          }, 0);
        });
      });
      
      await Promise.all(completePromises);
      runAllButton.innerText = "Run All";
      $('#buttonRunAll').removeClass('running');
      $('#buttonRunAll').removeClass('disabled');
    }
  } 
  /* R0*/
  runButtonR0.onclick = function (cancelOnly=false) {
    
    if ($('#buttonRunR0').hasClass('disabled')) {
      return false;
    }
    
    if ($('#buttonRunR0').hasClass('running')) {
      jobs['R0'].cancel();
      specialLog('#special-log-R0', 'Cancelling job...');
      runButtonR0.innerText = "Generate & Run";
      $('#buttonRunR0').removeClass('running');
      setTimeout(() => $('#buttonRunAll').removeClass('disabled'),0);
      $('#buttonRunAll').addClass('running')
      return;
    } else if (cancelOnly === 'cancelOnly') return;

    if(!(generateModelFlag && initalRefinPoints.length)) {
        alert('Upload the data first!')
    } else {
      let area = document.querySelector('#special-log-R0');
      area.value ='';
      if (!$('#buttonRunAll').hasClass('running')) {
        $('#buttonRunAll').addClass('disabled');
      }
      indexAll[Index.R0] = 0;

      runButtonR0.innerText = 'Cancel'
      downloadButtonR0.style.display = ''
      BestResultsButton.style.display = '';
      $('#buttonRunR0').addClass('running');
      $('#R0ButtonDownload').addClass('disabled');
      logScale = 0, flagBound = 0

      lowerLimit = document.getElementById('limit1R0').value
      upperLimit = document.getElementById('limit2R0').value
      lowerLimit = Number(lowerLimit);
      upperLimit = Number(upperLimit);
      param_lims[Index.R0] = [lowerLimit,upperLimit]

      if (autoFlag) {
        NoPoints = Number(document.getElementById('refineIterationNumber').value);
      } else {
        NoPoints = Number(document.getElementById('NumberOfPoints').value);
      }

      flagBound = flagBoundArray[Index.R0]
      if(fixedIndices.includes(Index.R0)) {
        flagBound = 0;
      }

      let generatedSet = generate.generateSet(initalRefinPoints, Index.R0, logScale, [lowerLimit,upperLimit], flagBound, NoPoints);
      let accumulatedResults = []
      
      let job = jobs['R0'] = runComputeFor(generatedSet, populationData, birthData, dataCasesUpload, times, indexAll, modelTimestep);
      job.on('myCustomError', (e) => {
        specialLog('#special-log-R0', 'Failed to deploy job: ' + e.message);
      });
      specialLog('#special-log-R0', 'Accessing Distributed Computer...');
      job.on('accepted', () => {
        specialLog('#special-log-R0', 'Job accepted, working...');
      })
      let resultsRetrieved = 0;

      job.on('result', function(res) {
        // Show the results come back from the workers in consule and html.
        if(typeof res != 'undefined') {
          if(res.result) {
            resultsRetrieved++;
            if(res.result[0] !== 0) {
              accumulatedResults.push(res.result);
              bestResults.push(res.result);
            }
            specialLog('#special-log-R0', res, resultsRetrieved / generatedSet.length);
            $('#R0ButtonDownload').removeClass('disabled');

            downloadButtonR0.onclick = function () {
              accumulatedResults.sort(mathLib.sortFunction);
              Csv(accumulatedResults,'R0.csv.csv');
            }
          }
        }
      });
      job.on('complete', async function(res) {
        await job.results.fetch();
        res = job.results.values();
        console.log('onComplete', res);
        runButtonR0.innerText = "Generate & Run"
        $('#buttonRunR0').removeClass('running');
        res = Array.from(res)
        res.sort(mathLib.sortFunction);
        specialLog('#special-log-R0', '\nJob complete! Click download for results.');
        res = Array.from(res)
        res.sort(mathLib.sortFunction);
        res = res.filter((row) => row[0] !== 0 && row[row.length - 1] < 0);
        $('#buttonRunAll').removeClass('disabled');

        downloadButtonR0.onclick = function () {
          Csv(res,'R0.csv.csv');
        }
      });
      return job;
    }
  } 

  /* amplitude*/
  runButtonAmplitude.onclick = function (cancelOnly=false) {
    
    if ($('#buttonRunAmplitude').hasClass('disabled')) {
      return false;
    }
    
    if ($('#buttonRunAmplitude').hasClass('running')) {
      jobs['amplitude'].cancel();
      specialLog('#special-log-amplitude', 'Cancelling job...');
      runButtonAmplitude.innerText = "Generate & Run";
      $('#buttonRunAmplitude').removeClass('running');
      setTimeout(() => $('#buttonRunAll').removeClass('disabled'),0);
      $('#buttonRunAll').addClass('running')
      return;
    } else if (cancelOnly === 'cancelOnly') return;

    if(!(generateModelFlag && initalRefinPoints.length)) {
        alert('Upload the data first!')
    } else {
      let area = document.querySelector('#special-log-amplitude');
      area.value ='';
      if (!$('#buttonRunAll').hasClass('running')) {
        $('#buttonRunAll').addClass('disabled');
      }
      indexAll[Index.amplitude] = 0;

      runButtonAmplitude.innerText = 'Cancel'
      downloadButtonAmplitude.style.display = ''
      BestResultsButton.style.display = '';
      $('#buttonRunAmplitude').addClass('running');
      $('#amplitudeButtonDownload').addClass('disabled');
      logScale = 0, flagBound = 0

      lowerLimit = document.getElementById('limit1amplitude').value
      upperLimit = document.getElementById('limit2amplitude').value
      lowerLimit = Number(lowerLimit);
      upperLimit = Number(upperLimit);
      param_lims[Index.amplitude] = [lowerLimit,upperLimit]

      if (autoFlag) {
        NoPoints = Number(document.getElementById('refineIterationNumber').value);
      } else {
        NoPoints = Number(document.getElementById('NumberOfPoints').value);
      }

      flagBound = flagBoundArray[Index.amplitude]
      if(fixedIndices.includes(Index.amplitude)) {
        flagBound = 0;
      }

      let generatedSet = generate.generateSet(initalRefinPoints, Index.amplitude, logScale, [lowerLimit,upperLimit], flagBound, NoPoints);
      let accumulatedResults = []
      
      let job = jobs['ampitude'] = runComputeFor(generatedSet, populationData, birthData, dataCasesUpload, times, indexAll, modelTimestep);
      job.on('myCustomError', (e) => {
        specialLog('#special-log-amplitude', 'Failed to deploy job: ' + e.message);
      });
      specialLog('#special-log-amplitude', 'Accessing Distributed Computer...');
      job.on('accepted', () => {
        specialLog('#special-log-amplitude', 'Job accepted, working...');
      })
      let resultsRetrieved = 0;

      job.on('result', function(res) {
        // Show the results come back from the workers in consule and html.
        if(typeof res != 'undefined') {
          if(res.result) {
            resultsRetrieved++;
            if(res.result[0] !== 0) {
              accumulatedResults.push(res.result);
              bestResults.push(res.result);
            }
            specialLog('#special-log-amplitude', res, resultsRetrieved / generatedSet.length);
            $('#amplitudeButtonDownload').removeClass('disabled');

            downloadButtonAmplitude.onclick = function () {
              accumulatedResults.sort(mathLib.sortFunction);
              Csv(accumulatedResults,'amplitude.csv.csv');
            }
          }
        }
      });
      job.on('complete', async function(res) {
        await job.results.fetch();
        res = job.results.values();
        console.log('onComplete', res);
        runButtonAmplitude.innerText = "Generate & Run"
        $('#buttonRunAmplitude').removeClass('running');
        res = Array.from(res)
        res.sort(mathLib.sortFunction);
        specialLog('#special-log-amplitude', '\nJob complete! Click download for results.');
        res = Array.from(res)
        res.sort(mathLib.sortFunction);
        res = res.filter((row) => row[0] !== 0 && row[row.length - 1] < 0);
        $('#buttonRunAll').removeClass('disabled');

        downloadButtonAmplitude.onclick = function () {
          Csv(res,'amplitude.csv.csv');
        }
      });
      return job;
    }
  } 

  /* mu*/
  runButtonMu.onclick = function (cancelOnly=false) {
    
    if ($('#buttonRunMu').hasClass('disabled')) {
      return false;
    }
    
    if ($('#buttonRunMu').hasClass('running')) {
      jobs['mu'].cancel();
      specialLog('#special-log-mu', 'Cancelling job...');
      runButtonMu.innerText = "Generate & Run";
      $('#buttonRunMu').removeClass('running');
      setTimeout(() => $('#buttonRunAll').removeClass('disabled'),0);
      $('#buttonRunAll').addClass('running')
      return;
    } else if (cancelOnly === 'cancelOnly') return;

    if(!(generateModelFlag && initalRefinPoints.length)) {
        alert('Upload the data first!')
    } else {
      let area = document.querySelector('#special-log-mu');
      area.value ='';
      if (!$('#buttonRunAll').hasClass('running')) {
        $('#buttonRunAll').addClass('disabled');
      }
      indexAll[Index.mu] = 0;

      runButtonMu.innerText = 'Cancel'
      downloadButtonMu.style.display = ''
      BestResultsButton.style.display = '';
      $('#buttonRunMu').addClass('running');
      $('#muButtonDownload').addClass('disabled');
      logScale = 0, flagBound = 0

      lowerLimit = document.getElementById('limit1mu').value
      upperLimit = document.getElementById('limit2mu').value
      lowerLimit = Number(lowerLimit);
      upperLimit = Number(upperLimit);
      param_lims[Index.mu] = [lowerLimit,upperLimit]

      if (autoFlag) {
        NoPoints = Number(document.getElementById('refineIterationNumber').value);
      } else {
        NoPoints = Number(document.getElementById('NumberOfPoints').value);
      }

      flagBound = flagBoundArray[Index.mu]
      if(fixedIndices.includes(Index.mu)) {
        flagBound = 0;
      }

      let generatedSet = generate.generateSet(initalRefinPoints, Index.mu, logScale, [lowerLimit,upperLimit], flagBound, NoPoints);
      let accumulatedResults = []
      
      let job = jobs['mu'] = runComputeFor(generatedSet, populationData, birthData, dataCasesUpload, times, indexAll, modelTimestep);
      job.on('myCustomError', (e) => {
        specialLog('#special-log-mu', 'Failed to deploy job: ' + e.message);
      });
      specialLog('#special-log-mu', 'Accessing Distributed Computer...');
      job.on('accepted', () => {
        specialLog('#special-log-mu', 'Job accepted, working...');
      })
      let resultsRetrieved = 0;

      job.on('result', function(res) {
        // Show the results come back from the workers in consule and html.
        if(typeof res != 'undefined') {
          if(res.result) {
            resultsRetrieved++;
            if(res.result[0] !== 0) {
              accumulatedResults.push(res.result);
              bestResults.push(res.result);
            }
            specialLog('#special-log-mu', res, resultsRetrieved / generatedSet.length);
            $('#muButtonDownload').removeClass('disabled');

            downloadButtonMu.onclick = function () {
              accumulatedResults.sort(mathLib.sortFunction);
              Csv(accumulatedResults,'mu.csv.csv');
            }
          }
        }
      });
      job.on('complete', async function(res) {
        await job.results.fetch();
        res = job.results.values();
        console.log('onComplete', res);
        runButtonMu.innerText = "Generate & Run"
        $('#buttonRunMu').removeClass('running');
        res = Array.from(res)
        res.sort(mathLib.sortFunction);
        specialLog('#special-log-mu', '\nJob complete! Click download for results.');
        res = Array.from(res)
        res.sort(mathLib.sortFunction);
        res = res.filter((row) => row[0] !== 0 && row[row.length - 1] < 0);
        $('#buttonRunAll').removeClass('disabled');

        downloadButtonMu.onclick = function () {
          Csv(res,'mu.csv.csv');
        }
      });
      return job;
    }
  } 

  /* rho*/
  runButtonRho.onclick = function (cancelOnly=false) {
    
    if ($('#buttonRunRho').hasClass('disabled')) {
      return false;
    }
    
    if ($('#buttonRunRho').hasClass('running')) {
      jobs['rho'].cancel();
      specialLog('#special-log-rho', 'Cancelling job...');
      runButtonRho.innerText = "Generate & Run";
      $('#buttonRunRho').removeClass('running');
      setTimeout(() => $('#buttonRunAll').removeClass('disabled'),0);
      $('#buttonRunAll').addClass('running')
      return;
    } else if (cancelOnly === 'cancelOnly') return;

    if(!(generateModelFlag && initalRefinPoints.length)) {
        alert('Upload the data first!')
    } else {
      let area = document.querySelector('#special-log-rho');
      area.value ='';
      if (!$('#buttonRunAll').hasClass('running')) {
        $('#buttonRunAll').addClass('disabled');
      }
      indexAll[Index.rho] = 0;

      runButtonRho.innerText = 'Cancel'
      downloadButtonRho.style.display = ''
      BestResultsButton.style.display = '';
      $('#buttonRunRho').addClass('running');
      $('#rhoButtonDownload').addClass('disabled');
      logScale = 0, flagBound = 0

      lowerLimit = document.getElementById('limit1rho').value
      upperLimit = document.getElementById('limit2rho').value
      lowerLimit = Number(lowerLimit);
      upperLimit = Number(upperLimit);
      param_lims[Index.rho] = [lowerLimit,upperLimit]

      if (autoFlag) {
        NoPoints = Number(document.getElementById('refineIterationNumber').value);
      } else {
        NoPoints = Number(document.getElementById('NumberOfPoints').value);
      }

      flagBound = flagBoundArray[Index.rho]
      if(fixedIndices.includes(Index.rho)) {
        flagBound = 0;
      }

      let generatedSet = generate.generateSet(initalRefinPoints, Index.rho, logScale, [lowerLimit,upperLimit], flagBound, NoPoints);
      let accumulatedResults = []
      
      let job = jobs['rho'] = runComputeFor(generatedSet, populationData, birthData, dataCasesUpload, times, indexAll, modelTimestep);
      job.on('myCustomError', (e) => {
        specialLog('#special-log-rho', 'Failed to deploy job: ' + e.message);
      });
      specialLog('#special-log-rho', 'Accessing Distributed Computer...');
      job.on('accepted', () => {
        specialLog('#special-log-rho', 'Job accepted, working...');
      })
      let resultsRetrieved = 0;

      job.on('result', function(res) {
        // Show the results come back from the workers in consule and html.
        if(typeof res != 'undefined') {
          if(res.result) {
            resultsRetrieved++;
            if(res.result[0] !== 0) {
              accumulatedResults.push(res.result);
              bestResults.push(res.result);
            }
            specialLog('#special-log-rho', res, resultsRetrieved / generatedSet.length);
            $('#rhoButtonDownload').removeClass('disabled');

            downloadButtonRho.onclick = function () {
              accumulatedResults.sort(mathLib.sortFunction);
              Csv(accumulatedResults,'rho.csv.csv');
            }
          }
        }
      });
      job.on('complete', async function(res) {
        await job.results.fetch();
        res = job.results.values();
        console.log('onComplete', res);
        runButtonRho.innerText = "Generate & Run"
        $('#buttonRunRho').removeClass('running');
        res = Array.from(res)
        res.sort(mathLib.sortFunction);
        specialLog('#special-log-rho', '\nJob complete! Click download for results.');
        res = Array.from(res)
        res.sort(mathLib.sortFunction);
        res = res.filter((row) => row[0] !== 0 && row[row.length - 1] < 0);
        $('#buttonRunAll').removeClass('disabled');

        downloadButtonRho.onclick = function () {
          Csv(res,'rho.csv.csv');
        }
      });
      return job;
    }
  } 

  /* psi*/
  runButtonPsi.onclick = function (cancelOnly=false) {
    
    if ($('#buttonRunPsi').hasClass('disabled')) {
      return false;
    }
    
    if ($('#buttonRunpsi').hasClass('running')) {
      jobs['psi'].cancel();
      specialLog('#special-log-psi', 'Cancelling job...');
      runButtonPsi.innerText = "Generate & Run";
      $('#buttonRunPsi').removeClass('running');
      setTimeout(() => $('#buttonRunAll').removeClass('disabled'),0);
      $('#buttonRunAll').addClass('running')
      return;
    } else if (cancelOnly === 'cancelOnly') return;

    if(!(generateModelFlag && initalRefinPoints.length)) {
        alert('Upload the data first!')
    } else {
      let area = document.querySelector('#special-log-psi');
      area.value ='';
      if (!$('#buttonRunAll').hasClass('running')) {
        $('#buttonRunAll').addClass('disabled');
      }
      indexAll[Index.psi] = 0;

      runButtonPsi.innerText = 'Cancel'
      downloadButtonPsi.style.display = ''
      BestResultsButton.style.display = '';
      $('#buttonRunPsi').addClass('running');
      $('#psiButtonDownload').addClass('disabled');
      logScale = 0, flagBound = 0

      lowerLimit = document.getElementById('limit1psi').value
      upperLimit = document.getElementById('limit2psi').value
      lowerLimit = Number(lowerLimit);
      upperLimit = Number(upperLimit);
      param_lims[Index.psi] = [lowerLimit,upperLimit]

      if (autoFlag) {
        NoPoints = Number(document.getElementById('refineIterationNumber').value);
      } else {
        NoPoints = Number(document.getElementById('NumberOfPoints').value);
      }

      flagBound = flagBoundArray[Index.psi]
      if(fixedIndices.includes(Index.psi)) {
        flagBound = 0;
      }

      let generatedSet = generate.generateSet(initalRefinPoints, Index.psi, logScale, [lowerLimit,upperLimit], flagBound, NoPoints);
      let accumulatedResults = []
      
      let job = jobs['psi'] = runComputeFor(generatedSet, populationData, birthData, dataCasesUpload, times, indexAll, modelTimestep);
      job.on('myCustomError', (e) => {
        specialLog('#special-log-psi', 'Failed to deploy job: ' + e.message);
      });
      specialLog('#special-log-psi', 'Accessing Distributed Computer...');
      job.on('accepted', () => {
        specialLog('#special-log-psi', 'Job accepted, working...');
      })
      let resultsRetrieved = 0;

      job.on('result', function(res) {
        // Show the results come back from the workers in consule and html.
        if(typeof res != 'undefined') {
          if(res.result) {
            resultsRetrieved++;
            if(res.result[0] !== 0) {
              accumulatedResults.push(res.result);
              bestResults.push(res.result);
            }
            specialLog('#special-log-psi', res, resultsRetrieved / generatedSet.length);
            $('#psiButtonDownload').removeClass('disabled');

            downloadButtonPsi.onclick = function () {
              accumulatedResults.sort(mathLib.sortFunction);
              Csv(accumulatedResults,'psi.csv.csv');
            }
          }
        }
      });
      job.on('complete', async function(res) {
        await job.results.fetch();
        res = job.results.values();
        console.log('onComplete', res);
        runButtonPsi.innerText = "Generate & Run"
        $('#buttonRunPsi').removeClass('running');
        res = Array.from(res)
        res.sort(mathLib.sortFunction);
        specialLog('#special-log-psi', '\nJob complete! Click download for results.');
        res = Array.from(res)
        res.sort(mathLib.sortFunction);
        res = res.filter((row) => row[0] !== 0 && row[row.length - 1] < 0);
        $('#buttonRunAll').removeClass('disabled');

        downloadButtonPsi.onclick = function () {
          Csv(res,'psi.csv.csv');
        }
      });
      return job;
    }
  } 
}

// Helper functions
function Csv (res, type) {
  res = [nameArray].concat(res);
  var csv = ''
  res.forEach(function (row) {
    csv += row.join(',')
    csv += '\n'
  })
  var hiddenElement = document.createElement('a')
  hiddenElement.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  hiddenElement.setAttribute('download', type)
  hiddenElement.click()
}

// log to initial search display.
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

function rmSameRow(allSets) {
  allSets.sort(mathLib.sortFunction);

  let finalSet = [allSets[0]];
  size = allSets[0].length - 1;
  for (let i = 1; i < allSets.length; i++) {
    while(allSets[i - 1][size].toFixed(8) === allSets[i][size].toFixed(8) ) {
      if(i < allSets.length - 1) {
        i++;
      }else {
        break;
      } 
    } 
    finalSet.push(allSets[i]);
  }
  return finalSet; 
}
function plot2D(data, PlotParamName, xTitle) {

  var layout = {
    width: 600,
    height: 600,
    autosize: false,
    margin: {'b': 100},
    xaxis: {
      title: {
        text: xTitle,// '$\\omega $',
        font: {
          family: 'Courier New, monospace',
          size: 20,
          color: '#7f7f7f'
        }
      },
    },
    scene: {
      xaxis: {
      },
      yaxis: {
        title: "F",
        rangemode: 'tozero',
      }
    },
    
    legend: {
    x: 1,
    y: 1
    }
  };

  Plotly.newPlot(PlotParamName, data, layout, { scrollZoom: true }); 
}

document.addEventListener("DOMContentLoaded", () => {
  
  document.querySelector('#special-log-sobol').value = '';
  document.querySelector('#special-log-R0').value = '';
  document.querySelector('#special-log-amplitude').value = '';
  document.querySelector('#special-log-mu').value = '';
  document.querySelector('#special-log-rho').value = '';
  document.querySelector('#special-log-psi').value = '';

  $('.interact > .disabled').click(function(evt) {
    if ($(this).hasClass('disabled')) {
      evt.preventDefault();
      evt.stopPropagation();
      evt.returnValue = false;
      return false;
    }
  });

  fetch('js/worker-bundle.js')
    .then(response => response.text())
    .then((workerBundle) => {
      // self.workerfn gets set by the workerBundle (see worker-src/index.js)
      const workerFn = `(async (...args) => {
        ${workerBundle}
        // Local exec
        //console.log(await self.workerfn(...args));
        return await self.workerfn(...args);
      })`;
      
      start(workerFn)
  });
});

function trigerPlot(bestResults,indexPlot, PlotParamName, bandwidth, param_lims, xTitle) {
  let pairs = [];
  let interpolateX =[], interpolateY = [];
  let plotData = plotProfile(bestResults, indexPlot, param_lims);
  
  if (plotData < 0) {
    return 0;
  }
  if(plotData[0][0] === plotData[0][1]) {
    return 0
  }
  var trace1 = {
    x: plotData[0],
    y: plotData[1],
    mode: 'markers',
    marker: {
      color: '#2ed573',
      size: 3,
      line: {
        color: '2ed573',
        width: 2
      }
    },
    name: 'Actual'
  }; 
     
  for(let i = 0; i < plotData[0].length; i++) {
    pairs.push([plotData[0][i],plotData[1][i]])
  }
  mathLib.sortAscendingByKey(pairs, 0)

  bandwidth = .6
  let fit = loess2(plotData, bandwidth)
  let interpolateResult = fit.fitted
  var upperLimitplot = fit.fitted.map((yhat, idx) => yhat + fit.halfwidth[idx])
  var lowerLimitplot = fit.fitted.map((yhat, idx) => yhat - fit.halfwidth[idx])
  
  var trace2 = {
    x: plotData[0],
    y: lowerLimitplot,
    mode: 'lines',
    line: {color: "#D3D3D3"},
    showlegend: false
  }; 

  var trace3 = {
    x: plotData[0],
    y: upperLimitplot,
    mode: 'lines',
    line: {color: "#D3D3D3"},
    fill: 'tonexty',
    name: ' Uncertainty'
  };

  var trace4 = {
    x: plotData[0],
    y: interpolateResult,
    mode: 'lines',
    line: {color: "#000000"},
    name:'Fitted'
  }; 
  
  var dataPlot = [trace1, trace2, trace3, trace4];
  plot2D(dataPlot, PlotParamName, xTitle)
}

function trigerPlotTrajectory(dataInput, simHarranged, PlotParamName) {
  let times = [];
  let data = [];

  for (let i = 0; i < dataInput.length; i++) {
    times.push(Number(dataInput[i][0]));
    data.push(Number(dataInput[i][1]));
  }

  var trace1 = {
    x: times,
    y: data,
    mode: 'lines',
    line: {color: "#00a473"},
    name: 'data'
  }; 

  var trace2 = {
    x: times,
    y: simHarranged,
    mode: 'lines',
    line: {color: "#1c3583"},
    name: ' trajectory'
  };

  var dataPlot = [trace1, trace2];
  plot2D(dataPlot, PlotParamName)
}