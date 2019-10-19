import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async () => {
    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            displayOpeartionalStatus('Operational Status', 'Check if contract is operational', [{
                label: 'Operational Status',
                error: error,
                value: result
            }]);
        });

        async function getContractBalance() {
            await contract.getContractBalance((error, result) => {
                displayContractBal('Contract Balance:', result);
            })
        }

        getContractBalance();
        getPassengerCredits();
        getPassengerBalance();

        //UI
        populateSelect("airline", contract.airlines, 1);
        populateSelect("flights", contract.flights, 1);
        populateSelect("flights", contract.flights, 2);
        populateSelect("flights", contract.flights, 3);
        flightChange('flights', 1, contract.flights);
        flightChange('flights', 2, contract.flights);
        flightChange('flights', 3, contract.flights);
        DOM.elid('flights1').addEventListener('change', () => {
            flightChange('flights', 1, contract.flights);
        });
        DOM.elid('flights2').addEventListener('change', () => {
            flightChange('flights', 2, contract.flights);
        });
        DOM.elid('flights3').addEventListener('change', () => {
            flightChange('flights', 3, contract.flights);
        });

        DOM.elid('fund').addEventListener('click', () => {
            let airline = DOM.elid('airline1').value;
            let fundAmount = DOM.elid('fundAmount').value;
            // Write transaction
            if (fundAmount > 0) {
                contract.fundAirline(airline, fundAmount, (tx, result) => {
                    displayFund('Airline funding', [{
                        label: 'Funding status : ',
                        TXid: tx,
                        airline: result,
                        amount: fundAmount
                    }]);
                    getContractBalance();
                });
            } else {
                alert("Airlines need to pay >0 ETH.");
            }
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flights1').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                console.log(`RESULTTTT: ${result}`);
                displayFlightStatus('display-wrapper-flight-status', 'Oracles', 'Trigger oracles', '', [{
                    label: 'Fetch Flight Status',
                    error: error,
                    value: result.flight + ' ' + result.timestamp
                }]);

            });
        });

        DOM.elid('flight-status').addEventListener('click', () => {
            let flight = DOM.elid('flights3').value;
            // Write transaction
            let flightStatus = 0;

            contract.fetchFlightStatus(flight, (error, result) => {
                contract.flightStatusInfoEvent(result2 => {
                    console.log(result2);
                    flightStatus = result2.status;
                    displayFlightStatus('flightStatusInfo', 'Flight Status', result2.status, flightStatus, [{
                        label: 'Flight Status : ',
                        error: error,
                        value: result.flight + ' ' + result.timestamp
                    }]);
                    getPassengerBalance();
                    getPassengerCredits();
                });
            });
        });


        async function getPassengerCredits() {
            await contract.getPassengerCredits(contract.passengers[0], (result) => {
                //let creditText = DOM.elid('passCredit').value + " " + result;
                DOM.elid('passCreditAmt').textContent = result;
            });
        }

        DOM.elid('getCredit').addEventListener('click', () => {
            getPassengerCredits();
        });

        async function getPassengerBalance() {
            await contract.getPassengerBalance(contract.passengers[0], (result) => {
                DOM.elid('passBalAmt').textContent = result;
            });
        }

        DOM.elid('getBalance').addEventListener('click', () => {
            getPassengerBalance();
        });

        DOM.elid('buy').addEventListener('click', () => {
            let flight = DOM.elid('flights2').value;
            let amount = DOM.elid('insurance').value;
            // Write transaction
            if (amount !== "" || amount === 0) {
                contract.buyInsurancePassenger(flight, amount, (error, result) => {
                    let display = result;

                    displayInsurance('Insurance Purchase', [{
                        label: 'Purchase TX# : ',
                        text: display,
                        flight: flight,
                        amount: amount
                    }]);
                    if (!error) {
                        fillInsuranceInfo('Passenger is insured on : ', flight);
                        getContractBalance();
                        getPassengerBalance();
                    }
                });
            } else {
                alert("Insurance Amount is required and should be a number greater than zero.");
            }
        });

        DOM.elid('withdraw').addEventListener('click', () => {
            // Write transaction
            contract.withdraw(contract.passengers[0], (result) => {
                DOM.elid('withdraw-status').innerHTML = DOM.elid('withdraw-status').innerHTML + "<br> TX ID: " + result;
                getContractBalance();
                getPassengerCredits();
                getPassengerBalance();
            });

        })
    });


})();

