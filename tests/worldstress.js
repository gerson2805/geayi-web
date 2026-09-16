const fs = require('fs'), vm = require('vm');
require(__dirname + '/stubs.js');
const DIR = '/home/hatch/workspace/your_files/obby-3d/';
const FILES = ['state.js','i18n.js','audio.js','vehicles.js','world.js', 'neoncity.js','family.js','player.js','online.js','travel.js','phase3.js','powers.js','trophies.js','community.js','casa.js','pets.js','fishing.js','racing.js','weather.js','observatory.js','jobs.js','candy.js','citylife3.js','citylife1.js','citylife2.js','bridges.js','buildmode.js','funpark.js','bowling.js','train.js','monetiza.js','promos.js','dealership.js','waterpark.js','fireworks.js','zoo.js','concerts.js','carwash.js','castle.js','game.js','ranch.js'];
for (const f of FILES) vm.runInContext(fs.readFileSync(DIR+f,'utf8'), global.sandbox, {filename:f});
R('boot(); initThree(); Particles.init(); Avatar.build();');
let bad = 0;
for (let i = 0; i < 9; i++) {
  try {
    R(`startLevel(${i})`);
    R(`(function(){ for (let k=0;k<60;k++){ const dt=0.016; levelTime+=dt;
      updatePlayer(dt,{x:0.3,z:0,jump:k===10});
      updatePhase3(dt); _updateSmoke(dt); _updateSled(dt);
      if (typeof updateNPCs==='function') updateNPCs(dt);
      if (typeof updateCasa==='function') updateCasa(dt);
      if (typeof updatePets==='function') updatePets(dt);
      if (typeof updateFishing==='function') updateFishing(dt);
      if (typeof updateRacing==='function') updateRacing(dt);
      if (typeof updateObservatory==='function') updateObservatory(dt);
      if (typeof updateRanch==='function') updateRanch(dt);
      if (typeof updateWeather==='function') updateWeather(dt);
      if (typeof updateVehiclePrompt==='function') updateVehiclePrompt();
      if (typeof updateAirportPrompt==='function') updateAirportPrompt();
      if (typeof Train!=='undefined' && typeof Train.update==='function') Train.update(dt);
      if (typeof CarWash!=='undefined') CarWash.update(dt);
    } return true; })()`);
    // viaje: destinos disponibles
    const nd = R(`travelDests().length`);
    console.log(`mundo ${i+1}: OK (60 cuadros, ${nd} destinos de viaje)`);
  } catch (e) {
    bad++;
    console.log(`mundo ${i+1}: ✗ ${e.message}`);
  }
}
console.log(bad ? `FALLOS: ${bad}` : 'LOS 9 MUNDOS: OK');
