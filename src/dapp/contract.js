import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        //this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.flights = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts(async (error, accts) => {
            this.owner = accts[0];

            let fakeAirline = ['Airline1', 'Airline2', 'Airline3', 'Airline4'];
            let fakeFlight = ['ER-2493', 'IB-9421', 'RY-5321', 'AI-8327'];
            let fakeFlightOrigin = ['A1', 'B1', 'C1', 'D1'];
            let fakeFlightDest = ['A2', 'B2', 'C2', 'D2'];


            //Airline Register
            for (let i = 0; i < 4; i++) {
                this.airlines.push({address: accts[i + 1], name: fakeAirline[i], fundBalance: 0});
            }
            this.registerAirlines(accts);

            //Airline Fund
            for (const airline of this.airlines) {
                let balance = await this.getAirlineFund(airline.address);
                if (balance < 10000000000000000000) { //10 ETH
                    await this.fundAirline(airline.address, "10", (error, result) => {
                    });
                }
                balance = await this.getAirlineFund(airline.address);
                console.log(airline.address, airline.name, balance);
            }


            //Flight
            for (let i = 0; i < 4; i++) {
                let time = Math.floor((Date.now() + (3600 * 1 + i)) / 1000);
                this.flights.push({
                    airline: accts[i + 1],
                    airlineName: fakeAirline[i],
                    flightNumber: fakeFlight[i],
                    time: time,
                    origin: fakeFlightOrigin[i],
                    dest: fakeFlightDest[i],
                });
            }
            this.registerFlights();


            for (let i = 0; i < 4; i++) {
                this.passengers.push(accts[i+4]);
            }

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({from: self.owner}, callback);
    }

    async getAirlineFund(address) {
        let self = this;

        return await self.flightSuretyApp.methods
            .getAirlineFund(address)
            .call({from: self.owner});
    }


    async registerAirlines(accts) {
        for (let i = 2; i < this.airlines.length + 1; i++) {
            let airlineAddress = accts[i];
            await this.flightSuretyApp.methods.registerAirline(airlineAddress).call({from: accts[1]});
        }
    }

    async registerFlights() {
        for (let i = 0; i < this.flights.length; i++) {
            console.log(this.flights[i]);
            await this.flightSuretyApp.methods
                .registerFlight(this.flights[i].airline, this.flights[i].flightNumber, this.flights[i].time)
                .call({from: self.owner});
        }
    }


    async fundAirline(airline, fundAmount, callback) {
        let self = this;
        let sendAmt = self.web3.utils.toWei(fundAmount, "ether").toString();

        await self.flightSuretyApp.methods
            .fundAirline(airline)
            .send({from: self.owner, value: sendAmt, gas: 3000000}, (error, result) => {
                if (error) {
                    console.log(error);
                } else {
                    let airlineName;
                    for (let i = 0; i < this.airlines.length; i++) {
                        if (self.airlines[i].address === airline) {
                            self.airlines[i].fundBalance += sendAmt;
                            airlineName = self.airlines[i].name;
                        }
                    }
                    callback(result, airlineName);
                }
            });
    }

    async fetchFlightStatus(flight, callback) {
        let self = this;
        let airline;
        for (const item of self.flights) {
            if (item.flightNumber === flight) {
                airline = item.airline;
                break;
            }
        }
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        };
        await self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    async flightStatusInfoEvent(callback) {
        let self = this;
        await self.flightSuretyApp.events.FlightStatusInfo({}, async function(error, event) {
            if(error) {
                console.log(`${error}`);
            } else {

                callback(event.returnValues);
            }
        })
    }

    async getPassengerCredits(passenger, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getPassengerCredits(passenger)
            .call({from: passenger}, (error, result) => {
                if (error) {
                    console.log(error);
                } else {
                    console.log(result);
                    callback(result);
                }
            });
    }

    async getPassengerBalance(passenger, callback) {
        let self = this;

        let balance = await self.web3.eth.getBalance(passenger);
        callback(balance);
    }

    async getContractBalance(callback) {
        let self = this;

        await self.flightSuretyApp.methods
            .getContractBalance()
            .call({from: self.owner}, callback);
    }

    async buyInsurancePassenger(flight, amount, callback) {
        let self = this;
        let sendAmount = self.web3.utils.toWei(amount, "ether").toString();

        let tempFlight;

        for (const item of self.flights) {
            if (item.flightNumber === flight) {
                tempFlight = item;
                break;
            }
        }

        console.log(self.owner);
        await self.flightSuretyApp.methods
            .buyInsurancePassenger(tempFlight.flightNumber, tempFlight.time, tempFlight.airline)
            .send({ from: self.passengers[0], value: sendAmount,  gas:3000000 }, (error, result) => {
                callback(error, result);
            });
    }

    async withdraw(passenger, callback){
        let self = this;

        await self.flightSuretyApp.methods
            .withdrawPayout()
            .send({from: passenger}, (error, result) => {
                if(error){
                    console.log(error);
                }else {
                    console.log(result);
                    callback(result);
                }
            });
    }
}