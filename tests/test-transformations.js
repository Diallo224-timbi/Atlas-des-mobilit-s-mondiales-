/* Test minimal sans bibliothèque externe : logique de regroupement et de catégories. */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const code = fs.readFileSync(__dirname + '/../src/app.js', 'utf8').replace(/bindControls\(\);start\(\);\s*$/, '');
const d3stub = {
  csvParse(text) {
    const [headers,...lines]=text.trim().split(/\r?\n/).map(s=>s.split(','));
    const rows=lines.map(vals=>Object.fromEntries(headers.map((h,i)=>[h,vals[i]])));
    rows.columns=headers;
    return rows;
  },
  csvParseRows(text) { return text.trim().split(/\r?\n/).map(s=>s.split(',')); },
  sum(arr,fn) { return arr.reduce((a,x)=>a+fn(x),0); }
};
const ctx={ d3:d3stub, Intl, console, document: {}, window:{} };
vm.createContext(ctx);
vm.runInContext(code,ctx);
const visas='Passport,Destination,Requirement\nFR,DZ,90\nFR,GB,eta\nFR,FR,-1\nDZ,FR,visa required\nDZ,DZ,-1\nDZ,GB,e-visa';
vm.runInContext(`model.countryAliases = {'france':'FR','algeria':'DZ','unitedkingdom':'GB'};`,ctx);
ctx.visas=visas;
vm.runInContext('parseVisa(visas)',ctx);
const airports='1,CDG,Paris,France,CDG,L,48.8,2.5\n2,ALG,Alger,Algeria,ALG,L,36.7,3.2\n3,LHR,London,United Kingdom,LHR,L,51.5,-0.4';
const routes='AF,1,CDG,1,ALG,2,,0,320\nAF,1,CDG,1,ALG,2,,0,320\nBA,1,LHR,3,CDG,1,,0,777\nAF,1,CDG,1,LHR,3,,0,320';
ctx.airports=airports;ctx.routes=routes;
vm.runInContext('parseFlights(airports,routes);calculateStats();',ctx);
assert.strictEqual(vm.runInContext(`visaType('90')`,ctx),'free');
assert.strictEqual(vm.runInContext(`visaType('eta')`,ctx),'eta');
assert.strictEqual(vm.runInContext(`visaType('e-visa')`,ctx),'evisa');
assert.strictEqual(vm.runInContext(`model.stats.get('FR').score`,ctx),2);
assert.strictEqual(vm.runInContext(`model.stats.get('FR').connected`,ctx),2);
assert.strictEqual(vm.runInContext(`model.stats.get('FR').routeEntries`,ctx),3);
assert.strictEqual(vm.runInContext(`model.routesByPassport.get('FR')[0].count`,ctx),2);
assert.strictEqual(vm.runInContext(`model.stats.get('DZ').required`,ctx),1);
console.log('Tests OK : catégories de visa, mapping pays/aéroports, routes et indicateurs.');