function populateSelect(type, selectOpts, el) {
    let select = DOM.elid(type + el);
    selectOpts.forEach(opt => {
        if (type === 'airline') {
            select.appendChild(DOM.option({value: opt.address}, opt.name));
        } else if (type === 'flights') {
            select.appendChild(DOM.option({value: opt.flightNumber}, opt.flightNumber));
        }
    });
}

function flightChange(el, n, flights) {
    el = el + n;
    let flight = DOM.elid(el).value;
    let flightArr = [];

    for (let i = 0; i < flights.length; i++) {
        if (flights[i].flightNumber === flight) {
            flightArr.push(flights[i]);
            break;
        }
    }

    let num = el.charAt(el.length - 1);
    if (n > 1)
        displayFlightInfo(num, flightArr);
}

function displayFlightInfo(num, flight) {
    let divname = "flightInfo" + num;
    let displayDiv = DOM.elid(divname);
    displayDiv.innerHTML = "";
    let section = DOM.section();

    let line1 = "Airlines: " + flight[0].airline + " Departs at: " + flight[0].time;


    section.appendChild(DOM.div({className: 'col-sm-6 field'}, line1));

    displayDiv.append(section);
}


function displayContractBal(description, balance) {
    let displayDiv = DOM.elid("display-contract-balance");
    displayDiv.innerHTML = "";
    let section = DOM.section();
    section.appendChild(DOM.h5(description));
    section.appendChild(DOM.div({className: 'col-sm-8 field-value'}, balance));
    displayDiv.append(section);
}

function displayFund(title, results) {
    let displayDiv = DOM.elid("display-wrapper-funding-status");
    let section = DOM.section();
    section.appendChild(DOM.h5(title));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className: 'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, String(result.airline) + " Funded."));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.TXid ? ("TX Id : " + String(result.TXid)) : ("Funded : TX: " + String(result.airline))));
        section.appendChild(row);
    });
    displayDiv.append(section);
}

function displayOpeartionalStatus(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper-operational-status");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className: 'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    });
    displayDiv.append(section);

}

function displayFlightStatus(divID, title, description, status, results) {
    let displayDiv = DOM.elid(divID);
    displayDiv.innerHTML = "";
    let section = DOM.section();

    section.appendChild(DOM.h5(description));

    let row = section.appendChild(DOM.div({className: 'row'}));
    row.appendChild(DOM.div({className: 'col-sm-4 field'}, results[0].label));
    let displayStr = String(results[0].value);
    switch (status) {
        case "0" :
            displayStr = displayStr + " : Unknown";
            break;
        case "10" :
            displayStr = displayStr + " : On Time";
            break;
        case "20" :
            displayStr = displayStr + " : Late because of Airline";
            break;
        case "30" :
            displayStr = displayStr + " : Late because of weather";
            break;
        case "40" :
            displayStr = displayStr + " : Late because of technical problems";
            break;
        case "50" :
            displayStr = displayStr + " : Late because of other reasons";
            break;
    }

    row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, results[0].error ? String(results[0].error) : displayStr));
    section.appendChild(row);

    displayDiv.append(section);

}

function displayInsurance(title, results) {
    let displayDiv = DOM.elid("display-wrapper-insurance-status");
    let section = DOM.section();
    section.appendChild(DOM.h5(title));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className: 'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, String(result.text)));
        section.appendChild(row);
    });
    displayDiv.append(section);
}

function fillInsuranceInfo(title, flight) {
    let displayDiv = DOM.elid("display-wrapper-insurance-info");
    if (displayDiv.innerHTML.length === 0) {
        displayDiv.appendChild(DOM.label(title));
    }
    displayDiv.appendChild(DOM.label(" - " + flight + " "));
}



