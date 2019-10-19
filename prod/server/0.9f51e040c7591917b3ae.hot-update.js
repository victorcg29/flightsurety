exports.id=0,exports.modules={"./build/contracts/FlightSuretyData.json":!1,"./src/server/server.js":function(e,t,s){"use strict";s.r(t);var o=s("./build/contracts/FlightSuretyApp.json"),r=s("./src/server/config.json"),n=s("web3"),a=s.n(n),l=s("express"),c=s.n(l);let u=r.localhost,i=new a.a(new a.a.providers.WebsocketProvider(u.url.replace("http","ws")));i.eth.defaultAccount=i.eth.accounts[0];let d=new i.eth.Contract(o.abi,u.appAddress),h=[];i.eth.getAccounts(async(e,t)=>{d.methods.REGISTRATION_FEE().call({from:t[0]},async(e,s)=>{let o=s.toString(),r=[],n=[];for(let e=10;e<40;e++)await d.methods.registerOracle().send({from:t[e],value:o,gas:3e6},async(s,o)=>{await d.methods.getMyIndexes().call({from:t[e]},(s,o)=>{n=o,r.push(t[e]),r.push(n),h.push(r),r=[]})})})}),d.events.OracleRequest({fromBlock:0},(async function(e,t){e&&console.log(e),console.log(t);let s,o,r=[0,10,20,30,40,50],n=r[Math.floor(Math.random()*r.length)];for(let e=0;e<h.length;e++)if(-1!==(s=h[e][1]).indexOf(index.toString())){o=h[e][0];try{await d.methods.submitOracleResponse(t.returnValues.index,t.returnValues.airline,t.returnValues.flight,t.returnValues.timestamp,n).send({from:o,gas:2e5},(e,t)=>{e?console.log(e):(console.log(t),console.log("Sent Oracle Response for "+o+" Status Code: "+n))})}catch(e){console.log(e)}}}));const g=c()();g.get("/api",(e,t)=>{t.send({message:"An API for use with your Dapp!"})}),t.default=g}};