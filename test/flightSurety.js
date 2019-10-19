
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
var Web3 = require('web3');
let web33 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));

const AIRLINE_FUNDED_AMOUNT = web3.utils.toWei('10', 'ether');

const FLIGHT_CODE = 'ND1309';
const TIMESTAMP = Math.floor(Date.now() / 1000);


contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

 it('(Multiparty Consensus) Only existing airline may register a new airline until there are at least four airlines registered', async () => {

    // ARRANGE
    let airline1 = accounts[1];
    let airline2 = accounts[2];
    let airline3 = accounts[3];
    let airline4 = accounts[4];

    let fundingAmount = 10000000000000000000; // 10 ether

    await config.flightSuretyApp.fundAirline(airline1, {from: config.firstAirline, value: fundingAmount});
    await config.flightSuretyApp.registerAirline(airline2, {from: config.firstAirline});
    await config.flightSuretyApp.fundAirline(airline2, {from: config.firstAirline, value: fundingAmount});
    await config.flightSuretyApp.registerAirline(airline3, {from: config.firstAirline});
    await config.flightSuretyApp.fundAirline(airline3, {from: config.firstAirline, value: fundingAmount});
    await config.flightSuretyApp.registerAirline(airline4, {from: config.firstAirline});
    await config.flightSuretyApp.fundAirline(airline4, {from: config.firstAirline, value: fundingAmount});

    let register1 = await config.flightSuretyData.isAirlineRegistered.call(config.firstAirline);
    let register2 = await config.flightSuretyData.isAirlineRegistered.call(airline2);
    let register3 = await config.flightSuretyData.isAirlineRegistered.call(airline3);
    let register4 = await config.flightSuretyData.isAirlineRegistered.call(airline4);

    // ASSERT
    assert.equal(register1, true, "airline1 not registered");
    assert.equal(register2, true, "airline2 not registered");
    assert.equal(register3, true, "airline3 not registered");
    assert.equal(register4, true, "airline3 not registered");

});

it('(Multiparty Consensus) Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines', async () => {

    // ARRANGE
    let airline2 = accounts[2];
    let airline3 = accounts[3];
    let airline4 = accounts[4];

    let airline5 = accounts[5];

    let fundingAmount = 10000000000000000000;

    await config.flightSuretyApp.registerAirline(airline5, {from: airline3});
    await config.flightSuretyApp.registerAirline(airline5, {from: airline2});
    await config.flightSuretyApp.fundAirline(airline5, {from: config.firstAirline, value: fundingAmount});

    let register2 = await config.flightSuretyData.isAirlineRegistered.call(airline2);
    let register3 = await config.flightSuretyData.isAirlineRegistered.call(airline3);
    let register4 = await config.flightSuretyData.isAirlineRegistered.call(airline4);
    let register5 = await config.flightSuretyData.isAirlineRegistered.call(airline5);

    // ASSERT
    assert.equal(register2, true, "register2 call failed");
    assert.equal(register3, true, "register3 call failed");
    assert.equal(register4, true, "register4 call failed");

    assert.equal(register5, true, "register5 call failed");
});

it('(Airlines) Airline can be registered, but does not participate in contract until it submits funding of 10 ether', async () => {

    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    } catch (e) {

    }
    let registered = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
    let funded = await config.flightSuretyData.isAirlineFunded.call(newAirline);

    // ASSERT
    assert.equal(registered === true && funded === true, true, "Airline can be registered, but does not participate in contract until it submits funding of 10 ether");

});

  

  it('(flight) a funded airline can register a flight', async () => {
      // ARRANGE
      //const flightCode = 'ND1309';
      //let timestamp = Math.floor(Date.now() / 1000);
      let airlineAddress = accounts[1];
    
      const flightCode = FLIGHT_CODE;
      let timestamp = TIMESTAMP;
    
      // ACT
      let before = await config.flightSuretyApp.isFlightRegistered.call(airlineAddress, flightCode, timestamp);
      await config.flightSuretyApp.registerFlight(airlineAddress, flightCode, timestamp);
      let after = await config.flightSuretyApp.isFlightRegistered.call(airlineAddress, flightCode, timestamp);
      // ASSERT
      assert.equal(before, false, "Flight is already registered");
      assert.equal(after, true, "Fligh not registered");

  });

  it('(passangers) can not pay more than 1eth to purchase flight insurance', async () => {

    //ARRANGE
    let passanger = accounts[10];
    const amount = web3.utils.toWei('2', 'ether');
    let airlineAddress = accounts[1];
    const flightCode = FLIGHT_CODE;
    let timestamp = TIMESTAMP;

    //ACT
    let isPurchased = true;
    try
    {
        await config.flightSuretyApp.purchaseInsurance(flightCode, timestamp, airlineAddress, {value: amount, from: passanger});

    }
    catch(e)
    {
        //console.log(e);
        isPurchased = false;

    }
    
    //ASSERT
    assert.equal(isPurchased, false, "Not possible to purchase");
  });

  it('(passangers) may pay up to 1 ether for purchasing flight insurance', async () => {

    // ARRANGE
    let passenger = accounts[11];
    
    const amount = web3.utils.toWei('1', 'ether');
    let airlineAddress = accounts[1];
    const flightCode = FLIGHT_CODE;
    let timestamp = TIMESTAMP;

    let isRegistered = false;
    let insuranceAmount = 0;
    // ACT
    try
    {
 
        await config.flightSuretyApp.buyInsurancePassenger(flightCode, timestamp, airlineAddress, {value: amount, from: passenger});
        isRegistered = await config.flightSuretyData.isPassengerInsured.call(passenger);
        //console.log(`Is registered: ${isRegistered}`);
        insuranceAmount = await config.flightSuretyData.getInsuredAmount.call(flightCode, passenger);

    }
    catch(e)
    {
        //console.log(e);

    }
    
    // ASSSERT
    assert.equal(isRegistered, true, "Passanger is not registered");
    assert.equal(insuranceAmount, amount, "Insurance amount is not the same that the amount paid");


  });

  it('(passengers) flight delayed due to airline fault, passenger receives credit of 1.5X the amount they paid', async () => {

    // ARRANGE
    let airlineAddress = accounts[1];
    let passenger = accounts[11];
    const FLIGHT_DELAY_STATUS_CODE = 20
    const flightCode = FLIGHT_CODE;
    let timestamp = TIMESTAMP;


    let amountToPay = 0;
    // ACT
    try 
    {

        await config.flightSuretyApp.processFlightStatus(airlineAddress, flightCode, timestamp, FLIGHT_DELAY_STATUS_CODE);
        //resultCode = await config.flightSuretyData.getFlightStatus.call(airlineAddress, flightCode, timestamp);

        amountToPay = await config.flightSuretyData.getPassengerCredits.call(passenger);
        
    }
    catch(e)
    {
        // console.log(e);
    }
    
    // ASSERT
    assert.equal(web3.utils.fromWei(amountToPay, 'ether'), 1.5, "Amount to pay to the user is not correct");

  });
 

});
